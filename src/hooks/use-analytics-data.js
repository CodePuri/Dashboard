"use client";

import { useState, useEffect, useCallback } from "react";

function getDateRange(filter) {
  // Get current date in IST (Asia/Kolkata)
  // format: YYYY-MM-DD
  const now = new Date();
  const istDateStr = now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  // Helper to create IST Date
  const createISTDate = (dateStr, timeStr) =>
    new Date(`${dateStr}T${timeStr}+05:30`);

  const todayStart = createISTDate(istDateStr, "00:00:00");
  const todayEnd = createISTDate(istDateStr, "23:59:59.999");

  switch (filter) {
    case "Today":
      return { startDate: todayStart, endDate: todayEnd };

    case "Yesterday": {
      const yesterdayStart = new Date(
        todayStart.getTime() - 24 * 60 * 60 * 1000,
      );
      const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
      return { startDate: yesterdayStart, endDate: yesterdayEnd };
    }

    case "Last 7 Days": {
      const start = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: todayEnd };
    }

    case "Last 14 Days": {
      const start = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: todayEnd };
    }

    case "Last 30 Days": {
      const start = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: todayEnd };
    }

    case "Last 90 Days": {
      const start = new Date(todayStart.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: todayEnd };
    }

    case "All Time":
    default:
      return { startDate: null, endDate: null };
  }
}

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
