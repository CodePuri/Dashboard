import { useState, useEffect } from "react";
import { subDays, startOfDay, endOfDay } from "date-fns";

const emptyPostHogData = {
  totalEvents: 0,
  events: [],
  eventBreakdown: [],
  eventsOverTime: [],
  uniqueEventTypes: 0,
  hasMore: false,
};

/**
 * Hook to fetch PostHog events data
 * @param {string} dateFilter - Date filter (e.g., "Last 7 Days", "Last 30 Days")
 * @param {object} customDateRange - Custom date range {from, to}
 * @param {string} sourceFilter - Optional source filter (Chat, Extension, Lander)
 */
export function usePostHogData(
  dateFilter,
  customDateRange,
  sourceFilter = null,
) {
  const [data, setData] = useState(emptyPostHogData);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState(null);
  const [fetchLimit, setFetchLimit] = useState(100);

  const loadMore = () => {
    if (data.events.length < data.totalEvents) {
      setFetchLimit((prev) => prev + 100);
    }
  };

  useEffect(() => {
    // Reset limit and trigger full loading when filters change
    setFetchLimit(100);
    setIsLoading(true);
  }, [dateFilter, customDateRange, sourceFilter]);

  useEffect(() => {
    async function fetchData() {
      // If limit > 100, we're loading more, otherwise it's an initial load or filter change
      const isInitialLoad = fetchLimit === 100;

      if (isInitialLoad) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append("limit", fetchLimit.toString());

        // Add source filter if provided
        if (sourceFilter && sourceFilter !== "All") {
          params.append("source", sourceFilter);
        }

        // Calculate date range
        let after = null;
        let before = null;

        if (customDateRange?.from && customDateRange?.to) {
          // Custom date range
          after = new Date(customDateRange.from).toISOString();
          before = endOfDay(new Date(customDateRange.to)).toISOString();
        } else {
          // Predefined date filters
          const now = new Date();
          before = now.toISOString();

          switch (dateFilter) {
            case "Today":
              after = startOfDay(now).toISOString();
              break;
            case "Yesterday":
              after = startOfDay(subDays(now, 1)).toISOString();
              before = endOfDay(subDays(now, 1)).toISOString();
              break;
            case "Last 7 Days":
              after = startOfDay(subDays(now, 7)).toISOString();
              break;
            case "Last 14 Days":
              after = startOfDay(subDays(now, 14)).toISOString();
              break;
            case "Last 30 Days":
              after = startOfDay(subDays(now, 30)).toISOString();
              break;
            case "Last 90 Days":
              after = startOfDay(subDays(now, 90)).toISOString();
              break;
            case "All Time":
              after = new Date("2025-01-01").toISOString(); // Project start or earlier
              break;
            default:
              // Default to last 7 days
              after = startOfDay(subDays(now, 7)).toISOString();
          }
        }

        if (after) params.append("after", after);
        if (before) params.append("before", before);

        console.log("PostHog API Request:", {
          dateFilter,
          after,
          before,
          sourceFilter,
          url: `/api/posthog?${params.toString()}`,
        });

        const response = await fetch(`/api/posthog?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          if (response.status === 503) {
            // API key not configured
            setConfigured(false);
            setData(emptyPostHogData);
          } else {
            throw new Error(result.error || "Failed to fetch PostHog data");
          }
        } else {
          setConfigured(true);
          setData(result.data);
        }
      } catch (err) {
        console.error("Error fetching PostHog data:", err);
        setError(err.message);
        setData(emptyPostHogData);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }

    fetchData();
  }, [dateFilter, customDateRange, sourceFilter, fetchLimit]);

  return { data, isLoading, isLoadingMore, configured, error, loadMore };
}
