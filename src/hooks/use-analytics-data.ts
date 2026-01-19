"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AnalyticsData,
  DateFilterOption,
  SourceFilterOption,
} from "@/types/analytics";

function getDateRange(filter: DateFilterOption): {
  startDate: Date | null;
  endDate: Date | null;
} {
  // Get current date in IST (Asia/Kolkata)
  // format: YYYY-MM-DD
  const now = new Date();
  const istDateStr = now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  // Helper to create IST Date
  const createISTDate = (dateStr: string, timeStr: string) =>
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

interface UseAnalyticsDataResult {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const emptyData: AnalyticsData = {
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
  },
};

export function useAnalyticsData(
  dateFilter: DateFilterOption = "Last 7 Days",
  sourceFilter: SourceFilterOption = "All",
): UseAnalyticsDataResult {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange(dateFilter);
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
  }, [dateFilter, sourceFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
