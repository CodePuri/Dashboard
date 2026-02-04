import { NextResponse } from "next/server";
import { getUserAttritionData, getActiveUserIds } from "@/lib/db";
import { getDateRange } from "@/lib/date-utils";

// Metrics logic here to keep DB logic pure
function processAttrition(rawData, endDate) {
  const refDate = endDate ? new Date(endDate) : new Date();
  // IST adjustment for "now" isn't strictly necessary if comparing relative days,
  // but consistency is good. rawData times are likely UTC strings.

  const processed = rawData
    .filter((user) => String(user.user_id) !== "329") // Standard exclusion
    .map((user) => {
      const lastActive = new Date(user.last_active);
      const firstActive = new Date(user.first_active);

      // Days since last active (Churn detector)
      const daysSinceLastActive =
        (refDate.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);

      // Lifespan (Days)
      const lifespanDays =
        (lastActive.getTime() - firstActive.getTime()) / (1000 * 60 * 60 * 24);

      // Churned status: inactive for > 7 days
      const isChurned = daysSinceLastActive > 7;

      // Success status of last prompt
      // If enhanced_prompt is null or empty, it failed.
      const lastStatus =
        user.last_enhanced_prompt && user.last_enhanced_prompt.length > 0
          ? "Success"
          : "Failure";

      return {
        userId: String(user.user_id || ""),
        promptCount: Number(user.total_prompts),
        daysSinceLastActive,
        lifespanDays: Math.max(0, lifespanDays), // Prevent negative if clocks distinct
        isChurned,
        lastIntent: user.last_intent || "Unknown",
        lastMode: user.last_mode || "Standard",
        lastStatus,
        lastActiveDate: user.last_active, // Added for daily trends
        plan: user.user_status || "free",
      };
    });

  return processed;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get("date") || "All Time"; // Default to All Time for Attrition
    const sourceFilter = searchParams.get("source") || "All";

    const { startDate, endDate } = getDateRange(dateFilter);

    // Calculate previous period for trend analysis
    let prevStartDate = null;
    let prevEndDate = null;
    let prev2StartDate = null;
    let prev2EndDate = null;

    if (startDate && endDate) {
      const durationMs = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(startDate.getTime() - durationMs - 1);

      prev2EndDate = new Date(prevStartDate.getTime() - 1);
      prev2StartDate = new Date(prevStartDate.getTime() - durationMs - 1);
    }

    const [rawData, prevRawData, currActiveIds, prevActiveIds, prev2ActiveIds] =
      await Promise.all([
        getUserAttritionData(startDate, endDate, sourceFilter),
        prevStartDate && prevEndDate
          ? getUserAttritionData(prevStartDate, prevEndDate, sourceFilter)
          : Promise.resolve([]),
        // IDs for Rolling Churn
        getActiveUserIds(startDate, endDate, sourceFilter),
        prevStartDate && prevEndDate
          ? getActiveUserIds(prevStartDate, prevEndDate, sourceFilter)
          : Promise.resolve([]),
        prev2StartDate && prev2EndDate
          ? getActiveUserIds(prev2StartDate, prev2EndDate, sourceFilter)
          : Promise.resolve([]),
      ]);

    const data = processAttrition(rawData, endDate);
    // Note: processAttrition logic might not be relevant for churn RATE anymore if we use Rolling Churn,
    // but the list of users is still used for the table.

    // Calculate Rolling Churn Rate
    // Churned = Users active in Prev Period who are NOT active in Curr Period
    const calculateRollingChurn = (activePrev, activeCurr) => {
      if (!activePrev || activePrev.length === 0) return 0;
      // Convert to Set for O(1) lookup? IDs are strings/numbers.
      const currSet = new Set(activeCurr.map(String));
      const lostCount = activePrev.filter(
        (id) => !currSet.has(String(id)),
      ).length;
      return (lostCount / activePrev.length) * 100;
    };

    const currentRate = calculateRollingChurn(prevActiveIds, currActiveIds);
    const previousRate = calculateRollingChurn(prev2ActiveIds, prevActiveIds);

    let trend = null;
    if (previousRate > 0) {
      trend = ((currentRate - previousRate) / previousRate) * 100;
    } else if (currentRate > 0) {
      trend = 100;
    } else {
      trend = 0;
    }

    // Calculate Daily Trends
    const dailyTrends = {};
    data.forEach((u) => {
      // Use existing logic for daily trends?
      // existing logic used u.isChurned based on 7 days inactivity.
      // We should arguably stick to "Attrition Table" logic for WHO is listed,
      // but ensure the aggregate RATE matches the Rolling definition.
      // Or align them?
      // Since "churned" status in table is useful for spotting individuals, we keep it based on threshold.
      if (!u.isChurned) return;

      const lastActiveStr =
        u.lastActiveDate instanceof Date
          ? u.lastActiveDate.toISOString()
          : String(u.lastActiveDate);
      const date = lastActiveStr.split("T")[0];

      if (!dailyTrends[date]) {
        dailyTrends[date] = {
          date,
          regrettableChurn: 0,
          totalLifespan: 0,
          churnCount: 0,
          exitTriggers: 0,
        };
      }
      const day = dailyTrends[date];
      day.churnCount++;
      if (u.promptCount >= 20) day.regrettableChurn++;
      day.totalLifespan += u.lifespanDays;
      if (u.lastStatus === "Failure") day.exitTriggers++;
    });

    const dailyActivity = Object.values(dailyTrends)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        avgLifespan: d.churnCount > 0 ? d.totalLifespan / d.churnCount : 0,
        exitTriggerRate:
          d.churnCount > 0 ? (d.exitTriggers / d.churnCount) * 100 : 0,
      }));

    return NextResponse.json({
      success: true,
      data,
      dailyActivity,
      metrics: {
        churnRate: currentRate,
        previousChurnRate: previousRate,
        trend: trend,
      },
    });
  } catch (error) {
    console.error("Attrition API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch attrition data" },
      { status: 500 },
    );
  }
}
