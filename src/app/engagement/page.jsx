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
import {
  ActiveUsersChart,
  PowerUserBar,
} from "@/components/ui/active-users-chart";
import { PeakUsageChart } from "@/components/ui/peak-usage-chart";
import { FilterBar } from "@/components/ui/filter-bar";
import { Activity, Zap, Crown, Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Line,
} from "recharts";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  count: {
    label: "Usage",
    color: COLORS.warning,
  },
};

export default function EngagementPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useAnalyticsData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Engagement
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
  const metrics = data?.metrics;

  const dailyActivity = data?.timeAnalysis?.dailyActivity || [];

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

  const powerUsersChartData = activeUsersChartData.map((d) => ({
    ...d,
    free: d.freePower,
    trial: d.trialPower,
    pro: d.proPower,
    total: d.freePower + d.trialPower + d.proPower,
  }));

  const insights = data?.insights;

  const dauMauRatio =
    growth?.activeUsers && growth.activeUsers > 0
      ? ((growth.dailyHabitUsers / growth.activeUsers) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Engagement
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            How deeply users interact with your product
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
          Engagement Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Stickiness"
            value={`${(metrics?.stickiness || 0).toFixed(1)}%`}
            subtitle="DAU / MAU"
            icon={Activity}
            color={COLORS.primary}
            tooltip="Stickiness (%). Ratio of Daily Active Users (DAU) to Monthly Active Users (MAU). Calculated as (DAU / MAU) * 100."
            chart={
              <ActiveUsersChart data={activeUsersChartData} variant="mini" />
            }
            detailedChart={
              <ActiveUsersChart
                data={activeUsersChartData}
                variant="detailed"
              />
            }
          />
          <MetricCard
            title="Peak Daily Usage"
            value={(growth?.intensity || 0).toFixed(1)}
            subtitle="Avg Max Prompts"
            icon={Zap}
            color={COLORS.success}
            tooltip="Peak Daily Usage (Avg Max Prompts). Average of each user's maximum daily prompt count. Calculated as Sum(Max Prompts per User) / Total Active Users."
            chart={
              <PeakUsageChart
                data={dailyActivity}
                variant="mini"
                showTooltip={true}
              />
            }
            detailedChart={
              <PeakUsageChart data={dailyActivity} variant="detailed" />
            }
          />
          <MetricCard
            title="Power Rate"
            value={`${(growth?.powerUserRate || 0).toFixed(1)}%`}
            subtitle="5+ prompts"
            icon={Crown}
            color={COLORS.warning}
            tooltip="Power Rate (%). Percentage of active users who have sent 5 or more prompts. Calculated as (Power Users / Total Active Users) * 100."
            chart={
              activeUsersChartData.length > 0 ? (
                <div className="h-full w-full">
                  <ChartContainer
                    config={{
                      free: { label: "Free", color: "#8b5cf6" },
                      trial: { label: "Trial", color: "#d946ef" },
                      pro: { label: "Pro", color: "#f43f5e" },
                    }}
                    className="h-full w-full"
                  >
                    <ComposedChart
                      data={activeUsersChartData}
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
                          <PowerUserBar patternIdGe5="stripe-pr-ge5-mini" />
                        }
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="#d946ef"
                        shape={
                          <PowerUserBar patternIdGe5="stripe-pr-ge5-mini" />
                        }
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="#f43f5e"
                        shape={
                          <PowerUserBar patternIdGe5="stripe-pr-ge5-mini" />
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
                      data={activeUsersChartData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                      barGap={0}
                      barCategoryGap="15%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="text-muted-foreground/10"
                      />
                      <XAxis
                        dataKey="date"
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
                          <PowerUserBar patternIdGe5="stripe-pr-ge5-detailed" />
                        }
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="trial"
                        stackId="users"
                        fill="#d946ef"
                        shape={
                          <PowerUserBar patternIdGe5="stripe-pr-ge5-detailed" />
                        }
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pro"
                        stackId="users"
                        fill="#f43f5e"
                        shape={
                          <PowerUserBar patternIdGe5="stripe-pr-ge5-detailed" />
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
            title="Refine Rate"
            value={`${metrics?.refinedCount || 0}`}
            subtitle={`out of ${metrics?.total || 0} prompts`}
            icon={Sparkles}
            color={COLORS.pink}
            tooltip="Refinement Rate (%). Proportion of prompts that were refined. Calculated as (Count of Refined Prompts / Total Enhanced Prompts) * 100."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="refineRate"
                  color={COLORS.pink}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <div className="h-[300px] w-full p-4">
                  <ChartContainer
                    config={{
                      refineRate: { label: "Refine Rate", color: COLORS.pink },
                    }}
                    className="h-full w-full"
                  >
                    <ComposedChart
                      data={dailyActivity}
                      margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="text-muted-foreground/10"
                      />
                      <XAxis
                        dataKey="date"
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
                        unit="%"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        width={40}
                      />
                      <ChartTooltip content={<RefineRateTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="refineRate"
                        stroke={COLORS.pink}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: COLORS.pink }}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              ) : null
            }
          />
        </div>
      </section>

      {/* Monetization & Segmentation */}
      {insights?.planAnalysis && (
        <section>
          <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
            Monetization & Segmentation
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Chart 1: Value Provided */}
            <ChartCard
              title="Value Provided per User"
              tooltip="Average Time Saved (Hours). Estimated economic value delivered per user. Calculated as Sum of (Extra Words / 40 wpm) * Complexity Multiplier. Multipliers: Low=1.0, Medium=1.2, High=1.4. Guardrails: Capped at 6 minutes per prompt. for each plan tier."
            >
              <ChartContainer
                config={{
                  paid: { label: "Paid", color: COLORS.success },
                  trial: { label: "Trial", color: COLORS.info },
                  free: { label: "Free", color: COLORS.secondary },
                }}
                className="h-[250px] w-full"
              >
                <BarChart
                  data={[
                    {
                      name: "Time Saved",
                      paid:
                        insights?.planAnalysis?.paid?.avgTimeSavedHours || 0,
                      trial:
                        insights?.planAnalysis?.trial?.avgTimeSavedHours || 0,
                      free:
                        insights?.planAnalysis?.free?.avgTimeSavedHours || 0,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis unit="h" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="paid"
                    fill={COLORS.success}
                    radius={[4, 4, 0, 0]}
                    name="Paid Users"
                    stackId="a"
                  />
                  <Bar
                    dataKey="trial"
                    fill={COLORS.info}
                    radius={[4, 4, 0, 0]}
                    name="Free Trial"
                    stackId="a"
                  />
                  <Bar
                    dataKey="free"
                    fill={COLORS.secondary}
                    radius={[4, 4, 0, 0]}
                    name="Free Users"
                    stackId="a"
                  />
                </BarChart>
              </ChartContainer>
            </ChartCard>

            {/* Chart 2: Total Volume by Plan */}
            <ChartCard
              title="Total Prompts per User"
              tooltip="Volume per User. Average total prompt volume per user. Calculated as (Total Prompts / Total Users) for each plan tier."
            >
              <ChartContainer
                config={{
                  paid: { label: "Paid", color: COLORS.success }, // Standardized to Green
                  trial: { label: "Trial", color: COLORS.info }, // Standardized to Blue
                  free: { label: "Free", color: COLORS.secondary }, // Standardized to Gray
                }}
                className="h-[250px] w-full"
              >
                <BarChart
                  data={[
                    {
                      name: "Prompts / User",
                      paid: insights?.planAnalysis?.paid?.promptsPerUser || 0,
                      trial: insights?.planAnalysis?.trial?.promptsPerUser || 0,
                      free: insights?.planAnalysis?.free?.promptsPerUser || 0,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="paid"
                    fill={COLORS.success} // Standardized to Green
                    radius={[4, 4, 0, 0]}
                    name="Paid Users"
                  />
                  <Bar
                    dataKey="trial"
                    fill={COLORS.info} // Standardized to Blue
                    radius={[4, 4, 0, 0]}
                    name="Free Trial"
                  />
                  <Bar
                    dataKey="free"
                    fill={COLORS.secondary} // Standardized to Gray
                    radius={[4, 4, 0, 0]}
                    name="Free Users"
                  />
                </BarChart>
              </ChartContainer>
            </ChartCard>
          </div>
        </section>
      )}

      {/* Top Users */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold">Leaderboard</h2>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="bg-card border rounded-xl overflow-hidden">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead className="w-[200px]">Email</TableHead>
                  <TableHead className="text-center w-[120px]">
                    Last Active
                  </TableHead>
                  <TableHead className="text-right w-[100px]">
                    Prompts
                  </TableHead>
                  <TableHead className="text-right w-[100px]">Exp.</TableHead>
                  <TableHead className="text-right w-[100px]">Time</TableHead>
                  <TableHead className="text-right w-[100px] pr-6">
                    Plan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(insights?.topPowerUsers || [])
                  .filter((user) => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      (user.name || "").toLowerCase().includes(query) ||
                      (user.email || "").toLowerCase().includes(query) ||
                      (user.userId || "").toLowerCase().includes(query)
                    );
                  })
                  .map((user, index) => (
                    <TableRow
                      key={user.userId}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div
                          className="truncate w-[180px]"
                          title={user.name || "Unknown User"}
                        >
                          {user.name || "Unknown User"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate w-[180px]">
                          #{user.userId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="truncate w-[180px] text-muted-foreground"
                          title={user.email || "-"}
                        >
                          {user.email || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {new Date(user.lastActive).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {user.promptCount}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {user.avgEnhancementScore.toFixed(1)}x
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {(user.timeSavedHours || 0).toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            ["paid", "pro", "premium"].some((k) =>
                              (user.status || "").toLowerCase().includes(k),
                            )
                              ? "bg-primary/10 text-primary"
                              : (user.status || "")
                                    .toLowerCase()
                                    .includes("trial")
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {(user.status || "").toLowerCase().includes("trial")
                            ? "Trial"
                            : user.status || "Free"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </section>
    </div>
  );
}

const TooltipRow = ({ color, label, value, subValue }) => (
  <div className="flex justify-between items-center text-xs gap-4">
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

const PowerRateTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = (data.free || 0) + (data.trial || 0) + (data.pro || 0);

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md border-border/50 min-w-[220px]">
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
            subValue={`(<5: ${data.freeLt5 || 0}, ≥5: ${data.freeGe5 || 0})`}
          />
          <TooltipRow
            color="#d946ef"
            label="Trial"
            value={data.trial || 0}
            subValue={`(<5: ${data.trialLt5 || 0}, ≥5: ${data.trialGe5 || 0})`}
          />
          <TooltipRow
            color="#f43f5e"
            label="Pro"
            value={data.pro || 0}
            subValue={`(<5: ${data.proLt5 || 0}, ≥5: ${data.proGe5 || 0})`}
          />
          <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between items-center text-xs">
            <span className="font-medium">Total Active Users</span>
            <span className="font-mono font-bold">{total}</span>
          </div>
          <div className="text-[10px] text-muted-foreground italic mt-1.5">
            Striped = Power Users (5+ prompts)
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const RefineRateTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const refined = data.refinedCount || 0;
    const total = data.prompts || 0;
    const rate = data.refineRate || 0;

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md border-border/50 min-w-[160px]">
        <div className="text-xs font-semibold text-foreground mb-2">
          {new Date(label).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Refined</span>
            <span className="font-mono font-semibold">{refined}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Total Prompts</span>
            <span className="font-mono font-semibold">{total}</span>
          </div>
          <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between items-center text-xs">
            <span className="font-medium text-pink-500">Refinement Rate</span>
            <span className="font-mono font-bold text-pink-500">
              {rate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
