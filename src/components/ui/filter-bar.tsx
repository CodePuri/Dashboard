"use client";

import * as React from "react";
import { Calendar, Filter, MessageSquare, Puzzle, Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DateFilterOption, SourceFilterOption } from "@/types/analytics";

interface FilterBarProps {
  dateFilter: DateFilterOption;
  onDateFilterChange: (value: DateFilterOption) => void;
  sourceFilter: SourceFilterOption;
  onSourceFilterChange: (value: SourceFilterOption) => void;
}

export function FilterBar({
  dateFilter,
  onDateFilterChange,
  sourceFilter,
  onSourceFilterChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Date Filter */}
      <Select
        value={dateFilter}
        onValueChange={(v) => onDateFilterChange(v as DateFilterOption)}
      >
        <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-input hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm">
          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Today">Today</SelectItem>
          <SelectItem value="Yesterday">Yesterday</SelectItem>
          <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
          <SelectItem value="Last 14 Days">Last 14 Days</SelectItem>
          <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
          <SelectItem value="Last 90 Days">Last 90 Days</SelectItem>
          <SelectItem value="All Time">All Time</SelectItem>
        </SelectContent>
      </Select>

      {/* Source/Platform Filter */}
      <div className="bg-muted/50 p-1 rounded-lg border border-border/50">
        <ToggleGroup
          type="single"
          value={sourceFilter}
          onValueChange={(value) => {
            if (value) onSourceFilterChange(value as SourceFilterOption);
          }}
          className="gap-1"
        >
          <ToggleGroupItem
            value="All"
            aria-label="All Platforms"
            className="h-7 px-2 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            All
          </ToggleGroupItem>
          <ToggleGroupItem
            value="Chat"
            aria-label="Chat Only"
            className="h-7 px-2 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Chat
          </ToggleGroupItem>
          <ToggleGroupItem
            value="Extension"
            aria-label="Extension Only"
            className="h-7 px-2 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <Puzzle className="h-3.5 w-3.5 mr-1.5" />
            Ext
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
