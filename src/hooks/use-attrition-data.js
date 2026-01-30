"use client";

import { useState, useEffect } from "react";

export function useAttritionData(
  dateFilter = "Last 30 Days",
  sourceFilter = "All",
  customDateRange = undefined,
) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAttrition() {
      setData(null); // Reset to prevent Ghost Values
      setIsLoading(true);
      try {
        let startDate, endDate;

        // Custom Date Logic (mirrored from useAnalyticsData)
        if (
          dateFilter === "Custom" &&
          customDateRange?.from &&
          customDateRange?.to
        ) {
          startDate = customDateRange.from;
          endDate = new Date(customDateRange.to);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Fallback to simple date param for presets, or implement full logic here
          // For simplicity, we'll let the API handle the presets if we pass just 'date'
          // BUT, to be consistent, we might want to calculate it.
          // Let's stick to passing the filter string if it's not custom,
          // assuming API handles it, OR we'd need to duplicate getDateRange.
          // The current API call uses `date: dateFilter`.
          // If we change to passing startDate/endDate, we need to ensure API supports it.
          // Let's assume we pass startDate/endDate if Custom, else date param.
        }

        const params = new URLSearchParams();
        if (sourceFilter) params.set("source", sourceFilter);

        if (startDate && endDate) {
          params.set("startDate", startDate.toISOString());
          params.set("endDate", endDate.toISOString());
          // Clear the named date filter if we are sending explicit dates
          // or keep it as 'Custom' depending on backend
        } else {
          params.set("date", dateFilter);
        }

        const res = await fetch(`/api/attrition?${params}`);
        const json = await res.json();
        if (json.success) {
          setData({
            list: json.data,
            dailyActivity: json.dailyActivity, // Added
            metrics: json.metrics,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAttrition();
  }, [dateFilter, sourceFilter, customDateRange]);

  return { data, isLoading };
}
