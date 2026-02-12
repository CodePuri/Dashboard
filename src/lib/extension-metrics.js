/**
 * Extension Metrics Utility Functions
 *
 * Provides calculation logic for PostHog extension event metrics
 * following the data-analyst skill's emphasis on clear metric definitions
 */

// Define the 11 tracked extension events
export const TRACKED_EXTENSION_EVENTS = [
  "extension_send_button_clicked",
  "button_enhance_clicked",
  "button_quick_action_clicked",
  "popup_accept_button_clicked",
  "extension_insert_button_clicked",
  "extension_copy_improved_button_clicked",
  "popup_copy_button_clicked",
  "extension_opened",
  "extension_user_dropdown_hovered",
  "extension_toggle_blocked",
  "popup_closed",
  // Additional events
  "extension_dropdown_toggled",
  "extension_dropdown_option_selected",
  "button_dropdown_toggled",
  "button_dropdown_option_selected",
  "popup_tab_clicked",
  "extension_toggle_clicked",
  "popup_refine_button_clicked",
  "popup_refine_option_selected",
  "popup_analysis_refine_button_clicked",
];

// Event categories for analysis
export const EVENT_CATEGORIES = {
  CORE_ACTIONS: [
    "extension_send_button_clicked",
    "button_enhance_clicked",
    "button_quick_action_clicked",
    "popup_accept_button_clicked",
    "extension_insert_button_clicked",
    "extension_copy_improved_button_clicked",
    "popup_copy_button_clicked",
    "extension_dropdown_option_selected",
    "button_dropdown_option_selected",
    "extension_toggle_clicked",
    "popup_refine_button_clicked",
    "popup_refine_option_selected",
    "popup_analysis_refine_button_clicked",
  ],
  NAVIGATION: [
    "extension_opened",
    "extension_user_dropdown_hovered",
    "extension_dropdown_toggled",
    "button_dropdown_toggled",
    "popup_tab_clicked",
  ],
  BLOCKERS: ["extension_toggle_blocked", "popup_closed"],
};

/**
 * Filter events to only include the 11 tracked extension events
 * @param {Array} events - Array of PostHog event objects
 * @returns {Array} Filtered events
 */
export function filterExtensionEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.filter((event) =>
    TRACKED_EXTENSION_EVENTS.includes(event.event),
  );
}

/**
 * Categorize events into Core Actions, Navigation, and Blockers
 * @param {Array} events - Array of PostHog event objects
 * @returns {Object} Event counts by category
 */
export function categorizeEvents(events) {
  const filtered = filterExtensionEvents(events);

  const categories = {
    "Core Actions": 0,
    Navigation: 0,
    Blockers: 0,
  };

  filtered.forEach((event) => {
    if (EVENT_CATEGORIES.CORE_ACTIONS.includes(event.event)) {
      categories["Core Actions"]++;
    } else if (EVENT_CATEGORIES.NAVIGATION.includes(event.event)) {
      categories["Navigation"]++;
    } else if (EVENT_CATEGORIES.BLOCKERS.includes(event.event)) {
      categories["Blockers"]++;
    }
  });

  return categories;
}

/**
 * Calculate action completion rate
 * Percentage of sessions that include core action events
 * @param {Array} events - Array of PostHog event objects
 * @returns {number} Completion rate percentage (0-100)
 */
export function calculateActionCompletionRate(events) {
  const filtered = filterExtensionEvents(events);
  if (filtered.length === 0) return 0;

  // Group events by distinct_id (user session)
  const sessionEvents = {};
  filtered.forEach((event) => {
    const sessionId = event.distinct_id;
    if (!sessionEvents[sessionId]) {
      sessionEvents[sessionId] = [];
    }
    sessionEvents[sessionId].push(event.event);
  });

  // Count sessions with at least one core action
  const totalSessions = Object.keys(sessionEvents).length;
  const sessionsWithActions = Object.values(sessionEvents).filter((eventList) =>
    eventList.some((eventName) =>
      EVENT_CATEGORIES.CORE_ACTIONS.includes(eventName),
    ),
  ).length;

  return totalSessions > 0 ? (sessionsWithActions / totalSessions) * 100 : 0;
}

