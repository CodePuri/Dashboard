"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function UsageDetailedTable({ data = [], columns = [] }) {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (aVal === bVal) return 0;

    const result = aVal < bVal ? -1 : 1;
    return sortConfig.direction === "asc" ? result : -result;
  });

  const filteredData = sortedData.filter((row) =>
    Object.values(row).some((val) =>
      String(val || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  );

  return (
    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="relative group max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-8 text-[11px] bg-muted/20 border-muted-foreground/10 focus-visible:ring-primary/20 transition-all rounded-full"
        />
      </div>
      <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="max-h-[400px] overflow-auto custom-scrollbar">
          <Table className="min-w-[600px] w-full">
            <TableHeader className="bg-muted/30 sticky top-0 z-20 backdrop-blur-xl border-b border-border/40">
              <TableRow className="hover:bg-transparent border-none">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="text-[9px] uppercase tracking-[0.15em] font-extrabold text-muted-foreground/70 h-9 px-4"
                    sortDirection={
                      sortConfig.key === col.key ? sortConfig.direction : null
                    }
                    onSort={() => handleSort(col.key)}
                  >
                    <span>{col.label}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((row, i) => (
                  <TableRow
                    key={i}
                    className="h-11 border-border/40 hover:bg-primary/[0.03] transition-colors group/row"
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className="text-[11px] py-1 px-4 text-foreground/90 font-medium whitespace-nowrap"
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground text-[11px] font-light"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span>No records found in this segment.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
