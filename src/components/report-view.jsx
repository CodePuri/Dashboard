"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format } from "date-fns";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE"];

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function ReportView({ data }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white text-black p-8 font-sans print:p-0">
      <style media="print">{`
        @page {
          size: auto;
          margin: 15mm;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `}</style>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Print Control - Hidden when printing */}
        <div className="flex justify-end print:hidden">
          <Button
            onClick={handlePrint}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        {/* Header */}
        <div className="border-b pb-6 mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Analytics Report</h1>
          <p className="text-gray-500">
            Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>

        {/* Executive Summary */}
        <section className="mb-8 break-inside-avoid">
          <h2 className="text-xl font-bold mb-4 uppercase tracking-wide text-gray-700 border-b pb-2">
            Executive Summary
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-gray-50 text-center">
              <div className="text-sm text-gray-500 uppercase">
                Total Prompts
              </div>
              <div className="text-2xl font-bold">{data.metrics.total}</div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50 text-center">
              <div className="text-sm text-gray-500 uppercase">
                Avg Processing
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {((data.metrics.avgProcessingTime || 0) / 1000).toFixed(2)}s
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50 text-center">
              <div className="text-sm text-gray-500 uppercase">
                Est. Time Saved
              </div>
              <div className="text-2xl font-bold text-green-600">
                {(data.metrics.totalTimeSavedHours || 0).toFixed(1)}h
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50 text-center">
              <div className="text-sm text-gray-500 uppercase">
                Success Rate
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {(data.metrics.enhancementRate || 0).toFixed(1)}%
              </div>
            </div>
          </div>
        </section>

        {/* Distributions */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <section className="break-inside-avoid">
            <h3 className="text-lg font-semibold mb-4">LLM Usage</h3>
            <div className="h-64 border rounded-lg p-4">
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.distributions.llm}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill="#8884d8"
                      label={{ position: "top" }}
                    >
                      {data.distributions.llm.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            </div>
          </section>

          <section className="break-inside-avoid">
            <h3 className="text-lg font-semibold mb-4">Mode Usage</h3>
            <div className="h-64 border rounded-lg p-4">
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.distributions.mode}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Bar
                      dataKey="count"
                      fill="#8884d8"
                      label={{ position: "top" }}
                    >
                      {data.distributions.mode.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Detailed Stats Table */}
        <section className="break-before-page">
          <h2 className="text-xl font-bold mb-4 uppercase tracking-wide text-gray-700 border-b pb-2">
            Detailed Metrics
          </h2>
          <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
            <thead className="bg-gray-100 uppercase">
              <tr>
                <th className="px-4 py-3 border-b">Metric</th>
                <th className="px-4 py-3 border-b text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-3">Total Users</td>
                <td className="px-4 py-3 text-right">
                  {data.metrics.uniqueUsers}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">Retention Rate</td>
                <td className="px-4 py-3 text-right">
                  {(data.growth.retentionRate || 0).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">Avg User Prompt Length</td>
                <td className="px-4 py-3 text-right">
                  {(data.insights.avgUserPromptLength || 0).toFixed(0)} chars
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">Avg Enhanced Prompt Length</td>
                <td className="px-4 py-3 text-right">
                  {(data.insights.avgEnhancedPromptLength || 0).toFixed(0)}{" "}
                  chars
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">Expansion Ratio</td>
                <td className="px-4 py-3 text-right">
                  {(data.insights.expansionRatio || 0).toFixed(1)}x
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Report automatically generated by PrettyDashboard. Confidential.
          </p>
        </section>
      </div>
    </div>
  );
}
