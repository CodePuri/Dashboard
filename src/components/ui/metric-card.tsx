"use client";

import * as React from "react";
import { Info, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function MetricCard({
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

export function ChartCard({
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
