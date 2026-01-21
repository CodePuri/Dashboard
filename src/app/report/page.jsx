import { ReportView } from "@/components/report-view";
import { getAnalyticsData } from "@/lib/db";
import { processData } from "@/lib/analytics-utils";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Default to last 30 days for report

  let processedData = null;
  try {
    const rawData = await getAnalyticsData(startDate, new Date());
    processedData = processData(rawData);
  } catch (error) {
    console.error("Report Fetch Error:", error);
    return <div>Error loading report data.</div>;
  }

  return <ReportView data={processedData} />;
}
