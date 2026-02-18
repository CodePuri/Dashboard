"use client";

import * as React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Premium color palette (default)
const DEFAULT_COLORS = {
  free: "hsl(220, 70%, 55%)", // Ocean blue
  trial: "hsl(160, 70%, 45%)", // Teal
  pro: "hsl(38, 95%, 55%)", // Amber gold
  line: "hsl(280, 65%, 60%)", // Purple for the line
};

// Custom bar with texture pattern for power users
export const PowerUserBar = (props) => {
  const {
    x,
    y,
    width,
    height,
    fill,
    payload,
    dataKey,
    patternId,
    patternIdGe5,
  } = props;

  // Legacy mode (single texture)
  if (patternId) {
    const powerKey = `${dataKey}Power`;
    const powerCount = payload?.[powerKey] || 0;
    const totalCount = payload?.[dataKey] || 0;
    const powerRatio = totalCount > 0 ? powerCount / totalCount : 0;
    const powerHeight = height * powerRatio;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          rx={2}
          ry={2}
        />
        {powerHeight > 0 && (
          <>
            <defs>
              <pattern
                id={patternId}
                patternUnits="userSpaceOnUse"
                width="4"
                height="4"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="4"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="2"
                />
              </pattern>
            </defs>
            <rect
              x={x}
              y={y + height - powerHeight}
              width={width}
              height={powerHeight}
              fill={`url(#${patternId})`}
              rx={2}
              ry={2}
            />
          </>
        )}
      </g>
    );
  }

  // Multi-texture mode (>=5 only)
  const ge5Key = `${dataKey}Ge5`;

  const countGe5 = payload?.[ge5Key] || 0;
  const totalCount = payload?.[dataKey] || 0;

  const hGe5 = totalCount > 0 ? height * (countGe5 / totalCount) : 0;

  return (
    <g>
      {/* Base Bar */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={2}
        ry={2}
      />

      {/* Ge5 Overlay (Bottom) - More than or equal to 5 */}
      {hGe5 > 0 && patternIdGe5 && (
        <>
          <defs>
            {/* Dense Crosshatch for >= 5 */}
            <pattern
              id={patternIdGe5}
              patternUnits="userSpaceOnUse"
              width="4"
              height="4"
              patternTransform="rotate(45)"
            >
              <path
                d="M0 0h4v4h-4z"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1.2"
              />
              <path
                d="M0 4L4 0"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1.2"
              />
            </pattern>
          </defs>
          <rect
            x={x}
            y={y + height - hGe5}
            width={width}
            height={hGe5}
            fill={`url(#${patternIdGe5})`}
            rx={2}
            ry={2}
          />
        </>
      )}
    </g>
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label, colors = DEFAULT_COLORS }) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
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
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: colors.free }}
              />
              <span>Free User Prompts</span>
            </div>
            <span className="font-mono font-semibold">
              {data?.["Free User Prompts"] || 0}
              {data?.freePower > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({data?.freePower})
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: colors.trial }}
              />
              <span>Freetrial User Prompts</span>
            </div>
            <span className="font-mono font-semibold">
              {data?.["Freetrial User Prompts"] || 0}
              {data?.trialPower > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({data?.trialPower})
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: colors.pro }}
              />
              <span>Pro User Prompts</span>
            </div>
            <span className="font-mono font-semibold">
              {data?.["Pro User Prompts"] || 0}
              {data?.proPower > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({data?.proPower})
                </span>
              )}
            </span>
          </div>

          <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between items-center text-xs">
            <span className="font-medium">Total Active</span>
            <span className="font-mono font-bold">{data?.total || 0}</span>
          </div>
          <div className="text-[10px] text-muted-foreground italic mt-1.5">
            Striped = Power Users (5+ prompts), count in ()
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function ActiveUsersChart({
  data,
  variant = "mini",
  className,
  colors = DEFAULT_COLORS,
  showTooltip = false,
}) {
  const chartId = React.useId().replace(/:/g, "");
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
    "Free User Prompts": { label: "Free User Prompts", color: colors.free },
    "Freetrial User Prompts": {
      label: "Freetrial User Prompts",
      color: colors.trial,
    },
    "Pro User Prompts": { label: "Pro User Prompts", color: colors.pro },
    total: { label: "Total", color: colors.line },
  };

  // Show all data provided by the API (which is already filtered by date)
  const displayData = data;

  return (
    <ChartContainer
      config={chartConfig}
      className={cn("w-full h-full", className)}
    >
      <ComposedChart
        data={displayData}
        margin={
          isDetailed
            ? { top: 20, right: 30, left: 10, bottom: 20 }
            : { top: 5, right: 5, left: 5, bottom: 5 }
        }
        barGap={0}
        barCategoryGap={isDetailed ? "15%" : "10%"}
      >
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
          minTickGap={30}
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
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={40}
          />
        )}

        {shouldShowTooltip && (
          <Tooltip content={<CustomTooltip colors={colors} />} />
        )}

        {isDetailed && (
          <Legend
            iconType="circle"
            wrapperStyle={{ paddingTop: "15px" }}
            formatter={(value) => (
              <span className="text-xs font-medium text-foreground capitalize">
                {value}
              </span>
            )}
          />
        )}

        {/* Stacked Bars with power user texture */}
        <Bar
          dataKey="Free User Prompts"
          stackId="users"
          fill={colors.free}
          shape={<PowerUserBar patternId={`stripe-free-${chartId}`} />}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="Freetrial User Prompts"
          stackId="users"
          fill={colors.trial}
          shape={<PowerUserBar patternId={`stripe-trial-${chartId}`} />}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="Pro User Prompts"
          stackId="users"
          fill={colors.pro}
          shape={<PowerUserBar patternId={`stripe-pro-${chartId}`} />}
          radius={[4, 4, 0, 0]}
        />

        {/* Line for total active users */}
        <Line
          type="monotone"
          dataKey="total"
          stroke={colors.line}
          strokeWidth={2}
          dot={isDetailed}
          activeDot={{ r: 5, fill: colors.line }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
