"use client";

import { useState } from "react";
// import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useShortIoData } from "@/hooks/use-shortio-data";
import { usePostHogData } from "@/hooks/use-posthog-data";
import {
  MetricCard,
  ChartCard,
  COLORS,
  PIE_COLORS,
  SparklineV2,
  DetailedChartV2,
} from "@/components/ui/metric-card";
import {
  Users,
  Link2,
  MousePointerClick,
  ExternalLink,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Activity,
  RefreshCw,
} from "lucide-react";
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

// Transform technical event names to user-friendly labels
const transformEventName = (eventName, sourceFilter) => {
  // Chat tab transformations
  if (sourceFilter === "Chat" && eventName === "$pageview") {
    return "Chat Page View";
  }

  // Extension tab transformations
  if (sourceFilter === "Extension") {
    const extensionEventMap = {
      // Browser Extension Events
      extension_opened: "Extension Opened",
      extension_login_button_clicked: "Login Button Clicked",
      extension_signup_button_clicked: "Sign Up Button Clicked",
      extension_send_button_clicked: "Enhance Button Clicked",
      extension_insert_button_clicked: "Insert Text Clicked",
      extension_copy_improved_button_clicked: "Copy Enhanced Text",
      extension_improved_like_button_clicked: "Liked Enhancement",
      extension_improved_dislike_button_clicked: "Disliked Enhancement",
      extension_toggle_clicked: "Extension Toggle Clicked",
      extension_toggle_blocked: "Extension Toggle Blocked",
      extension_dropdown_toggled: "Mode Dropdown Toggled",
      extension_dropdown_option_selected: "Mode Selected",
      extension_settings_button_clicked: "Settings Opened",
      extension_theme_toggle_clicked: "Theme Toggle",
      extension_settings_save_clicked: "Settings Saved",
      extension_settings_cancel_clicked: "Settings Cancelled",
      extension_settings_personality_dropdown_toggled: "Personality Dropdown",
      extension_upgrade_button_clicked: "Upgrade Clicked",
      extension_try_free_trial_button_clicked: "Free Trial Started",
      extension_trial_activated_successfully: "Trial Activated",
      extension_trial_activation_failed: "Trial Activation Failed",
      extension_trial_activation_started: "Trial Activation Started",
      extension_trial_ended_modal_shown: "Trial Ended Modal",
      extension_post_login_upgrade_modal_shown: "Post-Login Upgrade Modal",
      extension_post_login_upgrade_pro_clicked: "Post-Login Upgrade Clicked",
      extension_profile_button_clicked: "Profile Clicked",
      extension_memory_button_clicked: "Memory Clicked",
      extension_get_pro_badge_clicked: "Get Pro Badge Clicked",
      extension_user_dropdown_hovered: "User Dropdown Hovered",
      extension_user_dropdown_option_selected: "User Dropdown Option Selected",
      extension_snooze_button_clicked: "Snooze Clicked",
      extension_snooze_option_selected: "Snooze Duration Selected",

      // Injected Button Events
      button_enhance_clicked: "Injected Enhance Button Clicked",
      button_dropdown_toggled: "Injected Dropdown Toggled",
      button_dropdown_option_selected: "Injected Mode Selected",
      button_get_pro_clicked: "Injected Get Pro Clicked",

      // Popup Overlay Events
      popup_opened: "Popup Opened",
      popup_closed: "Popup Interface Dismissed",
      popup_close_button_clicked: "Popup Close Button Clicked",
      popup_tab_clicked: "Popup Tab Switched",
      popup_accept_button_clicked: "Popup Accept/Insert Clicked",
      popup_copy_button_clicked: "Popup Copy Result",
      popup_like_button_clicked: "Popup Liked Result",
      popup_dislike_button_clicked: "Popup Disliked Result",
      popup_refine_button_clicked: "Popup Refine Clicked",
      popup_refine_option_selected: "Popup Refinement Selected",
      popup_analysis_refine_button_clicked: "Popup Analysis Refine Clicked",
      popup_upgrade_button_clicked: "Popup Upgrade Clicked",
      popup_premium_popup_close_button_clicked: "Popup Premium Modal Closed",

      // API Events
      api_enhance_request: "API Request Started",
      api_enhance_response: "API Response Received",
      api_enhance_error: "API Error",
    };

    return extensionEventMap[eventName] || eventName;
  }

  // Return original name if no transformation needed
  return eventName;
};

// const chartConfig = {
//   sessions: { label: "Total Sessions", color: COLORS.primary },
//   unique: { label: "Unique Users", color: COLORS.info },
// };
// const peakChartConfig = {
//   sessions: { label: "Activity Volume", color: COLORS.warning },
// };

