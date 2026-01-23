"use client";

import { useState } from "react";
import { useDiagnosticsData } from "@/hooks/use-diagnostics-data";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
} from "@/components/ui/metric-card";
import { AlertTriangle, Users, Activity, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const chartConfig = {
  count: {
    label: "Errors",
    color: COLORS.danger,
  },
};

export default function DiagnosticsPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();

  const { data, isLoading } = useDiagnosticsData(
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
              Diagnostics
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

  const { logs, stats, distributions } = data || {};

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Diagnostics
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Monitor API health and error trends
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
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Errors"
            value={(stats?.total_errors || 0).toLocaleString()}
            subtitle="In selected period"
            icon={AlertTriangle}
            color={COLORS.danger}
            tooltip="Total number of API errors recorded"
          />
          <MetricCard
            title="Affected Users"
            value={(stats?.affected_users || 0).toLocaleString()}
            subtitle="Unique users"
            icon={Users}
            color={COLORS.warning}
            tooltip="Number of unique users who experienced errors"
          />
          <MetricCard
            title="Failing Endpoints"
            value={(stats?.failing_endpoints || 0).toLocaleString()}
            subtitle="Distinct endpoints"
            icon={Layers}
            color={COLORS.primary}
            tooltip="Number of unique API endpoints with errors"
          />
          <MetricCard
            title="Unique Error Types"
            value={(stats?.error_types_count || 0).toLocaleString()}
            subtitle="Error categories"
            icon={Activity}
            color={COLORS.info}
            tooltip="Distinct types of errors encountered"
          />
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <ChartCard
          title="Error Trend" // Using simple Title
          tooltip="Daily count of API errors over time"
        >
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={distributions?.timeline || []}>
                <defs>
                  <linearGradient id="fillErrors" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={COLORS.danger}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={COLORS.danger}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => format(new Date(v), "MMM d")}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={COLORS.danger}
                  fill="url(#fillErrors)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Errors by Type"
          tooltip="Distribution of errors by category"
        >
          <ChartContainer
            config={chartConfig}
            className="h-[250px] w-full flex justify-center"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={distributions?.types || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="error_type"
                >
                  {(distributions?.types || []).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </RechartsPie>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-2 mt-4 max-h-[100px] overflow-y-auto">
            {(distributions?.types || []).slice(0, 5).map((type, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                  }}
                />
                <span
                  className="text-xs text-muted-foreground truncate max-w-[150px]"
                  title={type.error_type}
                >
                  {type.error_type}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Top Failing Endpoints"
          tooltip="Endpoints with the most errors"
          className="lg:col-span-2"
        >
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distributions?.endpoints || []}
                layout="vertical"
                margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="api_endpoint"
                  type="category"
                  width={200}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => {
                    // Try to shorten the URL path for display
                    try {
                      const url = new URL(val);
                      return url.pathname;
                    } catch {
                      return val.length > 30
                        ? val.substring(0, 30) + "..."
                        : val;
                    }
                  }}
                />
                <ChartTooltip
                  cursor={{ fill: "transparent" }}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="count"
                  fill={COLORS.primary}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartCard>
      </section>

      {/* Recent Logs Table */}
      {/* Recent Logs Table */}
      <Card className="shadow-sm">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Recent Error Logs
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Latest error occurrences ({logs?.length || 0} rows)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-md border">
            <ScrollArea className="h-[400px] rounded-md">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    {logs && logs.length > 0 ? (
                      Object.keys(logs[0]).map((key) => (
                        <TableHead
                          key={key}
                          className="whitespace-nowrap font-bold text-foreground"
                        >
                          {key.replace(/_/g, " ").toUpperCase()}
                        </TableHead>
                      ))
                    ) : (
                      <TableHead>No Data</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs && logs.length > 0 ? (
                    logs.map((row, i) => (
                      <TableRow
                        key={i}
                        className="even:bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        {Object.values(row).map((cell, j) => (
                          <TableCell
                            key={j}
                            title={
                              typeof cell === "object" && cell !== null
                                ? JSON.stringify(cell)
                                : String(cell ?? "")
                            }
                            className="whitespace-nowrap max-w-[300px] truncate font-mono text-xs py-3"
                          >
                            {cell === null ? (
                              <span className="text-muted-foreground/50 italic">
                                NULL
                              </span>
                            ) : typeof cell === "boolean" ? (
                              <span
                                className={
                                  cell
                                    ? "text-green-500 font-medium"
                                    : "text-red-500 font-medium"
                                }
                              >
                                {cell.toString().toUpperCase()}
                              </span>
                            ) : typeof cell === "object" ? (
                              JSON.stringify(cell).substring(0, 100) +
                              (JSON.stringify(cell).length > 100 ? "..." : "")
                            ) : (
                              String(cell)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={100}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No errors found for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
