"use client";

import { useState } from "react";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useAttritionData } from "@/hooks/use-attrition-data";
import { MetricCard, ChartCard, COLORS } from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import type { DateFilterOption, SourceFilterOption } from "@/types/analytics";
import { Button } from "@/components/ui/button";
import {
  Users,
  Zap,
  Clock,
  Target,
  ArrowRight,
  UserMinus,
  TrendingUp,
  Activity,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

function getDateLabel(filter: DateFilterOption) {
  switch (filter) {
    case "Today":
      return "today";
    case "Last 7 Days":
      return "this week";
    case "Last 30 Days":
      return "this month";
    case "All Time":
      return "all time";
    case "Custom":
      return "in the selected period";
    default:
      return "in this period";
  }
}

export default function OverviewPage() {
  const [dateFilter, setDateFilter] =
    useState<DateFilterOption>("Last 30 Days");
  const [sourceFilter, setSourceFilter] = useState<SourceFilterOption>("All");

  const { data: analytics, isLoading: isAnalyticsLoading } = useAnalyticsData(
    dateFilter,
    sourceFilter,
  );
  const { data: attrition, isLoading: isAttritionLoading } = useAttritionData(
    dateFilter,
    sourceFilter,
  );

  const isLoading = isAnalyticsLoading || isAttritionLoading;

  // --- Metrics Calculation ---

  // 1. ROI / Value
  const timeSaved = analytics?.metrics?.totalTimeSavedHours || 0;
  const enhancementRate = analytics?.metrics?.enhancementRate || 0;

  // 2. Activity / Growth
  const activeUsers = analytics?.growth?.activeUsers || 0;
  const totalPrompts = analytics?.metrics?.total || 0;

  // 3. Attrition
  const totalUsersLifetime = attrition?.length || 0;
  const churnedUsers = attrition?.filter((u) => u.isChurned).length || 0;
  const churnRate =
    totalUsersLifetime > 0 ? (churnedUsers / totalUsersLifetime) * 100 : 0;

  // 4. Daily Trend (Prompts)
  const dailyTrend = analytics?.timeAnalysis?.dailyActivity || [];

  const dateLabel = getDateLabel(dateFilter);

  if (isLoading || !analytics || !attrition) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Executive Overview
          </h1>
          <p className="text-muted-foreground">Aggregating key insights...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="h-[400px] w-full flex gap-4">
          <Skeleton className="flex-1 h-full rounded-xl" />
          <Skeleton className="flex-1 h-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <FilterBar
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
        />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background p-8 border">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Executive Overview
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Velocity is currently saving users{" "}
              <span className="text-foreground font-bold">
                {timeSaved.toFixed(1)} hours
              </span>{" "}
              {dateLabel} with a{" "}
              <span className="text-foreground font-bold">
                {enhancementRate.toFixed(1)}%
              </span>{" "}
              success rate.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="default" className="gap-2">
              <Link href="/roi">
                View ROI Report <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[200px] w-[200px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Prompts"
          value={totalPrompts.toLocaleString()}
          subtitle={dateFilter}
          icon={Zap}
          color={COLORS.primary}
          tooltip={`Total prompts processed ${getDateLabel(dateFilter)}`}
        />
        <MetricCard
          title="Active Users"
          value={activeUsers.toLocaleString()}
          subtitle="Unique Users"
          icon={Users}
          color={COLORS.info}
          tooltip={`Users active ${getDateLabel(dateFilter)}`}
        />
        <MetricCard
          title="Time Saved"
          value={`${timeSaved.toFixed(1)}h`}
          subtitle="Efficiency Value"
          icon={Clock}
          color={COLORS.success}
          tooltip="Estimated hours saved based on text expansion"
        />
        <MetricCard
          title="Churn Rate"
          value={`${churnRate.toFixed(1)}%`}
          subtitle="Overall Attrition"
          icon={UserMinus}
          color={COLORS.danger}
          tooltip="Users inactive for > 30 days (All Time)"
        />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Trend (2/3 width) */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Is usage growing?"
            tooltip="Daily prompt volume trend"
          >
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient
                      id="colorPromptsOverview"
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#888" }}
                    tickFormatter={(v) => format(new Date(v), "MMM d")}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelFormatter={(v: any) =>
                      format(new Date(v), "MMM d, yyyy")
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="prompts"
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorPromptsOverview)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Quick Links / Status (1/3 width) */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm h-full flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12"
                  asChild
                >
                  <Link href="/activity">
                    <Activity className="mr-2 h-4 w-4" />
                    Check Daily Activity
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12"
                  asChild
                >
                  <Link href="/attrition">
                    <UserMinus className="mr-2 h-4 w-4" />
                    Analyze Churn
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12"
                  asChild
                >
                  <Link href="/acquisition">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Growth
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-8 rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium mb-1">System Status</p>
              <div className="flex items-center gap-2 text-green-600">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold">Live & Processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
