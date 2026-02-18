"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Premium color palette for Peak Usage
const PEAK_COLORS = {
  free: "#0ea5e9", // Sky 500
  trial: "#10b981", // Emerald 500
  pro: "#f59e0b", // Amber 500
  total: "#94a3b8", // Slate 400
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total =
      payload.find((p) => p.dataKey === "Total Prompts Intensity")?.value || 0;

    const getPercent = (val) => {
      if (!total || total === 0) return "0%";
      return `${((val / total) * 100).toFixed(0)}%`;
    };

    return (
      <div className="rounded-xl border bg-background/95 p-3 shadow-2xl backdrop-blur-xl border-border/50 min-w-[170px] max-w-[200px]">
        <div className="text-[11px] font-bold text-foreground mb-2 flex items-center justify-between">
          <span>
            {new Date(label).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-tighter font-medium">
            Peak
          </span>
        </div>

        <div className="space-y-2">
          {[
            {
              key: "Pro User Prompts Intensity",
              label: "Pro User Prompts Intensity",
              color: PEAK_COLORS.pro,
              shadow: "rgba(245,158,11,0.5)",
            },
            {
              key: "Freetrial User Prompts Intensity",
              label: "Freetrial User Prompts Intensity",
              color: PEAK_COLORS.trial,
              shadow: "rgba(16,185,129,0.5)",
            },
            {
              key: "Free User Prompts Intensity",
              label: "Free User Prompts Intensity",
              color: PEAK_COLORS.free,
              shadow: "rgba(14,165,233,0.5)",
            },
          ].map((seg) => {
            const val = payload.find((p) => p.dataKey === seg.key)?.value;
            return (
              <div
                key={seg.key}
                className="flex justify-between items-center text-[10px]"
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: seg.color,
                      boxShadow: `0 0 6px ${seg.shadow}`,
                    }}
                  />
                  <span className="text-muted-foreground">{seg.label}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono font-bold text-foreground">
                    {val?.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="border-t border-border/40 pt-2 mt-1">
            <div className="flex justify-between items-center text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  <div className="w-1 h-0.5 rounded-full bg-slate-400 opacity-60" />
                  <div className="w-1 h-0.5 rounded-full bg-slate-400 opacity-60" />
                </div>
                <span className="font-bold text-foreground">Total</span>
              </div>
              <span className="font-mono font-bold text-primary text-[11px]">
                {total.toFixed(1)}
              </span>
            </div>
            <p className="text-[8px] text-muted-foreground/80 italic mt-1.5 leading-tight opacity-80">
              * Number: Average max prompts per user.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function PeakUsageChart({
  data,
  variant = "mini",
  className,
  showTooltip = false,
}) {
  const isDetailed = variant === "detailed";
  const shouldShowTooltip = isDetailed || showTooltip;
  const hasData = data && data.length > 0;

  if (!hasData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No data</span>
      </div>
    );
  }

  const chartConfig = {
    "Free User Prompts Intensity": {
      label: "Free User Prompts Intensity",
      color: PEAK_COLORS.free,
    },
    "Freetrial User Prompts Intensity": {
      label: "Freetrial User Prompts Intensity",
      color: PEAK_COLORS.trial,
    },
    "Pro User Prompts Intensity": {
      label: "Pro User Prompts Intensity",
      color: PEAK_COLORS.pro,
    },
    "Total Prompts Intensity": {
      label: "Total Intensity",
      color: PEAK_COLORS.total,
    },
  };

  return (
    <ChartContainer
      config={chartConfig}
      className={cn(
        "w-full h-full",
        !isDetailed && "pointer-events-none",
        className,
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={
            isDetailed
              ? { top: 10, right: 10, left: 0, bottom: 0 }
              : { top: 5, right: 5, left: 5, bottom: 5 }
          }
        >
          <defs>
            <linearGradient id="colorFree" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={PEAK_COLORS.free}
                stopOpacity={0.3}
              />
              <stop offset="95%" stopColor={PEAK_COLORS.free} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTrial" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={PEAK_COLORS.trial}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={PEAK_COLORS.trial}
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="colorPro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PEAK_COLORS.pro} stopOpacity={0.3} />
              <stop offset="95%" stopColor={PEAK_COLORS.pro} stopOpacity={0} />
            </linearGradient>
          </defs>

          {isDetailed && (
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-muted-foreground/10"
            />
          )}

          <XAxis
            dataKey="date"
            hide={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            minTickGap={20}
            tickFormatter={(value) =>
              new Date(value).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />

          {isDetailed && (
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              width={30}
            />
          )}

          {shouldShowTooltip && <Tooltip content={<CustomTooltip />} />}

          {/* Ridge Plot - Overlapping Areas (No stackId) */}
          <Area
            type="monotone"
            dataKey="Free User Prompts Intensity"
            stroke={PEAK_COLORS.free}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorFree)"
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="Freetrial User Prompts Intensity"
            stroke={PEAK_COLORS.trial}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorTrial)"
            animationDuration={1800}
          />
          <Area
            type="monotone"
            dataKey="Pro User Prompts Intensity"
            stroke={PEAK_COLORS.pro}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorPro)"
            animationDuration={2100}
          />

          {/* Total Intensity Trend Line */}
          <Line
            type="monotone"
            dataKey="Total Prompts Intensity"
            stroke={PEAK_COLORS.total}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={isDetailed ? { r: 4, fill: PEAK_COLORS.total } : false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
