import { NextResponse } from "next/server";
import { getUsageBehaviorData } from "@/lib/db";
import { processUsageData } from "@/lib/usage";
import { TEST_USER_IDS } from "@/lib/constants";

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const sourceStr = searchParams.get("source");

    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;
    const source = ["All", "Chat", "Extension"].includes(sourceStr || "")
      ? sourceStr
      : "All";

    const rawData = await getUsageBehaviorData(
      startDate,
      endDate,
      source,
      TEST_USER_IDS,
    );
    const processed = processUsageData(rawData, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: processed,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
