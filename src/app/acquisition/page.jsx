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
import { UserPlus, Users, TrendingUp, PieChart, Moon } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
  const { data: dailyHabitData, isLoading: isDailyHabitLoading } = useDailyHabitData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

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
  const activeUsersChartData = data?.activeUsersChartData || [];
  
  // Daily Habit data
  const dailyHabitUsers = dailyHabitData?.finalDailyHabitUsers || dailyHabitData?.dailyHabitUsers || 0;
  const dormantHabitUsers = dailyHabitData?.dormantHabitUsers || 0;
  const dailyHabitSegments = dailyHabitData?.dailyHabitSegments || { free: 0, trial: 0, pro: 0 };
  const dailyHabitTrendData = dailyHabitData?.dailyTrend || [];
  const dormantHabitTrendData = dailyHabitData?.dormantTrend || [];
  
  // Debug logging
  console.log('Daily Habit Data:', {
    dailyHabitUsers,
    dormantHabitUsers,
    dailyTrendLength: dailyHabitTrendData.length,
    dormantTrendLength: dormantHabitTrendData.length,
    hasDailyTrend: dailyHabitTrendData.length > 0,
    hasDormantTrend: dormantHabitTrendData.length > 0,
    p90Threshold: dailyHabitData?.p90Threshold,
    medianPrompts: dailyHabitData?.medianPrompts
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
                <div className="h-12 w-full">
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
                      <Bar
                        dataKey="free"
                        stackId="users"
                        fill={COLORS.success}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="hsl(160, 70%, 45%)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="hsl(38, 95%, 55%)"
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
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="free"
                        stackId="users"
                        fill={COLORS.success}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="hsl(160, 70%, 45%)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="hsl(38, 95%, 55%)"
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
                <div className="h-12 w-full">
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
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                      barGap={0}
                      barCategoryGap="10%"
                    >
                      <Bar
                        dataKey="free"
                        stackId="users"
                        fill={COLORS.secondary}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="hsl(260, 50%, 60%)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="hsl(300, 60%, 65%)"
                        radius={[2, 2, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(220, 70%, 55%)"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </div>
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
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="hsl(260, 50%, 60%)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="hsl(300, 60%, 65%)"
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
            tooltip="Percentage of users with 5+ prompts"
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="powerUsers"
                  color={COLORS.warning}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="powerUsers"
                  color={COLORS.warning}
                  title="Daily Power User Trend"
                />
              ) : null
            }
          />
          <MetricCard
            title="Retention"
            value={`${(growth?.retentionRate || 0).toFixed(1)}%`}
            subtitle="Returning"
            icon={PieChart}
            color={COLORS.info}
            tooltip="Percentage of users who returned"
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="retentionRate"
                  color={COLORS.info}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="retentionRate"
                  color={COLORS.info}
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
