"use client";

import { useState } from "react";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
  SparklineV2,
  DetailedChartV2,
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  count: {
    label: "Count",
    color: COLORS.secondary,
  },
  Free: {
    label: "Free",
    color: "#fcd34d", // Amber 300
  },
  Freetrial: {
    label: "Free Trial",
    color: "#fb923c", // Orange 400
  },
  Pro: {
    label: "Pro",
    color: "#f87171", // Red 400
  },
};

const SEGMENT_COLORS = {
  Free: "#fcd34d", // Amber
  Freetrial: "#fb923c", // Orange
  Pro: "#f87171", // Red
};

export default function ConversionPage() {
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
              Funnel
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
  const dailyActivity = data?.timeAnalysis?.dailyActivity || [];
  const dailyInstallationMetrics = data?.dailyInstallationMetrics || [];
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
            Funnel
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            User onboarding and monetization opportunities
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          <FilterBar
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            customDateRange={customDateRange}
            onCustomDateChange={setCustomDateRange}
          />
        </div>
      </div>

      {/* Metrics
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
            tooltip="Enhancement Success Rate (%). Calculated as (Total Enhanced Prompts / Total Prompts Submitted) * 100."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="enhancementRate"
                  color={COLORS.success}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="enhancementRate"
                  color={COLORS.success}
                  title="Daily Enhancement Success Rate (%)"
                />
              ) : null
            }
          />
          <MetricCard
            title="Refine Rate"
            value={`${refineRate.toFixed(1)}%`}
            subtitle="Enhanced → Refined"
            icon={TrendingUp}
            color={COLORS.info}
            tooltip="Refinement Rate (%). Calculated as (Count of Refined Prompts / Total Enhanced Prompts) * 100."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="refineRate"
                  color={COLORS.info}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="refineRate"
                  color={COLORS.info}
                  title="Daily Refinement Rate (%)"
                />
              ) : null
            }
          />
          <MetricCard
            title="Total Enhanced"
            value={(metrics?.enhanced || 0).toLocaleString()}
            subtitle="Completed"
            icon={CheckCircle}
            color={COLORS.primary}
            tooltip="Total Enhanced Prompts (Count). The total number of prompts where enhanced_prompt is not null."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="prompts"
                  color={COLORS.primary}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="prompts"
                  color={COLORS.primary}
                  title="Daily Prompt Volume (Completed)"
                />
              ) : null
            }
          />
          <MetricCard
            title="Failure Rate"
            value={`${(metrics?.failureRate || 0).toFixed(1)}%`}
            subtitle="Did not complete"
            icon={AlertCircle}
            color={COLORS.danger}
            tooltip="Failure Rate (%). Calculated as (Failed Enhancements / Total Prompts) * 100."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="prompts"
                  color={COLORS.danger}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="prompts"
                  color={COLORS.danger}
                  title="Daily Failure Volume Trend"
                />
              ) : null
            }
          />
        </div>
      </section>
      */}

      {/* Growth & Monetization */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Growth & Monetization
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 items-start">
          {/* Opportunity Metrics */}
          <MetricCard
            title="Onboarding Completion"
            value={`${(data?.conversion?.onboardingCompletionRate || 0).toFixed(1)}%`}
            subtitle={`${data?.conversion?.activatedUsers || 0} users completed`}
            icon={CheckCircle}
            color={COLORS.success}
            tooltip="Activation Rate (%). Percentage of signups found in the onboarding_data table."
            chart={
              dailyInstallationMetrics.length > 0 ? (
                <SparklineV2
                  data={dailyInstallationMetrics}
                  dataKey="signups"
                  color={COLORS.success}
                />
              ) : null
            }
            detailedChart={
              dailyInstallationMetrics.length > 0 ? (
                <DetailedChartV2
                  data={dailyInstallationMetrics}
                  dataKey="signups"
                  color={COLORS.success}
                  title="Daily Signups"
                />
              ) : null
            }
          />

          <div className="lg:col-span-2">
            <ChartCard
              title="Signup Sources"
              tooltip="Acquisition Channels. Breakdown of new users by the source field in onboarding_data."
            >
              <ChartContainer
                config={chartConfig}
                className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
              >
                <BarChart
                  data={distributions?.signupSources || []}
                  layout="vertical"
                  margin={{ left: 0, right: 30, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    vertical={true}
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
                    fill={chartConfig.count.color}
                    radius={[0, 4, 4, 0]}
                    barSize={32}
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
