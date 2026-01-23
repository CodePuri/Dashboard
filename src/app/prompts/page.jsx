"use client";

import { useState } from "react";
import { MetricCard, ChartCard, COLORS } from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { TrendingUp, Timer, MessageSquare } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  count: {
    label: "Count",
    color: COLORS.primary,
  },
};

export default function PromptsPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  const { data, isLoading } = useAnalyticsData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Prompts
            </h1>
            <p className="text-muted-foreground">Loading metrics...</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;
  const insights = data?.insights;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Prompts
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Detailed breakdown of prompt enhancement and processing
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

      {/* Metrics */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Key Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Expansion Ratio"
            value={`${(insights?.expansionRatio || 0).toFixed(1)}x`}
            subtitle={`${(insights?.avgUserWords || 0).toFixed(0)} → ${(insights?.avgEnhancedWords || 0).toFixed(0)} words`}
            icon={TrendingUp}
            color={COLORS.secondary}
            tooltip="How much prompts are expanded during enhancement"
          />
          <MetricCard
            title="Avg Processing"
            value={`${((metrics?.avgProcessingTime || 0) / 1000).toFixed(2)}s`}
            subtitle="Per prompt"
            icon={Timer}
            color={COLORS.warning}
            tooltip="Average time (in seconds) to process a prompt"
          />
        </div>
      </section>

      {/* Charts */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Expansion Analysis
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <ChartCard
            title="Word Count Expansion"
            tooltip="Comparison of average word count before and after enhancement"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[180px] sm:h-[200px] md:h-[220px] w-full"
            >
              <BarChart
                data={[
                  { name: "User Input", count: insights?.avgUserWords || 0 },
                  { name: "Enhanced", count: insights?.avgEnhancedWords || 0 },
                ]}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  <Cell fill="#94a3b8" />
                  <Cell fill={COLORS.success} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
