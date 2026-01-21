"use client";

import { useState } from "react";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
} from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Activity, Zap, Crown, Sparkles } from "lucide-react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
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
  const distributions = data?.distributions;
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
            value={`${dauMauRatio}%`}
            subtitle="Habit / Active"
            icon={Activity}
            color={COLORS.primary}
            tooltip="Ratio of daily habit users to total active users"
          />
          <MetricCard
            title="Peak Daily Usage"
            value={(growth?.intensity || 0).toFixed(1)}
            subtitle="Avg Max Prompts"
            icon={Zap}
            color={COLORS.success}
            tooltip="Average of users' maximum daily prompt count (Peak Usage)"
          />
          <MetricCard
            title="Power Users"
            value={`${(growth?.powerUserRate || 0).toFixed(1)}%`}
            subtitle="Top segment"
            icon={Crown}
            color={COLORS.warning}
            tooltip="Percentage of users with 20+ prompts"
          />
          <MetricCard
            title="Refine Rate"
            value={`${(metrics?.refineRate || 0).toFixed(1)}%`}
            subtitle="Refined"
            icon={Sparkles}
            color={COLORS.pink}
            tooltip="Percentage of prompts that users chose to refine"
          />
        </div>
      </section>

      {/* Charts */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Usage Patterns
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          <ChartCard
            title="Top Intents"
            tooltip="What users are trying to accomplish"
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
                  dataKey="count"
                  fill={COLORS.warning}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="Domain Distribution"
            tooltip="Content domains being enhanced"
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
                  dataKey="count"
                  fill={COLORS.secondary}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </section>

      {/* Monetization & Segmentation */}
      {insights?.planAnalysis && (
        <section>
          <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
            Monetization & Segmentation
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Chart 1: Value Captured */}
            <ChartCard
              title="Value Captured per User"
              tooltip="Average estimated hours saved per user"
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
              tooltip="Volume: Avg total prompts per user (vs Peak Daily Usage)"
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
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Leaderboard
        </h2>
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="p-4 bg-muted/30 border-b font-medium text-sm grid grid-cols-12 gap-2 md:gap-4 text-muted-foreground">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-2">User</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2 text-center">Active</div>
                <div className="col-span-1 text-right">Prompts</div>
                <div className="col-span-1 text-right">Exp.</div>
                <div className="col-span-1 text-right">Time</div>
                <div className="col-span-1 text-right">Plan</div>
              </div>
              <div className="divide-y">
                {(insights?.topPowerUsers || [])
                  .slice(0, 5)
                  .map((user, index) => (
                    <div
                      key={user.userId}
                      className="p-4 grid grid-cols-12 gap-2 md:gap-4 items-center text-sm hover:bg-muted/5"
                    >
                      <div className="col-span-1 font-bold text-muted-foreground text-center">
                        {index + 1}
                      </div>
                      <div className="col-span-2">
                        <div
                          className="font-medium truncate"
                          title={user.name || "Unknown User"}
                        >
                          {user.name || "Unknown User"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          #{user.userId}
                        </div>
                      </div>
                      <div
                        className="col-span-3 text-muted-foreground truncate"
                        title={user.email || "-"}
                      >
                        {user.email || "-"}
                      </div>
                      <div className="col-span-2 text-muted-foreground text-xs text-center">
                        {new Date(user.lastActive).toLocaleDateString()}
                      </div>
                      <div className="col-span-1 text-right font-medium">
                        {user.promptCount}
                      </div>
                      <div className="col-span-1 text-right text-muted-foreground">
                        {user.avgEnhancementScore.toFixed(1)}x
                      </div>
                      <div className="col-span-1 text-right font-medium text-green-600">
                        {(user.timeSavedHours || 0).toFixed(1)}h
                      </div>
                      <div className="col-span-1 text-right">
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
                            ? "Free Trial"
                            : user.status || "Free"}
                        </span>
                      </div>
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
