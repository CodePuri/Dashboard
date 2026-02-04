import { useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  Filter,
  MessageSquare,
  Puzzle,
  Layers,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const PRESETS = [
  { label: "Today", value: "Today" },
  { label: "Yesterday", value: "Yesterday" },
  { label: "Last 7 Days", value: "Last 7 Days" },
  { label: "Last 14 Days", value: "Last 14 Days" },
  { label: "Last 30 Days", value: "Last 30 Days" },
  { label: "Last 90 Days", value: "Last 90 Days" },
  { label: "All Time", value: "All Time" },
];

export function FilterBar({
  dateFilter,
  onDateFilterChange,
  sourceFilter,
  onSourceFilterChange,
  customDateRange,
  onCustomDateChange,
  hideAllPlatformFilter = false,
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(customDateRange);
  const [numMonths, setNumMonths] = useState(2);

  // Sync temp state when prop changes or popover opens
  useEffect(() => {
    if (isPopoverOpen) {
      setTempDateRange(customDateRange);
    }
  }, [isPopoverOpen, customDateRange]);

  // Adjust number of months based on screen size
  useEffect(() => {
    const handleResize = () => {
      setNumMonths(window.innerWidth < 640 ? 1 : 2);
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleApply = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      onCustomDateChange(tempDateRange);
      onDateFilterChange("Custom");
      setIsPopoverOpen(false);
    }
  };

  const handlePresetClick = (presetValue) => {
    onDateFilterChange(presetValue);
    // Optionally clear custom date range or keep it as previous
    setIsPopoverOpen(false);
  };

  // Helper to get display label
  const getDisplayLabel = () => {
    if (dateFilter === "Custom" && customDateRange?.from) {
      if (customDateRange.to) {
        return `${format(customDateRange.from, "LLL dd")} - ${format(
          customDateRange.to,
          "LLL dd",
        )}`;
      }
      return format(customDateRange.from, "LLL dd, y");
    }
    return dateFilter || "Select Date";
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Unified Date Picker */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full sm:w-[240px] justify-start text-left font-normal",
              !dateFilter && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{getDisplayLabel()}</span>
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            {/* Presets Sidebar */}
            <div className="border-b sm:border-b-0 sm:border-r p-2 flex flex-row sm:flex-col gap-1 w-[300px] sm:w-[140px] overflow-x-auto">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={dateFilter === preset.value ? "secondary" : "ghost"}
                  className="justify-start font-normal h-8 px-2 whitespace-nowrap"
                  onClick={() => handlePresetClick(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar Area */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDateRange?.from}
                selected={tempDateRange}
                onSelect={(range) => {
                  setTempDateRange(range);
                  // Optional: Automatically switch to "Custom" visual state if needed,
                  // but we wait for Apply to commit.
                }}
                numberOfMonths={numMonths}
                disabled={{
                  before: new Date("2025-10-29"),
                  after: new Date(),
                }}
              />
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPopoverOpen(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Source/Platform Filter */}
      <div className="bg-muted/50 p-1 rounded-lg border border-border/50 w-full sm:w-auto">
        <ToggleGroup
          type="single"
          value={sourceFilter}
          onValueChange={(value) => {
            if (value) onSourceFilterChange(value);
          }}
          className="gap-1 flex flex-wrap"
        >
          {!hideAllPlatformFilter && (
            <ToggleGroupItem
              value="All"
              aria-label="All Platforms"
              className="h-7 px-2 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              All
            </ToggleGroupItem>
          )}
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
