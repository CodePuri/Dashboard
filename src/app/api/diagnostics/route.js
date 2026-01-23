import { NextResponse } from "next/server";
import { getDiagnosticsData } from "@/lib/db";

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

    console.log("Fetching diagnostics data...", { startDate, endDate, source });

    const data = await getDiagnosticsData(startDate, endDate, source);

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Diagnostics API error:", errorMessage, error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        data: {
          logs: [],
          stats: {
            total_errors: 0,
            affected_users: 0,
            failing_endpoints: 0,
            error_types_count: 0,
          },
          distributions: { types: [], endpoints: [], timeline: [] },
        },
      },
      { status: 500 },
    );
  }
}
