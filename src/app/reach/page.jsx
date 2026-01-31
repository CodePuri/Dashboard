"use client";

import { useState } from "react";
// import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useShortIoData } from "@/hooks/use-shortio-data";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
  SparklineV2,
  DetailedChartV2,
} from "@/components/ui/metric-card";
import { Users, Link2, MousePointerClick, ExternalLink } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { format } from "date-fns";

const VARIETY_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
  "#d946ef", // fuchsia
  "#14b8a6", // teal
];

// const chartConfig = {
//   sessions: { label: "Total Sessions", color: COLORS.primary },
//   unique: { label: "Unique Users", color: COLORS.info },
// };
// const peakChartConfig = {
//   sessions: { label: "Activity Volume", color: COLORS.warning },
// };

export default function ReachPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  // const { data, isLoading: isAnalyticsLoading } = useAnalyticsData(
  //   dateFilter,
  //   sourceFilter,
  //   customDateRange
  // );
  const {
    data: shortIoData,
    isLoading: shortIoLoading,
    configured: shortIoConfigured,
    needsDomainId: shortIoNeedsDomainId,
  } = useShortIoData(dateFilter, customDateRange);

  // if ((isAnalyticsLoading || !data) && !shortIoConfigured) {
  //   return (
  //     <div className="space-y-6">
  //       <div className="flex flex-col gap-4">
  //         <h1 className="text-3xl font-bold tracking-tight">Reach</h1>
  //         <p className="text-muted-foreground">
  //           Loading reach and traffic data...
  //         </p>
  //       </div>
  //       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  //         {[...Array(4)].map((_, i) => (
  //           <Skeleton key={i} className="h-32 rounded-xl" />
  //         ))}
  //       </div>
  //     </div>
  //   );
  // }

  // Map Data (analytics)
  // const totalSessions = data?.metrics?.total || 0;
  // const totalUnique = data?.metrics?.uniqueUsers || 0;
  // const avgProcessing =
  //   ((data?.metrics?.avgProcessingTime || 0) / 1000).toFixed(2) + "s";
  // const dailyData = (data?.timeAnalysis?.dailyActivity || []).map((d) => ({
  //   date: format(new Date(d.date), "MMM d"),
  //   sessions: d.prompts,
  //   unique: d.users,
  // }));
  // const peakHoursData = (data?.timeAnalysis?.timePeriod || []).map((d) => ({
  //   hour: d.name,
  //   sessions: d.count,
  // }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reach</h1>
          <p className="text-muted-foreground">
            Short link traffic and click metrics (Short.io)
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

      {/* Metric Cards – analytics (commented out)
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Interactions"
          value={totalSessions.toLocaleString()}
          subtitle="Extension interactions"
          icon={MousePointerClick}
          color={COLORS.primary}
          tooltip="Total number of prompts and clicks tracked by the extension"
          chart={
            dailyData.length > 0 ? (
              <SparklineV2
                data={dailyData}
                dataKey="sessions"
                color={COLORS.primary}
              />
            ) : null
          }
        />
        <MetricCard
          title="Unique Users"
          value={totalUnique.toLocaleString()}
          subtitle="Distinct extension users"
          icon={Users}
          color={COLORS.info}
          tooltip="Number of unique users who interacted with the extension"
          chart={
            dailyData.length > 0 ? (
              <SparklineV2
                data={dailyData}
                dataKey="unique"
                color={COLORS.info}
              />
            ) : null
          }
        />
        <MetricCard
          title="Avg. Latency"
          value={avgProcessing}
          subtitle="API response time"
          icon={Link2}
          color={COLORS.warning}
          tooltip="Average time taken to process prompts"
        />
      </div> */}

      {/* Short.io metrics */}
      {shortIoConfigured && (
        <>
          <div className="flex items-center gap-2 pt-4 border-t">
            <Link2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold tracking-tight">
              Short Links (Short.io)
            </h2>
          </div>
          {shortIoNeedsDomainId && !shortIoLoading && (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">
                One more step: add your Short.io Domain ID
              </p>
              <p className="mb-4">
                Your API key is set. Short.io needs a domain ID to list your
                links and show metrics.
              </p>
              <a
                href="https://app.short.io/domains/list"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="default" className="gap-2 mb-4">
                  <ExternalLink className="h-4 w-4" />
                  Open Short.io → Copy Domain ID
                </Button>
              </a>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li>
                  Click the button above (or go to app.short.io/domains/list)
                </li>
                <li>Open the domain you use for short links</li>
                <li>
                  Copy the <strong>Domain ID</strong> from the browser URL:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                    .../domains/
                    <wbr />
                    12345
                  </code>{" "}
                  → the number is your ID (e.g.{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                    12345
                  </code>
                  )
                </li>
                <li>
                  Add to your{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                    .env
                  </code>
                  :{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                    SHORT_IO_DOMAIN_ID=12345
                  </code>
                </li>
                <li className="text-amber-600 dark:text-amber-400 font-medium">
                  Restart the dev server (stop and run{" "}
                  <code className="rounded bg-muted px-1">npm run dev</code>{" "}
                  again)
                </li>
              </ol>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shortIoLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))
            ) : (
              <>
                <MetricCard
                  title="Total Clicks"
                  value={shortIoData.totalClicks.toLocaleString()}
                  subtitle={
                    shortIoData.totalClicksChange != null &&
                    shortIoData.totalClicksChange !== ""
                      ? `vs prev period: ${shortIoData.totalClicksChange}%`
                      : "All short link clicks"
                  }
                  icon={MousePointerClick}
                  color={COLORS.primary}
                  tooltip="Total clicks on your Short.io links in the selected period"
                  chart={
                    <SparklineV2
                      data={shortIoData.clicksOverTime.map((d) => ({
                        date: d.date,
                        total: d.total || 0,
                      }))}
                      dataKey="total"
                      color={COLORS.primary}
                    />
                  }
                  detailedChart={
                    <DetailedChartV2
                      data={shortIoData.clicksOverTime.map((d) => ({
                        date: d.date,
                        total: d.total || 0,
                      }))}
                      dataKey="total"
                      color={COLORS.primary}
                      title="Total Clicks Trend"
                    />
                  }
                />
                <MetricCard
                  title="Human Clicks"
                  value={shortIoData.humanClicks.toLocaleString()}
                  subtitle={
                    shortIoData.humanClicksChange != null &&
                    shortIoData.humanClicksChange !== ""
                      ? `vs prev period: ${shortIoData.humanClicksChange}%`
                      : "Excludes bots"
                  }
                  icon={Users}
                  color={COLORS.success}
                  tooltip="Clicks identified as human (bot traffic excluded)"
                  chart={
                    <SparklineV2
                      data={shortIoData.clicksOverTime.map((d) => ({
                        date: d.date,
                        total: d.total || 0, // Note: backend doesn't provide per-point human clicks yet, using total as trend proxy
                      }))}
                      dataKey="total"
                      color={COLORS.success}
                    />
                  }
                  detailedChart={
                    <DetailedChartV2
                      data={shortIoData.clicksOverTime.map((d) => ({
                        date: d.date,
                        total: d.total || 0,
                      }))}
                      dataKey="total"
                      color={COLORS.success}
                      title="Human Clicks Trend"
                    />
                  }
                />
                <MetricCard
                  title="Links Tracked"
                  value={shortIoData.linkCount.toLocaleString()}
                  subtitle="Short links in domain"
                  icon={Link2}
                  color={COLORS.info}
                  tooltip="Number of short links in your Short.io domain"
                />
              </>
            )}
          </div>
          {!shortIoLoading && shortIoData.clicksOverTime?.length > 0 && (
            <ChartCard
              title="Clicks Over Time"
              tooltip="Daily click volume across all short links"
            >
              <ChartContainer config={{}} className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={shortIoData.clicksOverTime.map((d) => ({
                      ...d,
                      date:
                        typeof d.date === "string" && isNaN(Date.parse(d.date))
                          ? d.date
                          : format(new Date(d.date), "MMM d"),
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {(shortIoData.activeLinks || []).map((linkPath, i) => (
                      <Line
                        key={linkPath}
                        type="monotone"
                        dataKey={linkPath}
                        name={linkPath}
                        stroke={PIE_COLORS[i % PIE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </ChartCard>
          )}
          {!shortIoLoading && shortIoData.topLinks?.length > 0 && (
            <ChartCard
              title="Top Short Links by Clicks"
              tooltip="Most clicked short links in the period"
            >
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {shortIoData.topLinks.map((link, i) => (
                  <div
                    key={link.path ?? i}
                    className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 text-card-foreground"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {link.title || link.path}
                      </p>
                      <a
                        href={link.shortURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-muted-foreground hover:underline block"
                      >
                        {link.shortURL}
                      </a>
                    </div>
                    <div className="flex shrink-0 gap-4 text-sm items-center">
                      {(link.totalClicks ?? 0) > 0 && (
                        <span className="text-muted-foreground">
                          {link.totalClicks.toLocaleString()} clicks
                        </span>
                      )}
                      {(link.humanClicks ?? 0) > 0 && (
                        <span className="text-muted-foreground">
                          {link.humanClicks.toLocaleString()} human
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
          {!shortIoLoading &&
            (shortIoData.country?.length > 0 ||
              shortIoData.browser?.length > 0) && (
              <div className="grid gap-6 md:grid-cols-2">
                {shortIoData.country?.length > 0 && (
                  <ChartCard
                    title="Clicks by Country"
                    tooltip="Short link clicks by country"
                  >
                    <ChartContainer
                      config={{
                        score: { label: "Clicks", color: COLORS.primary },
                      }}
                      className="h-[260px] w-full"
                    >
                      <BarChart
                        data={shortIoData.country.map((c) => ({
                          name: c.name || c.country || "Unknown",
                          ...c,
                        }))}
                        layout="vertical"
                        margin={{ left: 50, right: 30 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tickLine={false}
                          axisLine={false}
                          hide
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          width={80}
                          tick={{ fontSize: 11 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        {(shortIoData.activeLinks || []).map((linkPath, i) => (
                          <Bar
                            key={linkPath}
                            dataKey={linkPath}
                            name={linkPath}
                            stackId="a"
                            fill={VARIETY_COLORS[i % VARIETY_COLORS.length]}
                            radius={
                              i === shortIoData.activeLinks.length - 1
                                ? [0, 4, 4, 0]
                                : [0, 0, 0, 0]
                            }
                          />
                        ))}
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>
                )}
                {shortIoData.browser?.length > 0 && (
                  <ChartCard
                    title="Clicks by Browser"
                    tooltip="Short link clicks by browser"
                  >
                    <ChartContainer config={{}} className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie margin={{ top: 0, bottom: 0 }}>
                          <Pie
                            data={shortIoData.browser.map((b) => ({
                              name: b.name || "Unknown",
                              value: b.total || 0,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                          >
                            {shortIoData.browser.map((_, index) => (
                              <Cell
                                key={`browser-${index}`}
                                fill={
                                  VARIETY_COLORS[
                                    (index + 4) % VARIETY_COLORS.length
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 px-2">
                      {shortIoData.browser.slice(0, 8).map((b, i) => (
                        <div key={b.name} className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                VARIETY_COLORS[(i + 4) % VARIETY_COLORS.length],
                            }}
                          />
                          <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                            {b.name} ({b.total})
                          </span>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                )}
              </div>
            )}

          {/* Referrer, Social, OS, City */}
          {!shortIoLoading &&
            (shortIoData.referer?.length > 0 ||
              shortIoData.social?.length > 0 ||
              shortIoData.os?.length > 0 ||
              shortIoData.city?.length > 0) && (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  {shortIoData.referer?.length > 0 && (
                    <ChartCard
                      title="Clicks by Referrer"
                      tooltip="Where clicks came from (traffic source)"
                    >
                      <ChartContainer
                        config={{
                          score: { label: "Clicks", color: COLORS.primary },
                        }}
                        className="h-[260px] w-full"
                      >
                        <BarChart
                          data={shortIoData.referer.map((r) => ({
                            name: r.name || r.referer || "Direct",
                            ...r,
                          }))}
                          layout="vertical"
                          margin={{ left: 60, right: 30 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            hide
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            width={90}
                            tick={{ fontSize: 11 }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          {(shortIoData.activeLinks || []).map(
                            (linkPath, i) => (
                              <Bar
                                key={linkPath}
                                dataKey={linkPath}
                                name={linkPath}
                                stackId="a"
                                fill={
                                  VARIETY_COLORS[
                                    (i + 8) % VARIETY_COLORS.length
                                  ]
                                }
                                radius={
                                  i === shortIoData.activeLinks.length - 1
                                    ? [0, 4, 4, 0]
                                    : [0, 0, 0, 0]
                                }
                              />
                            ),
                          )}
                        </BarChart>
                      </ChartContainer>
                    </ChartCard>
                  )}
                  {shortIoData.social?.length > 0 && (
                    <ChartCard
                      title="Clicks by Social Network"
                      tooltip="Clicks originating from social platforms"
                    >
                      <ChartContainer
                        config={{
                          score: { label: "Clicks", color: COLORS.pink },
                        }}
                        className="h-[260px] w-full"
                      >
                        <BarChart
                          data={shortIoData.social.map((s) => ({
                            name: s.name || s.social || "Other",
                            ...s,
                          }))}
                          layout="vertical"
                          margin={{ left: 60, right: 30 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            hide
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            width={90}
                            tick={{ fontSize: 11 }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          {(shortIoData.activeLinks || []).map(
                            (linkPath, i) => (
                              <Bar
                                key={linkPath}
                                dataKey={linkPath}
                                name={linkPath}
                                stackId="a"
                                fill={
                                  VARIETY_COLORS[
                                    (i + 1) % VARIETY_COLORS.length
                                  ]
                                }
                                radius={
                                  i === shortIoData.activeLinks.length - 1
                                    ? [0, 4, 4, 0]
                                    : [0, 0, 0, 0]
                                }
                              />
                            ),
                          )}
                        </BarChart>
                      </ChartContainer>
                    </ChartCard>
                  )}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {shortIoData.os?.length > 0 && (
                    <ChartCard
                      title="Clicks by Operating System"
                      tooltip="Device OS of clickers"
                    >
                      <ChartContainer config={{}} className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie margin={{ top: 0, bottom: 0 }}>
                            <Pie
                              data={shortIoData.os.map((o) => ({
                                name: o.name || "Unknown",
                                value: o.total || 0,
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={5}
                              dataKey="value"
                              nameKey="name"
                            >
                              {shortIoData.os.map((_, index) => (
                                <Cell
                                  key={`os-${index}`}
                                  fill={
                                    VARIETY_COLORS[
                                      (index + 7) % VARIETY_COLORS.length
                                    ]
                                  }
                                />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </ChartContainer>
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 px-2">
                        {shortIoData.os.slice(0, 8).map((o, i) => (
                          <div key={o.name} className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  VARIETY_COLORS[
                                    (i + 7) % VARIETY_COLORS.length
                                  ],
                              }}
                            />
                            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                              {o.name} ({o.total})
                            </span>
                          </div>
                        ))}
                      </div>
                    </ChartCard>
                  )}
                  {shortIoData.city?.length > 0 && (
                    <ChartCard
                      title="Clicks by City"
                      tooltip="Clicks by visitor city"
                    >
                      <ChartContainer
                        config={{
                          score: { label: "Clicks", color: COLORS.success },
                        }}
                        className="h-[260px] w-full"
                      >
                        <BarChart
                          data={shortIoData.city.map((c) => ({
                            name: c.name || c.city || "Unknown",
                            ...c,
                          }))}
                          layout="vertical"
                          margin={{ left: 60, right: 30 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            hide
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            width={90}
                            tick={{ fontSize: 11 }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          {(shortIoData.activeLinks || []).map(
                            (linkPath, i) => (
                              <Bar
                                key={linkPath}
                                dataKey={linkPath}
                                name={linkPath}
                                stackId="a"
                                fill={
                                  VARIETY_COLORS[
                                    (i + 3) % VARIETY_COLORS.length
                                  ]
                                }
                                radius={
                                  i === shortIoData.activeLinks.length - 1
                                    ? [0, 4, 4, 0]
                                    : [0, 0, 0, 0]
                                }
                              />
                            ),
                          )}
                        </BarChart>
                      </ChartContainer>
                    </ChartCard>
                  )}

                  {shortIoData.utmMedium?.length > 0 && (
                    <ChartCard
                      title="Top UTM Mediums"
                      tooltip="Traffic by medium (e.g. social, email)"
                    >
                      <ChartContainer config={{}} className="h-[260px] w-full">
                        <BarChart
                          data={shortIoData.utmMedium}
                          layout="vertical"
                          margin={{ left: 60, right: 30 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            width={55}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          {(shortIoData.activeLinks || []).map(
                            (linkPath, i) => (
                              <Bar
                                key={linkPath}
                                dataKey={linkPath}
                                name={linkPath}
                                stackId="a"
                                fill={
                                  VARIETY_COLORS[
                                    (i + 5) % VARIETY_COLORS.length
                                  ]
                                }
                                radius={
                                  i === shortIoData.activeLinks.length - 1
                                    ? [0, 4, 4, 0]
                                    : [0, 0, 0, 0]
                                }
                              />
                            ),
                          )}
                        </BarChart>
                      </ChartContainer>
                    </ChartCard>
                  )}

                  {shortIoData.utmSource?.length > 0 && (
                    <ChartCard
                      title="Top UTM Sources"
                      tooltip="Traffic by source (e.g. newsletter, google)"
                    >
                      <ChartContainer config={{}} className="h-[260px] w-full">
                        <BarChart
                          data={shortIoData.utmSource}
                          layout="vertical"
                          margin={{ left: 60, right: 30 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            width={55}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          {(shortIoData.activeLinks || []).map(
                            (linkPath, i) => (
                              <Bar
                                key={linkPath}
                                dataKey={linkPath}
                                name={linkPath}
                                stackId="a"
                                fill={
                                  VARIETY_COLORS[
                                    (i + 4) % VARIETY_COLORS.length
                                  ]
                                }
                                radius={
                                  i === shortIoData.activeLinks.length - 1
                                    ? [0, 4, 4, 0]
                                    : [0, 0, 0, 0]
                                }
                              />
                            ),
                          )}
                        </BarChart>
                      </ChartContainer>
                    </ChartCard>
                  )}

                  {shortIoData.utmCampaign?.length > 0 && (
                    <ChartCard
                      title="Top UTM Campaigns"
                      tooltip="Traffic by marketing campaign name"
                    >
                      <ChartContainer config={{}} className="h-[260px] w-full">
                        <BarChart
                          data={shortIoData.utmCampaign}
                          layout="vertical"
                          margin={{ left: 60, right: 30 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            width={55}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          {(shortIoData.activeLinks || []).map(
                            (linkPath, i) => (
                              <Bar
                                key={linkPath}
                                dataKey={linkPath}
                                name={linkPath}
                                stackId="a"
                                fill={
                                  VARIETY_COLORS[
                                    (i + 1) % VARIETY_COLORS.length
                                  ]
                                }
                                radius={
                                  i === shortIoData.activeLinks.length - 1
                                    ? [0, 4, 4, 0]
                                    : [0, 0, 0, 0]
                                }
                              />
                            ),
                          )}
                        </BarChart>
                      </ChartContainer>
                    </ChartCard>
                  )}
                </div>
              </>
            )}
        </>
      )}

      {/* Charts – analytics (commented out)
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Traffic Trends"
          tooltip="Daily sessions and unique users"
        >
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={COLORS.primary}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={COLORS.primary}
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="fillUnique" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.info} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke={COLORS.primary}
                fill="url(#fillSessions)"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="unique"
                stroke={COLORS.info}
                fill="url(#fillUnique)"
                strokeWidth={2}
                stackId="1"
              />
            </AreaChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Peak Activity Times"
          tooltip="Interactions by time of day"
        >
          <ChartContainer config={peakChartConfig} className="h-[300px] w-full">
            <BarChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="sessions"
                fill={COLORS.warning}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div> */}

      {/* Attribution Section – analytics (commented out)
      {data?.insights?.attribution?.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <ChartCard
            title="Traffic Origins"
            tooltip="How users find the extension"
          >
            <ChartContainer config={{}} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={data.insights.attribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="name"
                  >
                    {data.insights.attribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {data.insights.attribution.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {entry.name} (
                      {((entry.count / totalSessions) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </ChartContainer>
          </ChartCard>
        </div>
      )} */}
    </div>
  );
}
