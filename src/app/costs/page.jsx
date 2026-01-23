"use client";

import { useState } from "react";
import { FilterBar } from "@/components/ui/filter-bar";

export default function CostsPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Costs
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Track infrastructure costs, API usage, and operational expenses
          </p>
        </div>
        <FilterBar
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          customDateRange={customDateRange}
          onCustomDateChange={setCustomDateRange}
        />
      </div>

      {/* Content */}
      <div className="min-h-[500px]">{/* Blank content */}</div>
    </div>
  );
}
