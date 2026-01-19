"use client";

import { useState } from "react";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
} from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { Skeleton } from "@/components/ui/skeleton";
import type { DateFilterOption, SourceFilterOption } from "@/types/analytics";
import { ExportAction } from "@/components/export-action";

const chartConfig = {
  count: {
    label: "Count",
    color: COLORS.secondary,
  },
} satisfies ChartConfig;

export default function ConversionPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState<SourceFilterOption>("All");
  const { data, isLoading } = useAnalyticsData(dateFilter, sourceFilter);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Conversion
            </h1>
            <p className="text-muted-foreground">Loading...</p>
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
  const distributions = data?.distributions;
  const enhancementRate = metrics?.enhancementRate || 0;
  const refineRate = metrics?.refineRate || 0;

  const funnelData = [
    {
      name: "Total Prompts",
      count: metrics?.total || 0,
      color: COLORS.secondary,
    },
    { name: "Enhanced", count: metrics?.enhanced || 0, color: COLORS.success },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Conversion
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Who takes action and completes key goals
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          <FilterBar
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
          />
          <ExportAction data={data} />
        </div>
      </div>

      {/* Metrics */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Conversion Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Enhancement Rate"
            value={`${enhancementRate.toFixed(1)}%`}
            subtitle="Success rate"
            icon={Target}
            color={COLORS.success}
            tooltip="Percentage of prompts successfully enhanced"
          />
          <MetricCard
            title="Refine Rate"
            value={`${refineRate.toFixed(1)}%`}
            subtitle="Enhanced → Refined"
            icon={TrendingUp}
            color={COLORS.info}
            tooltip="Percentage of enhanced prompts refined by users"
          />
          <MetricCard
            title="Total Enhanced"
            value={(metrics?.enhanced || 0).toLocaleString()}
            subtitle="Completed"
            icon={CheckCircle}
            color={COLORS.primary}
            tooltip="Total successfully enhanced prompts"
          />
          <MetricCard
            title="Failure Rate"
            value={`${(metrics?.failureRate || 0).toFixed(1)}%`}
            subtitle="Did not complete"
            icon={AlertCircle}
            color={COLORS.danger}
            tooltip="Percentage of prompts that failed to enhance"
          />
        </div>
      </section>

      {/* Growth & Monetization */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Growth & Monetization
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Opportunity Metrics */}
          <div className="grid gap-4 grid-cols-1 lg:col-span-1">
            <MetricCard
              title="Onboarding Completion"
              value={`${((data as any)?.conversion?.activationRate || 0).toFixed(1)}%`}
              subtitle={`${(data as any)?.conversion?.activatedUsers || 0} users completed`}
              icon={CheckCircle}
              color={COLORS.success}
              tooltip="Users who completed the onboarding setup flow"
            />
            <MetricCard
              title="Upgrade Candidates"
              value={(
                (data as any)?.conversion?.potentialPaidUsers || 0
              ).toLocaleString()}
              subtitle="High Value Free Users"
              icon={TrendingUp}
              color={COLORS.warning}
              tooltip="Free tier users with > 20 prompts (Power Users)"
            />
          </div>

          <div className="lg:col-span-2">
            <ChartCard
              title="Signup Sources"
              tooltip="User acquisition channels"
            >
              <ChartContainer
                config={chartConfig}
                className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
              >
                <BarChart
                  data={(distributions as any)?.signupSources || []}
                  layout="vertical"
                  margin={{ left: 0, right: 30, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill={COLORS.primary}
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ChartContainer>
            </ChartCard>
          </div>
        </div>
      </section>
    </div>
  );
}
