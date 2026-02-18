"use client";

import { useState } from "react";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useAttritionData } from "@/hooks/use-attrition-data";
import {
  MetricCard,
  ChartCard,
  COLORS,
  SparklineV2,
  DetailedChartV2,
  RetentionDropOffSparkline,
  RetentionDetailedChart,
} from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Users, Clock, MessageSquare, UserMinus } from "lucide-react";
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
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { EventFlagsTicker } from "@/components/ui/event-flags-ticker";
import { ChartContainer } from "@/components/ui/chart";
import { ActiveUsersChart } from "@/components/ui/active-users-chart";

const chartConfig = {
  prompts: {
    label: "Total Prompts",
    color: COLORS.primary,
  },
  users: {
    label: "Active Users",
    color: COLORS.pink,
  },
  totalPaidUsers: {
    label: "Total Paid Users",
    color: COLORS.success,
  },
  activePaidUsers: {
    label: "Active Paid Users",
    color: COLORS.info,
  },
};

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

// Sparkline component replaced by SparklineV2 in metric-card.jsx

export default function OverviewPage() {
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const { data: analytics, isLoading: isAnalyticsLoading } = useAnalyticsData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

  const [columnWidths, setColumnWidths] = useState({
    name: 120,
    email: 180,
    prompt: 250,
    enhancedPrompt: 250,
    intent: 100,
    domain: 100,
    platform: 80,
    plan: 80,
    totalPrompts: 100,
    processingTime: 100,
    createdAt: 120,
  });

  const handleResize = (key, newWidth) => {
    setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
  };

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const rawLatestPrompts = analytics?.latestPrompts || [];
  const latestPrompts = [...rawLatestPrompts].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Handle case sensitivity for strings
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal === bVal) return 0;
    const result = aVal < bVal ? -1 : 1;
    return sortConfig.direction === "asc" ? result : -result;
  });

  const { data: attrition, isLoading: isAttritionLoading } = useAttritionData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

  const isLoading = isAnalyticsLoading || isAttritionLoading;

  // --- Metrics Calculation ---
  const timeSaved = analytics?.metrics?.totalTimeSavedHours || 0;
  const avgTimeSaved = analytics?.metrics?.avgTimeSavedPerPrompt || 0;
  const enhancementRate = analytics?.metrics?.enhancementRate || 0;
  const activeUsers = analytics?.growth?.activeUsers || 0;
  const totalPrompts = analytics?.metrics?.total || 0;
  const totalUsersLifetime = attrition?.list?.length || 0;
  const churnedUsers = attrition?.list?.filter((u) => u.isChurned).length || 0;
  const churnRate = attrition?.metrics?.churnRate || 0;
  const churnTrend = attrition?.metrics?.trend;
  const dailyTrend = analytics?.timeAnalysis?.dailyActivity || [];
  const dateLabel = getDateLabel(dateFilter);

  // Additional metrics for event flags
  const powerUserRate = analytics?.growth?.powerUserRate || 0;
  const dailyHabitUsers = analytics?.growth?.dailyHabitUsers || 0;
  const d7Retention = analytics?.metrics?.retentionMetrics?.d7 || 0;
  const d1Retention = analytics?.metrics?.retentionMetrics?.d1 || 0;
  const stickiness = analytics?.metrics?.stickiness || 0;
  const expansionRatio = analytics?.insights?.expansionRatio || 0;
  const avgUserWords = analytics?.insights?.avgUserWords || 0;
  const avgEnhancedWords = analytics?.insights?.avgEnhancedWords || 0;
  const tokens = analytics?.insights?.tokens || {};
  const totalTokens = tokens?.totalTokens || 0;
  const totalCost = tokens?.totalCost || 0;
  const costPerPrompt = totalPrompts > 0 ? totalCost / totalPrompts : 0;

  // Get active users chart data from API (server-side computed)
  // Get active users chart data from API (server-side computed)
  const activeUsersChartData = analytics?.activeUsersChartData || [];

  const powerUserThreshold = 20;
  const churnedUsersList = attrition?.list?.filter((u) => u.isChurned) || [];
  const regrettableChurn = churnedUsersList.filter(
    (u) => u.promptCount >= powerUserThreshold,
  ).length;

  // Build event flag statements
  const eventStatements = [
    {
      source: "Overview",
      content: (
        <>
          Velocity is currently saving users{" "}
          <span className="text-foreground font-bold">
            {timeSaved.toFixed(1)} hours
          </span>{" "}
          {dateLabel}
        </>
      ),
    },
    {
      source: "Engagement",
      content: (
        <>
          <span className="text-foreground font-bold">
            {powerUserRate.toFixed(1)}%
          </span>{" "}
          of users are Power Users with 5+ prompts.
        </>
      ),
    },
    {
      source: "Retention",
      content: (
        <>
          <span className="text-foreground font-bold">
            {d7Retention.toFixed(1)}%
          </span>{" "}
          of users return on Day 7.
        </>
      ),
    },
    {
      source: "Acquisition",
      content: (
        <>
          <span className="text-foreground font-bold">
            {activeUsers.toLocaleString()}
          </span>{" "}
          users are active {dateLabel}, with{" "}
          <span className="text-foreground font-bold">{dailyHabitUsers}</span>{" "}
          forming daily habits.
        </>
      ),
    },
    // {
    //   source: "Conversion",
    //   content: (
    //     <>
    //       <span className="text-foreground font-bold">
    //         {enhancementRate.toFixed(1)}%
    //       </span>{" "}
    //       of prompts were successfully enhanced {dateLabel}.
    //     </>
    //   ),
    // },
    // {
    //   source: "Prompts",
    //   content: (
    //     <>
    //       Prompts are expanded by{" "}
    //       <span className="text-foreground font-bold">
    //         {expansionRatio.toFixed(1)}x
    //       </span>{" "}
    //       on average ({avgUserWords.toFixed(0)} → {avgEnhancedWords.toFixed(0)}{" "}
    //       words).
    //     </>
    //   ),
    // },
  ];

  // Add attrition statement only if there's regrettable churn
  if (regrettableChurn > 0) {
    eventStatements.splice(3, 0, {
      source: "Attrition",
      content: (
        <>
          <span className="text-foreground font-bold">{regrettableChurn}</span>{" "}
          power users have churned.
        </>
      ),
    });
  }

  // Add cost statement only if we have token data
  if (totalTokens > 0) {
    eventStatements.push({
      source: "Costs",
      content: (
        <>
          Average API cost per prompt:{" "}
          <span className="text-foreground font-bold">
            ${costPerPrompt.toFixed(4)}
          </span>{" "}
          with{" "}
          <span className="text-foreground font-bold">
            {totalTokens.toLocaleString()}
          </span>{" "}
          tokens consumed.
        </>
      ),
    });
  }

  // Add stickiness statement
  if (stickiness > 0) {
    eventStatements.splice(4, 0, {
      source: "Engagement",
      content: (
        <>
          Period stickiness is at{" "}
          <span className="text-foreground font-bold">
            {stickiness.toFixed(1)}%
          </span>{" "}
          (DAU / active users in period) {dateLabel}.
        </>
      ),
    });
  }

  if (isLoading || !analytics || !attrition) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Executive Overview
          </h1>
          <p className="text-muted-foreground">Aggregating key insights...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="h-[300px] sm:h-[400px] w-full flex flex-col lg:flex-row gap-4">
          <Skeleton className="flex-1 min-h-[200px] lg:min-h-0 h-full rounded-xl" />
          <Skeleton className="flex-1 min-h-[200px] lg:min-h-0 h-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Executive Overview
            </h1>
            {/* <div className="flex gap-2">
              {flags.map((flag, i) => (
                <span
                  key={i}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${flag.type === "positive" ? "bg-green-500/10 text-green-600 border-green-200" : "bg-red-500/10 text-red-600 border-red-200"}`}
                >
                  {flag.label}
                </span>
              ))}
            </div> */}
          </div>
          <p className="mt-2 text-muted-foreground text-sm md:text-base max-w-[90%] md:max-w-full">
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

      {/* Event Flags Ticker */}
      <EventFlagsTicker statements={eventStatements} autoPlayInterval={5000} />

      {/* Primary Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Prompts"
          value={totalPrompts.toLocaleString()}
          color={COLORS.primary}
          icon={MessageSquare}
          change={analytics?.metrics?.trends?.prompts ?? undefined}
          tooltip="Total Prompts (Count). Calculated by summing prompt entries in save_enhance_prompt for the selected period."
          chart={
            <SparklineV2
              data={dailyTrend}
              dataKey="prompts"
              color={COLORS.primary}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={dailyTrend}
              dataKey="prompts"
              color={COLORS.primary}
            />
          }
        />
        <MetricCard
          title="Active Users"
          value={activeUsers.toLocaleString()}
          color={COLORS.info}
          icon={Users}
          change={analytics?.metrics?.trends?.users ?? undefined}
          tooltip="Active Users (Unique Count). Calculated by counting distinct user_ids from save_enhance_prompt in the selected period."
          chart={
            <ActiveUsersChart data={activeUsersChartData} variant="mini" />
          }
          detailedChart={
            <ActiveUsersChart data={activeUsersChartData} variant="detailed" />
          }
        />
        <MetricCard
          title="Retention Rate"
          value={`${d1Retention.toFixed(1)}%`}
          subtitle="D1 Retention"
          icon={Users}
          color={COLORS.pink}
          change={analytics?.metrics?.trends?.retention ?? undefined}
          tooltip="Retention Rate (%). Percentage of users returning on Day 1, Day 3, and Day 7."
          chart={
            <RetentionDropOffSparkline
              data={[
                {
                  name: "D1",
                  val:
                    (analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.Free || 0) +
                    (analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.Freetrial || 0) +
                    (analytics?.metrics?.retentionMetrics?.bySegment?.d1?.Pro ||
                      0),
                  Free:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1?.Free ||
                    0,
                  FreeCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.FreeCount || 0,
                  Freetrial:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.Freetrial || 0,
                  FreetrialCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.FreetrialCount || 0,
                  Pro:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1?.Pro ||
                    0,
                  ProCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.ProCount || 0,
                  totalCount:
                    analytics?.metrics?.retentionMetrics?.d1Count || 0,
                },
                {
                  name: "D3",
                  val:
                    (analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.Free || 0) +
                    (analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.Freetrial || 0) +
                    (analytics?.metrics?.retentionMetrics?.bySegment?.d3?.Pro ||
                      0),
                  Free:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3?.Free ||
                    0,
                  FreeCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.FreeCount || 0,
                  Freetrial:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.Freetrial || 0,
                  FreetrialCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.FreetrialCount || 0,
                  Pro:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3?.Pro ||
                    0,
                  ProCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.ProCount || 0,
                  totalCount:
                    analytics?.metrics?.retentionMetrics?.d3Count || 0,
                },
                {
                  name: "D7",
                  val:
                    (analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.Free || 0) +
                    (analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.Freetrial || 0) +
                    (analytics?.metrics?.retentionMetrics?.bySegment?.d7?.Pro ||
                      0),
                  Free:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7?.Free ||
                    0,
                  FreeCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.FreeCount || 0,
                  Freetrial:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.Freetrial || 0,
                  FreetrialCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.FreetrialCount || 0,
                  Pro:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7?.Pro ||
                    0,
                  ProCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.ProCount || 0,
                  totalCount:
                    analytics?.metrics?.retentionMetrics?.d7Count || 0,
                },
              ]}
              color={COLORS.pink}
            />
          }
          detailedChart={
            <RetentionDetailedChart
              data={[
                {
                  name: "Day 1",
                  val: d1Retention,
                  Free:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1?.Free ||
                    0,
                  FreeCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.FreeCount || 0,
                  Freetrial:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.Freetrial || 0,
                  FreetrialCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.FreetrialCount || 0,
                  Pro:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1?.Pro ||
                    0,
                  ProCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d1
                      ?.ProCount || 0,
                  totalCount:
                    analytics?.metrics?.retentionMetrics?.d1Count || 0,
                },
                {
                  name: "Day 3",
                  val: analytics?.metrics?.retentionMetrics?.d3 || 0,
                  Free:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3?.Free ||
                    0,
                  FreeCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.FreeCount || 0,
                  Freetrial:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.Freetrial || 0,
                  FreetrialCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.FreetrialCount || 0,
                  Pro:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3?.Pro ||
                    0,
                  ProCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d3
                      ?.ProCount || 0,
                  totalCount:
                    analytics?.metrics?.retentionMetrics?.d3Count || 0,
                },
                {
                  name: "Day 7",
                  val: d7Retention,
                  Free:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7?.Free ||
                    0,
                  FreeCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.FreeCount || 0,
                  Freetrial:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.Freetrial || 0,
                  FreetrialCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.FreetrialCount || 0,
                  Pro:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7?.Pro ||
                    0,
                  ProCount:
                    analytics?.metrics?.retentionMetrics?.bySegment?.d7
                      ?.ProCount || 0,
                  totalCount:
                    analytics?.metrics?.retentionMetrics?.d7Count || 0,
                },
              ]}
              color={COLORS.pink}
            />
          }
        />
        <MetricCard
          title="Total Time Saved"
          value={`${timeSaved.toFixed(1)}h`}
          color={COLORS.success}
          icon={Clock}
          change={analytics?.metrics?.trends?.timeSaved ?? undefined}
          tooltip="Estimated Time Saved (Hours). Methodology: Sum of (Additional Words / 40 wpm) × Complexity Multiplier. Multipliers: Low=1.0, Medium=1.2, High=1.4. Capped at 6 min/prompt. This is an estimate based on word expansion; actual time saved may vary."
          chart={
            <SparklineV2
              data={dailyTrend}
              dataKey="timeSavedHours"
              color={COLORS.success}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={dailyTrend}
              dataKey="timeSavedHours"
              color={COLORS.success}
            />
          }
        />
        <MetricCard
          title="Churn Rate"
          value={`${churnRate.toFixed(1)}%`}
          color={COLORS.danger}
          icon={UserMinus}
          change={churnTrend ?? undefined}
          invertTrendColor={true}
          tooltip="Churn Rate (%). Percentage of users who have been inactive for more than 7 days. Calculated as (Churned Users / Total Users) * 100."
          chart={
            <SparklineV2
              data={attrition?.dailyActivity || []}
              dataKey="churnCount"
              color={COLORS.danger}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={attrition?.dailyActivity || []}
              dataKey="churnCount"
              color={COLORS.danger}
              title="Daily Churn Count"
            />
          }
        />
      </div>

      {/* Main Charts Area - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Growing Chart */}
        <ChartCard
          title="Is usage growing?"
          tooltip="Daily Volume Trend. Shows the daily count of total prompts and unique active users to visualize growth trends."
        >
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
                <linearGradient
                  id="colorUsersOverview"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={COLORS.pink} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.pink} stopOpacity={0} />
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
                yAxisId="left"
                tick={{ fontSize: 12, fill: "#888" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: "#888" }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      format(new Date(value), "MMMM d, yyyy")
                    }
                  />
                }
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="prompts"
                name="Total Prompts"
                stroke={COLORS.primary}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPromptsOverview)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="users"
                name="Active Users"
                stroke={COLORS.pink}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorUsersOverview)"
              />
            </AreaChart>
          </ChartContainer>
          <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-0.5"
                style={{ backgroundColor: COLORS.primary }}
              ></div>
              <span>Total Prompts</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-0.5"
                style={{ backgroundColor: COLORS.pink }}
              ></div>
              <span>Active Users</span>
            </div>
          </div>
        </ChartCard>

        {/* Paid Users Growing Chart */}
        <ChartCard
          title="Are paid users growing?"
          tooltip="Paid User Growth. Solid line shows Total Paid Users (cumulative count of users with pro status). Dashed line shows Active Paid Users (paid users active in the period)."
        >
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient
                  id="colorTotalPaidUsers"
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
                <linearGradient
                  id="colorActivePaidUsers"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.info} stopOpacity={0} />
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
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      format(new Date(value), "MMMM d, yyyy")
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="totalPaidUsers"
                name="Total Paid Users"
                stroke={COLORS.success}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTotalPaidUsers)"
              />
              <Area
                type="monotone"
                dataKey="activePaidUsers"
                name="Active Paid Users"
                stroke={COLORS.info}
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorActivePaidUsers)"
              />
            </AreaChart>
          </ChartContainer>
          <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-0.5"
                style={{ backgroundColor: COLORS.success }}
              ></div>
              <span>Total Paid Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-0.5 border-dashed border-t-2"
                style={{ borderColor: COLORS.info }}
              ></div>
              <span>Active Paid Users</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Latest Prompts Table */}
      <ChartCard
        title="Latest Prompts"
        tooltip="Real-time Prompt Stream. Displays the most recent prompts from save_enhance_prompt with intent and enhancement status."
      >
        <div className="rounded-md border overflow-hidden min-w-0 w-full">
          <ScrollArea className="h-[300px] sm:h-[400px] rounded-md w-full">
            <Table className="min-w-[800px] table-fixed">
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.name}
                    onResize={(w) => handleResize("name", w)}
                    onSort={() => handleSort("name")}
                    sortDirection={
                      sortConfig.key === "name" ? sortConfig.direction : null
                    }
                  >
                    NAME
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.email}
                    onResize={(w) => handleResize("email", w)}
                    onSort={() => handleSort("email")}
                    sortDirection={
                      sortConfig.key === "email" ? sortConfig.direction : null
                    }
                  >
                    EMAIL
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.prompt}
                    onResize={(w) => handleResize("prompt", w)}
                    onSort={() => handleSort("prompt")}
                    sortDirection={
                      sortConfig.key === "prompt" ? sortConfig.direction : null
                    }
                  >
                    PROMPT
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.enhancedPrompt}
                    onResize={(w) => handleResize("enhancedPrompt", w)}
                    onSort={() => handleSort("enhancedPrompt")}
                    sortDirection={
                      sortConfig.key === "enhancedPrompt"
                        ? sortConfig.direction
                        : null
                    }
                  >
                    ENHANCED PROMPT
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.intent}
                    onResize={(w) => handleResize("intent", w)}
                    onSort={() => handleSort("intent")}
                    sortDirection={
                      sortConfig.key === "intent" ? sortConfig.direction : null
                    }
                  >
                    INTENT
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.domain}
                    onResize={(w) => handleResize("domain", w)}
                    onSort={() => handleSort("domain")}
                    sortDirection={
                      sortConfig.key === "domain" ? sortConfig.direction : null
                    }
                  >
                    DOMAIN
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.platform}
                    onResize={(w) => handleResize("platform", w)}
                    onSort={() => handleSort("platform")}
                    sortDirection={
                      sortConfig.key === "platform"
                        ? sortConfig.direction
                        : null
                    }
                  >
                    SOURCE
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.plan}
                    onResize={(w) => handleResize("plan", w)}
                    onSort={() => handleSort("plan")}
                    sortDirection={
                      sortConfig.key === "plan" ? sortConfig.direction : null
                    }
                  >
                    PLAN
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.totalPrompts}
                    onResize={(w) => handleResize("totalPrompts", w)}
                    onSort={() => handleSort("totalPrompts")}
                    sortDirection={
                      sortConfig.key === "totalPrompts"
                        ? sortConfig.direction
                        : null
                    }
                  >
                    TOTAL PROMPTS
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.processingTime}
                    onResize={(w) => handleResize("processingTime", w)}
                    onSort={() => handleSort("processingTime")}
                    sortDirection={
                      sortConfig.key === "processingTime"
                        ? sortConfig.direction
                        : null
                    }
                  >
                    PROC TIME
                  </TableHead>
                  <TableHead
                    className="font-bold text-foreground"
                    width={columnWidths.createdAt}
                    onResize={(w) => handleResize("createdAt", w)}
                    onSort={() => handleSort("createdAt")}
                    sortDirection={
                      sortConfig.key === "createdAt"
                        ? sortConfig.direction
                        : null
                    }
                  >
                    LAST PROMPT AT
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
                      <TableCell
                        className="font-medium py-3 truncate"
                        title={row.name}
                      >
                        {row.name}
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs py-3 text-muted-foreground truncate"
                        title={row.email}
                      >
                        {row.email}
                      </TableCell>
                      <TableCell
                        className="truncate font-mono text-xs py-3 cursor-pointer"
                        title={`Double click to view full`}
                        onDoubleClick={() =>
                          setSelectedPrompt({
                            title: "User Prompt",
                            content: row.prompt,
                          })
                        }
                      >
                        {row.prompt}
                      </TableCell>
                      <TableCell
                        className="truncate font-mono text-xs py-3 cursor-pointer"
                        title={`Double click to view full`}
                        onDoubleClick={() => {
                          if (row.enhancedPrompt) {
                            setSelectedPrompt({
                              title: "Enhanced Prompt",
                              content: row.enhancedPrompt,
                            });
                          }
                        }}
                      >
                        {row.enhancedPrompt || "—"}
                      </TableCell>
                      <TableCell
                        className="py-3 text-muted-foreground truncate"
                        title={row.intent}
                      >
                        {row.intent}
                      </TableCell>
                      <TableCell
                        className="py-3 text-muted-foreground truncate"
                        title={row.domain}
                      >
                        {row.domain}
                      </TableCell>
                      <TableCell
                        className="py-3 text-muted-foreground truncate"
                        title={row.platform}
                      >
                        {row.platform}
                      </TableCell>
                      <TableCell
                        className="py-3 text-muted-foreground truncate"
                        title={row.plan}
                      >
                        {row.plan}
                      </TableCell>
                      <TableCell
                        className="text-center font-medium py-3 truncate"
                        title={String(row.totalPrompts)}
                      >
                        {row.totalPrompts}
                      </TableCell>
                      <TableCell className="font-mono text-center py-3 text-muted-foreground truncate">
                        {row.processingTime
                          ? `${(row.processingTime / 1000).toFixed(2)}s`
                          : "—"}
                      </TableCell>
                      <TableCell
                        className="py-3 text-xs text-muted-foreground truncate"
                        title={
                          row.createdAt
                            ? format(new Date(row.createdAt), "MMM d, HH:mm")
                            : "—"
                        }
                      >
                        {row.createdAt
                          ? format(new Date(row.createdAt), "MMM d, HH:mm")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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
      <Dialog
        open={!!selectedPrompt}
        onOpenChange={(open) => !open && setSelectedPrompt(null)}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedPrompt?.title}</DialogTitle>
            <DialogDescription>
              Full content of the selected prompt
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4 min-h-0 flex-1 overflow-hidden flex flex-col">
            <div className="rounded-md bg-muted p-4 font-mono text-sm whitespace-pre-wrap max-h-[50dvh] overflow-y-auto">
              {selectedPrompt?.content}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="secondary"
              onClick={() => handleCopy(selectedPrompt?.content)}
              className="gap-2"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setSelectedPrompt(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
