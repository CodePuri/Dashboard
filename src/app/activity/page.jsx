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
import { ActiveUsersChart } from "@/components/ui/active-users-chart";
import { PeakUsageChart } from "@/components/ui/peak-usage-chart";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Zap,
  Clock,
  Users,
  BarChart2,
  UserPlus,
  Monitor,
  MonitorOff,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const chartConfig = {
  prompts: {
    label: "Prompts",
    color: COLORS.primary,
  },
  users: {
    label: "Active Users",
    color: COLORS.secondary,
  },
  count: {
    label: "Count",
    color: COLORS.primary,
  },
  Free: {
    label: "Free",
    color: "#a78bfa", // Violet 400
  },
  Freetrial: {
    label: "Free Trial",
    color: "#22d3ee", // Cyan 400
  },
  Pro: {
    label: "Pro",
    color: "#fb7185", // Rose 400
  },
};

const SEGMENT_COLORS = {
  Free: "#a78bfa", // Violet
  Freetrial: "#22d3ee", // Cyan
  Pro: "#fb7185", // Rose
};

// Define distinct palettes for each chart
const PALETTES = {
  dayOfWeek: {
    Free: "#2dd4bf", // Teal 400
    Freetrial: "#22d3ee", // Cyan 400
    Pro: "#38bdf8", // Sky 400
  },
  timeOfDay: {
    Free: "#a78bfa", // Violet 400
    Freetrial: "#e879f9", // Fuchsia 400
    Pro: "#fb7185", // Rose 400
  },
  intents: {
    Free: "#34d399", // Emerald 400
    Freetrial: "#a3e635", // Lime 400
    Pro: "#4ade80", // Green 400
  },
  domains: {
    Free: "#fbbf24", // Amber 400
    Freetrial: "#fb923c", // Orange 400
    Pro: "#f87171", // Red 400
  },
  mode: {
    Free: "#818cf8", // Indigo 400
    Freetrial: "#c084fc", // Purple 400
    Pro: "#60a5fa", // Blue 400
  },
  llm: {
    Free: "#94a3b8", // Slate 400
    Freetrial: "#cbd5e1", // Slate 300
    Pro: "#64748b", // Slate 500
  },
};

