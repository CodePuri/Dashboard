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
  UserPlus,
  Users,
  TrendingUp,
  PieChart,
  Moon,
  Repeat,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PowerUserBar } from "@/components/ui/active-users-chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  ResponsiveContainer,
} from "recharts";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useDailyHabitData } from "@/hooks/use-daily-habit-data";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const chartConfig = {
  users: {
    label: "Users",
    color: COLORS.secondary,
  },
};

export default function AcquisitionPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  const { data, isLoading } = useAnalyticsData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );
  const { data: dailyHabitData, isLoading: isDailyHabitLoading } =
    useDailyHabitData(dateFilter, sourceFilter, customDateRange);

  if (isLoading || isDailyHabitLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Acquisition
            </h1>
            <p className="text-muted-foreground">Loading daily habit data...</p>
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
  const insights = data?.insights;
  const timeAnalysis = data?.timeAnalysis;
  const dailyActivity = timeAnalysis?.dailyActivity || [];
  const userSegments = insights?.userSegments || [];
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

  // Create dataset specifically for Power Users Chart (plotting ONLY power users)
  const powerUsersChartData = activeUsersChartData.map((d) => ({
    ...d,
    // Override main bars to be just the power counts (>= 5)
    free: d.freeGe5,
    trial: d.trialGe5,
    pro: d.proGe5,
    total: d.freeGe5 + d.trialGe5 + d.proGe5,
  }));

  // Daily Habit data
  const dailyHabitUsers = dailyHabitData?.dailyHabitUsers || 0;
  const dormantHabitUsers = dailyHabitData?.dormantHabitUsers || 0;
  const dailyHabitSegments = dailyHabitData?.dailyHabitSegments || {
    free: 0,
    trial: 0,
    pro: 0,
  };
  const dailyHabitTrendData = dailyHabitData?.dailyTrend || [];
  const dormantHabitTrendData = dailyHabitData?.dormantTrend || [];

  // Debug logging
  console.log("Daily Habit Data:", {
    dailyHabitUsers,
    dormantHabitUsers,
    dailyTrendLength: dailyHabitTrendData.length,
    dormantTrendLength: dormantHabitTrendData.length,
    hasDailyTrend: dailyHabitTrendData.length > 0,
    hasDormantTrend: dormantHabitTrendData.length > 0,
    p90Threshold: dailyHabitData?.p90Threshold,
    medianPrompts: dailyHabitData?.medianPrompts,
  });

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Acquisition
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Where users come from and how they engage
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
          User Growth
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Daily Habit"
            value={dailyHabitUsers.toLocaleString()}
            subtitle="Forming habits"
            icon={UserPlus}
            color={COLORS.success}
            tooltip={`Users with above-median prompts, in top 10% of distinct active days (P90=${dailyHabitData?.p90Threshold || 0}), and active in last 7 days. Median prompts: ${dailyHabitData?.medianPrompts || 0}`}
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
                <div className="h-[200px] w-full">
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
            title="Dormant"
            value={dormantHabitUsers.toLocaleString()}
            subtitle="Paused Power"
            icon={Moon}
            color={COLORS.secondary}
            tooltip={`Users with above-median prompts, in top 10% of distinct active days (P90=${dailyHabitData?.p90Threshold || 0}), but NOT active in last 7 days. Median prompts: ${dailyHabitData?.medianPrompts || 0}`}
            chart={
              dormantHabitTrendData.length > 0 ? (
                <SparklineV2
                  data={dormantHabitTrendData}
                  dataKey="total"
                  color={COLORS.secondary}
                />
              ) : null
            }
            detailedChart={
              dormantHabitTrendData.length > 0 ? (
                <div className="h-[200px] w-full">
                  <ChartContainer
                    config={{
                      free: { label: "Free", color: COLORS.secondary },
                      trial: { label: "Trial", color: "hsl(260, 50%, 60%)" },
                      pro: { label: "Pro", color: "hsl(300, 60%, 65%)" },
                      total: { label: "Total", color: "hsl(220, 70%, 55%)" },
                    }}
                    className="h-full w-full"
                  >
                    <ComposedChart
                      data={dormantHabitTrendData}
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
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="free"
                        stackId="users"
                        fill={COLORS.secondary}
                        shape={<PowerUserBar patternId="stripe-dt-detailed" />}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="hsl(260, 50%, 60%)"
                        shape={<PowerUserBar patternId="stripe-dt-detailed" />}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="hsl(300, 60%, 65%)"
                        shape={<PowerUserBar patternId="stripe-dt-detailed" />}
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(220, 70%, 55%)"
                        strokeWidth={2}
                        dot={true}
                        activeDot={{ r: 5, fill: "hsl(220, 70%, 55%)" }}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              ) : null
            }
          />
          <MetricCard
            title="Power Rate"
            value={`${(growth?.powerUserRate || 0).toFixed(1)}%`}
            subtitle="5+ prompts"
            icon={TrendingUp}
            color={COLORS.warning}
            tooltip="Power user distribution: 5+ prompts"
            chart={
              activeUsersChartData.length > 0 ? (
                <div className="h-full w-full">
                  <ChartContainer
                    config={{
                      free: { label: "Free", color: "#8b5cf6" }, // Violet 500
                      trial: { label: "Trial", color: "#d946ef" }, // Fuchsia 500
                      pro: { label: "Pro", color: "#f43f5e" }, // Rose 500
                    }}
                    className="h-full w-full"
                  >
                    <ComposedChart
                      data={powerUsersChartData}
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
                        fill="#8b5cf6"
                        shape={
                          <PowerUserBar
                            patternIdLt5="stripe-pr-lt5-mini"
                            patternIdGe5="stripe-pr-ge5-mini"
                          />
                        }
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="#d946ef"
                        shape={
                          <PowerUserBar
                            patternIdLt5="stripe-pr-lt5-mini"
                            patternIdGe5="stripe-pr-ge5-mini"
                          />
                        }
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="#f43f5e"
                        shape={
                          <PowerUserBar
                            patternIdLt5="stripe-pr-lt5-mini"
                            patternIdGe5="stripe-pr-ge5-mini"
                          />
                        }
                        radius={[2, 2, 0, 0]}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              ) : null
            }
            detailedChart={
              activeUsersChartData.length > 0 ? (
                <div className="h-[300px] w-full p-4">
                  <ChartContainer
                    config={{
                      free: { label: "Free", color: "#8b5cf6" },
                      trial: { label: "Trial", color: "#d946ef" },
                      pro: { label: "Pro", color: "#f43f5e" },
                    }}
                    className="h-full w-full"
                  >
                    <ComposedChart
                      data={powerUsersChartData}
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
                      <ChartTooltip content={<PowerRateTooltip />} />
                      <Bar
                        dataKey="free"
                        stackId="users"
                        fill="#8b5cf6"
                        shape={
                          <PowerUserBar
                            patternIdLt5="stripe-pr-lt5-detailed"
                            patternIdGe5="stripe-pr-ge5-detailed"
                          />
                        }
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="#d946ef"
                        shape={
                          <PowerUserBar
                            patternIdLt5="stripe-pr-lt5-detailed"
                            patternIdGe5="stripe-pr-ge5-detailed"
                          />
                        }
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="#f43f5e"
                        shape={
                          <PowerUserBar
                            patternIdLt5="stripe-pr-lt5-detailed"
                            patternIdGe5="stripe-pr-ge5-detailed"
                          />
                        }
                        radius={[4, 4, 0, 0]}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              ) : null
            }
          />
          <MetricCard
            title="Retention Rate"
            value={`${(growth?.retentionRate || 0).toFixed(1)}%`}
            subtitle="Overall Retention"
            icon={Repeat}
            color={COLORS.primary}
            tooltip="Retention Rate (%). Percentage of unique users who were active on more than one distinct day within the selected period."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="retentionRate"
                  color={COLORS.primary}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="retentionRate"
                  color={COLORS.primary}
                  title="Daily Retention Rate (%)"
                />
              ) : null
            }
          />
        </div>
      </section>

      {/* Charts */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Analysis
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <ChartCard
            title="User Segments"
            tooltip="Distribution by plan: Free, Freetrial, Pro"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full flex justify-center"
            >
              <RechartsPie>
                <Pie
                  data={userSegments}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="name"
                >
                  {userSegments.map((_, index) => (
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
              {userSegments.map((segment, i) => (
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

          <ChartCard title="Daily User Growth" tooltip="Active users over time">
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <AreaChart data={timeAnalysis?.dailyActivity || []}>
                <defs>
                  <linearGradient id="fillUsersAcq" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={COLORS.secondary}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={COLORS.secondary}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => format(new Date(v), "MMM d")}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke={COLORS.secondary}
                  fill="url(#fillUsersAcq)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}

// Standardized Tooltip Styles matches Active Users Card
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

const PowerRateTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = (data.free || 0) + (data.trial || 0) + (data.pro || 0);

    // Helper to format breakdown
    const formatBreakdown = (p5, pGt5) => `(${p5} =5, ${pGt5} >5)`;

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md border-border/50 min-w-[180px]">
        <div className="text-xs font-semibold text-foreground mb-2">
          {new Date(label).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
        <div className="space-y-1.5">
          <TooltipRow
            color="#8b5cf6"
            label="Free"
            value={data.free || 0}
            subValue={formatBreakdown(
              data.freePower5 || 0,
              data.freePowerGt5 || 0,
            )}
          />
          <TooltipRow
            color="#d946ef"
            label="Trial"
            value={data.trial || 0}
            subValue={formatBreakdown(
              data.trialPower5 || 0,
              data.trialPowerGt5 || 0,
            )}
          />
          <TooltipRow
            color="#f43f5e"
            label="Pro"
            value={data.pro || 0}
            subValue={formatBreakdown(
              data.proPower5 || 0,
              data.proPowerGt5 || 0,
            )}
          />

          <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between items-center text-xs">
            <span className="font-medium">Total Power Users</span>
            <span className="font-mono font-bold">{total}</span>
          </div>
          <div className="text-[10px] text-muted-foreground italic mt-1.5">
            Striped = =5 Prompts, Crosshatch = &gt;5
          </div>
        </div>
      </div>
    );
  }
  return null;
};
