"use client";

import { useState } from "react";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
  SparklineV2,
  DetailedChartV2,
  RetentionDropOffSparkline,
  RetentionDetailedChart,
} from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Users, Repeat, TrendingUp, UserCheck } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ActiveUsersChart,
  PowerUserBar,
} from "@/components/ui/active-users-chart";
import { useDailyHabitData } from "@/hooks/use-daily-habit-data";

// Custom tooltip for retention drop-off chart
const RetentionTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md border-border/50 min-w-[180px]">
        <div className="text-xs font-semibold text-foreground mb-2">
          {label} Retention
        </div>
        <div className="space-y-1.5">
          {payload.map((entry, index) => {
            // Extract count from the data
            const segment = entry.dataKey;
            const percentage = entry.value;
            // The count data is stored in the payload's payload object
            const countKey = `${segment}Count`;
            const explicitCount = entry.payload[countKey];
            const derivedCount = Math.round(
              (percentage / 100) * (entry.payload.denominator || 0),
            );
            const count =
              explicitCount !== undefined ? explicitCount : derivedCount;

            return (
              <div
                key={`item-${index}`}
                className="flex justify-between items-center text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="capitalize">{segment}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-semibold">
                    {percentage?.toFixed(1) || 0}%
                  </span>
                  {count > 0 && (
                    <span className="text-muted-foreground ml-2">
                      ({count})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between items-center text-xs">
            <span className="font-medium">Total Pool Retention</span>
            <div className="text-right">
              <span className="font-mono font-bold">
                {payload[0]?.payload?.total?.toFixed(1) || 0}%
              </span>
              <span className="text-muted-foreground ml-2">
                ({payload[0]?.payload?.totalCount})
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useAttritionData } from "@/hooks/use-attrition-data";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const chartConfig = {
  users: {
    label: "Active Users",
    color: COLORS.primary,
  },
};

export default function RetentionPage() {
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  const { data, isLoading } = useAnalyticsData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

  const { data: attritionData, isLoading: isAttritionLoading } =
    useAttritionData(dateFilter, sourceFilter, customDateRange);

  const { data: dailyHabitData, isLoading: isDailyHabitLoading } =
    useDailyHabitData(dateFilter, sourceFilter, customDateRange);

  if (isLoading || isAttritionLoading || isDailyHabitLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Retention
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

  const growth = data?.growth;
  const timeAnalysis = data?.timeAnalysis;
  const dailyActivity = timeAnalysis?.dailyActivity || [];
  const insights = data?.insights;
  const metrics = data?.metrics;

  const activeUsersChartData = (data?.activeUsersChartData || []).map((d) => ({
    ...d,
    // Granular fields for dual texture
    freeLt5: d.freeLt5 || 0,
    freeGe5: d.freeGe5 || 0,
    trialLt5: d.trialLt5 || 0,
    trialGe5: d.trialGe5 || 0,
    proLt5: d.proLt5 || 0,
    proGe5: d.proGe5 || 0,
  }));

  const dailyHabitTrendData = dailyHabitData?.dailyTrend || [];
  const dailyHabitUsers = dailyHabitData?.dailyHabitUsers || 0;

  const retentionRate = growth?.retentionRate || 0;
  const stickiness =
    growth?.activeUsers && growth.activeUsers > 0
      ? (growth.dailyHabitUsers / growth.activeUsers) * 100
      : 0;

  // Calculate daily stickiness trend (DAU / MAU)
  const stickinessTrend = dailyActivity.map((day) => ({
    ...day,
    stickiness:
      growth?.activeUsers > 0
        ? ((day.users || 0) / growth.activeUsers) * 100
        : 0,
  }));

  const totalUsers = attritionData?.list?.length || 0;
  const churnedUsers = attritionData?.list?.filter((u) => u.isChurned) || [];
  const churnRate =
    totalUsers > 0 ? (churnedUsers.length / totalUsers) * 100 : 0;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Retention
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Who comes back and how often
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
          Retention Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Retention Rate"
            value={`${(metrics?.retentionMetrics?.d1 || 0).toFixed(1)}%`}
            subtitle="D1 Retention"
            icon={Repeat}
            color={COLORS.primary}
            tooltip="Retention Rate (%). Percentage of unique users who were active on Day 1 after their first active date. The chart shows Day 1, Day 3, and Day 7 retention."
            chart={
              <RetentionDropOffSparkline
                data={[
                  {
                    name: "D1",
                    val: metrics?.retentionMetrics?.d1 || 0,
                    Free: metrics?.retentionMetrics?.bySegment?.d1?.Free || 0,
                    FreeCount:
                      metrics?.retentionMetrics?.bySegment?.d1?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d1?.Freetrial || 0,
                    FreetrialCount:
                      metrics?.retentionMetrics?.bySegment?.d1
                        ?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d1?.Pro || 0,
                    ProCount:
                      metrics?.retentionMetrics?.bySegment?.d1?.ProCount || 0,
                    totalCount: metrics?.retentionMetrics?.d1Count || 0,
                  },
                  {
                    name: "D3",
                    val: metrics?.retentionMetrics?.d3 || 0,
                    Free: metrics?.retentionMetrics?.bySegment?.d3?.Free || 0,
                    FreeCount:
                      metrics?.retentionMetrics?.bySegment?.d3?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d3?.Freetrial || 0,
                    FreetrialCount:
                      metrics?.retentionMetrics?.bySegment?.d3
                        ?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d3?.Pro || 0,
                    ProCount:
                      metrics?.retentionMetrics?.bySegment?.d3?.ProCount || 0,
                    totalCount: metrics?.retentionMetrics?.d3Count || 0,
                  },
                  {
                    name: "D7",
                    val: metrics?.retentionMetrics?.d7 || 0,
                    Free: metrics?.retentionMetrics?.bySegment?.d7?.Free || 0,
                    FreeCount:
                      metrics?.retentionMetrics?.bySegment?.d7?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d7?.Freetrial || 0,
                    FreetrialCount:
                      metrics?.retentionMetrics?.bySegment?.d7
                        ?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d7?.Pro || 0,
                    ProCount:
                      metrics?.retentionMetrics?.bySegment?.d7?.ProCount || 0,
                    totalCount: metrics?.retentionMetrics?.d7Count || 0,
                  },
                ]}
                color={COLORS.primary}
              />
            }
            detailedChart={
              <RetentionDetailedChart
                data={[
                  {
                    name: "Day 1",
                    val: metrics?.retentionMetrics?.d1 || 0,
                    Free: metrics?.retentionMetrics?.bySegment?.d1?.Free || 0,
                    FreeCount:
                      metrics?.retentionMetrics?.bySegment?.d1?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d1?.Freetrial || 0,
                    FreetrialCount:
                      metrics?.retentionMetrics?.bySegment?.d1
                        ?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d1?.Pro || 0,
                    ProCount:
                      metrics?.retentionMetrics?.bySegment?.d1?.ProCount || 0,
                    totalCount: metrics?.retentionMetrics?.d1Count || 0,
                  },
                  {
                    name: "Day 3",
                    val: metrics?.retentionMetrics?.d3 || 0,
                    Free: metrics?.retentionMetrics?.bySegment?.d3?.Free || 0,
                    FreeCount:
                      metrics?.retentionMetrics?.bySegment?.d3?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d3?.Freetrial || 0,
                    FreetrialCount:
                      metrics?.retentionMetrics?.bySegment?.d3
                        ?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d3?.Pro || 0,
                    ProCount:
                      metrics?.retentionMetrics?.bySegment?.d3?.ProCount || 0,
                    totalCount: metrics?.retentionMetrics?.d3Count || 0,
                  },
                  {
                    name: "Day 7",
                    val: metrics?.retentionMetrics?.d7 || 0,
                    Free: metrics?.retentionMetrics?.bySegment?.d7?.Free || 0,
                    FreeCount:
                      metrics?.retentionMetrics?.bySegment?.d7?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d7?.Freetrial || 0,
                    FreetrialCount:
                      metrics?.retentionMetrics?.bySegment?.d7
                        ?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d7?.Pro || 0,
                    ProCount:
                      metrics?.retentionMetrics?.bySegment?.d7?.ProCount || 0,
                    totalCount: metrics?.retentionMetrics?.d7Count || 0,
                  },
                ]}
                color={COLORS.primary}
              />
            }
          />
          <MetricCard
            title="Daily Habit"
            value={dailyHabitUsers.toLocaleString()}
            subtitle="Forming habits"
            icon={UserCheck}
            color={COLORS.primary}
            tooltip={`Daily Habit Users. Users with above-median prompt volume, who are in the top 10% (P90) of distinct active days, and were active in the last 7 days.`}
            chart={
              dailyHabitTrendData.length > 0 ? (
                <div className="h-full w-full">
                  <ChartContainer
                    config={{
                      free: { label: "Free", color: COLORS.success },
                      trial: { label: "Trial", color: "hsl(160, 70%, 45%)" },
                      pro: { label: "Pro", color: "hsl(38, 95%, 55%)" },
                      total: { label: "Total", color: "hsl(280, 65%, 60%)" },
                    }}
                    className="h-full w-full"
                  >
                    <ComposedChart
                      data={dailyHabitTrendData}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                      barGap={0}
                      barCategoryGap="10%"
                    >
                      <XAxis
                        dataKey="date"
                        hide={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 8, fill: "#94a3b8" }}
                        minTickGap={30}
                        interval="preserveStartEnd"
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "numeric",
                            day: "numeric",
                          })
                        }
                      />
                      <Bar
                        dataKey="free"
                        stackId="users"
                        fill={COLORS.success}
                        shape={<PowerUserBar patternId="stripe-dh-mini" />}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="hsl(160, 70%, 45%)"
                        shape={<PowerUserBar patternId="stripe-dh-mini" />}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="hsl(38, 95%, 55%)"
                        shape={<PowerUserBar patternId="stripe-dh-mini" />}
                        radius={[2, 2, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(280, 65%, 60%)"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              ) : null
            }
            detailedChart={
              dailyHabitTrendData.length > 0 ? (
                <div className="h-full w-full">
                  <ChartContainer
                    config={{
                      free: { label: "Free", color: COLORS.success },
                      trial: { label: "Trial", color: "hsl(160, 70%, 45%)" },
                      pro: { label: "Pro", color: "hsl(38, 95%, 55%)" },
                      total: { label: "Total", color: "hsl(280, 65%, 60%)" },
                    }}
                    className="h-full w-full"
                  >
                    <ComposedChart
                      data={dailyHabitTrendData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                      barGap={0}
                      barCategoryGap="15%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="currentColor"
                        className="text-muted-foreground/10"
                      />
                      <XAxis
                        dataKey="date"
                        hide={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: "#94a3b8" }}
                        minTickGap={30}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        width={40}
                      />
                      <ChartTooltip content={<DailyHabitTooltip />} />
                      <Bar
                        dataKey="free"
                        stackId="users"
                        fill={COLORS.success}
                        shape={<PowerUserBar patternId="stripe-dh-detailed" />}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="hsl(160, 70%, 45%)"
                        shape={<PowerUserBar patternId="stripe-dh-detailed" />}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="hsl(38, 95%, 55%)"
                        shape={<PowerUserBar patternId="stripe-dh-detailed" />}
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(280, 65%, 60%)"
                        strokeWidth={2}
                        dot={true}
                        activeDot={{ r: 5, fill: "hsl(280, 65%, 60%)" }}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              ) : null
            }
          />
          <MetricCard
            title="Period Stickiness"
            value={`${(metrics?.stickiness || 0).toFixed(1)}%`}
            subtitle="DAU / Active Users"
            icon={TrendingUp}
            color={COLORS.info}
            tooltip="Period Stickiness (%). Ratio of average Daily Active Users to total unique users in the selected period. Formula: (Avg DAU / Period Active Users) × 100. Note: For shorter date filters (e.g. 7 days), this represents DAU/WAU rather than traditional DAU/MAU."
            chart={
              stickinessTrend.length > 0 ? (
                <SparklineV2
                  data={stickinessTrend}
                  dataKey="stickiness"
                  color={COLORS.info}
                />
              ) : null
            }
            detailedChart={
              stickinessTrend.length > 0 ? (
                <DetailedChartV2
                  data={stickinessTrend}
                  dataKey="stickiness"
                  color={COLORS.info}
                  title="Stickiness Trend (%)"
                />
              ) : null
            }
          />
        </div>
      </section>

      {/* Analysis */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Trends
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-4">
          <ChartCard
            title="Retention Drop-off"
            tooltip="Cohort Retention Analysis. Shows the percentage of users retaining on specific days (Day 1, Day 3, Day 7) after their first active date."
            className="lg:col-span-3"
          >
            <ChartContainer
              config={{
                Free: { label: "Free", color: "#60a5fa" }, // Light Blue
                Freetrial: { label: "Trial", color: COLORS.warning },
                Pro: { label: "Pro", color: COLORS.success },
              }}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <BarChart
                data={[
                  {
                    name: "D1",
                    Free: metrics?.retentionMetrics?.bySegment?.d1?.Free || 0,
                    FreeCount:
                      metrics?.retentionMetrics?.bySegment?.d1?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d1?.Freetrial || 0,
                    FreetrialCount:
                      metrics?.retentionMetrics?.bySegment?.d1
                        ?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d1?.Pro || 0,
                    ProCount:
                      metrics?.retentionMetrics?.bySegment?.d1?.ProCount || 0,
                    total:
                      (metrics?.retentionMetrics?.bySegment?.d1?.Free || 0) +
                      (metrics?.retentionMetrics?.bySegment?.d1?.Freetrial ||
                        0) +
                      (metrics?.retentionMetrics?.bySegment?.d1?.Pro || 0),
                    totalCount: metrics?.retentionMetrics?.d1Count || 0,
                    denominator: metrics?.retentionMetrics?.d1Total || 0,
                  },
                  {
                    name: "D3",
                    Free: metrics?.retentionMetrics?.bySegment?.d3?.Free || 0,
                    FreeCount:
                      metrics?.retentionMetrics?.bySegment?.d3?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d3?.Freetrial || 0,
                    FreetrialCount:
                      metrics?.retentionMetrics?.bySegment?.d3
                        ?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d3?.Pro || 0,
                    ProCount:
                      metrics?.retentionMetrics?.bySegment?.d3?.ProCount || 0,
                    total:
                      (metrics?.retentionMetrics?.bySegment?.d3?.Free || 0) +
                      (metrics?.retentionMetrics?.bySegment?.d3?.Freetrial ||
                        0) +
                      (metrics?.retentionMetrics?.bySegment?.d3?.Pro || 0),
                    totalCount: metrics?.retentionMetrics?.d3Count || 0,
                    denominator: metrics?.retentionMetrics?.d3Total || 0,
                  },
                  {
                    name: "D7",
                    Free: metrics?.retentionMetrics?.bySegment?.d7?.Free || 0,
                    FreeCount:
                      metrics?.retentionMetrics?.bySegment?.d7?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d7?.Freetrial || 0,
                    FreetrialCount:
                      metrics?.retentionMetrics?.bySegment?.d7
                        ?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d7?.Pro || 0,
                    ProCount:
                      metrics?.retentionMetrics?.bySegment?.d7?.ProCount || 0,
                    total:
                      (metrics?.retentionMetrics?.bySegment?.d7?.Free || 0) +
                      (metrics?.retentionMetrics?.bySegment?.d7?.Freetrial ||
                        0) +
                      (metrics?.retentionMetrics?.bySegment?.d7?.Pro || 0),
                    totalCount: metrics?.retentionMetrics?.d7Count || 0,
                    denominator: metrics?.retentionMetrics?.d7Total || 0,
                  },
                ]}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  unit="%"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<RetentionTooltip />} />
                <Bar
                  dataKey="Free"
                  stackId="a"
                  fill="#60a5fa" // Light Blue
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Freetrial"
                  stackId="a"
                  fill={COLORS.warning}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Pro"
                  stackId="a"
                  fill={COLORS.success}
                  radius={[4, 4, 0, 0]}
                  label={(props) => {
                    const { x, y, width, height, value, payload } = props;
                    if (!payload) return null;
                    return (
                      <text
                        x={x + width / 2}
                        y={y - 12}
                        fill="#666"
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight="bold"
                      >
                        {(payload.total || 0).toFixed(1)}%
                      </text>
                    );
                  }}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="User Segments"
            tooltip="User Segmentation. Count of unique users by plan: Free, Free Trial, or Pro (derived from user_status)."
            className="lg:col-span-1"
          >
            <ChartContainer
              config={{
                users: {
                  label: "Users",
                  color: COLORS.secondary,
                },
              }}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full flex justify-center"
            >
              <RechartsPie>
                <Pie
                  data={insights?.userSegments || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="name"
                >
                  {(insights?.userSegments || []).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </RechartsPie>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {(insights?.userSegments || []).map((segment, i) => (
                <div key={segment.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {segment.name} ({segment.count})
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}

const TooltipRow = ({ color, label, value, subValue }) => (
  <div className="flex justify-between items-center text-xs">
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </div>
    <span className="font-mono font-semibold">
      {value}
      {subValue && (
        <span className="text-muted-foreground ml-1">{subValue}</span>
      )}
    </span>
  </div>
);

const DailyHabitTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    // Calculate total from payload to ensure accuracy with stack
    const total = (data.free || 0) + (data.trial || 0) + (data.pro || 0);

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md border-border/50 min-w-[160px]">
        <div className="text-xs font-semibold text-foreground mb-2">
          {new Date(label).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
        <div className="space-y-1.5">
          <TooltipRow
            color={COLORS.success}
            label="Free"
            value={data.free || 0}
          />
          <TooltipRow
            color="hsl(160, 70%, 45%)"
            label="Trial"
            value={data.trial || 0}
          />
          <TooltipRow
            color="hsl(38, 95%, 55%)"
            label="Pro"
            value={data.pro || 0}
          />

          <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between items-center text-xs">
            <span className="font-medium">Total Habit Users</span>
            <span className="font-mono font-bold">{total}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