export default function ReachPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("Chat");
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
  } = useShortIoData(dateFilter, customDateRange, sourceFilter);

  const {
    data: postHogData,
    isLoading: postHogLoading,
    isLoadingMore: postHogLoadingMore,
    configured: postHogConfigured,
    error: postHogError,
    loadMore: postHogLoadMore,
  } = usePostHogData(dateFilter, customDateRange, sourceFilter);

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

  // Calculate Liked and Disliked metrics from eventBreakdown
  const eventBreakdown = postHogData?.eventBreakdown || [];

  const totalLiked = eventBreakdown
    .filter(
      (e) =>
        e.name === "extension_improved_like_button_clicked" ||
        e.name === "popup_like_button_clicked",
    )
    .reduce((acc, curr) => acc + curr.count, 0);

  const totalDisliked = eventBreakdown
    .filter(
      (e) =>
        e.name === "extension_improved_dislike_button_clicked" ||
        e.name === "popup_dislike_button_clicked",
    )
    .reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Impression</h1>
          <p className="text-muted-foreground">
            Clicks and Traffic Data from Short.io and PostHog
          </p>
        </div>
        <FilterBar
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          customDateRange={customDateRange}
          onCustomDateChange={setCustomDateRange}
          hideAllPlatformFilter={true}
          showLanderFilter={true}
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
      {shortIoConfigured && sourceFilter !== "Lander" && (
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
                          interval={0}
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
                            interval={0}
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
                            interval={0}
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
                            interval={0}
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
                            interval={0}
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
                            interval={0}
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
                            interval={0}
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

      {/* PostHog Events Section */}
      {postHogConfigured && (
        <>
          <div className="flex items-center gap-2 pt-4 border-t">
            <MousePointerClick className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold tracking-tight">
              PostHog Events Analytics
            </h2>
          </div>

          {postHogError && (
            <div className="rounded-xl border-2 border-dashed border-destructive/30 bg-destructive/5 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">
                Error loading PostHog data
              </p>
              <p>{postHogError}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {postHogLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))
            ) : (
              <>
                {/* Commented out as requested:
                <MetricCard
                  title={
                    sourceFilter === "Chat"
                      ? "Total Chat Page Views"
                      : "Total Events"
                  }
                  value={postHogData.totalEvents.toLocaleString()}
                  subtitle="Full analysis for period"
                  icon={MousePointerClick}
                  color={COLORS.primary}
                  tooltip={
                    sourceFilter === "Chat" ? (
                      <div className="space-y-2">
                        <p className="font-bold text-primary mb-1">
                          Chat Page Views
                        </p>
                        <p className="text-xs">
                          Tracks all page views on the Velocity chat application
                          (thinkvelocity.in/chat/*).
                        </p>
                        <div className="mt-2 pt-2 border-t">
                          <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                            Tracked Event
                          </p>
                          <div className="font-mono text-[9px] opacity-90">
                            <span>$pageview</span>
                          </div>
                        </div>
                      </div>
                    ) : sourceFilter === "Extension" ? (
                      <div className="space-y-3 max-h-[350px] overflow-auto pr-2 scrollbar-thin">
                        <p className="font-bold border-b pb-1 mb-2 text-primary">
                          All Tracked Extension Events:
                        </p>

                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                              API Operations
                            </p>
                            <div className="grid grid-cols-1 gap-0.5 opacity-90 font-mono text-[9px]">
                              <span>api_enhance_error</span>
                              <span>api_enhance_request</span>
                              <span>api_enhance_response</span>
                            </div>
                          </div>

                          <div>
                            <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                              Injected Buttons
                            </p>
                            <div className="grid grid-cols-1 gap-0.5 opacity-90 font-mono text-[9px]">
                              <span>button_dropdown_option_selected</span>
                              <span>button_dropdown_toggled</span>
                              <span>button_enhance_clicked</span>
                              <span>button_get_pro_clicked</span>
                            </div>
                          </div>

                          <div>
                            <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                              Browser Extension
                            </p>
                            <div className="grid grid-cols-1 gap-0.5 opacity-90 font-mono text-[9px]">
                              <span>
                                extension_copy_improved_button_clicked
                              </span>
                              <span>extension_dropdown_option_selected</span>
                              <span>extension_dropdown_toggled</span>
                              <span>extension_get_pro_badge_clicked</span>
                              <span>
                                extension_improved_dislike_button_clicked
                              </span>
                              <span>
                                extension_improved_like_button_clicked
                              </span>
                              <span>extension_insert_button_clicked</span>
                              <span>extension_login_button_clicked</span>
                              <span>extension_memory_button_clicked</span>
                              <span>extension_opened</span>
                              <span>
                                extension_post_login_upgrade_modal_shown
                              </span>
                              <span>
                                extension_post_login_upgrade_pro_clicked
                              </span>
                              <span>extension_profile_button_clicked</span>
                              <span>extension_send_button_clicked</span>
                              <span>extension_settings_button_clicked</span>
                              <span>extension_settings_cancel_clicked</span>
                              <span>
                                extension_settings_personality_dropdown_toggled
                              </span>
                              <span>extension_settings_save_clicked</span>
                              <span>extension_signup_button_clicked</span>
                              <span>extension_snooze_button_clicked</span>
                              <span>extension_snooze_option_selected</span>
                              <span>extension_theme_toggle_clicked</span>
                              <span>extension_toggle_blocked</span>
                              <span>extension_toggle_clicked</span>
                              <span>extension_trial_activation_failed</span>
                              <span>extension_trial_activation_started</span>
                              <span>
                                extension_trial_activated_successfully
                              </span>
                              <span>extension_trial_ended_modal_shown</span>
                              <span>
                                extension_try_free_trial_button_clicked
                              </span>
                              <span>extension_upgrade_button_clicked</span>
                              <span>extension_user_dropdown_hovered</span>
                              <span>
                                extension_user_dropdown_option_selected
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                              Overlay Popup
                            </p>
                            <div className="grid grid-cols-1 gap-0.5 opacity-90 font-mono text-[9px]">
                              <span>popup_accept_button_clicked</span>
                              <span>popup_analysis_refine_button_clicked</span>
                              <span>popup_close_button_clicked</span>
                              <span>popup_closed</span>
                              <span>popup_copy_button_clicked</span>
                              <span>popup_dislike_button_clicked</span>
                              <span>popup_like_button_clicked</span>
                              <span>popup_opened</span>
                              <span>
                                popup_premium_popup_close_button_clicked
                              </span>
                              <span>popup_refine_button_clicked</span>
                              <span>popup_refine_option_selected</span>
                              <span>popup_tab_clicked</span>
                              <span>popup_upgrade_button_clicked</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : sourceFilter === "Lander" ? (
                      <div className="space-y-2">
                        <p className="font-bold text-primary mb-1">
                          Landing Page Events
                        </p>
                        <p className="text-xs">
                          Custom events from the landing page, excluding all
                          extension, chat, and PostHog autocaptured events.
                        </p>
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-[10px] text-muted-foreground">
                            <strong>Excluded:</strong> All
                            extension/button/popup/API events, chat pageviews,
                            and PostHog native events ($pageview, $autocapture,
                            etc.)
                          </p>
                        </div>
                      </div>
                    ) : (
                      "Total number of events tracked by PostHog in the selected time range"
                    )
                  }
                />
                */}
                {sourceFilter === "Extension" ? (
                  <>
                    <MetricCard
                      title="Liked"
                      value={totalLiked.toLocaleString()}
                      subtitle="Positive feedback"
                      icon={ThumbsUp}
                      color={COLORS.success} // Green
                      tooltip="Total number of times users clicked the Like button (Extension + Popup)"
                    />
                    <MetricCard
                      title="Disliked"
                      value={totalDisliked.toLocaleString()}
                      subtitle="Negative feedback"
                      icon={ThumbsDown}
                      color={COLORS.destructive} // Red
                      tooltip="Total number of times users clicked the Dislike button (Extension + Popup)"
                    />
                  </>
                ) : (
                  <>
                    {/* Commented out as requested:
                    <MetricCard
                      title="Unique Event Types"
                      value={postHogData.uniqueEventTypes.toLocaleString()}
                      subtitle="Found in this period"
                      icon={Users}
                      color={COLORS.info}
                      tooltip={
                        sourceFilter === "Chat" ? (
                          <div className="space-y-2">
                            <p className="font-bold text-primary mb-1">
                              Unique Chat Event Types
                            </p>
                            <p className="text-xs">
                              Number of distinct event types captured on the chat
                              page.
                            </p>
                            <div className="mt-2 pt-2 border-t">
                              <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                                Events Included
                              </p>
                              <div className="font-mono text-[9px] opacity-90">
                                <span>$pageview</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          "Number of distinct event types captured"
                        )
                      }
                    />
                    */}
                  </>
                )}
              </>
            )}
          </div>

          {/* Chat Analytics Section */}
          {!postHogLoading &&
            sourceFilter === "Chat" &&
            postHogData.totalEvents > 0 && (
              <>
                {/* Calculate Chat Metrics */}
                {(() => {
                  const events = postHogData.eventBreakdown || [];
                  
                  // Page & Session
                  const chatPageViews = events.find(e => e.name === "Chat Page Viewed")?.count || 0;
                  const sessionEvents = events.find(e => e.name === "Session Started / Ended")?.count || 0;
                  
                  // Prompt Interactions
                  const promptsSent = events.find(e => e.name === "Prompt Sent")?.count || 0;
                  const promptsRefined = events.find(e => e.name === "Prompt Refined")?.count || 0;
                  const refineActions = events.find(e => e.name === "Refine Action")?.count || 0;
                  const refineSuggestionClicked = events.find(e => e.name === "Refine Suggestion Clicked")?.count || 0;
                  const suggestionClicked = events.find(e => e.name === "Suggestion Clicked")?.count || 0;
                  
                  // API Events
                  const apiRequests = events.find(e => e.name === "api_enhance_request")?.count || 0;
                  const apiResponses = events.find(e => e.name === "api_enhance_response")?.count || 0;
                  const apiErrors = events.find(e => e.name === "api_enhance_error")?.count || 0;
                  
                  // User Actions
                  const messageCopied = events.find(e => e.name === "Message Copied")?.count || 0;
                  const openInPlatform = events.find(e => e.name === "Open in Platform Selected")?.count || 0;
                  const sidebarToggled = events.find(e => e.name === "Mobile Sidebar Toggled")?.count || 0;
                  const popupToggled = events.find(e => e.name === "Public Popup Opened/Closed")?.count || 0;
                  const installClicked = events.find(e => e.name === "Install Clicked")?.count || 0;
                  
                  // Navigation
                  const profileViewed = events.find(e => e.name === "User Profile Page Viewed")?.count || 0;
                  const settingsSaved = events.find(e => e.name === "extension_settings_save_clicked")?.count || 0;
                  const userLogout = events.find(e => e.name === "User Logout")?.count || 0;
                  
                  // Calculations
                  const apiSuccessRate = apiRequests > 0 ? ((apiResponses / apiRequests) * 100).toFixed(1) : 0;
                  const refinementRate = promptsSent > 0 ? ((promptsRefined / promptsSent) * 100).toFixed(1) : 0;
                  const totalSessions = sessionEvents / 2; // Divide by 2 since each session has start and end
                  
                  // Funnel calculations
                  const viewToPrompt = chatPageViews > 0 ? ((promptsSent / chatPageViews) * 100).toFixed(1) : 0;
                  const promptToRefine = promptsSent > 0 ? ((promptsRefined / promptsSent) * 100).toFixed(1) : 0;
                  
                  // Total engagement actions
                  const totalEngagement = messageCopied + openInPlatform + suggestionClicked + refineActions;
                  
                  // Activity over time
                  const activityOverTime = (postHogData.eventsOverTime || []).map(day => {
                    const dayEvents = postHogData.events?.filter(e => 
                      e.timestamp?.startsWith(day.date)
                    ) || [];
                    
                    return {
                      date: day.date,
                      Views: dayEvents.filter(e => e.event === "Chat Page Viewed").length,
                      Prompts: dayEvents.filter(e => e.event === "Prompt Sent").length,
                      Refinements: dayEvents.filter(e => e.event === "Prompt Refined").length,
                      API_Requests: dayEvents.filter(e => e.event === "api_enhance_request").length,
                    };
                  });

                  return (
                    <>
                      {/* Journey Metric Cards */}
                      <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <MetricCard
                          title="Chat Page Viewed"
                          value={chatPageViews.toLocaleString()}
                          subtitle="100% - Entry point"
                          icon={MousePointerClick}
                          color={COLORS.primary}
                          tooltip="Total views on the Chat application page"
                          chart={
                            <SparklineV2
                              data={activityOverTime}
                              dataKey="Views"
                              color={COLORS.primary}
                            />
                          }
                          detailedChart={
                            <DetailedChartV2
                              data={activityOverTime}
                              dataKey="Views"
                              color={COLORS.primary}
                              title="Chat Page Views Trend"
                            />
                          }
                        />
                        <MetricCard
                          title="Prompt Sent"
                          value={promptsSent.toLocaleString()}
                          subtitle={`${viewToPrompt}% conversion`}
                          icon={MessageSquare}
                          color={COLORS.info}
                          tooltip="Number of prompts sent relative to page views"
                          chart={
                            <SparklineV2
                              data={activityOverTime}
                              dataKey="Prompts"
                              color={COLORS.info}
                            />
                          }
                          detailedChart={
                            <DetailedChartV2
                              data={activityOverTime}
                              dataKey="Prompts"
                              color={COLORS.info}
                              title="Prompts Sent Trend"
                            />
                          }
                        />
                        <MetricCard
                          title="Prompt Refined"
                          value={promptsRefined.toLocaleString()}
                          subtitle={`${promptToRefine}% from prompts sent`}
                          icon={RefreshCw}
                          color={COLORS.success}
                          tooltip="Number of refined prompts relative to prompts sent"
                          chart={
                            <SparklineV2
                              data={activityOverTime}
                              dataKey="Refinements"
                              color={COLORS.success}
                            />
                          }
                          detailedChart={
                            <DetailedChartV2
                              data={activityOverTime}
                              dataKey="Refinements"
                              color={COLORS.success}
                              title="Prompts Refined Trend"
                            />
                          }
                        />
                      </div>

                      {/* Commented out as requested:
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                          title="Chat Sessions"
                          value={Math.round(totalSessions).toLocaleString()}
                          subtitle="Total user sessions"
                          icon={Users}
                          color={COLORS.primary}
                          tooltip="Number of chat sessions (Session Started / Ended events divided by 2)"
                        />
                        <MetricCard
                          title="Prompts Sent"
                          value={promptsSent.toLocaleString()}
                          subtitle="Total prompts submitted"
                          icon={MessageSquare}
                          color={COLORS.info}
                          tooltip="Total number of prompts sent by users in chat"
                        />
                        <MetricCard
                          title="API Success Rate"
                          value={`${apiSuccessRate}%`}
                          subtitle={`${apiResponses}/${apiRequests} successful`}
                          icon={Activity}
                          color={apiSuccessRate >= 95 ? COLORS.success : apiSuccessRate >= 80 ? COLORS.warning : COLORS.danger}
                          tooltip="Percentage of API enhance requests that completed successfully"
                        />
                        <MetricCard
                          title="Refinement Rate"
                          value={`${refinementRate}%`}
                          subtitle="Prompts refined"
                          icon={RefreshCw}
                          color={COLORS.warning}
                          tooltip="Percentage of prompts that were refined by users"
                        />
                      </div>
                      */}

                      {/* User Journey & API Performance */}
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* User Journey Funnel */}
                        <ChartCard
                          title="User Journey Funnel"
                          tooltip="User progression from page view to refinement"
                        >
                          <div className="space-y-4 p-4">
                            {/* Step 1: Chat Page Viewed */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Chat Page Viewed</span>
                                <span className="text-sm font-bold text-primary">{chatPageViews}</span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                                  style={{ width: chatPageViews > 0 ? '100%' : '0%' }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">100% - Entry point</p>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center">
                              <div className="text-muted-foreground">↓</div>
                            </div>

                            {/* Step 2: Prompt Sent */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Prompt Sent</span>
                                <span className="text-sm font-bold text-info">{promptsSent}</span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all"
                                  style={{ width: chatPageViews > 0 ? `${(promptsSent / chatPageViews) * 100}%` : '0%' }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {viewToPrompt}% conversion
                              </p>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center">
                              <div className="text-muted-foreground">↓</div>
                            </div>

                            {/* Step 3: Prompt Refined */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Prompt Refined</span>
                                <span className="text-sm font-bold text-success">{promptsRefined}</span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                                  style={{ width: chatPageViews > 0 ? `${(promptsRefined / chatPageViews) * 100}%` : '0%' }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {promptToRefine}% from prompts sent
                              </p>
                            </div>
                          </div>
                        </ChartCard>

                        {/* API Performance */}
                        <ChartCard
                          title="API Performance"
                          tooltip="API enhance request success vs error rate"
                        >
                          <ChartContainer config={{}} className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPie margin={{ top: 0, bottom: 0 }}>
                                <Pie
                                  data={[
                                    { name: "Successful", value: apiResponses },
                                    { name: "Errors", value: apiErrors },
                                  ].filter(item => item.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={85}
                                  paddingAngle={5}
                                  dataKey="value"
                                  nameKey="name"
                                >
                                  <Cell fill={COLORS.success} />
                                  <Cell fill={COLORS.danger} />
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                              </RechartsPie>
                            </ResponsiveContainer>
                          </ChartContainer>
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 px-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: COLORS.success }}
                              />
                              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                Successful ({apiResponses})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: COLORS.danger }}
                              />
                              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                Errors ({apiErrors})
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t text-center">
                            <p className="text-xs text-muted-foreground">
                              Total Requests: <span className="font-semibold text-foreground">{apiRequests}</span>
                            </p>
                          </div>
                        </ChartCard>
                      </div>

                      {/* Engagement & Feature Usage */}
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Engagement Breakdown */}
                        <ChartCard
                          title="Engagement Actions"
                          tooltip="User interactions and engagement events"
                        >
                          <ChartContainer
                            config={{
                              count: { label: "Actions", color: COLORS.info },
                            }}
                            className="h-[280px] w-full"
                          >
                            <BarChart
                              data={[
                                { name: "Message Copied", count: messageCopied },
                                { name: "Suggestions", count: suggestionClicked },
                                { name: "Refine Actions", count: refineActions },
                                { name: "Open Platform", count: openInPlatform },
                              ].filter(item => item.count > 0)}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={{ fontSize: 10 }}
                                angle={-15}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar
                                dataKey="count"
                                fill={COLORS.info}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ChartContainer>
                        </ChartCard>

                        {/* Feature Usage */}
                        <ChartCard
                          title="Feature Usage"
                          tooltip="Navigation and feature interaction events"
                        >
                          <ChartContainer config={{}} className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPie margin={{ top: 0, bottom: 0 }}>
                                <Pie
                                  data={[
                                    { name: "Install Clicked", value: installClicked },
                                    { name: "Profile Viewed", value: profileViewed },
                                    { name: "Settings Saved", value: settingsSaved },
                                    { name: "Sidebar Toggled", value: sidebarToggled },
                                    { name: "Popup Toggled", value: popupToggled },
                                  ].filter(item => item.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={85}
                                  paddingAngle={5}
                                  dataKey="value"
                                  nameKey="name"
                                >
                                  {[
                                    { name: "Install Clicked", value: installClicked },
                                    { name: "Profile Viewed", value: profileViewed },
                                    { name: "Settings Saved", value: settingsSaved },
                                    { name: "Sidebar Toggled", value: sidebarToggled },
                                    { name: "Popup Toggled", value: popupToggled },
                                  ].filter(item => item.value > 0).map((_, index) => (
                                    <Cell
                                      key={`feature-${index}`}
                                      fill={VARIETY_COLORS[index % VARIETY_COLORS.length]}
                                    />
                                  ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                              </RechartsPie>
                            </ResponsiveContainer>
                          </ChartContainer>
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 px-2">
                            {[
                              { name: "Install Clicked", value: installClicked },
                              { name: "Profile Viewed", value: profileViewed },
                              { name: "Settings Saved", value: settingsSaved },
                              { name: "Sidebar Toggled", value: sidebarToggled },
                              { name: "Popup Toggled", value: popupToggled },
                            ].filter(item => item.value > 0).map((item, i) => (
                              <div key={item.name} className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor: VARIETY_COLORS[i % VARIETY_COLORS.length],
                                  }}
                                />
                                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                  {item.name} ({item.value})
                                </span>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                      </div>

                      {/* Activity Over Time */}
                      {activityOverTime.length > 0 && (
                        <ChartCard
                          title="Activity Over Time"
                          tooltip="Daily prompts, refinements, and API requests"
                        >
                          <ChartContainer config={{}} className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={activityOverTime}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                  dataKey="date"
                                  tickLine={false}
                                  axisLine={false}
                                  tickMargin={8}
                                  tickFormatter={(tick) => {
                                    try {
                                      return format(new Date(tick), "MMM d");
                                    } catch (e) {
                                      return tick;
                                    }
                                  }}
                                />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line
                                  type="monotone"
                                  dataKey="Prompts"
                                  stroke={VARIETY_COLORS[0]}
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="Refinements"
                                  stroke={VARIETY_COLORS[1]}
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="API_Requests"
                                  stroke={VARIETY_COLORS[2]}
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 px-2">
                            {["Prompts", "Refinements", "API Requests"].map((metric, i) => (
                              <div key={metric} className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor: VARIETY_COLORS[i % VARIETY_COLORS.length],
                                  }}
                                />
                                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                  {metric}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                      )}
                    </>
                  );
                })()}
              </>
            )}

          {!postHogLoading &&
            sourceFilter === "Lander" &&
            postHogData.totalEvents === 0 && (
              <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
                <MousePointerClick className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-semibold text-lg text-foreground mb-2">
                  No Lander Events Found
                </p>
                <p className="text-xs text-muted-foreground/70 mt-4">
                  Try adjusting the date range or check if lander event tracking
                  is configured.
                </p>
              </div>
            )}

          {/* Lander Analytics Section */}
          {!postHogLoading &&
            sourceFilter === "Lander" &&
            postHogData.totalEvents > 0 && (
              <>
                {/* Calculate Lander Metrics */}
                {(() => {
                  const events = postHogData.eventBreakdown || [];
                  
                  // Page Views
                  const homePageViews = events.find(e => e.name === "Home Page Viewed")?.count || 0;
                  const loginPageViews = events.find(e => e.name === "Login Page Viewed")?.count || 0;
                  const pricingPageViews = events.find(e => e.name === "Pricing Page Viewed")?.count || 0;
                  const aboutPageViews = events.find(e => e.name === "About Us Page Viewed")?.count || 0;
                  const totalPageViews = homePageViews + loginPageViews + pricingPageViews + aboutPageViews;
                  
                  // Engagement Events
                  const faqToggled = events.find(e => e.name === "FAQ Toggled")?.count || 0;
                  const videoPlayed = events.find(e => e.name === "Video Played")?.count || 0;
                  const ctaClicked = events.find(e => e.name === "CTA Button Clicked")?.count || 0;
                  const promptSubmitted = events.find(e => e.name === "Prompt Submitted")?.count || 0;
                  const footerClicked = events.find(e => e.name === "Footer Page/Link Clicked")?.count || 0;
                  const totalEngagement = faqToggled + videoPlayed + ctaClicked + promptSubmitted + footerClicked;
                  
                  // Navigation
                  const navbarSignUp = events.find(e => e.name === "Navbar Sign Up Clicked")?.count || 0;
                  const navbarPricing = events.find(e => e.name === "Navbar Pricing Link Clicked")?.count || 0;
                  
                  // Pricing Funnel
                  const pricingPlanSelected = events.find(e => e.name === "Pricing Plan Selected")?.count || 0;
                  const pricingSubscribeClicked = events.find(e => e.name === "Pricing Subscribe Clicked")?.count || 0;
                  const checkoutCancelled = events.find(e => e.name === "Pricing Subscription Checkout Cancelled")?.count || 0;
                  
                  // Onboarding
                  const onboardingStep1 = events.find(e => e.name === "Onboarding Step 1 Completed")?.count || 0;
                  const onboardingStep2 = events.find(e => e.name === "Onboarding Step 2 Completed")?.count || 0;
                  const onboardingStep3 = events.find(e => e.name === "Onboarding Step 3 Completed")?.count || 0;
                  const onboardingStep4 = events.find(e => e.name === "Onboarding Step 4 Completed")?.count || 0;
                  const onboardingStep5 = events.find(e => e.name === "Onboarding Step 5 Completed")?.count || 0;
                  const onboardingCompleted = events.find(e => e.name === "Onboarding Completed")?.count || 0;
                  
                  // Auth
                  const userLogin = events.find(e => e.name === "User Login")?.count || 0;
                  
                  // Conversion Funnel Calculations
                  const signupOrLogin = navbarSignUp + loginPageViews + userLogin;
                  const discoveryConversionRate = homePageViews > 0 ? ((signupOrLogin / homePageViews) * 100).toFixed(1) : 0;
                  const promptConversionRate = signupOrLogin > 0 ? ((promptSubmitted / signupOrLogin) * 100).toFixed(1) : 0;
                  const overallConversionRate = homePageViews > 0 ? ((promptSubmitted / homePageViews) * 100).toFixed(1) : 0;
                  
                  // Pricing Funnel Calculations
                  const pricingViewToSelect = pricingPageViews > 0 ? ((pricingPlanSelected / pricingPageViews) * 100).toFixed(1) : 0;
                  const selectToSubscribe = pricingPlanSelected > 0 ? ((pricingSubscribeClicked / pricingPlanSelected) * 100).toFixed(1) : 0;
                  
                  // Engagement Rate
                  const engagementRate = totalPageViews > 0 ? ((totalEngagement / totalPageViews) * 100).toFixed(1) : 0;

                  // Page Views Over Time by Type
                  const pageViewsOverTime = (postHogData.eventsOverTime || []).map(day => {
                    const dayEvents = postHogData.events?.filter(e => 
                      e.timestamp?.startsWith(day.date)
                    ) || [];
                    
                    return {
                      date: day.date,
                      Home: dayEvents.filter(e => e.event === "Home Page Viewed").length,
                      Pricing: dayEvents.filter(e => e.event === "Pricing Page Viewed").length,
                      Login: dayEvents.filter(e => e.event === "Login Page Viewed").length,
                      About: dayEvents.filter(e => e.event === "About Us Page Viewed").length,
                    };
                  });

                  return (
                    <>
                      {/* Metric Cards */}
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                          title="Total Page Views"
                          value={totalPageViews.toLocaleString()}
                          subtitle="Across all landing pages"
                          icon={MousePointerClick}
                          color={COLORS.primary}
                          tooltip="Total views of Home, Pricing, Login, and About pages"
                        />
                        <MetricCard
                          title="Engagement Rate"
                          value={`${engagementRate}%`}
                          subtitle="Users taking action"
                          icon={Users}
                          color={COLORS.info}
                          tooltip="Percentage of page views that resulted in engagement (FAQ, Video, CTA, Prompt, Footer)"
                        />
                        <MetricCard
                          title="Conversion Rate"
                          value={`${overallConversionRate}%`}
                          subtitle="Home → Prompt Submitted"
                          icon={ExternalLink}
                          color={COLORS.success}
                          tooltip="Percentage of home page viewers who submitted a prompt"
                        />
                        <MetricCard
                          title="Prompt Submissions"
                          value={promptSubmitted.toLocaleString()}
                          subtitle="Try it now feature"
                          icon={Link2}
                          color={COLORS.warning}
                          tooltip="Total prompts submitted via the Hero/Lander 'Try it now' feature"
                        />
                      </div>

                      {/* Conversion Funnels */}
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Primary Discovery Funnel */}
                        <ChartCard
                          title="Discovery to Conversion Funnel"
                          tooltip="User journey from landing to prompt submission"
                        >
                          <div className="space-y-4 p-4">
                            {/* Step 1: Home Page */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Home Page Viewed</span>
                                <span className="text-sm font-bold text-primary">{homePageViews}</span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                                  style={{ width: '100%' }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">100% - Entry point</p>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center">
                              <div className="text-muted-foreground">↓</div>
                            </div>

                            {/* Step 2: Signup/Login */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Login / Sign Up Intent</span>
                                <span className="text-sm font-bold text-info">{signupOrLogin}</span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all"
                                  style={{ width: homePageViews > 0 ? `${(signupOrLogin / homePageViews) * 100}%` : '0%' }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {discoveryConversionRate}% conversion
                              </p>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center">
                              <div className="text-muted-foreground">↓</div>
                            </div>

                            {/* Step 3: Prompt Submitted */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Prompt Submitted</span>
                                <span className="text-sm font-bold text-success">{promptSubmitted}</span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                                  style={{ width: homePageViews > 0 ? `${(promptSubmitted / homePageViews) * 100}%` : '0%' }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {overallConversionRate}% overall conversion
                              </p>
                            </div>
                          </div>
                        </ChartCard>

                        {/* Pricing Funnel */}
                        <ChartCard
                          title="Pricing Conversion Funnel"
                          tooltip="User journey through pricing and subscription"
                        >
                          <div className="space-y-4 p-4">
                            {/* Step 1: Pricing Page */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Pricing Page Viewed</span>
                                <span className="text-sm font-bold text-primary">{pricingPageViews}</span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                                  style={{ width: '100%' }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">100% - Entry point</p>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center">
                              <div className="text-muted-foreground">↓</div>
                            </div>

                            {/* Step 2: Plan Selected */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Plan Selected</span>
                                <span className="text-sm font-bold text-warning">{pricingPlanSelected}</span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all"
                                  style={{ width: pricingPageViews > 0 ? `${(pricingPlanSelected / pricingPageViews) * 100}%` : '0%' }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {pricingViewToSelect}% conversion
                              </p>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center">
                              <div className="text-muted-foreground">↓</div>
                            </div>

                            {/* Step 3: Subscribe Clicked */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Subscribe Clicked</span>
                                <span className="text-sm font-bold text-success">{pricingSubscribeClicked}</span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
                                  style={{ width: pricingPageViews > 0 ? `${(pricingSubscribeClicked / pricingPageViews) * 100}%` : '0%' }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {selectToSubscribe}% from plan selection
                              </p>
                            </div>

                            {/* Checkout Cancelled */}
                            {checkoutCancelled > 0 && (
                              <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Checkout Cancelled</span>
                                  <span className="text-xs font-semibold text-destructive">{checkoutCancelled}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </ChartCard>
                      </div>

                      {/* Engagement & Onboarding */}
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Engagement Breakdown */}
                        <ChartCard
                          title="Engagement Breakdown"
                          tooltip="How users interact with landing page features"
                        >
                          <ChartContainer config={{}} className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPie margin={{ top: 0, bottom: 0 }}>
                                <Pie
                                  data={[
                                    { name: "FAQ Toggled", value: faqToggled },
                                    { name: "Video Played", value: videoPlayed },
                                    { name: "CTA Clicked", value: ctaClicked },
                                    { name: "Prompt Submitted", value: promptSubmitted },
                                    { name: "Footer Clicked", value: footerClicked },
                                  ].filter(item => item.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={85}
                                  paddingAngle={5}
                                  dataKey="value"
                                  nameKey="name"
                                >
                                  {[
                                    { name: "FAQ Toggled", value: faqToggled },
                                    { name: "Video Played", value: videoPlayed },
                                    { name: "CTA Clicked", value: ctaClicked },
                                    { name: "Prompt Submitted", value: promptSubmitted },
                                    { name: "Footer Clicked", value: footerClicked },
                                  ].filter(item => item.value > 0).map((_, index) => (
                                    <Cell
                                      key={`engagement-${index}`}
                                      fill={VARIETY_COLORS[index % VARIETY_COLORS.length]}
                                    />
                                  ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                              </RechartsPie>
                            </ResponsiveContainer>
                          </ChartContainer>
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 px-2">
                            {[
                              { name: "FAQ Toggled", value: faqToggled },
                              { name: "Video Played", value: videoPlayed },
                              { name: "CTA Clicked", value: ctaClicked },
                              { name: "Prompt Submitted", value: promptSubmitted },
                              { name: "Footer Clicked", value: footerClicked },
                            ].filter(item => item.value > 0).map((item, i) => (
                              <div key={item.name} className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor: VARIETY_COLORS[i % VARIETY_COLORS.length],
                                  }}
                                />
                                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                  {item.name} ({item.value})
                                </span>
                              </div>
                            ))}
                          </div>
                        </ChartCard>

                        {/* Onboarding Progress */}
                        <ChartCard
                          title="Onboarding Progress"
                          tooltip="User completion rates across onboarding steps"
                        >
                          <ChartContainer
                            config={{
                              count: { label: "Completions", color: COLORS.success },
                            }}
                            className="h-[280px] w-full"
                          >
                            <BarChart
                              data={[
                                { name: "Step 1", count: onboardingStep1 },
                                { name: "Step 2", count: onboardingStep2 },
                                { name: "Step 3", count: onboardingStep3 },
                                { name: "Step 4", count: onboardingStep4 },
                                { name: "Step 5", count: onboardingStep5 },
                                { name: "Completed", count: onboardingCompleted },
                              ]}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={{ fontSize: 11 }}
                              />
                              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar
                                dataKey="count"
                                fill={COLORS.success}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ChartContainer>
                        </ChartCard>
                      </div>

                      {/* Page Views Over Time */}
                      {pageViewsOverTime.length > 0 && (
                        <ChartCard
                          title="Page Views Over Time"
                          tooltip="Daily page view trends by page type"
                        >
                          <ChartContainer config={{}} className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={pageViewsOverTime}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <defs>
                                  <linearGradient id="fillHome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={VARIETY_COLORS[0]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={VARIETY_COLORS[0]} stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="fillPricing" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={VARIETY_COLORS[1]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={VARIETY_COLORS[1]} stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="fillLogin" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={VARIETY_COLORS[2]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={VARIETY_COLORS[2]} stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="fillAbout" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={VARIETY_COLORS[3]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={VARIETY_COLORS[3]} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                  dataKey="date"
                                  tickLine={false}
                                  axisLine={false}
                                  tickMargin={8}
                                  tickFormatter={(tick) => {
                                    try {
                                      return format(new Date(tick), "MMM d");
                                    } catch (e) {
                                      return tick;
                                    }
                                  }}
                                />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Area
                                  type="monotone"
                                  dataKey="Home"
                                  stackId="1"
                                  stroke={VARIETY_COLORS[0]}
                                  fill="url(#fillHome)"
                                  strokeWidth={2}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="Pricing"
                                  stackId="1"
                                  stroke={VARIETY_COLORS[1]}
                                  fill="url(#fillPricing)"
                                  strokeWidth={2}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="Login"
                                  stackId="1"
                                  stroke={VARIETY_COLORS[2]}
                                  fill="url(#fillLogin)"
                                  strokeWidth={2}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="About"
                                  stackId="1"
                                  stroke={VARIETY_COLORS[3]}
                                  fill="url(#fillAbout)"
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 px-2">
                            {["Home", "Pricing", "Login", "About"].map((page, i) => (
                              <div key={page} className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor: VARIETY_COLORS[i % VARIETY_COLORS.length],
                                  }}
                                />
                                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                  {page}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                      )}
                    </>
                  );
                })()}
              </>
            )}

          {!postHogLoading && postHogData.eventsOverTime?.length > 0 && (
            <ChartCard
              title="Events Over Time"
              tooltip="Daily event volume across all event types"
            >
              <ChartContainer
                config={{
                  count: { label: "Total Events", color: COLORS.primary },
                }}
                className="h-[280px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={postHogData.eventsOverTime}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="fillEvents"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(tick) => {
                        try {
                          return format(new Date(tick), "MMM d");
                        } catch (e) {
                          return tick;
                        }
                      }}
                    />

                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={COLORS.primary}
                      fill="url(#fillEvents)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </ChartCard>
          )}

          {!postHogLoading && postHogData.eventBreakdown?.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <ChartCard
                title="Event Breakdown"
                tooltip="Distribution of events by type"
              >
                <ChartContainer config={{}} className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie margin={{ top: 0, bottom: 0 }}>
                      <Pie
                        data={postHogData.eventBreakdown
                          .slice(0, 10)
                          .map((event) => ({
                            ...event,
                            name: transformEventName(event.name, sourceFilter),
                          }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="name"
                      >
                        {postHogData.eventBreakdown
                          .slice(0, 10)
                          .map((_, index) => (
                            <Cell
                              key={`event-${index}`}
                              fill={
                                VARIETY_COLORS[index % VARIETY_COLORS.length]
                              }
                            />
                          ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 px-2">
                  {postHogData.eventBreakdown.slice(0, 8).map((event, i) => (
                    <div key={event.name} className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            VARIETY_COLORS[i % VARIETY_COLORS.length],
                        }}
                      />
                      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                        {transformEventName(event.name, sourceFilter)} (
                        {event.count})
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Top Events" tooltip="Most frequent event types">
                <ChartContainer
                  config={{
                    score: { label: "Count", color: COLORS.primary },
                  }}
                  className="h-[280px] w-full"
                >
                  <BarChart
                    data={postHogData.eventBreakdown
                      .slice(0, 10)
                      .map((event) => ({
                        ...event,
                        name: transformEventName(event.name, sourceFilter),
                      }))}
                    layout="vertical"
                    margin={{ left: 20, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
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
                      width={
                        sourceFilter === "Extension"
                          ? 200
                          : sourceFilter === "Chat"
                            ? 130
                            : 155
                      }
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />

                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill={COLORS.primary}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </ChartCard>
            </div>
          )}

          {!postHogLoading && postHogData.events?.length > 0 && (
            <ChartCard
              title="Recent Events"
              tooltip="Latest events captured by PostHog"
            >
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Event</th>
                      <th className="text-left p-3 font-semibold">Timestamp</th>
                      <th className="text-left p-3 font-semibold">
                        Distinct ID
                      </th>
                      <th className="text-left p-3 font-semibold">
                        Properties
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {postHogData.events.map((event, i) => {
                      const sessionId = event.properties?.$session_id;

                      // Principled check: Session recording requires visual context metadata.
                      // Events from sessions that are actually being recorded include hardware/viewport info.
                      // Thin events (like server-side redirects or background pings) won't have these.
                      const hasVisualContext = !!(
                        event.properties?.$screen_width ||
                        event.properties?.$viewport_width ||
                        event.properties?.$lib_version
                      );

                      const replayUrl =
                        sessionId && postHogData.projectId && hasVisualContext
                          ? `https://app.posthog.com/project/${postHogData.projectId}/replay/${sessionId}`
                          : null;

                      return (
                        <tr
                          key={i}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-3 font-medium">
                            {replayUrl ? (
                              <a
                                href={replayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1.5"
                                title="View Session Replay"
                              >
                                {event.event}
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            ) : (
                              event.event
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-xs">
                            {event.distinct_id?.substring(0, 20)}...
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {event.event === "$pageview" &&
                            event.properties?.$current_url ? (
                              <span className="truncate max-w-[200px] inline-block">
                                {event.properties.$current_url}
                              </span>
                            ) : (
                              `${Object.keys(event.properties || {}).length} properties`
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col items-center gap-3 mt-4">
                {postHogData.events.length < postHogData.totalEvents && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={postHogLoadMore}
                    disabled={postHogLoadingMore}
                    className="text-xs px-6 flex items-center gap-2"
                  >
                    {postHogLoadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More Events"
                    )}
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground opacity-70 italic">
                  Showing {postHogData.events.length} of{" "}
                  {postHogData.totalEvents} events for this period
                </p>
              </div>
            </ChartCard>
          )}
        </>
      )}

      {!postHogConfigured && !postHogLoading && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">
            PostHog Analytics Available
          </p>
          <p className="mb-4">
            Add your PostHog credentials to see event analytics and user
            behavior tracking.
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
            <li>
              Get your API key from{" "}
              <a
                href="https://app.posthog.com/project/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                PostHog Settings
              </a>
            </li>
            <li>
              Add to your{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                .env
              </code>
              :{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                POSTHOG_API_KEY=your_key_here
              </code>
            </li>
            <li>
              Add your project ID:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                POSTHOG_PROJECT_ID=12345
              </code>
            </li>
            <li className="text-amber-600 dark:text-amber-400 font-medium">
              Restart the server (stop and run{" "}
              <code className="rounded bg-muted px-1">npm run dev</code> or
              redeploy)
            </li>
          </ol>
        </div>
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
