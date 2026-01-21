"use client";

import { useState } from "react";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
} from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Clock, Zap, TrendingUp, Timer } from "lucide-react";
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

export default function ROIPage() {
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
              Value / ROI
            </h1>
            <p className="text-muted-foreground">Loading value metrics...</p>
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
  const distributions = data?.distributions;

  const timeSavedHours = metrics?.totalTimeSavedHours || 0;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Value / ROI
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Measuring the impact and value created by Velocity
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

      {/* Key Value Metrics */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Value & Key Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Time Saved"
            value={`${timeSavedHours.toFixed(1)}h`}
            subtitle="Estimated hours"
            icon={Clock}
            color={COLORS.secondary}
            tooltip="Estimated hours saved by enhancements based on words added"
          />
          <MetricCard
            title="Enhancement"
            value={`${(metrics?.enhancementRate || 0).toFixed(1)}%`}
            subtitle="Success rate"
            icon={Zap}
            color={COLORS.success}
            tooltip="% of prompts successfully enhanced"
          />
          <MetricCard
            title="Expansion Ratio"
            value={`${(insights?.expansionRatio || 0).toFixed(1)}x`}
            subtitle={`${(insights?.avgUserWords || 0).toFixed(0)} → ${(insights?.avgEnhancedWords || 0).toFixed(0)} words`}
            icon={TrendingUp}
            color={COLORS.secondary}
            tooltip="How much prompts are expanded"
          />
          <MetricCard
            title="Avg Processing"
            value={`${((metrics?.avgProcessingTime || 0) / 1000).toFixed(2)}s`}
            subtitle="Per prompt"
            icon={Timer}
            color={COLORS.warning}
            tooltip="Average time to process a prompt"
          />
        </div>
      </section>

      {/* Deep Insights -> Productivity Impact */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Productivity Impact
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <ChartCard
            title="Word Count Expansion"
            tooltip="Average word count comparison"
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

          <ChartCard
            title="Mode Distribution"
            tooltip="Enhancement mode breakdown"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[180px] sm:h-[200px] md:h-[220px] w-full"
            >
              <BarChart data={distributions?.mode || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(distributions?.mode || []).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </section>

      {/* LLM Distribution (Target AI Platforms) */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Target AI Platforms
        </h2>
        <ChartCard
          title="LLM Distribution"
          tooltip="Breakdown of which AI models users are targeting"
        >
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={distributions?.llm || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                fill={COLORS.primary}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </section>
    </div>
  );
}