/**
 * Get the most frequently occurring event
 * @param {Array} events - Array of PostHog event objects
 * @returns {Object} { name: string, count: number }
 */
export function getTopEvent(events) {
  const filtered = filterExtensionEvents(events);
  if (filtered.length === 0) return { name: "N/A", count: 0 };

  const eventCounts = {};
  filtered.forEach((event) => {
    eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
  });

  const topEvent = Object.entries(eventCounts).reduce(
    (max, [name, count]) => (count > max.count ? { name, count } : max),
    { name: "N/A", count: 0 },
  );

  return topEvent;
}

/**
 * Count copy action events
 * @param {Array} events - Array of PostHog event objects
 * @returns {number} Total copy actions
 */
export function countCopyActions(events) {
  const filtered = filterExtensionEvents(events);
  const copyEvents = [
    "extension_copy_improved_button_clicked",
    "popup_copy_button_clicked",
  ];

  return filtered.filter((event) => copyEvents.includes(event.event)).length;
}

/**
 * Count blocker events
 * @param {Array} events - Array of PostHog event objects
 * @returns {number} Total blocker events
 */
export function countBlockers(events) {
  const filtered = filterExtensionEvents(events);
  return filtered.filter((event) =>
    EVENT_CATEGORIES.BLOCKERS.includes(event.event),
  ).length;
}

/**
 * Count extension opened events
 * @param {Array} events - Array of PostHog event objects
 * @returns {number} Total extension opens
 */
export function countExtensionOpens(events) {
  const filtered = filterExtensionEvents(events);
  return filtered.filter((event) => event.event === "extension_opened").length;
}

/**
 * Calculate funnel conversion metrics
 * Tracks user journey: opened → enhance → accept → copy
 * @param {Array} events - Array of PostHog event objects
 * @returns {Object} Funnel metrics with conversion rates
 */
export function calculateFunnelMetrics(events) {
  const filtered = filterExtensionEvents(events);

  // Group by user session
  const sessions = {};
  filtered.forEach((event) => {
    const sessionId = event.distinct_id;
    if (!sessions[sessionId]) {
      sessions[sessionId] = new Set();
    }
    sessions[sessionId].add(event.event);
  });

  const totalSessions = Object.keys(sessions).length;
  if (totalSessions === 0) {
    return {
      opened: 0,
      enhanced: 0,
      accepted: 0,
      copied: 0,
      openedRate: 0,
      enhancedRate: 0,
      acceptedRate: 0,
      copiedRate: 0,
    };
  }

  // Count sessions at each funnel stage
  let opened = 0;
  let enhanced = 0;
  let accepted = 0;
  let copied = 0;

  Object.values(sessions).forEach((eventSet) => {
    if (eventSet.has("extension_opened")) opened++;
    if (eventSet.has("button_enhance_clicked")) enhanced++;
    if (eventSet.has("popup_accept_button_clicked")) accepted++;
    if (
      eventSet.has("extension_copy_improved_button_clicked") ||
      eventSet.has("popup_copy_button_clicked")
    )
      copied++;
  });

  return {
    opened,
    enhanced,
    accepted,
    copied,
    openedRate: (opened / totalSessions) * 100,
    enhancedRate: opened > 0 ? (enhanced / opened) * 100 : 0,
    acceptedRate: enhanced > 0 ? (accepted / enhanced) * 100 : 0,
    copiedRate: accepted > 0 ? (copied / accepted) * 100 : 0,
  };
}

/**
 * Get event breakdown for visualization
 * @param {Array} events - Array of PostHog event objects
 * @returns {Array} Event breakdown with name and count
 */
export function getEventBreakdown(events) {
  const filtered = filterExtensionEvents(events);
  const eventCounts = {};

  filtered.forEach((event) => {
    eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
  });

  return Object.entries(eventCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
