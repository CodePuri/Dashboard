import { NextResponse } from "next/server";

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;

/**
 * GET /api/posthog
 * Fetches PostHog data using HogQL for accuracy and performance
 */
export async function GET(request) {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    return NextResponse.json(
      {
        success: false,
        error:
          "PostHog configuration missing (POSTHOG_API_KEY or POSTHOG_PROJECT_ID)",
      },
      { status: 503 },
    );
  }

  const after = request.nextUrl.searchParams.get("after");
  const before = request.nextUrl.searchParams.get("before");
  const limit = request.nextUrl.searchParams.get("limit") || "10000";
  const source = request.nextUrl.searchParams.get("source");

  // Format dates for HogQL safely
  const formatHogQLDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toISOString().replace("T", " ").replace("Z", "");
    } catch (e) {
      return null;
    }
  };

  const dateFrom = formatHogQLDate(after);
  const dateTo = formatHogQLDate(before);

  // Define event filters
  const extensionEvents = [
    // API Events (Backend Operations)
    "api_enhance_error",
    "api_enhance_request",
    "api_enhance_response",

    // Button Events (Injected Button)
    "button_dropdown_option_selected",
    "button_dropdown_toggled",
    "button_enhance_clicked",
    "button_get_pro_clicked",

    // Extension Events (Browser Popup)
    "extension_copy_improved_button_clicked",
    "extension_dropdown_option_selected",
    "extension_dropdown_toggled",
    "extension_get_pro_badge_clicked",
    "extension_improved_dislike_button_clicked",
    "extension_improved_like_button_clicked",
    "extension_insert_button_clicked",
    "extension_login_button_clicked",
    "extension_memory_button_clicked",
    "extension_opened",
    "extension_post_login_upgrade_modal_shown",
    "extension_post_login_upgrade_pro_clicked",
    "extension_profile_button_clicked",
    "extension_send_button_clicked",
    "extension_settings_button_clicked",
    "extension_settings_cancel_clicked",
    "extension_settings_personality_dropdown_toggled",
    "extension_settings_refresh_traits_clicked",
    "extension_settings_save_clicked",
    "extension_signup_button_clicked",
    "extension_snooze_button_clicked",
    "extension_snooze_option_selected",
    "extension_theme_toggle_clicked",
    "extension_toggle_blocked",
    "extension_toggle_clicked",
    "extension_trial_activation_failed",
    "extension_trial_activation_started",
    "extension_trial_activated_successfully",
    "extension_trial_ended_modal_shown",
    "extension_try_free_trial_button_clicked",
    "extension_upgrade_button_clicked",
    "extension_user_dropdown_hovered",
    "extension_user_dropdown_option_selected",

    // Popup Events (Overlay Window)
    "popup_accept_button_clicked",
    "popup_analysis_refine_button_clicked",
    "popup_close_button_clicked",
    "popup_closed",
    "popup_copy_button_clicked",
    "popup_dislike_button_clicked",
    "popup_like_button_clicked",
    "popup_opened",
    "popup_premium_popup_close_button_clicked",
    "popup_refine_button_clicked",
    "popup_refine_option_selected",
    "popup_tab_clicked",
    "popup_upgrade_button_clicked",

    // Tracking Events
  ];

  const landerEvents = [
    // Page Views
    "Home Page Viewed",
    "Login Page Viewed",
    "About Us Page Viewed",
    "Pricing Page Viewed",

    // Navigation
    "Navbar Logo Clicked",
    "Navbar Sign Up Clicked",
    "Navbar Pricing Link Clicked",

    // Engagement
    "FAQ Toggled",
    "Video Played",
    "CTA Button Clicked",
    "Prompt Submitted",

    // Pricing
    "Pricing Plan Selected",
    "Pricing Subscribe Clicked",
    "Pricing Subscription Checkout Cancelled",

    // Onboarding
    "Onboarding Step 1 Completed",
    "Onboarding Step 2 Completed",
    "Onboarding Step 3 Completed",
    "Onboarding Step 4 Completed",
    "Onboarding Step 5 Completed",
    "Onboarding Completed",

    // Footer
    "Footer Page/Link Clicked",

    // Auth
    "User Login",
  ];

  const chatEvents = [
    // Page & Session
    "Chat Page Viewed",
    "Session Started / Ended",

    // Prompt Interactions
    "Prompt Sent",
    "Prompt Refined",
    "Refine Action",
    "Refine Suggestion Clicked",
    "Suggestion Clicked",

    // API Events
    "api_enhance_request",
    "api_enhance_response",
    "api_enhance_error",

    // User Actions
    "Message Copied",
    "Open in Platform Selected",
    "Mobile Sidebar Toggled",
    "Public Popup Opened/Closed",
    "Install Clicked",

    // Navigation
    "User Profile Page Viewed",
    "extension_settings_save_clicked",
    "User Logout",
  ];

  const extensionFilter = `event IN (${extensionEvents.map((e) => `'${e}'`).join(", ")})`;
  const chatFilter = `event IN (${chatEvents.map((e) => `'${e}'`).join(", ")})`;
  const landerFilter = `event IN (${landerEvents.map((e) => `'${e}'`).join(", ")})`;

  // Helper to build the WHERE clause based on available dates and source filter
  const whereClause = (() => {
    const conditions = [];
    // Hardcoded project start date to exclude stray test data from early development
    const PROJECT_START_DATE = "2026-01-01 00:00:00";
    if (!dateFrom || new Date(dateFrom) < new Date(PROJECT_START_DATE)) {
      conditions.push(`timestamp >= '${PROJECT_START_DATE}'`);
    } else {
      conditions.push(`timestamp >= '${dateFrom}'`);
    }

    if (dateTo) conditions.push(`timestamp <= '${dateTo}'`);

    // ... source-based conditions ...

    if (source === "Extension") {
      conditions.push(extensionFilter);
    } else if (source === "Chat") {
      conditions.push(chatFilter);
    } else if (source === "Lander") {
      // Show only lander-specific events
      conditions.push(landerFilter);
    } else if (source === "ExtensionInteraction") {
      // Strict filter for the 11 core extension events
      const coreEvents = [
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
        // Additional events requested
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
      conditions.push(
        `event IN (${coreEvents.map((e) => `'${e}'`).join(", ")})`,
      );
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  })();

  try {
    // 1. Fetch Summary Stats using HogQL
    // We get total count, unique event types count, and top 20 events in one go
    const statsQuery = {
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT 
            count() as total_count,
            count(DISTINCT event) as unique_types
          FROM events 
          ${whereClause}
        `,
      },
    };

    // 2. Fetch Events Over Time
    const timelineQuery = {
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT 
            toStartOfDay(timestamp) as date,
            count() as count
          FROM events 
          ${whereClause}
          GROUP BY date
          ORDER BY date ASC
        `,
      },
    };

    // 3. Fetch Event Breakdown
    const breakdownQuery = {
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT 
            event,
            count() as count
          FROM events 
          ${whereClause}
          GROUP BY event
          ORDER BY count DESC
          LIMIT 500
        `,
      },
    };

    // 4. Fetch Raw Events using HogQL for consistency
    const eventsQuery = {
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT 
            event,
            timestamp,
            distinct_id,
            properties
          FROM events 
          ${whereClause}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `,
      },
    };

    // Execute queries in parallel
    console.log("Executing PostHog HogQL Queries:", {
      source: source || "All",
      after,
      before,
      where: whereClause,
    });

    const [statsRes, timelineRes, breakdownRes, eventsRes] = await Promise.all([
      posthogQuery(statsQuery),
      posthogQuery(timelineQuery),
      posthogQuery(breakdownQuery),
      posthogQuery(eventsQuery),
    ]);

    // Check for errors
    const checkRes = async (res, name) => {
      if (!res.ok) {
        const error = await res.text();
        console.error(`PostHog API Error (${name}):`, {
          status: res.status,
          error,
        });
      }
    };

    await Promise.all([
      checkRes(statsRes, "Stats"),
      checkRes(timelineRes, "Timeline"),
      checkRes(breakdownRes, "Breakdown"),
      checkRes(eventsRes, "Events"),
    ]);

    const statsData = await statsRes.json();
    const timelineData = await timelineRes.json();
    const breakdownData = await breakdownRes.json();
    const eventsData = await eventsRes.json();

    // Process responses
    const totalEvents = statsData.results?.[0]?.[0] || 0;
    const uniqueEventTypes = statsData.results?.[0]?.[1] || 0;

    const eventsOverTime = (timelineData.results || []).map((row) => ({
      date: row[0] ? String(row[0]).split(/[ T]/)[0] : row[0], // Handle 'YYYY-MM-DD HH:mm:ss' or 'YYYY-MM-DDTHH:mm:ssZ'
      count: row[1],
    }));

    const eventBreakdown = (breakdownData.results || []).map((row) => ({
      name: row[0],
      count: row[1],
    }));

    // Map HogQL results back to original PostHog event objects
    const events = (eventsData.results || []).map((row) => ({
      event: row[0],
      timestamp: row[1],
      distinct_id: row[2],
      properties: typeof row[3] === "string" ? JSON.parse(row[3]) : row[3],
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalEvents,
        uniqueEventTypes,
        eventsOverTime,
        eventBreakdown,
        events: events, // Limit is already applied in HogQL
        hasMore: totalEvents > Number(limit),
        fetchedEvents: events.length,
        projectId: POSTHOG_PROJECT_ID,
      },
    });
  } catch (err) {
    console.error("PostHog API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "PostHog request failed" },
      { status: 500 },
    );
  }
}

async function posthogQuery(queryBody) {
  return fetch(
    `https://app.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryBody),
    },
  );
}
