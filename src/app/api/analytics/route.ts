import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsData, getConversionMetrics } from "@/lib/db";

// Test users to exclude from analytics
const TEST_USERS = [
  "aniket gupta",
  "arjun gujar",
  "aakash puri",
  "minal hussain",
  "vaishnavi parab",
  "rahul thokal",
  "rana basant",
  "shoeb",
  "aniket",
  "arjun",
  "abhishek",
  "test",
];

import { processData, PromptData } from "@/lib/analytics-utils";

// ... (Functions processData and interface PromptData are removed from here)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const sourceStr = searchParams.get("source");

    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;
    const source = (
      ["All", "Chat", "Extension"].includes(sourceStr || "") ? sourceStr : "All"
    ) as "All" | "Chat" | "Extension";

    console.log("Fetching analytics data...", { startDate, endDate, source });

    const [data, conversionMetrics] = await Promise.all([
      getAnalyticsData(startDate, endDate, source) as unknown as Promise<
        PromptData[]
      >,
      getConversionMetrics(startDate, endDate),
    ]);

    console.log(
      `Fetched ${data.length} records, Onboarding: ${conversionMetrics.onboarding.completedOnboarding}`,
    );
    const processed = processData(data);

    // Merge DB-based Onboarding Metrics (User requested DB logic for onboarding)
    processed.conversion.activationRate =
      conversionMetrics.onboarding.completionRate;
    processed.conversion.activatedUsers =
      conversionMetrics.onboarding.completedOnboarding;

    // Add Signup Sources to distributions
    (processed.distributions as any).signupSources = conversionMetrics.sources;

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
        complexity: [],
        mode: [],
        llm: [],
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