export default function ActivityPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
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
              Activity
            </h1>
            <p className="text-muted-foreground">Loading activity data...</p>
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

  const metrics = data?.metrics;
  const timeAnalysis = data?.timeAnalysis;
  const growth = data?.growth;
  const distributions = data?.distributions;
  const installationMetrics = data?.installationMetrics;

  const isChatOnly = sourceFilter === "Chat";
  const timeSavedHours = metrics?.totalTimeSavedHours || 0;
  const dailyActivity = timeAnalysis?.dailyActivity || [];
  const dailyInstallationMetrics = data?.dailyInstallationMetrics || [];

  const promptsPerUser = growth?.activeUsers
    ? (metrics?.total || 0) / growth.activeUsers
    : 0;

  // Custom colors for Active Users chart on Activity page
  const activeUsersColors = {
    free: "#a78bfa", // Violet 400
    trial: "#22d3ee", // Cyan 400
    pro: "#fb7185", // Rose 400
    line: "#818cf8", // Indigo 400
  };

  const activeUsersChartData = data?.activeUsersChartData || [];
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Activity
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Usage patterns and session analytics
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

      {/* Metric Cards */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Activity Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Prompts"
            value={(metrics?.total || 0).toLocaleString()}
            subtitle={`${(metrics?.enhancementRate || 0).toFixed(1)}% enhanced`}
            icon={BarChart2}
            color={COLORS.primary}
            tooltip="Total Prompts (Count). Calculated by summing prompt entries in save_enhance_prompt for the selected period."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="prompts"
                  color={COLORS.primary}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="prompts"
                  color={COLORS.primary}
                  title="Daily Prompts"
                />
              ) : null
            }
          />
          <MetricCard
            title="Active Users"
            value={(growth?.activeUsers || 0).toLocaleString()}
            subtitle="Unique users"
            icon={Users}
            color={COLORS.info}
            tooltip="Active Users (Unique Count). Calculated by counting distinct users in save_enhance_prompt."
            chart={
              <ActiveUsersChart
                data={activeUsersChartData}
                variant="mini"
                colors={activeUsersColors}
              />
            }
            detailedChart={
              <ActiveUsersChart
                data={activeUsersChartData}
                variant="detailed"
                colors={activeUsersColors}
              />
            }
          />
          <MetricCard
            title="Peak Daily Usage"
            value={(growth?.intensity || 0).toFixed(1)}
            subtitle="Avg Max Prompts"
            icon={Zap}
            color={COLORS.warning}
            tooltip="Peak Daily Usage (Avg Max Prompts). Calculated by finding the maximum daily prompt count for each user, then averaging these maximums across all active users."
            chart={
              dailyActivity.length > 0 ? (
                <PeakUsageChart data={dailyActivity} variant="mini" />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <PeakUsageChart data={dailyActivity} variant="detailed" />
              ) : null
            }
          />
          <MetricCard
            title="Avg Processing"
            value={`${((metrics?.avgProcessingTime || 0) / 1000).toFixed(2)}s`}
            subtitle="Per enhancement"
            icon={Clock}
            color={COLORS.secondary}
            tooltip="Average Processing Time (Seconds). Calculated from the processing_time column in save_enhance_prompt for all successful enhancements."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="avgProcessingTime"
                  color={COLORS.secondary}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="avgProcessingTime"
                  color={COLORS.secondary}
                  title="Daily Avg Processing Time (s)"
                />
              ) : null
            }
          />
        </div>
      </section>

      {/* Value & ROI Metrics */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Value & ROI Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Time Saved"
            value={`${timeSavedHours.toFixed(1)}h`}
            subtitle="Estimated hours"
            icon={Clock}
            color={COLORS.secondary}
            tooltip="Velocity Time Saved (Hours). Calculated as Sum of (Extra Words / 40 wpm) * Complexity Multiplier. Multipliers: Low=1.0, Medium=1.2, High=1.4. Guardrails: Capped at 6 minutes per prompt."
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="timeSavedHours"
                  color={COLORS.secondary}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="timeSavedHours"
                  color={COLORS.secondary}
                  title="Daily Time Saved (Hours)"
                />
              ) : null
            }
          />
          <MetricCard
            title="Total Signups"
            value={installationMetrics?.total_signups?.toLocaleString() || "0"}
            subtitle="All Users"
            icon={UserPlus}
            color={COLORS.primary}
            tooltip="Total Signups (Count). Distinct users found in the usertable created during the selected period."
            chart={
              dailyInstallationMetrics.length > 0 ? (
                <SparklineV2
                  data={dailyInstallationMetrics}
                  dataKey="signups"
                  color={COLORS.primary}
                />
              ) : null
            }
            detailedChart={
              dailyInstallationMetrics.length > 0 ? (
                <DetailedChartV2
                  data={dailyInstallationMetrics}
                  dataKey="signups"
                  color={COLORS.primary}
                  title="Daily Signups"
                />
              ) : null
            }
          />
          <MetricCard
            title="Total Installs"
            value={
              isChatOnly
                ? "--"
                : installationMetrics?.total_installs?.toLocaleString() || "0"
            }
            subtitle="Extension Active"
            icon={Monitor}
            color={COLORS.info}
            tooltip="Current Installs (Count). Distinct users in usertable with installed = true."
            chart={
              !isChatOnly && dailyInstallationMetrics.length > 0 ? (
                <SparklineV2
                  data={dailyInstallationMetrics}
                  dataKey="installs"
                  color={COLORS.info}
                />
              ) : null
            }
            detailedChart={
              !isChatOnly && dailyInstallationMetrics.length > 0 ? (
                <DetailedChartV2
                  data={dailyInstallationMetrics}
                  dataKey="installs"
                  color={COLORS.info}
                  title="Daily Installs"
                />
              ) : null
            }
          />
          <MetricCard
            title="Total Uninstalls"
            value={
              isChatOnly
                ? "--"
                : installationMetrics?.total_uninstalls?.toLocaleString() || "0"
            }
            subtitle="Previously Used"
            icon={MonitorOff}
            color={COLORS.danger}
            tooltip="Total Uninstalls (Count). Calculated as users with installed = false who have prior prompt history in save_enhance_prompt."
            chart={
              !isChatOnly && dailyInstallationMetrics.length > 0 ? (
                <SparklineV2
                  data={dailyInstallationMetrics}
                  dataKey="uninstalls"
                  color={COLORS.danger}
                />
              ) : null
            }
            detailedChart={
              !isChatOnly && dailyInstallationMetrics.length > 0 ? (
                <DetailedChartV2
                  data={dailyInstallationMetrics}
                  dataKey="uninstalls"
                  color={COLORS.danger}
                  title="Daily Uninstalls"
                />
              ) : null
            }
          />
        </div>
      </section>

      {/* Charts */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Time Analysis
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <ChartCard
            title="Daily Activity"
            tooltip="Daily Prompt Volume. Count of prompt entries grouped by creation date."
          >
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <AreaChart data={timeAnalysis?.dailyActivity || []}>
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
                  tickFormatter={(value) => format(new Date(value), "MMM d")}
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
            tooltip="Weekly Activity Distribution. Breakdown of prompt volume by day of the week (derived from created_at)"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <BarChart data={timeAnalysis?.dayOfWeek || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="Free"
                  stackId="a"
                  fill={PALETTES.dayOfWeek.Free}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Freetrial"
                  stackId="a"
                  fill={PALETTES.dayOfWeek.Freetrial}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Pro"
                  stackId="a"
                  fill={PALETTES.dayOfWeek.Pro}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="Activity by Time of Day"
            tooltip="Hourly Activity Distribution. Categorized into Morning (6-12), Afternoon (12-18), Evening (18-24), and Night (0-6) based on created_at"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <BarChart data={timeAnalysis?.timePeriod || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="Free"
                  stackId="a"
                  fill={PALETTES.timeOfDay.Free}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Freetrial"
                  stackId="a"
                  fill={PALETTES.timeOfDay.Freetrial}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Pro"
                  stackId="a"
                  fill={PALETTES.timeOfDay.Pro}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </section>

      {/* Usage Patterns */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Usage Patterns
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          <ChartCard
            title="Top Intents"
            tooltip="User Intent Distribution. Categorization based on the detected intent stored in save_enhance_prompt"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <BarChart
                data={(distributions?.topIntents || []).slice(0, 8)}
                layout="vertical"
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
                  dataKey="Free"
                  stackId="a"
                  fill={PALETTES.intents.Free}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Freetrial"
                  stackId="a"
                  fill={PALETTES.intents.Freetrial}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Pro"
                  stackId="a"
                  fill={PALETTES.intents.Pro}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="Domain Distribution"
            tooltip="Domain Usage. Breakdown of the domain column where prompts were generated"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
            >
              <BarChart
                data={(distributions?.topDomains || []).slice(0, 8)}
                layout="vertical"
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
                  dataKey="Free"
                  stackId="a"
                  fill={PALETTES.domains.Free}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Freetrial"
                  stackId="a"
                  fill={PALETTES.domains.Freetrial}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Pro"
                  stackId="a"
                  fill={PALETTES.domains.Pro}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 mt-6">
          <ChartCard
            title="Mode Distribution"
            tooltip="Enhancement Modes. Usage breakdown by the mode column (e.g., Standard, Deep Research) in save_enhance_prompt"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[180px] sm:h-[200px] md:h-[220px] w-full"
            >
              <BarChart data={distributions?.mode || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="Free"
                  stackId="a"
                  fill={PALETTES.mode.Free}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Freetrial"
                  stackId="a"
                  fill={PALETTES.mode.Freetrial}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Pro"
                  stackId="a"
                  fill={PALETTES.mode.Pro}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="LLM Distribution"
            tooltip="LLM Targets. Breakdown of the target AI model (e.g., ChatGPT, Claude) recorded in llm_used column"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[180px] sm:h-[200px] md:h-[220px] w-full"
            >
              <BarChart
                data={distributions?.llm || []}
                layout="vertical"
                margin={{ left: 30, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="Free"
                  stackId="a"
                  fill={PALETTES.llm.Free}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Freetrial"
                  stackId="a"
                  fill={PALETTES.llm.Freetrial}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Pro"
                  stackId="a"
                  fill={PALETTES.llm.Pro}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
