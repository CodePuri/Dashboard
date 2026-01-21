"use client";

import { useState } from "react";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useAttritionData } from "@/hooks/use-attrition-data";
import { MetricCard, ChartCard, COLORS } from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Users, Zap, Clock, UserMinus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
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

function getDateLabel(filter) {
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
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();

  const { data: analytics, isLoading: isAnalyticsLoading } = useAnalyticsData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );
  const { data: attrition, isLoading: isAttritionLoading } = useAttritionData(
    dateFilter,
    sourceFilter,
    customDateRange, // Assuming useAttritionData also needs update
  );

  const isLoading = isAnalyticsLoading || isAttritionLoading;

  // --- Metrics Calculation ---
  const timeSaved = analytics?.metrics?.totalTimeSavedHours || 0;
  const enhancementRate = analytics?.metrics?.enhancementRate || 0;
  const activeUsers = analytics?.growth?.activeUsers || 0;
  const totalPrompts = analytics?.metrics?.total || 0;
  const totalUsersLifetime = attrition?.length || 0;
  const churnedUsers = attrition?.filter((u) => u.isChurned).length || 0;
  const churnRate =
    totalUsersLifetime > 0 ? (churnedUsers / totalUsersLifetime) * 100 : 0;
  const dailyTrend = analytics?.timeAnalysis?.dailyActivity || [];
  const latestPrompts = analytics?.latestPrompts || [];
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Executive Overview
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Aggregating key insights and performance metrics
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

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background p-8 border">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-xl text-muted-foreground">
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

      {/* Main Charts Area - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Growing Chart */}
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
                  labelFormatter={(v) => format(new Date(v), "MMM d, yyyy")}
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

        {/* Paid Users Growing Chart */}
        <ChartCard
          title="Are paid users growing?"
          tooltip="Daily paid user count trend"
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient
                    id="colorPaidUsersOverview"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={COLORS.success}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={COLORS.success}
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
                  labelFormatter={(v) => format(new Date(v), "MMM d, yyyy")}
                />
                <Area
                  type="monotone"
                  dataKey="paidUsers"
                  name="Paid Users"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPaidUsersOverview)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Latest Prompts Table */}
      <ChartCard
        title="Latest Prompts"
        tooltip="Most recent prompts with user details"
      >
        <div className="rounded-md border">
          <ScrollArea className="h-[400px] rounded-md">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="whitespace-nowrap font-bold text-foreground">
                    NAME
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-bold text-foreground">
                    EMAIL
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-bold text-foreground">
                    PROMPT
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-bold text-foreground">
                    ENHANCED PROMPT
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-bold text-foreground">
                    SOURCE
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-bold text-foreground">
                    PLAN
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-bold text-foreground">
                    TOTAL PROMPTS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestPrompts.length > 0 ? (
                  latestPrompts.map((row, i) => (
                    <TableRow
                      key={i}
                      className="even:bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="whitespace-nowrap font-medium py-3">
                        {row.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs py-3 text-muted-foreground">
                        {row.email}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate font-mono text-xs py-3"
                        title={row.prompt}
                      >
                        {row.prompt}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate font-mono text-xs py-3"
                        title={row.enhancedPrompt || "No enhanced prompt"}
                      >
                        {row.enhancedPrompt || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-3 text-muted-foreground">
                        {row.platform}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-3 text-muted-foreground">
                        {row.plan}
                      </TableCell>
                      <TableCell className="text-center font-medium py-3">
                        {row.totalPrompts}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No prompts found for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </ChartCard>
    </div>
  );
}
