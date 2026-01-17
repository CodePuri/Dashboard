"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  Zap,
  Clock,
  Target,
  Flame,
  BarChart2,
  CheckCircle,
  XCircle,
  Timer,
  Info, // Import Info icon
  Download, // Import Download icon
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePanelState } from "@/hooks/use-panel-state";
import type {
  AnalyticsData,
  AnalyticsResponse,
  DateFilterOption,
} from "@/types/analytics";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Chart colors (Standard)
const COLORS = {
  primary: "#2563eb", // Blue 600
  secondary: "#475569", // Slate 600
  success: "#16a34a", // Green 600
  warning: "#ca8a04", // Yellow 600
  danger: "#dc2626", // Red 600
  info: "#0891b2", // Cyan 600
  pink: "#db2777", // Pink 600
  lime: "#65a30d", // Lime 600
};

const PIE_COLORS = [
  "#2563eb", // Blue
  "#db2777", // Pink
  "#0891b2", // Cyan
  "#ca8a04", // Yellow
  "#16a34a", // Green
  "#9333ea", // Purple
  "#4f46e5", // Indigo
  "#e11d48", // Rose
];

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  change?: number;
  tooltip?: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  change,
  tooltip,
}: MetricCardProps) {
  return (
    <div
      className="rounded-xl border bg-card p-3 md:p-5 shadow-sm transition-all hover:shadow-md dark:hover:bg-accent/10 dark:hover:border-primary/20"
      title={tooltip}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] md:text-sm font-medium uppercase tracking-wider text-muted-foreground mr-1 truncate">
              {title}
            </p>
            {tooltip && (
              <span
                className="text-muted-foreground/60 transition-colors hover:text-foreground cursor-help"
                title={tooltip}
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <p className="text-xl md:text-3xl font-bold tracking-tight text-foreground truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground font-medium">
              {subtitle}
            </p>
          )}
          {change !== undefined && (
            <p
              className={cn(
                "mt-2 flex items-center text-xs font-medium",
                change >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {change >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {Math.abs(change).toFixed(1)}%
            </p>
          )}
        </div>
        <div
          className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg shadow-sm"
          style={{ backgroundColor: `${color}15`, color: color }}
        >
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  tooltip,
}: {
  title: string;
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground p-3 sm:p-4 md:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <h3 className="font-semibold text-xs sm:text-sm uppercase tracking-wide text-foreground">
          {title}
        </h3>
        {tooltip && (
          <span
            className="text-muted-foreground/60 transition-colors hover:text-foreground cursor-help"
            title={tooltip}
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function getDateRange(
  filter: DateFilterOption,
  customStart?: Date,
  customEnd?: Date,
) {
  const now = new Date();

  switch (filter) {
    case "Today":
      return { startDate: startOfToday(), endDate: endOfToday() };
    case "Yesterday":
      return { startDate: startOfYesterday(), endDate: endOfYesterday() };
    case "Last 7 Days":
      return { startDate: startOfDay(subDays(now, 7)), endDate: endOfDay(now) };
    case "Last 14 Days":
      return {
        startDate: startOfDay(subDays(now, 14)),
        endDate: endOfDay(now),
      };
    case "Last 30 Days":
      return {
        startDate: startOfDay(subDays(now, 30)),
        endDate: endOfDay(now),
      };
    case "Last 90 Days":
      return {
        startDate: startOfDay(subDays(now, 90)),
        endDate: endOfDay(now),
      };
    case "Custom":
      return { startDate: customStart || null, endDate: customEnd || null };
    case "All Time":
    default:
      return { startDate: null, endDate: null };
  }
}

const chartConfig = {
  count: {
    label: "Count",
    color: COLORS.primary,
  },
  value: {
    label: "Value",
  },
  "One-time": { label: "One-time", color: COLORS.danger },
  Casual: { label: "Casual", color: COLORS.warning },
  Regular: { label: "Regular", color: COLORS.success },
  Power: { label: "Power", color: COLORS.secondary },
  "User Input": { label: "User Input", color: "#94a3b8" },
  Enhanced: { label: "Enhanced", color: COLORS.success },
  standard: { label: "Standard", color: PIE_COLORS[0] },
  "deep research": { label: "Deep Research", color: PIE_COLORS[1] },
  prompts: { label: "Prompts", color: COLORS.primary },
  users: { label: "Active Users", color: COLORS.secondary },
} satisfies ChartConfig;

export function MainContent() {
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("Last 7 Days");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange(
        dateFilter,
        customStartDate ? new Date(customStartDate) : undefined,
        customEndDate ? new Date(customEndDate) : undefined,
      );

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate.toISOString());
      if (endDate) params.set("endDate", endDate.toISOString());

      const response = await fetch(`/api/analytics?${params.toString()}`);
      const result: AnalyticsResponse = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to fetch data");
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleDownloadReport = () => {
    window.open("/report", "_blank");
  };

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 min-w-0 bg-background overflow-x-hidden">
      <ScrollArea className="h-screen relative z-10">
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Analytics Overview
              </h1>
              <p className="mt-2 text-muted-foreground text-sm md:text-base">
                Real-time insights of Velocity
              </p>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {format(new Date(), "MMM d, yyyy")}
              </div>
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReport}
                className="h-9"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Download Report</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 p-3 md:p-4 rounded-xl border bg-card/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Select
                value={dateFilter}
                onValueChange={(value) =>
                  setDateFilter(value as DateFilterOption)
                }
              >
                <SelectTrigger className="w-full sm:w-48 h-10 text-sm">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="Yesterday">Yesterday</SelectItem>
                  <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                  <SelectItem value="Last 14 Days">Last 14 Days</SelectItem>
                  <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                  <SelectItem value="Last 90 Days">Last 90 Days</SelectItem>
                  <SelectItem value="All Time">All Time</SelectItem>
                  <SelectItem value="Custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === "Custom" && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="flex-1 sm:w-36 h-10"
                  />
                  <span className="text-muted-foreground self-center text-sm">
                    to
                  </span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="flex-1 sm:w-36 h-10"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {data && `${data.metrics.total.toLocaleString()} prompts`}
              </span>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={loading}
                className="h-10 px-4"
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
          </div>

          {data && (
            <>
              {/* Key Metrics Section */}
              <section className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
                  Value & Key Metrics
                </h2>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  <MetricCard
                    title="Total Prompts"
                    value={data.metrics.total.toLocaleString()}
                    subtitle="Volume"
                    icon={BarChart2}
                    color={COLORS.primary}
                    tooltip="Total number of prompts processed"
                  />
                  <MetricCard
                    title="Enhanced"
                    value={data.metrics.enhanced.toLocaleString()}
                    subtitle={`${(data.metrics.enhancementRate ?? 0).toFixed(1)}% rate`}
                    icon={CheckCircle}
                    color={COLORS.success}
                    tooltip="Number of prompts successfully enhanced"
                  />
                  <MetricCard
                    title="Failed"
                    value={data.metrics.failed.toLocaleString()}
                    subtitle={`${(data.metrics.failureRate ?? 0).toFixed(1)}% failure rate`}
                    icon={XCircle}
                    color={COLORS.danger}
                    tooltip="Enhancements that failed"
                  />
                  <MetricCard
                    title="Unique Users"
                    value={data.metrics.uniqueUsers.toLocaleString()}
                    icon={Users}
                    color={COLORS.info}
                    tooltip="Distinct users in this segment"
                  />
                </div>

                {/* Performance Sub-metrics */}
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Performance & Sub-metrics
                </h3>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard
                    title="Avg Processing"
                    value={`${((data.metrics.avgProcessingTime ?? 0) / 1000).toFixed(2)}s`}
                    icon={Timer}
                    color={COLORS.warning}
                    tooltip="Average time to process a prompt"
                  />
                  <MetricCard
                    title="Time Saved"
                    value={`${(data.metrics.totalTimeSavedHours ?? 0).toFixed(1)}h`}
                    icon={Clock}
                    color={COLORS.secondary}
                    tooltip="Estimated hours saved by enhancements"
                  />
                  <MetricCard
                    title="Enhancement"
                    value={`${(data.metrics.enhancementRate ?? 0).toFixed(1)}%`}
                    icon={Zap}
                    color={COLORS.success}
                    tooltip="% of prompts successfully enhanced"
                  />
                  <MetricCard
                    title="Refine Rate"
                    value={`${(data.metrics.refineRate ?? 0).toFixed(1)}%`}
                    icon={TrendingUp}
                    color={COLORS.pink}
                    tooltip="% of prompts refined by users after enhancement"
                  />
                </div>
              </section>

              {/* Growth & Retention Section */}
              <section className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
                  Growth & Retention
                </h2>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  <MetricCard
                    title="Active Users"
                    value={data.growth.activeUsers.toLocaleString()}
                    icon={Users}
                    color={COLORS.info}
                    tooltip="Unique users in this segment"
                  />
                  <MetricCard
                    title="Daily Habit"
                    value={data.growth.dailyHabitUsers.toLocaleString()}
                    icon={Flame}
                    color={COLORS.warning}
                    tooltip="Users active 5+ days"
                  />
                  <MetricCard
                    title="Power Rate"
                    value={`${(data.growth.powerUserRate ?? 0).toFixed(1)}%`}
                    icon={Zap}
                    color={COLORS.pink}
                    tooltip="% users with 20+ prompts"
                  />
                  <MetricCard
                    title="Intensity"
                    value={(data.growth.intensity ?? 0).toFixed(1)}
                    icon={Activity}
                    color={COLORS.secondary}
                    tooltip="Prompts per user"
                  />
                  <MetricCard
                    title="Retention"
                    value={`${(data.growth.retentionRate ?? 0).toFixed(1)}%`}
                    icon={Target}
                    color={COLORS.lime}
                    tooltip="Users returning"
                  />
                </div>
                <div className="mt-8">
                  <ChartCard
                    title="User & Prompt Growth"
                    tooltip="Daily prompts vs active users over time"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[220px] sm:h-[280px] md:h-[300px] w-full"
                    >
                      <LineChart
                        data={data.timeAnalysis.dailyActivity}
                        margin={{ left: 12, right: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={32}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            });
                          }}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke={COLORS.primary}
                          tick={{ fill: COLORS.primary }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke={COLORS.secondary}
                          tick={{ fill: COLORS.secondary }}
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Line
                          yAxisId="left"
                          dataKey="prompts"
                          type="monotone"
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="right"
                          dataKey="users"
                          type="monotone"
                          stroke={COLORS.secondary}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ChartContainer>
                  </ChartCard>
                </div>
              </section>

              {/* Distribution Analysis Section */}
              <section className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
                  Distribution Analysis
                </h2>

                <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                  <ChartCard
                    title="Top Intents"
                    tooltip="Most common user intents"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                    >
                      <BarChart
                        data={data.distributions.topIntents}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="count"
                          fill={COLORS.secondary}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Top Domains" tooltip="Most common domains">
                    <ChartContainer
                      config={chartConfig}
                      className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                    >
                      <BarChart
                        data={data.distributions.topDomains}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="count"
                          fill={COLORS.primary}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard
                    title="Complexity Distribution"
                    tooltip="Prompt complexity breakdown"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                    >
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={data.distributions.complexity}
                      >
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                        />
                        <Radar
                          name="Count"
                          dataKey="count"
                          stroke={COLORS.primary}
                          fill={COLORS.primary}
                          fillOpacity={0.6}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RadarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard
                    title="Mode Distribution"
                    tooltip="Enhancement mode breakdown"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                    >
                      <BarChart data={data.distributions.mode}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {data.distributions.mode.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>
                </div>
              </section>

              {/* Time Analysis Section */}
              <section className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
                  Time Analysis
                </h2>

                <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                  <ChartCard
                    title="Daily Activity"
                    tooltip="Prompts processed per day"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                    >
                      <AreaChart data={data.timeAnalysis.dailyActivity}>
                        <defs>
                          <linearGradient
                            id="colorPromptsDaily"
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) =>
                            format(new Date(value), "MMM d")
                          }
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="prompts"
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPromptsDaily)"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard
                    title="By Day of Week"
                    tooltip="Activity distribution by weekday"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                    >
                      <BarChart data={data.timeAnalysis.dayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="count"
                          fill={COLORS.primary}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard
                    title="Activity by Time of Day"
                    tooltip="Distribution across time periods"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                    >
                      <BarChart data={data.timeAnalysis.timePeriod}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="count"
                          fill={COLORS.warning}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard
                    title="LLM Distribution"
                    tooltip="Which LLM models are being used"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[180px] sm:h-[200px] md:h-[220px] w-full"
                    >
                      <PieChart>
                        <Pie
                          data={data.distributions.llm as any[]}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          label
                        >
                          {data.distributions.llm.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </ChartCard>
                </div>
              </section>

              {/* Deep Insights Section */}
              <section className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
                  Deep Insights
                </h2>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  <MetricCard
                    title="Avg User Prompt"
                    value={`${(data.insights.avgUserPromptLength ?? 0).toFixed(0)}`}
                    subtitle="characters"
                    icon={BarChart2}
                    color={COLORS.primary}
                    tooltip="Average character count of user input prompts"
                  />
                  <MetricCard
                    title="Avg Enhanced"
                    value={`${(data.insights.avgEnhancedPromptLength ?? 0).toFixed(0)}`}
                    subtitle="characters"
                    icon={Zap}
                    color={COLORS.success}
                    tooltip="Average character count of enhanced prompts"
                  />
                  <MetricCard
                    title="Avg Processing"
                    value={`${((data.metrics.avgProcessingTime ?? 0) / 1000).toFixed(2)}s`}
                    subtitle="per prompt"
                    icon={Timer}
                    color={COLORS.warning}
                    tooltip="Average time to process a prompt"
                  />
                  <MetricCard
                    title="Expansion Ratio"
                    value={`${(data.insights.expansionRatio ?? 0).toFixed(1)}x`}
                    subtitle={`${(data.insights.avgUserWords ?? 0).toFixed(0)} → ${(data.insights.avgEnhancedWords ?? 0).toFixed(0)} words`}
                    icon={TrendingUp}
                    color={COLORS.secondary}
                    tooltip="How much prompts are expanded"
                  />
                </div>

                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  <ChartCard
                    title="User Segments"
                    tooltip="One-time: 1 | Casual: 2-5 | Regular: 6-20 | Power: 21+"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[180px] sm:h-[200px] md:h-[220px] w-full"
                    >
                      <BarChart data={data.insights.userSegments}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {data.insights.userSegments.map((entry, index) => {
                            const colorMap: Record<string, string> = {
                              "One-time": COLORS.danger,
                              Casual: COLORS.warning,
                              Regular: COLORS.success,
                              Power: COLORS.secondary,
                            };
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={colorMap[entry.name] || COLORS.primary}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard
                    title="Word Count Expansion"
                    tooltip="Average word count comparison"
                  >
                    <ChartContainer
                      config={chartConfig}
                      className="h-[180px] sm:h-[200px] md:h-[220px] w-full"
                    >
                      <BarChart
                        data={[
                          {
                            name: "User Input",
                            count: data.insights.avgUserWords,
                          },
                          {
                            name: "Enhanced",
                            count: data.insights.avgEnhancedWords,
                          },
                        ]}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={100} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          <Cell fill="#94a3b8" />
                          <Cell fill={COLORS.success} />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center text-sm text-muted-foreground border-t pt-4">
                © Velocity 2026
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
