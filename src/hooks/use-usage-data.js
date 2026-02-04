"use client";

import { useState, useEffect, useCallback } from "react";
import { getDateRange } from "@/lib/date-utils";

export function useUsageData(
  dateFilter = "Last 30 Days",
  sourceFilter = "All",
  customDateRange = undefined,
) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use centralized getDateRange for all filters including Custom
      const { startDate, endDate } = getDateRange(dateFilter, customDateRange);

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate.toISOString());
      if (endDate) params.set("endDate", endDate.toISOString());
      if (sourceFilter && sourceFilter !== "All") {
        params.set("source", sourceFilter);
      }

      const res = await fetch(`/api/usage?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch usage data");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, sourceFilter, customDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
