import { ReportView } from "@/components/report-view";
import { getAnalyticsData } from "@/lib/db";
import { processData } from "@/lib/analytics-utils";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Default to last 30 days for report

  let processedData = null;
  try {
    const end = new Date();
    const rawData = await getAnalyticsData(startDate, end);
    processedData = processData(rawData, [], [], startDate, end, null);
  } catch (error) {
    console.error("Report Fetch Error:", error);
    return <div>Error loading report data.</div>;
  }

  return <ReportView data={processedData} />;
}
