"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnalyticsData } from "@/types/analytics";

interface ExportActionProps {
  data: AnalyticsData | null;
}

export function ExportAction({ data }: ExportActionProps) {
  const handlePrint = () => {
    // Navigate to report page or just print window
    // Assuming report page is at /report or we just window.print() if on report page
    // For now, let's just trigger window.print() if the user is ok with current view,
    // OR ideally navigate to a report view.
    // The user mentioned "Report PDF was already made", likely referring to `report/page.tsx`
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;

    // Flatten data for CSV
    // We'll create a simple CSV with key metrics for now
    // Or if we have a list of prompts, export that.
    // Based on AnalyticsData structure, we have aggregates.
    // Let's export the "Detailed Metrics" and "Time Analysis" as separate sections or just one summary.

    // Actually, user said "export as csv button for all the data that is being used in the chart"
    // Let's look at `timeAnalysis` or `distributions` which are array data.

    const rows = [
      ["Metric", "Value"],
      ["Total Prompts", data.metrics.total],
      ["Enhanced Prompts", data.metrics.enhanced],
      ["Enhancement Rate", `${data.metrics.enhancementRate}%`],
      ["Time Saved (Hours)", data.metrics.totalTimeSavedHours],
      ["", ""],
      ["Daily Activity (Date)", "Prompts"],
      ...data.timeAnalysis.dailyActivity.map((d) => [d.date, d.prompts]),
      ["", ""],
      ["Mode Distribution", "Count"],
      ...data.distributions.mode.map((d) => [d.name, d.count]),
      ["", ""],
      ["Complexity Distribution", "Count"],
      ...data.distributions.complexity.map((d) => [d.name, d.count]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `velocity_analytics_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportCSV}>
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      {/* Optional PDF Button if needing explicit separate action */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrint}
        title="Print / Save PDF"
      >
        <Printer className="h-4 w-4" />
      </Button>
    </div>
  );
}
