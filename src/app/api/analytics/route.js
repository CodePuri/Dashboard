import { NextResponse } from "next/server";
import {
  getAnalyticsData,
  getConversionMetrics,
  getPriorPaidUsers,
  getTotalPaidUsersByDate,
  getInstallationMetrics,
  getDailyInstallationMetrics,
  getActiveUsersBreakdown,
} from "@/lib/db";

// Test users to exclude from analytics
// const TEST_USERS = [
//   "aniket gupta",
//   "arjun gujar",
//   "aakash puri",
//   "minal hussain",
//   "vaishnavi parab",
//   "rahul thokal",
//   "rana basant",
//   "shoeb",
//   "aniket",
//   "arjun",
//   "abhishek",
//   "test",
// ];
const TEST_USER_IDS = [329];

import { processData } from "@/lib/analytics-utils";

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const sourceStr = searchParams.get("source");

    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;
    const source = ["All", "Chat", "Extension"].includes(sourceStr || "")
      ? sourceStr
      : "All";

    console.log("Fetching analytics data...", { startDate, endDate, source });

    // Calculate previous period for trend analysis
    let prevStartDate = null;
    let prevEndDate = null;

    if (startDate && endDate) {
      const durationMs = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime() - 1); // 1ms before current start
      prevStartDate = new Date(startDate.getTime() - durationMs - 1);
    }

    const [
      data,
      conversionMetrics,
      priorPaidUsers,
      allPaidUsers,
      installationMetrics,
      dailyInstallationMetrics,
      prevData,
      activeBreakdownRaw,
    ] = await Promise.all([
      getAnalyticsData(startDate, endDate, source, TEST_USER_IDS),
      getConversionMetrics(startDate, endDate, source, TEST_USER_IDS),
      startDate
        ? getPriorPaidUsers(startDate, source, TEST_USER_IDS)
        : Promise.resolve([]),
      getTotalPaidUsersByDate(startDate, endDate, TEST_USER_IDS),
      getInstallationMetrics(startDate, endDate, TEST_USER_IDS),
      getDailyInstallationMetrics(startDate, endDate, TEST_USER_IDS),
      prevStartDate && prevEndDate
        ? getAnalyticsData(prevStartDate, prevEndDate, source, TEST_USER_IDS)
        : Promise.resolve([]),
      getActiveUsersBreakdown(startDate, endDate, source, TEST_USER_IDS),
    ]);

    console.log(
      `Fetched ${data.length} records, Previous: ${prevData.length}, Onboarding: ${conversionMetrics.onboarding.completedOnboarding}`,
    );

    // Process Active Breakdown
    // Transform daily breakdown into chart data
    const activeUsersChartData = (activeBreakdownRaw || []).map((row) => ({
      date: row.date,
      free: parseInt(row.free_users || 0),
      trial: parseInt(row.trial_users || 0),
      pro: parseInt(row.pro_users || 0),
      // Aggregated Power Counts (Legacy support for Overview page)
      freePower:
        parseInt(row.free_power_5 || 0) + parseInt(row.free_power_gt_5 || 0),
      trialPower:
        parseInt(row.trial_power_5 || 0) + parseInt(row.trial_power_gt_5 || 0),
      proPower:
        parseInt(row.pro_power_5 || 0) + parseInt(row.pro_power_gt_5 || 0),
      // Granular Power Counts (New support for Acquisition page)
      freePower5: parseInt(row.free_power_5 || 0),
      freePowerGt5: parseInt(row.free_power_gt_5 || 0),
      trialPower5: parseInt(row.trial_power_5 || 0),
      trialPowerGt5: parseInt(row.trial_power_gt_5 || 0),
      proPower5: parseInt(row.pro_power_5 || 0),
      proPowerGt5: parseInt(row.pro_power_gt_5 || 0),
      total: parseInt(row.total_users || 0),
    }));

    const processed = processData(
      data,
      priorPaidUsers, // Renamed from initialPaidUsers to priorPaidUsers to match existing variable
      allPaidUsers,
      startDate,
      endDate,
      installationMetrics,
      prevData,
    );

    // Merge DB-based Onboarding Metrics (User requested DB logic for onboarding)
    processed.conversion.activationRate =
      conversionMetrics.onboarding.completionRate;
    processed.conversion.activatedUsers =
      conversionMetrics.onboarding.completedOnboarding;

    // Add Signup Sources to distributions
    processed.distributions.signupSources = conversionMetrics.sources;

    // Add daily installation metrics for visualizations
    processed.dailyInstallationMetrics = dailyInstallationMetrics;

    // Add active users breakdown for the chart
    processed.activeUsersChartData = activeUsersChartData;

    return NextResponse.json({
      success: true,
      data: processed,
      count: data.length,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Analytics API error:", errorMessage, error);

    // Return empty data structure instead of failing completely
    const emptyData = {
      metrics: {
        total: 0,
        enhanced: 0,
        failed: 0,
        uniqueUsers: 0,
        enhancementRate: 0,
        failureRate: 0,
        avgProcessingTime: 0,
        totalTimeSavedHours: 0,
        refineRate: 0,
      },
      growth: {
        activeUsers: 0,
        dailyHabitUsers: 0,
        powerUserRate: 0,
        intensity: 0,
        retentionRate: 0,
      },
      distributions: {
        topIntents: [],
        topDomains: [],
        mode: [],
        llm: [],
        signupSources: [],
      },
      timeAnalysis: {
        dailyActivity: [],
        dayOfWeek: [
          { name: "Monday", count: 0 },
          { name: "Tuesday", count: 0 },
          { name: "Wednesday", count: 0 },
          { name: "Thursday", count: 0 },
          { name: "Friday", count: 0 },
          { name: "Saturday", count: 0 },
          { name: "Sunday", count: 0 },
        ],
        timePeriod: [
          { name: "Morning", count: 0 },
          { name: "Afternoon", count: 0 },
          { name: "Evening", count: 0 },
          { name: "Night", count: 0 },
        ],
      },
      insights: {
        avgUserPromptLength: 0,
        avgEnhancedPromptLength: 0,
        avgUserWords: 0,
        avgEnhancedWords: 0,
        expansionRatio: 0,
        userSegments: [
          { name: "One-time", count: 0 },
          { name: "Casual", count: 0 },
          { name: "Regular", count: 0 },
          { name: "Power", count: 0 },
        ],
        latestPrompts: [],
      },
    };

    return NextResponse.json({
      success: true,
      data: emptyData,
      count: 0,
      warning: `Database error: ${errorMessage}. Showing empty data.`,
    });
  }
}
