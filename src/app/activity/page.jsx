"use client";

import { useState } from "react";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
} from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Zap, Clock, Users, BarChart2 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const chartConfig = {
  prompts: {
    label: "Prompts",
    color: COLORS.primary,
  },
  users: {
    label: "Active Users",
    color: COLORS.secondary,
  },
  count: {
    label: "Count",
    color: COLORS.primary,
  },
};

export default function ActivityPage() {
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
              Activity
            </h1>
            <p className="text-muted-foreground">Loading activity data...</p>
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
  const timeAnalysis = data?.timeAnalysis;
  const growth = data?.growth;

  const promptsPerUser = growth?.activeUsers
    ? (metrics?.total || 0) / growth.activeUsers
    : 0;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Activity
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Usage patterns and session analytics
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

      {/* Metric Cards */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Activity Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Prompts"
            value={(metrics?.total || 0).toLocaleString()}
            subtitle={`${(metrics?.enhancementRate || 0).toFixed(1)}% enhanced`}
            icon={BarChart2}
            color={COLORS.primary}
            tooltip="Total number of prompts submitted in the selected period"
          />
          <MetricCard
            title="Active Users"
            value={(growth?.activeUsers || 0).toLocaleString()}
            subtitle="Unique users"
            icon={Users}
            color={COLORS.info}
            tooltip="Unique users who submitted at least one prompt in the selected period"
          />
          <MetricCard
            title="Peak Daily Usage"
            value={(growth?.intensity || 0).toFixed(1)}
            subtitle="Avg Max Prompts"
            icon={Zap}
            color={COLORS.warning}
            tooltip="Average of users' maximum daily prompt count (Peak Usage)"
          />
          <MetricCard
            title="Avg Processing"
            value={`${((metrics?.avgProcessingTime || 0) / 1000).toFixed(2)}s`}
            subtitle="Per enhancement"
            icon={Clock}
            color={COLORS.secondary}
            tooltip="Average time taken to enhance each prompt"
          />
        </div>
      </section>

      {/* Charts */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Time Analysis
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <ChartCard title="Daily Activity" tooltip="Prompts processed per day">
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <AreaChart data={timeAnalysis?.dailyActivity || []}>
                <defs>
                  <linearGradient
                    id="colorPromptsDaily"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={COLORS.primary}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={COLORS.primary}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => format(new Date(value), "MMM d")}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="prompts"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPromptsDaily)"
                />
              </AreaChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="By Day of Week"
            tooltip="Activity distribution by weekday"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <BarChart data={timeAnalysis?.dayOfWeek || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill={COLORS.primary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="Activity by Time of Day"
            tooltip="Morning (6-12), Afternoon (12-18), Evening (18-24), Night (0-6)"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <BarChart data={timeAnalysis?.timePeriod || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill={COLORS.warning}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
