"use client";

import { useState } from "react";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
} from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Users, Repeat, TrendingUp, UserCheck } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
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
  const insights = data?.insights;

  const retentionRate = growth?.retentionRate || 0;
  const stickiness =
    growth?.activeUsers && growth.activeUsers > 0
      ? (growth.dailyHabitUsers / growth.activeUsers) * 100
      : 0;

  const totalUsers = attritionData?.length || 0;
  const churnedUsers = attritionData?.filter((u) => u.isChurned) || [];
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
            value={`${retentionRate.toFixed(1)}%`}
            subtitle="Returning users"
            icon={Repeat}
            color={COLORS.success}
            tooltip="Percentage of users who returned on multiple distinct days"
          />
          <MetricCard
            title="Attrition Rate"
            value={`${churnRate.toFixed(1)}%`}
            subtitle="Overall Churn"
            icon={Users}
            color={COLORS.danger}
            tooltip="% of users inactive for > 30 days"
          />
          <MetricCard
            title="Daily Habit"
            value={(growth?.dailyHabitUsers || 0).toLocaleString()}
            subtitle="Active 5+ days"
            icon={UserCheck}
            color={COLORS.primary}
            tooltip="Users active on 5+ distinct days"
          />
          <MetricCard
            title="Stickiness"
            value={`${stickiness.toFixed(1)}%`}
            subtitle="Habit / Active"
            icon={TrendingUp}
            color={COLORS.info}
            tooltip="Ratio of daily habit users to total active users"
          />
          <MetricCard
            title="Power Rate"
            value={`${(growth?.powerUserRate || 0).toFixed(1)}%`}
            subtitle="20+ prompts"
            icon={Users}
            color={COLORS.secondary}
            tooltip="Users with 20+ prompts"
          />
        </div>
      </section>

      {/* Analysis */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Trends
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          <ChartCard
            title="User Activity Trend"
            tooltip="Daily active users over time"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <AreaChart data={timeAnalysis?.dailyActivity || []}>
                <defs>
                  <linearGradient id="fillUsersRet" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(v) => format(new Date(v), "MMM d")}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke={COLORS.primary}
                  fill="url(#fillUsersRet)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4">
            {/* User Segments Text Summary */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-sm uppercase tracking-wide mb-4">
                User Segments
              </h3>
              <div className="space-y-4">
                {(insights?.userSegments || []).map((segment) => (
                  <div
                    key={segment.name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">
                      {segment.name}
                    </span>
                    <span className="font-bold">
                      {segment.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
