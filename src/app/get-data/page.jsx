"use client";

import { useState } from "react";
import { Send, Download, Play, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function GetDataPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sql, setSql] = useState("");
  const [error, setError] = useState(null);

  const handleGenerateAndRun = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/get-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate_and_run",
          prompt: prompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }

      setSql(data.sql);
      setResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSql = async () => {
    if (!sql.trim()) return;

    setLoading(true);
    setError(null);
    // Keep existing result if possible, or clear it. Let's clear to show fresh load.
    // setResult(null);

    try {
      const response = await fetch("/api/get-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "run",
          query: sql,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute SQL");
      }

      setResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!result || result.length === 0) return;

    // Get headers
    const headers = Object.keys(result[0]);

    // Create CSV content
    const csvContent = [
      headers.join(","), // Header row
      ...result.map((row) =>
        headers
          .map((header) => {
            const cell = row[header];
            // Handle null, undefined, objects, and strings with commas
            if (cell === null || cell === undefined) return "";
            if (typeof cell === "object")
              return `"${JSON.stringify(cell).replace(/"/g, '""')}"`;
            return `"${String(cell).replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `data_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerateAndRun();
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Get Data</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Ask Data</CardTitle>
            <CardDescription>
              Ask questions in plain English to retrieve data from the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full items-center gap-2">
              <Input
                placeholder="e.g., Show me the top 10 users by token count..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                disabled={loading}
              />
              <Button
                onClick={handleGenerateAndRun}
                disabled={loading || !prompt.trim()}
              >
                {loading ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Run
              </Button>
            </div>
            {error && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section - Only show if we have SQL or Results */}
        {(sql || result) && (
          <div className="grid gap-4 md:grid-cols-1">
            {/* SQL Editor */}
            <Card className="border-muted">
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Generated SQL</CardTitle>
                    <CardDescription className="text-xs">
                      Tip: Adjust 'LIMIT' to see more rows or modify 'WHERE'
                      clauses to filter.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunSql}
                    disabled={loading}
                  >
                    <Play className="mr-2 h-3 w-3" />
                    Run Query
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  className="font-mono text-sm bg-muted/40 min-h-[100px]"
                  placeholder="SELECT * FROM..."
                />
              </CardContent>
            </Card>

            {/* Data Table */}
            {result && (
              <Card>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Results ({result.length} rows)
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCsv}
                      disabled={result.length === 0}
                    >
                      <Download className="mr-2 h-3 w-3" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <ScrollArea className="h-[400px] rounded-md">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            {result.length > 0 ? (
                              Object.keys(result[0]).map((key) => (
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
                          {result.length > 0 ? (
                            result.map((row, i) => (
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
                                      (JSON.stringify(cell).length > 100
                                        ? "..."
                                        : "")
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
                                No results found for this query.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
