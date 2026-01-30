"use client";

import { useState } from "react";
import { useAttritionData } from "@/hooks/use-attrition-data";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
  SparklineV2,
  DetailedChartV2,
} from "@/components/ui/metric-card";
import { Users, AlertCircle, Clock, Anchor } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Treemap,
  Tooltip,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { FilterBar } from "@/components/ui/filter-bar";

const chartConfig = {
  users: {
    label: "Users",
    color: COLORS.primary,
  },
};

// Custom Shape for Treemap content
const CustomizedContent = (props) => {
  const { root, depth, x, y, width, height, index, name, value, colors } =
    props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill:
            depth < 2
              ? colors[Math.floor((index / root.children.length) * 6)]
              : "none",
          stroke: "#fff",
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {depth === 1 ? (
        <text
          x={x + width / 2}
          y={y + height / 2 + 7}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
        >
          {name}
        </text>
      ) : null}
      {depth === 1 ? (
        <text x={x + 4} y={y + 18} fill="#fff" fontSize={16} fontWeight="bold">
          {index + 1}
        </text>
      ) : null}
    </g>
  );
};

export default function AttritionPage() {
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  const { data, isLoading } = useAttritionData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Attrition
          </h1>
          <p className="text-muted-foreground">Loading attrition data...</p>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const userList = data?.list || [];
  const totalUsers = userList.length;
  const churnedUsers = userList.filter((u) => u.isChurned);
  const churnCount = churnedUsers.length;
  const churnRate = totalUsers > 0 ? (churnCount / totalUsers) * 100 : 0;

  const powerUserThreshold = 20;
  const regrettableChurn = churnedUsers.filter(
    (u) => u.promptCount >= powerUserThreshold,
  ).length;

  const churnedLifespans = churnedUsers.map((u) => u.lifespanDays);
  const avgLifespan =
    churnedLifespans.length > 0
      ? churnedLifespans.reduce((a, b) => a + b, 0) / churnedLifespans.length
      : 0;

  const lastActionFailures = churnedUsers.filter(
    (u) => u.lastStatus === "Failure",
  ).length;
  const exitTriggerRate =
    churnCount > 0 ? (lastActionFailures / churnCount) * 100 : 0;

  // Chart Data Preparation

  // 1. Whale Scatter Plot
  const scatterData = userList.map((u) => ({
    x: Math.round(u.lifespanDays), // Days Active
    y: u.promptCount, // Lifetime Prompts
    z: 1, // Size
    status: u.isChurned ? "Churned" : "Active",
    userId: u.userId,
  }));

  // 2. Survival Curve
  const maxDay = 90;
  const survivalData = [];
  for (let i = 0; i <= maxDay; i += 7) {
    const survivors = userList.filter((u) => u.lifespanDays >= i).length;
    survivalData.push({
      day: i,
      date: `Day ${i}`,
      survival: totalUsers > 0 ? (survivors / totalUsers) * 100 : 0,
    });
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Attrition / Churn Analysis
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Understanding who is leaving and why
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
          Churn Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Regrettable Churn"
            value={regrettableChurn}
            subtitle="Power Users Lost"
            icon={Anchor}
            color={COLORS.warning}
            tooltip={`Users with >${powerUserThreshold} prompts who churned`}
            chart={
              data.dailyActivity?.length > 0 ? (
                <SparklineV2
                  data={data.dailyActivity}
                  dataKey="regrettableChurn"
                  color={COLORS.warning}
                />
              ) : null
            }
            detailedChart={
              data.dailyActivity?.length > 0 ? (
                <DetailedChartV2
                  data={data.dailyActivity}
                  dataKey="regrettableChurn"
                  color={COLORS.warning}
                  title="Daily Regrettable Churn Count"
                />
              ) : null
            }
          />
          <MetricCard
            title="User Lifespan"
            value={`${avgLifespan.toFixed(1)}d`}
            subtitle="Avg time to churn"
            icon={Clock}
            color={COLORS.info}
            tooltip="Average days between first and last prompt for churned users"
            chart={
              data.dailyActivity?.length > 0 ? (
                <SparklineV2
                  data={data.dailyActivity}
                  dataKey="avgLifespan"
                  color={COLORS.info}
                />
              ) : null
            }
            detailedChart={
              data.dailyActivity?.length > 0 ? (
                <DetailedChartV2
                  data={data.dailyActivity}
                  dataKey="avgLifespan"
                  color={COLORS.info}
                  title="Daily Avg Lifespan of Churned Users"
                />
              ) : null
            }
          />
          <MetricCard
            title="Exit Trigger"
            value={`${exitTriggerRate.toFixed(1)}%`}
            subtitle="Failed on last prompt"
            icon={AlertCircle}
            color={COLORS.secondary}
            tooltip="% of churned users whose last prompt failed"
            chart={
              data.dailyActivity?.length > 0 ? (
                <SparklineV2
                  data={data.dailyActivity}
                  dataKey="exitTriggerRate"
                  color={COLORS.secondary}
                />
              ) : null
            }
            detailedChart={
              data.dailyActivity?.length > 0 ? (
                <DetailedChartV2
                  data={data.dailyActivity}
                  dataKey="exitTriggerRate"
                  color={COLORS.secondary}
                  title="Daily Exit Trigger Rate (%)"
                />
              ) : null
            }
          />
        </div>
      </section>

      {/* Advanced Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Whale Scatter Plot */}
        <ChartCard
          title="Whale Scatter Plot (Power User Loss)"
          tooltip="Red dots high up are Regrettable Churn"
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid />
                <XAxis type="number" dataKey="x" name="Days Active" unit="d" />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Lifetime Prompts"
                  unit=""
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-black/90 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-xl text-xs text-white">
                          <p className="font-bold mb-1">{d.status}</p>
                          <div className="grid gap-1 opacity-90">
                            <p>User: {String(d.userId || "").slice(0, 8)}...</p>
                            <p>Active: {d.x} days</p>
                            <p>Prompts: {d.y}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Active Users - Green */}
                <Scatter
                  name="Active"
                  data={scatterData.filter((d) => d.status === "Active")}
                  fill={COLORS.success}
                />
                {/* Churned Users - Red */}
                <Scatter
                  name="Churned"
                  data={scatterData.filter((d) => d.status === "Churned")}
                  fill={COLORS.danger}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Survival Curve */}
        <ChartCard
          title="User Survival Curve"
          tooltip="% of users remaining active over time"
        >
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              data={survivalData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                label={{
                  value: "Days Since Signup",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="survival"
                stroke={COLORS.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>
      </div>
    </div>
  );
}
