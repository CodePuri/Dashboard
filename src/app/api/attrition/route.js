import { NextResponse } from "next/server";
import {
  getUserAttritionData,
  getActiveUserIds,
  getDailyChurnActivity,
} from "@/lib/db";
import { getDateRange } from "@/lib/date-utils";

// Metrics logic here to keep DB logic pure
function processAttrition(rawData, endDate) {
  const refDate = endDate ? new Date(endDate) : new Date();

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

      const lastStatus =
        user.last_enhanced_prompt && user.last_enhanced_prompt.length > 0
          ? "Success"
          : "Failure";

      return {
        userId: String(user.user_id || ""),
        promptCount: Number(user.total_prompts),
        daysSinceLastActive,
        lifespanDays: Math.max(0, lifespanDays),
        isChurned,
        lastIntent: user.last_intent || "Unknown",
        lastMode: user.last_mode || "Standard",
        lastStatus,
        lastActiveDate: user.last_active,
        plan: user.user_status || "free",
      };
    });

  return processed;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get("date") || "All Time";
    const sourceFilter = searchParams.get("source") || "All";

    let { startDate, endDate } = getDateRange(dateFilter);

    const queryStartDate = searchParams.get("startDate");
    const queryEndDate = searchParams.get("endDate");

    if (queryStartDate && queryEndDate) {
      startDate = new Date(queryStartDate);
      endDate = new Date(queryEndDate);
    }

    // Baseline: calculate durations and previous periods
    const durationMs =
      startDate && endDate
        ? endDate.getTime() - startDate.getTime()
        : 30 * 24 * 60 * 60 * 1000;
    const effectiveEndDate = endDate || new Date();
    const effectiveStartDate =
      startDate || new Date(effectiveEndDate.getTime() - durationMs);

    const prevEndDate = new Date(effectiveStartDate.getTime() - 1);
    const prevStartDate = new Date(
      effectiveStartDate.getTime() - durationMs - 1,
    );

    const prev2EndDate = new Date(prevStartDate.getTime() - 1);
    const prev2StartDate = new Date(prevStartDate.getTime() - durationMs - 1);

    const [
      rawData,
      dailyChurnData,
      currActiveIds,
      prevActiveIds,
      prev2ActiveIds,
    ] = await Promise.all([
      getUserAttritionData(startDate, endDate, sourceFilter),
      getDailyChurnActivity(startDate, endDate, sourceFilter),
      getActiveUserIds(startDate, endDate, sourceFilter),
      getActiveUserIds(prevStartDate, prevEndDate, sourceFilter),
      getActiveUserIds(prev2StartDate, prev2EndDate, sourceFilter),
    ]);

    console.log("Attrition Data fetched:", {
      rawData: rawData?.length,
      currActive: currActiveIds?.length,
      prevActive: prevActiveIds?.length,
    });

    const data = processAttrition(rawData, endDate);

    // Calculate Rolling Churn Rate
    const calculateRollingChurn = (activePrev, activeCurr) => {
      if (!activePrev || activePrev.length === 0) return 0;
      const currSet = new Set(activeCurr.map(String));
      const lostCount = activePrev.filter(
        (id) => !currSet.has(String(id)),
      ).length;
      return (lostCount / activePrev.length) * 100;
    };

    const currentRate = calculateRollingChurn(prevActiveIds, currActiveIds);
    const previousRate = calculateRollingChurn(prev2ActiveIds, prevActiveIds);

    // Handle trend calculation
    let trend = null;
    if (previousRate > 0) {
      trend = ((currentRate - previousRate) / previousRate) * 100;
    } else if (currentRate > 0) {
      trend = 100;
    } else {
      trend = 0;
    }

    console.log("Churn calculation done:", { currentRate, previousRate });

    // Map the accurate daily activity from the specific churn query
    const dailyActivity = (dailyChurnData || []).map((d) => {
      let dateStr = "";
      try {
        if (d.date instanceof Date) {
          dateStr = d.date.toISOString().split("T")[0];
        } else if (typeof d.date === "string") {
          dateStr = d.date.split("T")[0];
        } else {
          dateStr = new Date(d.date).toISOString().split("T")[0];
        }
      } catch (err) {
        console.error("Date formatting error:", err, d.date);
        dateStr = String(d.date);
      }

      return {
        date: dateStr,
        churnCount: parseInt(d.churnCount) || 0,
        regrettableChurn: parseInt(d.regrettableChurn) || 0,
        exitTriggers: parseInt(d.exitTriggers) || 0,
        avgLifespan: 0,
        exitTriggerRate:
          d.churnCount > 0 ? (d.exitTriggers / d.churnCount) * 100 : 0,
      };
    });

    console.log("Response prepared, returning JSON");

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
    console.error("Attrition API Error:", error.message, error.stack);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch attrition data",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
