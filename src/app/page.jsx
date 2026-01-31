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
} from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Users, Zap, Clock, UserMinus, MousePointerClick } from "lucide-react";
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
    customDateRange
  );
  const { data: attrition, isLoading: isAttritionLoading } = useAttritionData(
    dateFilter,
    sourceFilter,
    customDateRange // Assuming useAttritionData also needs update
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
  const churnRate =
    totalUsersLifetime > 0 ? (churnedUsers / totalUsersLifetime) * 100 : 0;
  const churnTrend = attrition?.metrics?.trend;
  const dailyTrend = analytics?.timeAnalysis?.dailyActivity || [];
  const latestPrompts = analytics?.latestPrompts || [];
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
    (u) => u.promptCount >= powerUserThreshold
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
          of users are Power Users with 5+ prompts, showing{" "}
          <span className="text-foreground font-bold">
            strong product adoption
          </span>
          .
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
          of users return on Day 7, indicating{" "}
          <span className="text-foreground font-bold">healthy retention</span>.
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
    {
      source: "Conversion",
      content: (
        <>
          <span className="text-foreground font-bold">
            {enhancementRate.toFixed(1)}%
          </span>{" "}
          of prompts were successfully enhanced {dateLabel}.
        </>
      ),
    },
    {
      source: "Prompts",
      content: (
        <>
          Prompts are expanded by{" "}
          <span className="text-foreground font-bold">
            {expansionRatio.toFixed(1)}x
          </span>{" "}
          on average ({avgUserWords.toFixed(0)} → {avgEnhancedWords.toFixed(0)}{" "}
          words).
        </>
      ),
    },
  ];

  // Add attrition statement only if there's regrettable churn
  if (regrettableChurn > 0) {
    eventStatements.splice(3, 0, {
      source: "Attrition",
      content: (
        <>
          <span className="text-foreground font-bold">{regrettableChurn}</span>{" "}
          power users have churned — high-value loss requiring attention.
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
          Product stickiness is at{" "}
          <span className="text-foreground font-bold">
            {stickiness.toFixed(1)}%
          </span>{" "}
          DAU/MAU ratio {dateLabel}.
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
          title="Total Time Saved"
          value={`${timeSaved.toFixed(1)}h`}
          color={COLORS.success}
          change={analytics?.metrics?.trends?.timeSaved ?? undefined}
          tooltip="Velocity Time Saved (Hours). Calculated as Sum of (Extra Words / 40 wpm) * Complexity Multiplier. Multipliers: Low=1.0, Medium=1.2, High=1.4. Guardrails: Capped at 6 minutes per prompt."
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
            <Table className="min-w-[800px]">
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
                    INTENT
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-bold text-foreground">
                    DOMAIN
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
                  <TableHead className="whitespace-nowrap font-bold text-foreground">
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
                        className="whitespace-nowrap font-medium py-3 max-w-[120px] truncate"
                        title={row.name}
                      >
                        {row.name}
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap font-mono text-xs py-3 text-muted-foreground max-w-[150px] truncate"
                        title={row.email}
                      >
                        {row.email}
                      </TableCell>
                      <TableCell
                        className="max-w-[215px] truncate font-mono text-xs py-3 cursor-pointer"
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
                        className="max-w-[215px] truncate font-mono text-xs py-3 cursor-pointer"
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
                        className="whitespace-nowrap py-3 text-muted-foreground max-w-[100px] truncate"
                        title={row.intent}
                      >
                        {row.intent}
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap py-3 text-muted-foreground max-w-[100px] truncate"
                        title={row.domain}
                      >
                        {row.domain}
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap py-3 text-muted-foreground max-w-[80px] truncate"
                        title={row.platform}
                      >
                        {row.platform}
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap py-3 text-muted-foreground max-w-[80px] truncate"
                        title={row.plan}
                      >
                        {row.plan}
                      </TableCell>
                      <TableCell
                        className="text-center font-medium py-3 max-w-[80px] truncate"
                        title={String(row.totalPrompts)}
                      >
                        {row.totalPrompts}
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap py-3 text-xs text-muted-foreground max-w-[90px] truncate"
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
