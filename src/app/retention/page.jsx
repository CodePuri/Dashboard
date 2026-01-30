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
import { Users, Repeat, TrendingUp, UserCheck } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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
            const count = entry.payload[countKey] || Math.round((percentage / 100) * (entry.payload.totalCount || 100));
            
            return (
              <div key={`item-${index}`} className="flex justify-between items-center text-xs">
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
                  <span className="text-muted-foreground ml-2">
                    ({count})
                  </span>
                </div>
              </div>
            );
          })}
          <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between items-center text-xs">
            <span className="font-medium">Total</span>
            <span className="font-mono font-bold">
              {payload[0]?.payload?.total?.toFixed(1) || 0}%
            </span>
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

  if (isLoading || isAttritionLoading) {
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

  const retentionRate = growth?.retentionRate || 0;
  const stickiness =
    growth?.activeUsers && growth.activeUsers > 0
      ? (growth.dailyHabitUsers / growth.activeUsers) * 100
      : 0;

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
            value={`${(retentionRate || 0).toFixed(1)}%`}
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
          <MetricCard
            title="Daily Habit"
            value={(growth?.dailyHabitUsers || 0).toLocaleString()}
            subtitle="Active 7 consec days"
            icon={UserCheck}
            color={COLORS.primary}
            tooltip="Daily Habit Users. Users with above-median prompt volume, who are in the top 10% (P90) of distinct active days, and were active in the last 7 days."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="habitUsers"
                  color={COLORS.primary}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="habitUsers"
                  color={COLORS.primary}
                  title="Daily Habit-Building Users"
                />
              ) : null
            }
          />
          <MetricCard
            title="Stickiness"
            value={`${(metrics?.stickiness || 0).toFixed(1)}%`}
            subtitle="DAU / MAU"
            icon={TrendingUp}
            color={COLORS.info}
            tooltip="Ratio of daily active users to monthly active users"
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="users"
                  color={COLORS.info}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="users"
                  color={COLORS.info}
                  title="Daily Active Users"
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
                Free: { label: "Free", color: "#818cf8" }, // Indigo 400
                Freetrial: { label: "Trial", color: "#c084fc" }, // Purple 400
                Pro: { label: "Pro", color: "#34d399" }, // Emerald 400
              }}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <BarChart
                data={[
                  {
                    name: "D1",
                    Free: metrics?.retentionMetrics?.bySegment?.d1?.Free || 0,
                    FreeCount: metrics?.retentionMetrics?.bySegment?.d1?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d1?.Freetrial || 0,
                    FreetrialCount: metrics?.retentionMetrics?.bySegment?.d1?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d1?.Pro || 0,
                    ProCount: metrics?.retentionMetrics?.bySegment?.d1?.ProCount || 0,
                    total: metrics?.retentionMetrics?.d1 || 0,
                    totalCount: metrics?.retentionMetrics?.d1Count || 100,
                  },
                  {
                    name: "D3",
                    Free: metrics?.retentionMetrics?.bySegment?.d3?.Free || 0,
                    FreeCount: metrics?.retentionMetrics?.bySegment?.d3?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d3?.Freetrial || 0,
                    FreetrialCount: metrics?.retentionMetrics?.bySegment?.d3?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d3?.Pro || 0,
                    ProCount: metrics?.retentionMetrics?.bySegment?.d3?.ProCount || 0,
                    total: metrics?.retentionMetrics?.d3 || 0,
                    totalCount: metrics?.retentionMetrics?.d3Count || 100,
                  },
                  {
                    name: "D7",
                    Free: metrics?.retentionMetrics?.bySegment?.d7?.Free || 0,
                    FreeCount: metrics?.retentionMetrics?.bySegment?.d7?.FreeCount || 0,
                    Freetrial:
                      metrics?.retentionMetrics?.bySegment?.d7?.Freetrial || 0,
                    FreetrialCount: metrics?.retentionMetrics?.bySegment?.d7?.FreetrialCount || 0,
                    Pro: metrics?.retentionMetrics?.bySegment?.d7?.Pro || 0,
                    ProCount: metrics?.retentionMetrics?.bySegment?.d7?.ProCount || 0,
                    total: metrics?.retentionMetrics?.d7 || 0,
                    totalCount: metrics?.retentionMetrics?.d7Count || 100,
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
                  fill="#818cf8" // Indigo
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Freetrial"
                  stackId="a"
                  fill="#c084fc" // Purple
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Pro"
                  stackId="a"
                  fill="#34d399" // Emerald
                  radius={[4, 4, 0, 0]}
                  label={(props) => {
                    const { x, y, width, payload } = props;
                    if (!payload) return null;
                    return (
                      <text
                        x={x + width / 2}
                        y={y - 10}
                        fill="#666"
                        textAnchor="middle"
                        fontSize={10}
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
