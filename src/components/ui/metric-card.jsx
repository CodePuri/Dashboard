"use client";

import * as React from "react";
import { Info, ArrowUpRight, ArrowDownRight, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Dot,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Brighter color palette for better dark mode visibility
export const COLORS = {
  primary: "#3b82f6", // Blue 500
  secondary: "#94a3b8", // Slate 400 (visible on dark)
  success: "#22c55e", // Green 500
  warning: "#eab308", // Yellow 500
  danger: "#ef4444", // Red 500
  info: "#06b6d4", // Cyan 500
  pink: "#ec4899", // Pink 500
  lime: "#84cc16", // Lime 500
};

export const PIE_COLORS = [
  "#2563eb",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#16a34a",
  "#9333ea",
  "#4f46e5",
  "#e11d48",
];

export const SparklineV2 = ({
  data,
  dataKey,
  color = COLORS.primary,
  height = 50,
  isAnimationActive = true,
}) => {
  if (!data || data.length === 0) return null;

  const lastIndex = data.length - 1;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient
              id={`gradient-${dataKey}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            hide={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            minTickGap={100}
            tickFormatter={(value) => {
              const date = new Date(value);
              if (isNaN(date.getTime())) return value;
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${dataKey})`}
            isAnimationActive={isAnimationActive}
            activeDot={false}
            dot={(props) => {
              const { cx, cy, index } = props;
              if (index === lastIndex) {
                return (
                  <Dot
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={color}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }
              return null;
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RetentionDropOffSparkline = ({ data, color = COLORS.primary }) => {
  if (!data || data.length === 0) return null;

  return (
    <ChartContainer
      config={{
        Free: { label: "Free", color: "#818cf8" },
        Freetrial: { label: "Trial", color: "#c084fc" },
        Pro: { label: "Pro", color: "#34d399" },
      }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 15, right: 5, left: 5, bottom: 0 }}
        >
          <Bar
            dataKey="Free"
            stackId="retention"
            fill="#818cf8"
            radius={[0, 0, 0, 0]}
            isAnimationActive={true}
            barSize={32}
          />
          <Bar
            dataKey="Freetrial"
            stackId="retention"
            fill="#c084fc"
            radius={[0, 0, 0, 0]}
            isAnimationActive={true}
            barSize={32}
          />
          <Bar
            dataKey="Pro"
            stackId="retention"
            fill="#34d399"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            barSize={32}
            label={{
              position: "top",
              fontSize: 9,
              fontWeight: "900",
              fill: color,
              formatter: (v, entry) => {
                const total =
                  entry?.payload?.val ?? entry?.payload?.total ?? v ?? 0;
                return `${Number(total).toFixed(0)}%`;
              },
            }}
          />
          <XAxis
            dataKey="name"
            hide={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: "700", fill: "#94a3b8" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export const RetentionTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md border-border/50 min-w-[160px]">
        <div className="text-xs font-semibold text-foreground mb-2">
          {label} Retention
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#818cf8]" />
              <span>Free</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono font-semibold">
                {(data.Free || 0).toFixed(1)}%
              </span>
              <span className="text-[9px] text-muted-foreground">
                ({data.FreeCount || 0} users)
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#c084fc]" />
              <span>Trial</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono font-semibold">
                {(data.Freetrial || 0).toFixed(1)}%
              </span>
              <span className="text-[9px] text-muted-foreground">
                ({data.FreetrialCount || 0} users)
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#34d399]" />
              <span>Pro</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono font-semibold">
                {(data.Pro || 0).toFixed(1)}%
              </span>
              <span className="text-[9px] text-muted-foreground">
                ({data.ProCount || 0} users)
              </span>
            </div>
          </div>
          <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between items-start text-xs">
            <span className="font-medium mt-0.5">Total Retention</span>
            <div className="flex flex-col items-end">
              <span className="font-mono font-bold text-primary">
                {(data.val || data.total || 0).toFixed(1)}%
              </span>
              <span className="text-[9px] text-muted-foreground font-medium">
                ({data.totalCount || 0} users)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const RetentionDetailedChart = ({ data, color = COLORS.primary }) => {
  if (!data || data.length === 0) return null;

  return (
    <ChartContainer
      config={{
        Free: { label: "Free", color: "#818cf8" },
        Freetrial: { label: "Trial", color: "#c084fc" },
        Pro: { label: "Pro", color: "#34d399" },
      }}
      className="h-[300px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            className="text-muted-foreground/10"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 12,
              fontWeight: "500",
              fill: "var(--muted-foreground)",
            }}
          />
          <YAxis
            unit="%"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <ChartTooltip content={<RetentionTooltip />} />
          <Bar
            dataKey="Free"
            stackId="retention"
            fill="#818cf8" // Indigo
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Freetrial"
            stackId="retention"
            fill="#c084fc" // Purple
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Pro"
            stackId="retention"
            fill="#34d399" // Emerald
            radius={[4, 4, 0, 0]}
            label={{
              position: "top",
              fontSize: 12,
              fontWeight: "900",
              fill: "var(--foreground)",
              formatter: (v, entry) => {
                const total =
                  entry?.payload?.val ?? entry?.payload?.total ?? v ?? 0;
                return `${Number(total).toFixed(1)}%`;
              },
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export const DetailedChartV2 = ({
  data,
  dataKey,
  color = COLORS.primary,
  title,
  isAnimationActive = true,
}) => {
  if (!data || data.length === 0) return null;

  return (
    <ChartContainer
      config={{
        [dataKey]: {
          label: title,
          color: color,
        },
      }}
      className="h-full w-full"
    >
      <AreaChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient
            id={`detailed-gradient-${dataKey}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="currentColor"
          className="text-muted-foreground/10"
        />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, className: "fill-muted-foreground" }}
          minTickGap={30}
          tickFormatter={(value) => {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, className: "fill-muted-foreground" }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                const date = new Date(value);
                if (isNaN(date.getTime())) return value;
                return date.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={3}
          fillOpacity={1}
          fill={`url(#detailed-gradient-${dataKey})`}
          isAnimationActive={isAnimationActive}
          animationDuration={1000}
        />
      </AreaChart>
    </ChartContainer>
  );
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  change,
  invertTrendColor, // New prop: if true, negative is green, positive is red
  tooltip,
  chart,
  detailedChart, // New prop for larger chart
  dialogContent, // Custom content for the dialog
  className,
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-all hover:shadow-md dark:hover:bg-accent/5 flex flex-col gap-4 min-w-0 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div
              className="p-1.5 rounded-lg bg-muted/5 flex items-center justify-center"
              style={{ color: `${color}44` }}
            >
              <Icon className="h-4 w-4" style={{ color: color }} />
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground/80 tracking-tight uppercase">
              {title}
            </span>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground/30 transition-colors hover:text-primary outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-full p-0.5">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs text-[11px] leading-relaxed bg-popover/90 text-popover-foreground backdrop-blur-md border-primary/20"
                >
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {(detailedChart || dialogContent) && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="text-muted-foreground/30 hover:opacity-100 transition-opacity"
                style={{ "--hover-color": color }}
              >
                <Maximize2 className="h-3.5 w-3.5 hover:text-[var(--hover-color)] transition-colors" />
              </button>
            </DialogTrigger>
            <DialogContent
              className={cn(
                "bg-background/95 backdrop-blur-sm border-primary/10 overflow-hidden flex flex-col gap-0 p-0 sm:rounded-2xl",
                dialogContent
                  ? "sm:max-w-[95vw] lg:max-w-[1000px] h-[85vh] sm:h-[600px]"
                  : "sm:max-w-[700px]",
              )}
            >
              <DialogHeader className="p-6 pb-2 border-b border-border/40">
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {Icon && (
                      <Icon className="h-5 w-5" style={{ color: color }} />
                    )}
                    <span className="text-xl font-bold tracking-tight">
                      {title}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border/60 mx-1" />
                  <span
                    className="text-2xl font-black tabular-nums"
                    style={{ color: color }}
                  >
                    {value}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-auto p-6 scrollbar-thin">
                {dialogContent ? (
                  <div className="animate-in fade-in zoom-in-95 duration-500 h-full">
                    {dialogContent}
                  </div>
                ) : (
                  <div className="h-[350px] w-full animate-in zoom-in-95 duration-300">
                    {detailedChart}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          {change !== undefined && (
            <div
              className={cn(
                "flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md w-fit",
                (invertTrendColor ? change <= 0 : change >= 0)
                  ? "text-green-600 bg-green-500/10"
                  : "text-red-600 bg-red-500/10",
              )}
            >
              {change >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5 stroke-[3px]" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5 stroke-[3px]" />
              )}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
          {subtitle && !change && (
            <p className="text-xs text-muted-foreground font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>

        {chart && (
          <div className="flex-1 min-w-0 max-w-[200px] h-[60px] sm:h-[80px] animate-in fade-in duration-700">
            {chart}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  children,
  tooltip,
  headerAction,
  className,
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/50 backdrop-blur-xl text-card-foreground p-4 sm:p-5 md:p-6 shadow-xl shadow-black/5 flex flex-col h-full min-w-0 overflow-hidden transition-all hover:bg-card/60 hover:shadow-2xl hover:shadow-black/10",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <h3 className="font-bold text-xs uppercase tracking-[0.1em] text-muted-foreground/90">
            {title}
          </h3>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/30 transition-colors hover:text-primary outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-full p-0.5">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs text-[11px] leading-relaxed bg-popover/90 text-popover-foreground backdrop-blur-md border-primary/20"
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {headerAction && (
          <div className="flex items-center animate-in fade-in slide-in-from-right-2 duration-500">
            {headerAction}
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
