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
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Zap,
  UserCheck,
  Users,
  Skull,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useUsageData } from "@/hooks/use-usage-data";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageDetailedTable } from "./detailed-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";

export default function UsagePage() {
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  const [expandedCharts, setExpandedCharts] = useState({});
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const { data, isLoading } = useUsageData(
    dateFilter,
    sourceFilter,
    customDateRange,
  );

  const [upgradeSort, setUpgradeSort] = useState({
    key: null,
    direction: null,
  });

  const handleUpgradeSort = (key) => {
    let direction = "asc";
    if (upgradeSort.key === key && upgradeSort.direction === "asc") {
      direction = "desc";
    } else if (upgradeSort.key === key && upgradeSort.direction === "desc") {
      direction = null;
    }
    setUpgradeSort({ key, direction });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const segments = data.segments || {};
  const subData = data.subscription || {};
  const loyalty = data.loyalty || {};
  const tokens = data.tokenUsage || {};
  const prompts = data.promptSophistication || {};
  const features = data.featureLevel || {};
  const occupations = data.occupations?.slice(0, 5) || [];
  const complexityData = data.complexityDistribution || [];

  const rawUpgradeRecords = (segments.power?.records || []).filter(
    (r) => r.status === "free",
  );

  const upgradeRecords = [...rawUpgradeRecords].sort((a, b) => {
    if (!upgradeSort.key || !upgradeSort.direction) return 0;
    const aVal = a[upgradeSort.key];
    const bVal = b[upgradeSort.key];
    if (aVal === bVal) return 0;
    const result = aVal < bVal ? -1 : 1;
    return upgradeSort.direction === "asc" ? result : -result;
  });

  const upgradeColumns = [
    {
      label: "User",
      key: "name",
      className: "w-[180px]",
      render: (val, row) => (
        <div className="flex flex-col">
          <span
            className="font-bold text-foreground truncate max-w-[160px]"
            title={val}
          >
            {val}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60 tracking-tighter">
            #{String(row.id || "").slice(-8)}
          </span>
        </div>
      ),
    },
    {
      label: "Email",
      key: "email",
      className: "flex-1 min-w-[180px]",
      render: (val) => (
        <span
          className="text-[11px] text-muted-foreground/80 truncate block max-w-[200px]"
          title={val}
        >
          {val}
        </span>
      ),
    },
    {
      label: "Prompts",
      key: "totalPrompts",
      className: "text-right w-[100px] pr-4",
      render: (val) => (
        <span className="font-black text-amber-500 tabular-nums">{val}</span>
      ),
    },
  ];

  const userColumns = [
    {
      label: "User Identity",
      key: "name",
      render: (_, row) => (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span
            className="font-semibold text-foreground truncate"
            title={row.name}
          >
            {row.name}
          </span>
          <span
            className="text-[10px] text-muted-foreground/60 font-mono truncate"
            title={row.email}
          >
            {row.email}
          </span>
        </div>
      ),
    },
    {
      label: "Usage",
      key: "totalPrompts",
      render: (val, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary">{val} prompts</span>
          <span className="text-[10px] text-muted-foreground/60 tracking-tighter">
            Avg {row.avgTokens} tokens
          </span>
        </div>
      ),
    },
    {
      label: "Account Status",
      key: "status",
      render: (val) => {
        const isPro = val.includes("pro");
        const isTrial = val.includes("trial");
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1.5 h-4 font-black uppercase tracking-widest border-none shadow-none",
              isPro
                ? "bg-amber-500/10 text-amber-500"
                : isTrial
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-slate-500/10 text-slate-500",
            )}
          >
            {val}
          </Badge>
        );
      },
    },
    {
      label: "Last Seen",
      key: "lastActive",
      render: (val) => (
        <div className="flex items-center gap-1.5 text-muted-foreground/80">
          <span className="text-[10px] font-medium uppercase tracking-tighter">
            {new Date(val).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      ),
    },
  ];

  const behavioralColumns = [
    {
      label: "User Identity",
      key: "name",
      render: (_, row) => (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span
            className="font-semibold text-foreground truncate"
            title={row.name}
          >
            {row.name}
          </span>
          <span
            className="text-[10px] text-muted-foreground/60 font-mono truncate"
            title={row.email}
          >
            {row.email}
          </span>
        </div>
      ),
    },
    {
      label: "Classification",
      key: "segment",
      render: (_, row) => {
        if (row.isPower) {
          return (
            <div className="flex flex-col gap-1">
              <Badge
                variant="outline"
                className="w-fit text-[9px] px-1.5 h-4 font-black uppercase tracking-widest border-emerald-500/20 bg-emerald-500/5 text-emerald-600 shadow-none"
              >
                High Volume
              </Badge>
              <span className="text-[9px] text-muted-foreground/70">
                {row.activeDays} active days • {row.modesCount} modes
              </span>
            </div>
          );
        }
        if (row.isInactive || row.isDead) {
          return (
            <div className="flex flex-col gap-1">
              <Badge
                variant="outline"
                className="w-fit text-[9px] px-1.5 h-4 font-black uppercase tracking-widest border-rose-500/20 bg-rose-500/5 text-rose-500 shadow-none"
              >
                Inactive
              </Badge>
              <span className="text-[9px] text-muted-foreground/70">
                Last seen {row.daysInactive} days ago
              </span>
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-foreground/80">
              Casual Usage
            </span>
            <span className="text-[9px] text-muted-foreground/70">
              {row.activeDays} active days
            </span>
          </div>
        );
      },
    },
    {
      label: "Usage",
      key: "totalPrompts",
      render: (val, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary">{val} prompts</span>
          <span className="text-[10px] text-muted-foreground/60 tracking-tighter">
            Avg {row.avgTokens} tokens
          </span>
        </div>
      ),
    },
    {
      label: "Last Seen",
      key: "lastActive",
      render: (val) => (
        <div className="flex items-center gap-1.5 text-muted-foreground/80">
          <span className="text-[10px] font-medium uppercase tracking-tighter">
            {new Date(val).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      ),
    },
  ];

  const subscriptionColumns = [
    {
      label: "User Identity",
      key: "name",
      render: (_, row) => (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span
            className="font-semibold text-foreground truncate"
            title={row.name}
          >
            {row.name}
          </span>
          <span
            className="text-[10px] text-muted-foreground/60 font-mono truncate"
            title={row.email}
          >
            {row.email}
          </span>
        </div>
      ),
    },
    {
      label: "Plan Status",
      key: "status",
      render: (val, row) => {
        const isPro = val.includes("pro");
        const isTrial = val.includes("trial");
        return (
          <div className="flex flex-col gap-1">
            <Badge
              variant="outline"
              className={cn(
                "w-fit text-[9px] px-1.5 h-4 font-black uppercase tracking-widest border-none shadow-none",
                isPro
                  ? "bg-amber-500/10 text-amber-500"
                  : isTrial
                    ? "bg-blue-500/10 text-blue-500"
                    : "bg-slate-500/10 text-slate-500",
              )}
            >
              {val}
            </Badge>
            {isTrial && (
              <span className="text-[9px] text-muted-foreground/50">
                Trial ends in 3 days
              </span>
            )}
            {isPro && (
              <span className="text-[9px] text-muted-foreground/50">
                Active since {new Date(row.lastActive).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      },
    },
    {
      label: "Usage",
      key: "totalPrompts",
      render: (val, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary">{val} prompts</span>
          <span className="text-[10px] text-muted-foreground/60 tracking-tighter">
            Avg {row.avgTokens} tokens
          </span>
        </div>
      ),
    },
  ];

  const loyaltyColumns = [
    {
      label: "User Identity",
      key: "name",
      render: (_, row) => (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span
            className="font-semibold text-foreground truncate"
            title={row.name}
          >
            {row.name}
          </span>
          <span
            className="text-[10px] text-muted-foreground/60 font-mono truncate"
            title={row.email}
          >
            {row.email}
          </span>
        </div>
      ),
    },
    {
      label: "Models Used",
      key: "llmsList",
      render: (val) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {val && val.length > 0 ? (
            val.map((model) => (
              <span
                key={model}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 border border-border/50 text-muted-foreground/80 font-mono"
              >
                {model}
              </span>
            ))
          ) : (
            <span className="text-[9px] text-muted-foreground/40 font-mono">
              Unknown
            </span>
          )}
        </div>
      ),
    },
    {
      label: "Diversity",
      key: "diversity_metric",
      render: (_, row) => (
        <span className="text-[10px] font-medium text-foreground/70">
          {row.llmsList ? row.llmsList.length : 0} Models
        </span>
      ),
    },
    {
      label: "Usage",
      key: "totalPrompts",
      render: (val, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary">{val} prompts</span>
          <span className="text-[10px] text-muted-foreground/60 tracking-tighter">
            Avg {row.avgTokens} tokens
          </span>
        </div>
      ),
    },
  ];

  const featureColumns = [
    {
      label: "User Identity",
      key: "name",
      render: (_, row) => (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span
            className="font-semibold text-foreground truncate"
            title={row.name}
          >
            {row.name}
          </span>
          <span
            className="text-[10px] text-muted-foreground/60 font-mono truncate"
            title={row.email}
          >
            {row.email}
          </span>
        </div>
      ),
    },
    {
      label: "Feature Adoption",
      key: "modesList",
      render: (val) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {val && val.length > 0 ? (
            val.map((mode) => (
              <span
                key={mode}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-600/80 font-mono uppercase tracking-tight"
              >
                {mode}
              </span>
            ))
          ) : (
            <span className="text-[9px] text-muted-foreground/40 font-mono">
              Basic Chat
            </span>
          )}
        </div>
      ),
    },
    {
      label: "Count",
      key: "modesCount",
      render: (val) => (
        <span className="font-bold text-foreground/80">{val || 0}</span>
      ),
    },
    {
      label: "Usage",
      key: "totalPrompts",
      render: (val, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary">{val} prompts</span>
          <span className="text-[10px] text-muted-foreground/60 tracking-tighter">
            Avg {row.avgTokens} tokens
          </span>
        </div>
      ),
    },
  ];

  const occupationColumns = [
    {
      label: "User Identity",
      key: "name",
      render: (_, row) => (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span
            className="font-semibold text-foreground truncate"
            title={row.name}
          >
            {row.name}
          </span>
          <span
            className="text-[10px] text-muted-foreground/60 font-mono truncate"
            title={row.email}
          >
            {row.email}
          </span>
        </div>
      ),
    },
    {
      label: "Role",
      key: "occupation",
      render: (val) => (
        <Badge
          variant="secondary"
          className="text-[9px] font-bold uppercase tracking-wider bg-secondary/50 text-secondary-foreground/80"
        >
          {val || "Unknown"}
        </Badge>
      ),
    },
    {
      label: "Last Active",
      key: "lastActive",
      render: (val) => (
        <span className="text-[10px] text-muted-foreground/70 font-mono">
          {new Date(val).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      label: "Usage",
      key: "totalPrompts",
      render: (val, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary">{val} prompts</span>
          <span className="text-[10px] text-muted-foreground/60 tracking-tighter">
            Avg {row.avgTokens} tokens
          </span>
        </div>
      ),
    },
  ];

  const promptColumns = [
    {
      label: "Contributor",
      key: "name",
      render: (val, row) => (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span className="font-bold text-foreground/80 truncate" title={val}>
            {val}
          </span>
          <span
            className="text-[10px] text-muted-foreground/60 font-mono truncate"
            title={row.email}
          >
            {row.email}
          </span>
        </div>
      ),
    },
    {
      label: "Prompt Content",
      key: "content",
      render: (val) => (
        <div
          className="max-w-[300px] truncate font-mono text-[10px] leading-relaxed opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-between group"
          title="Double click to view full"
          onDoubleClick={() =>
            setSelectedPrompt({
              title: "Prompt Content",
              content: val,
            })
          }
        >
          <span className="truncate">{val}</span>
        </div>
      ),
    },
    {
      label: "Details",
      key: "length",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-primary font-bold">{val} chars</span>
          <span className="text-[9px] text-muted-foreground/60">
            {new Date(row.date).toLocaleDateString()}
          </span>
        </div>
      ),
    },
  ];

  const toggleExpand = (chartName) => {
    setExpandedCharts((prev) => ({
      ...prev,
      [chartName]: !prev[chartName],
    }));
  };

  const segmentData = [
    { name: "Power", count: segments.power?.count || 0, fill: "#10b981" }, // Emerald 500
    { name: "Casual", count: segments.casual?.count || 0, fill: "#8b5cf6" }, // Violet 500
    { name: "Inactive", count: segments.dead?.count || 0, fill: "#fb7185" }, // Rose 400
  ];

  const subscriptionData = [
    { name: "Pro", count: subData.pro?.count || 0, fill: COLORS.warning },
    {
      name: "Free Trial",
      count: subData.freetrial?.count || 0,
      fill: COLORS.info,
    },
    { name: "Free", count: subData.free?.count || 0, fill: COLORS.secondary },
  ];

  const loyaltyData = [
    { name: "Specialist", count: loyalty.specialist?.count || 0 },
    { name: "Explorer", count: loyalty.explorer?.count || 0 },
  ];

  const promptLengthData = [
    { name: "Short (<50)", count: prompts.short?.count || 0 },
    { name: "Medium", count: prompts.medium?.count || 0 },
    { name: "Long (>200)", count: prompts.long?.count || 0 },
  ];

  const featureLevelData = [
    { name: "LV1: Basic", count: features.level1?.count || 0 },
    { name: "LV2: Modes", count: features.level2?.count || 0 },
    { name: "LV3: Refine", count: features.level3?.count || 0 },
    { name: "LV4: Expert", count: features.level4?.count || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Usage Analysis
          </h1>
          <p className="text-muted-foreground text-sm">
            Actionable behavioral segmentation & revenue insights
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

      {/* Primary Engagement Row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start">
        <MetricCard
          title="Potential Upgrades"
          value={segments.power?.freePower || 0}
          subtitle="Free users with Power habits"
          icon={UserCheck}
          color={COLORS.warning}
          tooltip="Free tier users showing high engagement patterns - Prime candidates for upgrade. Power users (5+ prompts with diverse feature usage) currently on free plan."
          chart={
            <SparklineV2
              data={data.trends}
              dataKey="upgrades"
              color={COLORS.warning}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={data.trends}
              dataKey="upgrades"
              color={COLORS.warning}
              title="Potential Upgrades Trend"
            />
          }
          dialogContent={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                    Engagement Trend
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Volume of free users showing power behaviors over time.
                  </p>
                </div>
                <div className="flex-1 min-h-[250px] bg-muted/10 rounded-xl p-4 border border-border/40">
                  <DetailedChartV2
                    data={data.trends}
                    dataKey="upgrades"
                    color={COLORS.warning}
                    title="Upgrades Trend"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 min-h-0">
                <div className="flex flex-col">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                    Upgrade Candidates ({upgradeRecords.length})
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    High-volume users currently on the free tier.
                  </p>
                </div>
                <ScrollArea className="flex-1 min-h-0 bg-card/50 border border-border/40 rounded-xl">
                  <Table className="w-full">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent border-b border-border/40">
                        {upgradeColumns.map((col) => (
                          <TableHead
                            key={col.key}
                            className={cn(
                              "text-[9px] uppercase tracking-[0.15em] font-black text-muted-foreground/70 h-10 px-4",
                              col.className,
                            )}
                            onSort={() => handleUpgradeSort(col.key)}
                            sortDirection={
                              upgradeSort.key === col.key
                                ? upgradeSort.direction
                                : null
                            }
                          >
                            {col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upgradeRecords.map((row, i) => (
                        <TableRow
                          key={row.id || i}
                          className="h-12 border-border/40 hover:bg-amber-500/[0.02] transition-colors"
                        >
                          {upgradeColumns.map((col) => (
                            <TableCell
                              key={col.key}
                              className={cn(
                                "py-2 px-4 whitespace-nowrap overflow-hidden",
                                col.className,
                              )}
                            >
                              {col.render
                                ? col.render(row[col.key], row)
                                : row[col.key]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          }
        />
        <MetricCard
          title="Pro Users"
          value={subData.pro?.count || 0}
          subtitle="Revenue Baseline"
          icon={Zap}
          color={COLORS.success}
          tooltip="Total number of users currently on a paid subscription plan, representing the core revenue-generating user base."
          chart={
            <SparklineV2
              data={data.trends}
              dataKey="proUsers"
              color={COLORS.success}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={data.trends}
              dataKey="proUsers"
              color={COLORS.success}
              title="Pro Users Trend"
            />
          }
        />
        <MetricCard
          title="Explorer Rate"
          value={`${((loyalty.explorer?.count / (data.totalUsers || 1)) * 100).toFixed(1)}%`}
          subtitle="Multi-LLM utility"
          icon={Users}
          color={COLORS.info}
          tooltip="The percentage of users who utilize multiple LLM models, demonstrating high versatility and sophisticated tool usage."
          chart={
            <SparklineV2
              data={data.trends}
              dataKey="explorerRate"
              color={COLORS.info}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={data.trends}
              dataKey="explorerRate"
              color={COLORS.info}
              title="Explorer Rate Trend (%)"
            />
          }
        />
        <MetricCard
          title="Avg Tokens / User"
          value={tokens.avgTokens?.toLocaleString()}
          subtitle="Cost Efficiency"
          icon={Clock}
          color={COLORS.secondary}
          tooltip={`Avg tokens consumed by users calculated from input_token, output_token and user count.`}
          chart={
            <SparklineV2
              data={data.trends}
              dataKey="avgTokens"
              color={COLORS.secondary}
            />
          }
          detailedChart={
            <DetailedChartV2
              data={data.trends}
              dataKey="avgTokens"
              color={COLORS.secondary}
              title="Avg Tokens Trend"
            />
          }
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
        {/* Row 1: Users & Subscription */}
        <ChartCard
          title="Behavioral Segments"
          tooltip="Power: >5 prompts + high diversity. Dead: No activity in 14d."
          className="h-auto"
          headerAction={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider hover:bg-muted/20 hover:text-foreground transition-all duration-300 gap-2 rounded-full border border-muted-foreground/10"
              onClick={() => toggleExpand("engagement")}
            >
              {expandedCharts["engagement"] ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Skip List
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Drill Down
                </>
              )}
            </Button>
          }
        >
          {/* Primary Content Container */}
          <div className="h-[280px] w-full">
            <ChartContainer config={{}} className="h-full w-full">
              <RechartsPie>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="count"
                  nameKey="name"
                  stroke="none"
                >
                  {segmentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </RechartsPie>
            </ChartContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-4">
            {segmentData.map((s) => (
              <div key={s.name} className="flex items-center gap-2.5 group">
                <div
                  className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] group-hover:scale-125 transition-transform"
                  style={{ backgroundColor: s.fill }}
                />
                <span className="text-[11px] font-bold tracking-tight text-muted-foreground group-hover:text-foreground transition-colors">
                  {s.name}:{" "}
                  <span className="text-foreground ml-0.5">
                    {((s.count / (data.totalUsers || 1)) * 100).toFixed(0)}%
                  </span>
                </span>
              </div>
            ))}
          </div>

          {expandedCharts["engagement"] && (
            <div className="mt-8 pt-8 border-t border-muted-foreground/10 animate-in slide-in-from-bottom-4 duration-500">
              <UsageDetailedTable
                data={[
                  ...(segments.power?.records || []),
                  ...(segments.casual?.records || []),
                  ...(segments.dead?.records || []),
                ]}
                columns={behavioralColumns}
              />
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Revenue Pipeline (Status)"
          tooltip="Breakdown of paid vs trial vs free users"
          className="h-auto"
          headerAction={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider hover:bg-muted/20 hover:text-foreground transition-all duration-300 gap-2 rounded-full border border-muted-foreground/10"
              onClick={() => toggleExpand("subscription")}
            >
              {expandedCharts["subscription"] ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Skip List
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Drill Down
                </>
              )}
            </Button>
          }
        >
          {/* Primary Content Container */}
          <div className="h-[280px] w-full">
            <ChartContainer config={{}} className="h-full w-full">
              <RechartsPie>
                <Pie
                  data={subscriptionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="count"
                  nameKey="name"
                  stroke="none"
                >
                  {subscriptionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </RechartsPie>
            </ChartContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-4">
            {subscriptionData.map((s) => (
              <div key={s.name} className="flex items-center gap-2.5 group">
                <div
                  className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] group-hover:scale-125 transition-transform"
                  style={{ backgroundColor: s.fill }}
                />
                <span className="text-[11px] font-bold tracking-tight text-muted-foreground group-hover:text-foreground transition-colors">
                  {s.name}:{" "}
                  <span className="text-foreground ml-0.5">{s.count}</span>
                </span>
              </div>
            ))}
          </div>

          {expandedCharts["subscription"] && (
            <div className="mt-8 pt-8 border-t border-muted-foreground/10 animate-in slide-in-from-bottom-4 duration-500">
              <UsageDetailedTable
                data={[
                  ...(subData.pro?.records || []),
                  ...(subData.freetrial?.records || []),
                  ...(subData.free?.records || []),
                ]}
                columns={subscriptionColumns}
              />
            </div>
          )}
        </ChartCard>

        {/* Row 2: LLM Loyalty & Tokens */}
        <ChartCard
          title="Platform Specialization"
          tooltip="Do users stick to one LLM (Specialist) or hop around (Explorer)?"
          className="h-auto"
          headerAction={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider hover:bg-muted/20 hover:text-foreground transition-all duration-300 gap-2 rounded-full border border-muted-foreground/10"
              onClick={() => toggleExpand("loyalty")}
            >
              {expandedCharts["loyalty"] ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Skip List
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Drill Down
                </>
              )}
            </Button>
          }
        >
          <div className={expandedCharts["loyalty"] ? "mb-6" : ""}>
            <ChartContainer config={{}} className="h-[250px] w-full">
              <BarChart data={loyaltyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  fontSize={12}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill={COLORS.info} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
          {expandedCharts["loyalty"] && (
            <UsageDetailedTable
              data={[
                ...(loyalty.specialist?.records || []),
                ...(loyalty.explorer?.records || []),
              ]}
              columns={loyaltyColumns}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Feature Adaption Progression"
          tooltip="Level 1: Basic Enhance Level 2: Modes Level 3: Refine feature Level 4: Modes + Refinement Mastery"
          className="h-auto"
          headerAction={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider hover:bg-muted/20 hover:text-foreground transition-all duration-300 gap-2 rounded-full border border-muted-foreground/10"
              onClick={() => toggleExpand("feature")}
            >
              {expandedCharts["feature"] ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Skip List
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Drill Down
                </>
              )}
            </Button>
          }
        >
          <div className={expandedCharts["feature"] ? "mb-6" : ""}>
            <ChartContainer config={{}} className="h-[250px] w-full">
              <BarChart data={featureLevelData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill={COLORS.success}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
          {expandedCharts["feature"] && (
            <UsageDetailedTable
              data={[
                ...(features.level1?.records || []),
                ...(features.level2?.records || []),
                ...(features.level3?.records || []),
                ...(features.level4?.records || []),
              ]}
              columns={featureColumns}
            />
          )}
        </ChartCard>

        {/* Row 3: Sophistication & Top Occupations */}
        <ChartCard
          title="Prompt construction"
          tooltip="Are users Constructions (Long/Med) or Transactional (Short) prompters?"
          className="h-auto"
          headerAction={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider hover:bg-muted/20 hover:text-foreground transition-all duration-300 gap-2 rounded-full border border-muted-foreground/10"
              onClick={() => toggleExpand("sophistication")}
            >
              {expandedCharts["sophistication"] ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Skip List
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Drill Down
                </>
              )}
            </Button>
          }
        >
          <div className={expandedCharts["sophistication"] ? "mb-6" : ""}>
            <ChartContainer config={{}} className="h-[250px] w-full">
              <BarChart data={promptLengthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
          </div>
          {expandedCharts["sophistication"] && (
            <UsageDetailedTable
              data={[
                ...(prompts.short?.records || []),
                ...(prompts.medium?.records || []),
                ...(prompts.long?.records || []),
              ]}
              columns={promptColumns}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Top Occupations (Onboarding)"
          tooltip="Primary use-case segments from onboarding data"
          className="h-auto"
          headerAction={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider hover:bg-muted/20 hover:text-foreground transition-all duration-300 gap-2 rounded-full border border-muted-foreground/10"
              onClick={() => toggleExpand("occupation")}
            >
              {expandedCharts["occupation"] ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Skip List
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Drill Down
                </>
              )}
            </Button>
          }
        >
          <div className={expandedCharts["occupation"] ? "mb-6" : ""}>
            <ChartContainer config={{}} className="h-[250px] w-full">
              {occupations.length > 0 ? (
                <BarChart data={occupations} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    fontSize={11}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill={COLORS.secondary}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No occupation data synced
                </div>
              )}
            </ChartContainer>
          </div>
          {expandedCharts["occupation"] && (
            <UsageDetailedTable
              data={occupations.flatMap((o) => o.records || [])}
              columns={occupationColumns}
            />
          )}
        </ChartCard>
      </div>
      <Dialog
        open={!!selectedPrompt}
        onOpenChange={(open) => !open && setSelectedPrompt(null)}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedPrompt?.title}</DialogTitle>
            <DialogDescription>
              Full content of the selected prompt
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4 min-h-0 flex-1 overflow-hidden flex flex-col">
            <div className="rounded-md bg-muted p-4 font-mono text-sm whitespace-pre-wrap max-h-[50dvh] overflow-y-auto">
              {selectedPrompt?.content}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="secondary"
              onClick={() => handleCopy(selectedPrompt?.content)}
              className="gap-2"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setSelectedPrompt(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
