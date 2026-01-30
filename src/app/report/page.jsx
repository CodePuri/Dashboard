// import { ReportView } from "@/components/report-view";
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

  return (
    <div className="min-h-screen bg-white text-black p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Report Page</h1>
          <p className="text-gray-500">Reports are temporarily disabled.</p>
        </div>
      </div>
    </div>
  );
}
