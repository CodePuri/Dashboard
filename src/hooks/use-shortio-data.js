"use client";

import { useState, useEffect, useCallback } from "react";

function getShortIoPeriod(dateFilter) {
  const map = {
    Today: "today",
    Yesterday: "yesterday",
    "Last 7 Days": "last7",
    "Last 14 Days": "last30",
    "Last 30 Days": "last30",
    "Last 90 Days": "total",
    "All Time": "total",
  };
  return map[dateFilter] || "last7";
}

const emptyShortIoData = {
  totalClicks: 0,
  humanClicks: 0,
  totalClicksChange: null,
  humanClicksChange: null,
  linkCount: 0,
  topLinks: [],
  country: [],
  browser: [],
  referer: [],
  social: [],
  os: [],
  city: [],
  utmMedium: [],
  utmSource: [],
  utmCampaign: [],
  clicksOverTime: [],
  clickStatistics: null,
  platform: "All",
  filteredLinkUrl: null,
};

export function useShortIoData(
  dateFilter = "Last 7 Days",
  customDateRange = null,
  sourceFilter = "All",
) {
  const [data, setData] = useState(emptyShortIoData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [needsDomainId, setNeedsDomainId] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNeedsDomainId(false);

    try {
      if (sourceFilter === "Lander") {
        setData(emptyShortIoData);
        setIsLoading(false);
        return;
      }

      const period = getShortIoPeriod(dateFilter);
      let url = `/api/shortio?period=${encodeURIComponent(period)}`;

      // Add platform filter if not "All"
      if (sourceFilter && sourceFilter !== "All") {
        url += `&platform=${encodeURIComponent(sourceFilter)}`;
      }

      if (dateFilter === "Custom" && customDateRange?.from) {
        url = `/api/shortio?period=custom`;
        if (sourceFilter && sourceFilter !== "All") {
          url += `&platform=${encodeURIComponent(sourceFilter)}`;
        }
        url += `&from=${encodeURIComponent(
          customDateRange.from.toISOString().split("T")[0],
        )}`;
        if (customDateRange.to) {
          url += `&to=${encodeURIComponent(
            customDateRange.to.toISOString().split("T")[0],
          )}`;
        }
      }

      const res = await fetch(url);
      const json = await res.json();

      if (res.status === 503) {
        setConfigured(false);
        setData(emptyShortIoData);
        return;
      }

      if (!res.ok) {
        throw new Error(json.error || `Short.io: ${res.status}`);
      }

      if (json.success && json.data) {
        setData(json.data);
        setConfigured(true);
        setNeedsDomainId(!!json.needsDomainId);
      } else {
        setData(emptyShortIoData);
      }
    } catch (err) {
      console.error("Short.io fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(emptyShortIoData);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, customDateRange, sourceFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    configured,
    needsDomainId,
    refetch: fetchData,
  };
}
