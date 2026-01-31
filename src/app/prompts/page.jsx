"use client";

import { useState } from "react";
import {
  MetricCard,
  ChartCard,
  COLORS,
  SparklineV2,
  DetailedChartV2,
} from "@/components/ui/metric-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { TrendingUp, Timer, MessageSquare, Copy, Check } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const chartConfig = {
  count: {
    label: "Count",
    color: COLORS.primary,
  },
};

export default function PromptsPage() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState();
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  const { data, isLoading } = useAnalyticsData(
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
              Prompts
            </h1>
            <p className="text-muted-foreground">Loading metrics...</p>
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

  const metrics = data?.metrics;
  const insights = data?.insights;
  const dailyActivity = data?.timeAnalysis?.dailyActivity || [];
  const slowestPrompts = data?.slowestPrompts || [];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Prompts
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Detailed breakdown of prompt enhancement and processing
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
          Key Metrics
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Expansion Ratio"
            value={`${(insights?.expansionRatio || 0).toFixed(1)}x`}
            subtitle={`${(insights?.avgUserWords || 0).toFixed(0)} → ${(insights?.avgEnhancedWords || 0).toFixed(0)} words`}
            icon={TrendingUp}
            color={COLORS.secondary}
            tooltip="How much prompts are expanded during enhancement"
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="expansionRatio"
                  color={COLORS.secondary}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="expansionRatio"
                  color={COLORS.secondary}
                  title="Daily Average Expansion Ratio (x)"
                />
              ) : null
            }
          />
          <MetricCard
            title="Avg Processing"
            value={`${((metrics?.avgProcessingTime || 0) / 1000).toFixed(2)}s`}
            subtitle="Per prompt"
            icon={Timer}
            color={COLORS.warning}
            tooltip="Average time (in seconds) to process a prompt"
            chart={
              dailyActivity.length > 0 ? (
                <SparklineV2
                  data={dailyActivity}
                  dataKey="avgProcessingTime"
                  color={COLORS.warning}
                />
              ) : null
            }
            detailedChart={
              dailyActivity.length > 0 ? (
                <DetailedChartV2
                  data={dailyActivity}
                  dataKey="avgProcessingTime"
                  color={COLORS.warning}
                  title="Daily Avg Processing Time (s)"
                />
              ) : null
            }
          />
        </div>
      </section>

      {/* Charts */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 pb-2 border-b-2">
          Expansion Analysis
        </h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <ChartCard
            title="Word Count Expansion"
            tooltip="Comparison of average word count before and after enhancement (words in user_prompt vs words in enhanced_prompt)"
          >
            <ChartContainer
              config={chartConfig}
              className="h-[180px] sm:h-[200px] md:h-[220px] w-full"
            >
              <BarChart
                data={[
                  { name: "User Input", count: insights?.avgUserWords || 0 },
                  { name: "Enhanced", count: insights?.avgEnhancedWords || 0 },
                ]}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  <Cell fill="#94a3b8" />
                  <Cell fill={COLORS.success} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </section>

      {/* Slowest Prompts Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Performance Analysis
            </h2>
            <p className="text-sm text-muted-foreground">
              Top 5 slowest prompts by processing time
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
              <Timer className="h-3.5 w-3.5 text-red-500" />
              <span>Slowest Processing</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground py-3 w-[150px]">
                    User
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-3 min-w-[200px]">
                    User Prompt
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-3 min-w-[200px]">
                    Enhanced Prompt
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-3 w-[100px]">
                    Intent
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-3 w-[100px]">
                    Domain
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-3 text-right w-[130px]">
                    Processing Time
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-3 text-center w-[80px]">
                    Plan
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-3 text-center w-[90px]">
                    Platform
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-3 text-right w-[120px]">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slowestPrompts.length > 0 ? (
                  slowestPrompts.map((prompt, index) => (
                    <TableRow
                      key={index}
                      className="border-b transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted"
                    >
                      <TableCell className="py-3">
                        <div>
                          <div className="font-medium text-foreground">
                            {prompt.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {prompt.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 max-w-[200px]">
                        <div
                          className="cursor-pointer text-sm text-primary hover:text-primary/80 transition-colors font-medium truncate"
                          onClick={() =>
                            setSelectedPrompt({
                              title: "User Prompt",
                              content: prompt.prompt,
                              prompt: prompt,
                            })
                          }
                          title={prompt.prompt}
                        >
                          {prompt.prompt
                            ? prompt.prompt.length > 100
                              ? prompt.prompt.substring(0, 100) + "..."
                              : prompt.prompt
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 max-w-[200px]">
                        <div
                          className="cursor-pointer text-sm text-purple-600 hover:text-purple-700 transition-colors truncate"
                          onClick={() =>
                            setSelectedPrompt({
                              title: "Enhanced Prompt",
                              content: prompt.enhancedPrompt,
                              prompt: prompt,
                            })
                          }
                        >
                          {prompt.enhancedPrompt
                            ? prompt.enhancedPrompt.length > 100
                              ? prompt.enhancedPrompt.substring(0, 100) + "..."
                              : prompt.enhancedPrompt
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 truncate">
                          {prompt.intent}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 truncate">
                          {prompt.domain}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 w-fit ml-auto">
                          <Timer className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                          <span className="font-mono text-sm font-bold text-red-600">
                            {(prompt.processingTime / 1000).toFixed(2)}s
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold truncate ${
                            prompt.plan === "Pro"
                              ? "bg-purple-100 text-purple-700"
                              : prompt.plan === "Freetrial"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {prompt.plan}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold truncate ${
                            prompt.platform === "Chat"
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {prompt.platform}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="text-sm text-muted-foreground">
                          {new Date(prompt.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground/60">
                          {new Date(prompt.createdAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Timer className="h-8 w-8 text-muted-foreground/50" />
                        <div className="text-muted-foreground">
                          No slow prompts found in the selected period
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Prompt Detail Dialog */}
      <Dialog
        open={!!selectedPrompt}
        onOpenChange={(open) => !open && setSelectedPrompt(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPrompt?.title}</DialogTitle>
            <DialogDescription>
              Full content of the selected prompt
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4">
            <div className="rounded-md bg-muted p-4 font-mono text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
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
