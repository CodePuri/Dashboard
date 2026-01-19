import { NextResponse } from "next/server";
import { getUserAttritionData } from "@/lib/db";

// Metrics logic here to keep DB logic pure
function processAttrition(rawData: any[]) {
  const now = new Date();
  // IST adjustment for "now" isn't strictly necessary if comparing relative days,
  // but consistency is good. rawData times are likely UTC strings.

  const processed = rawData.map((user: any) => {
    const lastActive = new Date(user.last_active);
    const firstActive = new Date(user.first_active);

    // Days since last active (Churn detector)
    const daysSinceLastActive =
      (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);

    // Lifespan (Days)
    const lifespanDays =
      (lastActive.getTime() - firstActive.getTime()) / (1000 * 60 * 60 * 24);

    // Churned status: inactive for > 30 days
    const isChurned = daysSinceLastActive > 30;

    // Success status of last prompt
    // If enhanced_prompt is null or empty, it failed.
    const lastStatus =
      user.last_enhanced_prompt && user.last_enhanced_prompt.length > 0
        ? "Success"
        : "Failure";

    return {
      userId: String(user.user_id || ""),
      promptCount: Number(user.total_prompts),
      daysSinceLastActive,
      lifespanDays: Math.max(0, lifespanDays), // Prevent negative if clocks distinct
      isChurned,
      lastIntent: user.last_intent || "Unknown",
      lastMode: user.last_mode || "Standard",
      lastStatus,
    };
  });

  return processed;
}

// Helper to calculate date ranges (Duplicated from analytics route for now)
// Ideally move to shared lib
function getDateRange(filter: string): {
  startDate: Date | null;
  endDate: Date | null;
} {
  const now = new Date();

  // Create dates in IST (UTC+5:30)
  // We want "Today" to range from 00:00:00 IST to 23:59:59 IST
  const getISTDate = (d: Date) => {
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 5.5);
  };

  // Helper to set time to end of day
  const endOfDay = (d: Date) => {
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const startOfDay = (d: Date) => {
    d.setHours(0, 0, 0, 0);
    return d;
  };

  let startDate = new Date(); // Defaults
  let endDate = new Date();

  // Reset to start/end of current day in local/server time (approximation if not using strict IST lib)
  // For simplicity in this route, we will use standard Date manipulation relative to now
  // Assuming server time or UTC.

  endDate = endOfDay(new Date());

  switch (filter) {
    case "Today":
      startDate = startOfDay(new Date());
      break;
    case "Yesterday":
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 1)));
      endDate = endOfDay(new Date(startDate));
      break;
    case "Last 7 Days":
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 7)));
      break;
    case "Last 30 Days":
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 30)));
      break;
    case "This Month":
      startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      break;
    case "Last Month":
      startDate = startOfDay(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
      );
      endDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    case "Last 3 Months":
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 90)));
      break;
    case "All Time":
      return { startDate: null, endDate: null };
    default:
      // Default to Last 30 Days if unknown
      startDate = startOfDay(new Date(now.setDate(now.getDate() - 30)));
  }

  return { startDate, endDate };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get("date") || "All Time"; // Default to All Time for Attrition
    const sourceFilter = (searchParams.get("source") || "All") as
      | "All"
      | "Chat"
      | "Extension";

    const { startDate, endDate } = getDateRange(dateFilter);

    // If "All Time" is explicitly requested or default, we pass nulls
    const rawData = await getUserAttritionData(
      startDate,
      endDate,
      sourceFilter,
    );
    const data = processAttrition(rawData);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Attrition API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch attrition data" },
      { status: 500 },
    );
  }
}
