import { NextResponse } from "next/server";
import {
  setApiKey,
  listLinks,
  listDomains,
  getLink,
} from "@short.io/client-node";

const SHORT_IO_API_KEY = process.env.SHORT_IO_API_KEY;
let SHORT_IO_DOMAIN_ID = process.env.SHORT_IO_DOMAIN_ID;

// Configure SDK
if (SHORT_IO_API_KEY) {
  setApiKey(SHORT_IO_API_KEY);
}

/** Merge time-series from Short.io clickStatistics for multiple links */
function mergeClicksOverTime(statsResults, links) {
  const byDate = new Map();
  statsResults.forEach((stats, i) => {
    const link = links[i];
    if (!link || !stats) return;
    const linkKey = link.path || `link_${i}`;

    const ds = stats?.clickStatistics?.datasets?.[0];
    if (!ds) return;
    const points = Array.isArray(ds) ? ds : ds.data || [];

    points.forEach((p) => {
      const dateStr = p.x ?? p.date ?? p.label ?? p.t;
      const value = Number(p.y ?? p.value ?? p.count ?? 0);

      if (dateStr != null && !isNaN(value)) {
        if (!byDate.has(dateStr)) {
          byDate.set(dateStr, { date: dateStr });
        }
        const entry = byDate.get(dateStr);
        entry[linkKey] = (entry[linkKey] || 0) + value;
        // Also keep an 'aggregated' total for convenience
        entry.total = (entry.total || 0) + value;
      }
    });
  });

  return Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

async function getAutoDetectedDomainId() {
  try {
    const domains = await listDomains();
    if (domains.data && domains.data.length > 0) {
      return domains.data[0].id;
    }
  } catch (error) {
    console.error("Error auto-detecting domain:", error);
  }
  return null;
}

export async function GET(request) {
  if (!SHORT_IO_API_KEY) {
    return NextResponse.json(
      { success: false, error: "SHORT_IO_API_KEY is not configured" },
      { status: 503 },
    );
  }

  // Attempt to auto-detect domain ID if missing
  if (!SHORT_IO_DOMAIN_ID) {
    SHORT_IO_DOMAIN_ID = await getAutoDetectedDomainId();
  }

  const period = request.nextUrl.searchParams.get("period") || "last7";
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const tzOffset = -new Date().getTimezoneOffset();

  try {
    // 1. Fetch DOMAIN statistics and LINKS list in parallel
    let domainStatsUrl = `https://api-v2.short.io/statistics/domain/${SHORT_IO_DOMAIN_ID}?period=${period}&tzOffset=${tzOffset}`;
    if (period === "custom" && from && to) {
      const startMillis = new Date(from).getTime();
      const endMillis = new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1;
      domainStatsUrl = `https://api-v2.short.io/statistics/domain/${SHORT_IO_DOMAIN_ID}?period=custom&startDate=${startMillis}&endDate=${endMillis}&tzOffset=${tzOffset}`;
    }

    const [domainStatsRes, linksResponse] = await Promise.all([
      fetch(domainStatsUrl, {
        headers: {
          accept: "*/*",
          authorization: SHORT_IO_API_KEY,
        },
      }),
      listLinks({
        query: {
          domain_id: SHORT_IO_DOMAIN_ID,
          limit: 50,
        },
      }),
    ]);

    const domainStats = domainStatsRes.ok ? await domainStatsRes.json() : null;
    const links = linksResponse.data?.links || [];

    if (!domainStats) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch domain statistics from Short.io",
        },
        { status: 502 },
      );
    }

    // Helper to process breakdown data into a standard format
    const processBreakdown = (items, keyField) => {
      const ALL_TRAFFIC = "All Traffic";
      return (items || [])
        .map((item) => {
          let name =
            item.name || item.cityName || item.countryName || item[keyField];

          if (keyField === "city" && (!name || /^\d+$/.test(String(name)))) {
            name = "Unknown City";
          }

          if (
            (keyField === "referer" ||
              keyField === "refhost" ||
              keyField === "social") &&
            (!name || name === "Unknown")
          ) {
            name = "Direct / Other Traffic";
          }

          const result = {
            name: name || "Unknown",
            total: Number(item.score || item.clicks || item.count || 0),
          };
          result[ALL_TRAFFIC] = result.total; // Assign total to the single "All Traffic" segment
          return result;
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);
    };

    // 2. Process breakdowns
    const country = processBreakdown(domainStats.country, "country");
    const browser = processBreakdown(domainStats.browser, "browser");
    const referer = processBreakdown(domainStats.referer, "refhost");
    const social = processBreakdown(domainStats.social, "social");
    const os = processBreakdown(domainStats.os, "os");
    const city = processBreakdown(domainStats.city, "city");
    const utmMedium = processBreakdown(domainStats.utm_medium, "utm_medium");
    const utmSource = processBreakdown(domainStats.utm_source, "utm_source");
    const utmCampaign = processBreakdown(
      domainStats.utm_campaign,
      "utm_campaign",
    );

    // 3. Process Clicks Over Time (Single series: All Traffic)
    const clicksOverTime = [];
    const ds = domainStats.clickStatistics?.datasets?.[0];
    const points = Array.isArray(ds) ? ds : ds?.data || [];

    points.forEach((p) => {
      const dateStr = p.x ?? p.date ?? p.label ?? p.t;
      const value = Number(p.y ?? p.value ?? p.count ?? 0);
      if (dateStr != null && !isNaN(value)) {
        clicksOverTime.push({
          date: dateStr,
          "All Traffic": value,
          total: value,
        });
      }
    });
    clicksOverTime.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const activeLinks = ["All Traffic"];

    // 4. Totals and Changes
    const totalClicks = Number(domainStats.clicks || 0);
    const humanClicks = Number(domainStats.humanClicks || 0);

    let totalClicksChange = null;
    if (
      domainStats.clicks &&
      domainStats.prevClicks &&
      Number(domainStats.prevClicks) > 0
    ) {
      totalClicksChange = (
        ((Number(domainStats.clicks) - Number(domainStats.prevClicks)) /
          Number(domainStats.prevClicks)) *
        100
      ).toFixed(1);
    }

    let humanClicksChange = null;
    if (
      domainStats.humanClicks &&
      domainStats.prevHumanClicks &&
      Number(domainStats.prevHumanClicks) > 0
    ) {
      humanClicksChange = (
        ((Number(domainStats.humanClicks) -
          Number(domainStats.prevHumanClicks)) /
          Number(domainStats.prevHumanClicks)) *
        100
      ).toFixed(1);
    }

    // 5. Top Links (Basic list, no detailed stats needed per link)
    const topLinks = links.slice(0, 10).map((l) => ({
      path: l.path,
      shortURL: l.secureShortURL || l.shortURL,
      title: l.title || l.path,
      totalClicks: 0, // We aren't fetching individual link stats anymore as per user request
      humanClicks: 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalClicks,
        humanClicks,
        totalClicksChange,
        humanClicksChange,
        linkCount: links.length,
        topLinks,
        activeLinks,
        country,
        browser,
        referer,
        social,
        os,
        city,
        utmMedium,
        utmSource,
        utmCampaign,
        clicksOverTime,
        clickStatistics:
          clicksOverTime.length > 0
            ? { datasets: [{ data: clicksOverTime }] }
            : null,
      },
    });
  } catch (err) {
    console.error("Short.io API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Short.io request failed" },
      { status: 500 },
    );
  }
}
