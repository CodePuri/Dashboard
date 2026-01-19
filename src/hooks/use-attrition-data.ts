"use client";

import { useState, useEffect } from "react";

export interface AttritionUser {
  userId: string;
  promptCount: number;
  daysSinceLastActive: number;
  lifespanDays: number;
  isChurned: boolean;
  lastIntent: string;
  lastMode: string;
  lastStatus: "Success" | "Failure";
}

import type { DateFilterOption, SourceFilterOption } from "@/types/analytics";

export function useAttritionData(
  dateFilter: DateFilterOption = "Last 30 Days",
  sourceFilter: SourceFilterOption = "All",
) {
  const [data, setData] = useState<AttritionUser[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAttrition() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          date: dateFilter,
          source: sourceFilter,
        });
        const res = await fetch(`/api/attrition?${params}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAttrition();
  }, [dateFilter, sourceFilter]);

  return { data, isLoading };
}
