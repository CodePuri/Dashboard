"use client";

import { useState } from "react";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  MetricCard,
  ChartCard,
  COLORS,
  SparklineV2,
  DetailedChartV2,
} from "@/components/ui/metric-card";
import {
  DollarSign,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Cpu,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer } from "@/components/ui/chart";

const chartConfig = {
  inputTokens: {
    label: "Input Tokens",
    color: COLORS.success,
  },
  outputTokens: {
    label: "Output Tokens",
    color: COLORS.warning,
  },
};

export default function CostsPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();

  const { data: analytics, isLoading } = useAnalyticsData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

  const tokens = analytics?.insights?.tokens || {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  };

  const dailyTrend = analytics?.timeAnalysis?.dailyActivity || [];

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Costs & Usage
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Track infrastructure costs and API token consumption
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

      {/* Primary Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total API Cost"
          value={`$${tokens.totalCost.toFixed(3)}`}
          color={COLORS.primary}
          icon={DollarSign}
          tooltip="Total Estimated Cost ($). Calculated as (Input Tokens / 1M * $1.00) + (Output Tokens / 1M * $3.00)."
          chart={
            <SparklineV2
              data={dailyTrend}
              dataKey="totalCost"
              color={COLORS.primary}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={dailyTrend}
              dataKey="totalCost"
              color={COLORS.primary}
              title="Daily API Cost Trend ($)"
            />
          }
        />
        <MetricCard
          title="Total Tokens"
          value={tokens.totalTokens.toLocaleString()}
          color={COLORS.info}
          icon={Coins}
          tooltip="Total Token Usage. Sum of input_token and output_token from save_enhance_prompt and refine_prompt tables."
          chart={
            <SparklineV2
              data={dailyTrend}
              dataKey="totalTokens"
              color={COLORS.info}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={dailyTrend}
              dataKey="totalTokens"
              color={COLORS.info}
              title="Daily Total Tokens Consumed"
            />
          }
        />
        <MetricCard
          title="Input Tokens"
          value={tokens.inputTokens.toLocaleString()}
          color={COLORS.success}
          icon={ArrowDownRight}
          tooltip="Input Tokens. The number of tokens sent to the AI models (prompts)."
          chart={
            <SparklineV2
              data={dailyTrend}
              dataKey="inputTokens"
              color={COLORS.success}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={dailyTrend}
              dataKey="inputTokens"
              color={COLORS.success}
              title="Daily Input Tokens"
            />
          }
        />
        <MetricCard
          title="Output Tokens"
          value={tokens.outputTokens.toLocaleString()}
          color={COLORS.warning}
          icon={ArrowUpRight}
          tooltip="Output Tokens. The number of tokens generated by the AI models (responses)."
          chart={
            <SparklineV2
              data={dailyTrend}
              dataKey="outputTokens"
              color={COLORS.warning}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={dailyTrend}
              dataKey="outputTokens"
              color={COLORS.warning}
              title="Daily Output Tokens"
            />
          }
        />
      </div>

      {/* Token Usage Chart */}
      <ChartCard
        title="Token Consumption Over Time"
        tooltip="Daily Token Consumption. Visualizes the trend of Input vs. Output token usage over time."
      >
        <ChartContainer config={chartConfig} className="h-[400px] w-full mt-4">
          <AreaChart data={dailyTrend}>
            <defs>
              <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={COLORS.success}
                  stopOpacity={0.3}
                />
                <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={COLORS.warning}
                  stopOpacity={0.3}
                />
                <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(str) => format(new Date(str), "MMM d")}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) =>
                val > 1000 ? `${(val / 1000).toFixed(1)}k` : val
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(str) =>
                    format(new Date(str), "MMMM d, yyyy")
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="inputTokens"
              name="Input Tokens"
              stroke={COLORS.success}
              fillOpacity={1}
              fill="url(#colorInput)"
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="outputTokens"
              name="Output Tokens"
              stroke={COLORS.warning}
              fillOpacity={1}
              fill="url(#colorOutput)"
              stackId="1"
            />
          </AreaChart>
        </ChartContainer>
        <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS.success }}
            ></div>
            <span>Input Tokens</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS.warning }}
            ></div>
            <span>Output Tokens</span>
          </div>
        </div>
      </ChartCard>

      {/* Cost Distribution / Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Efficiency Insights"
          tooltip="Cost Efficiency Metrics. Calculates Average Cost per Prompt and the Output/Input token ratio."
        >
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Avg. Cost per Prompt</p>
                  <p className="text-xs text-muted-foreground">
                    Across selected period
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold">
                $
                {analytics?.metrics?.total > 0
                  ? (tokens.totalCost / analytics.metrics.total).toFixed(4)
                  : "0.0000"}
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Cpu className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm font-medium">Output/Input Ratio</p>
                  <p className="text-xs text-muted-foreground">
                    Generation intensity
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold">
                {tokens.inputTokens > 0
                  ? (tokens.outputTokens / tokens.inputTokens).toFixed(2)
                  : "0.00"}
                x
              </p>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Cost Estimates Policy"
          tooltip="How costs are calculated"
        >
          <div className="space-y-4 pt-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              Costs are estimated based on token consumption recorded in{" "}
              <code className="text-foreground">save_enhance_prompt</code> and{" "}
              <code className="text-foreground">refine_prompt</code> tables.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <span className="text-foreground font-medium">
                  Input Tokens:
                </span>{" "}
                $1.00 per 1 million tokens (Estimated Avg)
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Output Tokens:
                </span>{" "}
                $3.00 per 1 million tokens (Estimated Avg)
              </li>
            </ul>
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs italic">
              * Actual costs may vary depending on the specific model used and
              current provider pricing.
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
