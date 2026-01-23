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
  logs: [],
  stats: {
    total_errors: 0,
    affected_users: 0,
    failing_endpoints: 0,
    error_types_count: 0,
  },
  distributions: {
    types: [],
    endpoints: [],
    timeline: [],
  },
};

export function useDiagnosticsData(
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

      const res = await fetch(`/api/diagnostics?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch diagnostics: ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setData(emptyData);
      }
    } catch (err) {
      console.error("Diagnostics fetch error:", err);
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
