"use client";

import { useState, useEffect, useCallback } from "react";
import { getDateRange } from "../lib/date-utils";

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
    userStatus: [],
    signupSources: [],
  },
  timeAnalysis: {
    dailyActivity: [],
    dayOfWeek: [],
    timePeriod: [],
  },
  insights: {
    avgUserPromptLength: 0,
    avgEnhancedPromptLength: 0,
    avgUserWords: 0,
    avgEnhancedWords: 0,
    expansionRatio: 0,
    userSegments: [],
    topPowerUsers: [],
    highIntentActions: [],
    planAnalysis: {
      paid: { avgTimeSavedHours: 0, promptsPerUser: 0 },
      trial: { avgTimeSavedHours: 0, promptsPerUser: 0 },
      free: { avgTimeSavedHours: 0, promptsPerUser: 0 },
    },
  },
};

export function useAnalyticsData(
  dateFilter = "Last 7 Days",
  sourceFilter = "All",
  customDateRange = undefined,
) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let startDate, endDate;

      if (
        dateFilter === "Custom" &&
        customDateRange?.from &&
        customDateRange?.to
      ) {
        startDate = customDateRange.from;
        // set end date to end of day if it's the same day, or just use the provided date
        endDate = new Date(customDateRange.to);
        endDate.setHours(23, 59, 59, 999);
      } else {
        const range = getDateRange(dateFilter);
        startDate = range.startDate;
        endDate = range.endDate;
      }

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate.toISOString());
      if (endDate) params.set("endDate", endDate.toISOString());
      if (sourceFilter && sourceFilter !== "All") {
        params.set("source", sourceFilter);
      }

      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch analytics: ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        // Enriched data with real segmentation from backend
        // No fake data injection anymore
        setData(json.data);
      } else {
        setData(emptyData);
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(emptyData);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, sourceFilter, customDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
