import { NextResponse } from "next/server";
import { getUserAttritionData } from "@/lib/db";

// Metrics logic here to keep DB logic pure
function processAttrition(rawData) {
  const now = new Date();
  // IST adjustment for "now" isn't strictly necessary if comparing relative days,
  // but consistency is good. rawData times are likely UTC strings.

  const processed = rawData
    .filter((user) => String(user.user_id) !== "329") // Standard exclusion
    .map((user) => {
      const lastActive = new Date(user.last_active);
      const firstActive = new Date(user.first_active);

      // Days since last active (Churn detector)
      const daysSinceLastActive =
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);

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

// Helper to calculate date ranges (Duplicated from analytics route for now)
// Ideally move to shared lib
function getDateRange(filter) {
  const now = new Date();

  // Create dates in IST (UTC+5:30)
  // We want "Today" to range from 00:00:00 IST to 23:59:59 IST
  const getISTDate = (d) => {
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 5.5);
  };

  // Helper to set time to end of day
  const endOfDay = (d) => {
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const startOfDay = (d) => {
    d.setHours(0, 0, 0, 0);
    return d;
  };

  let startDate = new Date(); // Defaults
  let endDate = new Date();

  // Reset to start/end of current day in local/server time (approximation if not using strict IST lib)
  // For simplicity in this route, we will use standard Date manipulation relative to now
  // Assuming server time or UTC.

  endDate = endOfDay(new Date());

  switch (filter) {
    case "Today":
      startDate = startOfDay(new Date());
      break;
    case "Yesterday":
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 1)));
      endDate = endOfDay(new Date(startDate));
      break;
    case "Last 7 Days":
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 7)));
      break;
    case "Last 30 Days":
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 30)));
      break;
    case "This Month":
      startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      break;
    case "Last Month":
      startDate = startOfDay(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
      );
      endDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    case "Last 3 Months":
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 90)));
      break;
    case "All Time":
      return { startDate: null, endDate: null };
    default:
      // Default to Last 30 Days if unknown
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 30)));
  }

  return { startDate, endDate };
}

const TEST_USER_IDS = [329];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get("date") || "All Time"; // Default to All Time for Attrition
    const sourceFilter = searchParams.get("source") || "All";

    const { startDate, endDate } = getDateRange(dateFilter);

    // Calculate previous period for trend analysis
    let prevStartDate = null;
    let prevEndDate = null;
    if (startDate && endDate) {
      const durationMs = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(startDate.getTime() - durationMs - 1);
    }

    const [rawData, prevRawData] = await Promise.all([
      getUserAttritionData(startDate, endDate, sourceFilter, TEST_USER_IDS),
      prevStartDate && prevEndDate
        ? getUserAttritionData(
            prevStartDate,
            prevEndDate,
            sourceFilter,
            TEST_USER_IDS,
          )
        : Promise.resolve([]),
    ]);

    const data = processAttrition(rawData);
    const prevProcessed = processAttrition(prevRawData);

    const calculateRate = (list) => {
      const total = list.length;
      const churned = list.filter((u) => u.isChurned).length;
      return total > 0 ? (churned / total) * 100 : 0;
    };

    const currentRate = calculateRate(data);
    const previousRate = calculateRate(prevProcessed);

    let trend = null;
    if (prevRawData && prevRawData.length > 0) {
      if (previousRate > 0) {
        trend = ((currentRate - previousRate) / previousRate) * 100;
      } else {
        trend = currentRate > 0 ? 100 : 0;
      }
    }

    // Calculate Daily Trends
    const dailyTrends = {};
    data.forEach((u) => {
      if (!u.isChurned) return;
      const date = new Date(u.lastActiveDate).toISOString().split("T")[0];
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
