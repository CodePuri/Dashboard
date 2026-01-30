"use client";

import { useState } from "react";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
  SparklineV2,
  DetailedChartV2,
} from "@/components/ui/metric-card";
import { Eye, Clock, Users } from "lucide-react";
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
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/ui/filter-bar";
import { format } from "date-fns";

const chartConfig = {
  sessions: {
    label: "Total Sessions",
    color: COLORS.primary,
  },
  unique: {
    label: "Unique Users",
    color: COLORS.info,
  },
};

const peakChartConfig = {
  sessions: {
    label: "Activity Volume",
    color: COLORS.warning,
  },
};

export default function ReachPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  const { data, isLoading } = useAnalyticsData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Reach</h1>
          <p className="text-muted-foreground">
            Loading reach and traffic data...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Map Data
  const totalSessions = data.metrics.total;
  const totalUnique = data.metrics.uniqueUsers;
  const avgProcessing =
    (data.metrics.avgProcessingTime / 1000).toFixed(2) + "s";

  const dailyData = data.timeAnalysis.dailyActivity.map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    sessions: d.prompts,
    unique: d.users,
  }));

  const peakHoursData = data.timeAnalysis.timePeriod.map((d) => ({
    hour: d.name,
    sessions: d.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reach</h1>
          <p className="text-muted-foreground">
            Traffic volume and user attribution insights
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Interactions"
          value={totalSessions.toLocaleString()}
          subtitle={`Across ${totalUnique} users`}
          icon={Eye}
          color={COLORS.primary}
          tooltip="Total volume of interactions in the period"
          chart={
            <SparklineV2
              data={dailyData.map((d) => ({ date: d.date, value: d.sessions }))}
              dataKey="value"
              color={COLORS.primary}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={dailyData.map((d) => ({ date: d.date, value: d.sessions }))}
              dataKey="value"
              color={COLORS.primary}
              title="Interaction Trend"
            />
          }
        />

        <MetricCard
          title="Unique Users"
          value={totalUnique.toLocaleString()}
          subtitle="Distinct individuals"
          icon={Users}
          color={COLORS.info}
          tooltip="Count of unique users active in the period"
          chart={
            <SparklineV2
              data={dailyData.map((d) => ({ date: d.date, value: d.unique }))}
              dataKey="value"
              color={COLORS.info}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={dailyData.map((d) => ({ date: d.date, value: d.unique }))}
              dataKey="value"
              color={COLORS.info}
              title="User Trend"
            />
          }
        />

        <MetricCard
          title="Avg. Latency"
          value={avgProcessing}
          subtitle="Processing speed"
          icon={Clock}
          color={COLORS.secondary}
          tooltip="Average time taken to process requests"
          chart={
            <SparklineV2
              data={data.timeAnalysis.dailyActivity.map((d) => ({
                date: d.date,
                value: d.avgProcessingTime || 0,
              }))}
              dataKey="value"
              color={COLORS.secondary}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={data.timeAnalysis.dailyActivity.map((d) => ({
                date: d.date,
                value: d.avgProcessingTime || 0,
              }))}
              dataKey="value"
              color={COLORS.secondary}
              title="Daily Avg. Latency (s)"
            />
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Traffic Trends" tooltip="Volume vs Reach over time">
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={COLORS.primary}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={COLORS.primary}
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillUnique" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.8} />
                  <stop
                    offset="95%"
                    stopColor={COLORS.info}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke={COLORS.primary}
                fill="url(#fillSessions)"
                strokeWidth={2}
                name="Interactions"
              />
              <Area
                type="monotone"
                dataKey="unique"
                stroke={COLORS.info}
                fill="url(#fillUnique)"
                strokeWidth={2}
                name="Users"
              />
            </AreaChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Peak Activity Times"
          tooltip="Distribution by time of day"
        >
          <ChartContainer config={peakChartConfig} className="h-[300px] w-full">
            <BarChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="sessions"
                fill={COLORS.warning}
                radius={[4, 4, 0, 0]}
                name="Interactions"
              />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      {/* Attribution Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Traffic Origins"
          tooltip="Where your users are coming from"
        >
          <ChartContainer
            config={{
              count: { label: "Users", color: "hsl(var(--chart-1))" },
            }}
            className="h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={data.distributions.signupSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="name"
                >
                  {data.distributions.signupSources.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </RechartsPie>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {data.distributions.signupSources.map((source, i) => (
              <div key={source.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {source.name} ({source.count})
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
