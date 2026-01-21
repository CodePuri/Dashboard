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

export function ExportAction({ data }) {
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;

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
      ["LLM Distribution", "Count"],
      ...data.distributions.llm.map((d) => [d.name, d.count]),
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
