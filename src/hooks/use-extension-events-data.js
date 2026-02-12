import { useMemo } from "react";
import { usePostHogData } from "./use-posthog-data";
import {
  filterExtensionEvents,
  categorizeEvents,
  calculateActionCompletionRate,
  getTopEvent,
  countCopyActions,
  countBlockers,
  countExtensionOpens,
  calculateFunnelMetrics,
  getEventBreakdown,
} from "@/lib/extension-metrics";

/**
 * Custom hook for Extension User Interactions data
 *
 * Fetches PostHog extension events and calculates derived metrics
 * Follows senior-architect principle of separation of concerns
 *
 * @param {string} dateFilter - Date filter (e.g., "Last 7 Days")
 * @param {object} customDateRange - Custom date range {from, to}
 * @param {string} pageSourceFilter - Current page's source filter ("All", "Extension", "Chat")
 * @returns {object} Processed extension events data with metrics
 */
export function useExtensionEventsData(
  dateFilter,
  customDateRange,
  pageSourceFilter,
) {
  // Always fetch Extension events (these events only exist for extension)
  const {
    data: rawData,
    isLoading,
    isLoadingMore,
    configured,
    error,
    loadMore,
  } = usePostHogData(dateFilter, customDateRange, "ExtensionInteraction");

  // Determine if section should be shown based on page's source filter
  const shouldShow = pageSourceFilter !== "Chat";

  // Process the data
  const processedData = useMemo(() => {
    if (!rawData || !rawData.events) {
      return {
        totalInteractions: 0,
        totalEvents: 0,
        actionCompletionRate: 0,
        copyActions: 0,
        blockersEncountered: 0,
        extensionOpens: 0,
        topEvent: { name: "N/A", count: 0 },
        categoryBreakdown: [],
        eventBreakdown: [],
        funnelMetrics: {
          opened: 0,
          enhanced: 0,
          accepted: 0,
          copied: 0,
          openedRate: 0,
          enhancedRate: 0,
          acceptedRate: 0,
          copiedRate: 0,
        },
        eventsOverTime: [],
        recentEvents: [],
        projectId: rawData?.projectId || null,
      };
    }

    // Since we use "ExtensionInteraction" source, events are already filtered by backend
    const filteredEvents = rawData.events;
    const projectId = rawData.projectId || rawData.data?.projectId; // Flexible access

    // Calculate metrics
    const categories = categorizeEvents(filteredEvents);
    const categoryBreakdown = Object.entries(categories).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );

    const eventBreakdown = getEventBreakdown(filteredEvents);
    const funnelMetrics = calculateFunnelMetrics(filteredEvents);

    // Use backend's accurate timeline data instead of manual calculation from limited set
    const eventsOverTimeArray = rawData.eventsOverTime || [];

    return {
      totalInteractions: rawData.totalEvents || filteredEvents.length,
      totalEvents: rawData.totalEvents || 0,
      actionCompletionRate: calculateActionCompletionRate(filteredEvents),
      copyActions: countCopyActions(filteredEvents),
      blockersEncountered: countBlockers(filteredEvents),
      extensionOpens: countExtensionOpens(filteredEvents),
      topEvent: getTopEvent(filteredEvents),
      categoryBreakdown,
      eventBreakdown,
      funnelMetrics,
      eventsOverTime: eventsOverTimeArray,
      recentEvents: filteredEvents.slice(0, 50), // Increased slice since we might have loaded more
      projectId: projectId || rawData.projectId, // Pass through project ID for PostHog links
    };
  }, [rawData]);

  return {
    data: processedData,
    isLoading,
    isLoadingMore,
    configured,
    error,
    loadMore,
    shouldShow,
  };
}
