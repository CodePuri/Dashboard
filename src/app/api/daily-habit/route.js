import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/db";

const TEST_USER_IDS = [];

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const sourceStr = searchParams.get("source");

    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;
    const source = ["All", "Chat", "Extension"].includes(sourceStr || "")
      ? sourceStr
      : "All";

    // Get all data (we need complete history for median calculation)
    const allData = await getAnalyticsData(null, null, source, TEST_USER_IDS);

    // Filter data for the requested period
    const periodData =
      startDate && endDate
        ? allData.filter((row) => {
            const rowDate = new Date(row.prompt_created_at);
            return rowDate >= startDate && rowDate <= endDate;
          })
        : allData;

    // Calculate daily habit users
    const dailyHabitData = calculateDailyHabitUsers(
      allData,
      periodData,
      endDate,
    );

    // Generate daily trend data
    const dailyTrendData = generateDailyTrendData(allData, periodData, endDate);
    const dormantTrendData = generateDormantTrendData(
      allData,
      periodData,
      endDate,
    );

    console.log("Trend Data Generated:", {
      dailyTrendPoints: dailyTrendData.length,
      dormantTrendPoints: dormantTrendData.length,
      dailyTrendWithActivity: dailyTrendData.filter((d) => d.total > 0).length,
      dormantTrendWithActivity: dormantTrendData.filter((d) => d.total > 0)
        .length,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...dailyHabitData,
        dailyTrend: dailyTrendData,
        dormantTrend: dormantTrendData,
      },
    });
  } catch (error) {
    console.error("Daily Habit API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

function calculateDailyHabitUsers(allData, periodData, analysisEndDate) {
  // Step 1: Calculate total prompts per user (from all data)
  const promptsPerUser = {};
  allData.forEach((row) => {
    if (!row.user_id || !row.prompt_created_at) return;
    promptsPerUser[row.user_id] = (promptsPerUser[row.user_id] || 0) + 1;
  });

  // Step 2: Find median prompts
  const promptCounts = Object.values(promptsPerUser).sort((a, b) => a - b);
  const medianPrompts = calculateMedian(promptCounts);

  // Step 3: Filter high-volume users (≥ median prompts)
  const highVolumeUsers = new Set(
    Object.keys(promptsPerUser).filter(
      (userId) => promptsPerUser[userId] >= medianPrompts,
    ),
  );

  // Step 4: Calculate distinct active days for high-volume users
  const distinctDaysPerUser = {};

  // Use all data to get complete history
  allData.forEach((row) => {
    if (!row.user_id || !row.prompt_created_at) return;
    const userIdStr = String(row.user_id);
    if (!highVolumeUsers.has(userIdStr)) return;

    const dateStr = new Date(row.prompt_created_at).toISOString().split("T")[0];
    if (!distinctDaysPerUser[userIdStr]) {
      distinctDaysPerUser[userIdStr] = new Set();
    }
    distinctDaysPerUser[userIdStr].add(dateStr);
  });

  // Convert to counts
  const distinctDaysCount = {};
  Object.keys(distinctDaysPerUser).forEach((userId) => {
    distinctDaysCount[userId] = distinctDaysPerUser[userId].size;
  });

  // Step 5: Calculate P90 of distinct days
  const distinctDaysArray = Object.values(distinctDaysCount).sort(
    (a, b) => a - b,
  );
  const p90Threshold = calculatePercentile(distinctDaysArray, 90);

  // Step 6: Get users active in last 7 days of analysis period
  const sevenDaysAgo = analysisEndDate
    ? new Date(analysisEndDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentlyActiveUsers = new Set();
  periodData.forEach((row) => {
    if (!row.user_id || !row.prompt_created_at) return;
    const rowDate = new Date(row.prompt_created_at);
    if (rowDate >= sevenDaysAgo) {
      recentlyActiveUsers.add(String(row.user_id));
    }
  });

  // Step 7: Final classification
  const dailyHabitUsers = [];
  const dormantHabitUsers = [];

  Object.keys(distinctDaysCount).forEach((userId) => {
    const distinctDays = distinctDaysCount[userId];
    const isActiveRecently = recentlyActiveUsers.has(userId);

    if (distinctDays >= p90Threshold) {
      if (isActiveRecently) {
        dailyHabitUsers.push(userId);
      } else {
        dormantHabitUsers.push(userId);
      }
    }
  });

  // Get user details for segmentation
  const userStatusMap = {};
  const userDataMap = {};

  allData.forEach((row) => {
    if (!row.user_id) return;
    const userIdStr = String(row.user_id);
    if (!userStatusMap[userIdStr]) {
      userStatusMap[userIdStr] = row.user_status || "free";
      userDataMap[userIdStr] = {
        name: row.user_name || "Anonymous",
        email: row.user_email || "N/A",
      };
    }
  });

  // Segment users by status
  const segmentUsers = (userIds) => {
    const segments = { free: 0, trial: 0, pro: 0 };
    userIds.forEach((userId) => {
      const status = (userStatusMap[userId] || "free").toLowerCase();
      if (
        status.includes("pro") ||
        status.includes("paid") ||
        status.includes("premium")
      ) {
        segments.pro++;
      } else if (status.includes("trial")) {
        segments.trial++;
      } else {
        segments.free++;
      }
    });
    return segments;
  };

  const dailyHabitSegments = segmentUsers(dailyHabitUsers);
  const dormantHabitSegments = segmentUsers(dormantHabitUsers);

  return {
    dailyHabitUsers: dailyHabitUsers.length,
    dormantHabitUsers: dormantHabitUsers.length,
    p90Threshold,
    medianPrompts,
    dailyHabitSegments,
    dormantHabitSegments,
    userData: {
      dailyHabit: dailyHabitUsers.map((id) => ({
        id,
        ...userDataMap[id],
        status: userStatusMap[id],
      })),
      dormantHabit: dormantHabitUsers.map((id) => ({
        id,
        ...userDataMap[id],
        status: userStatusMap[id],
      })),
    },
  };
}

function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sorted.length) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function generateDailyTrendData(allData, periodData, endDate) {
  // First calculate the P90 threshold using all data
  const promptsPerUser = {};
  allData.forEach((row) => {
    if (!row.user_id || !row.prompt_created_at) return;
    promptsPerUser[row.user_id] = (promptsPerUser[row.user_id] || 0) + 1;
  });

  const promptCounts = Object.values(promptsPerUser).sort((a, b) => a - b);
  const medianPrompts = calculateMedian(promptCounts);

  const highVolumeUsers = new Set(
    Object.keys(promptsPerUser).filter(
      (userId) => promptsPerUser[userId] >= medianPrompts,
    ),
  );

  const distinctDaysPerUser = {};
  allData.forEach((row) => {
    if (!row.user_id || !row.prompt_created_at) return;
    const userIdStr = String(row.user_id);
    if (!highVolumeUsers.has(userIdStr)) return;

    const dateStr = new Date(row.prompt_created_at).toISOString().split("T")[0];
    if (!distinctDaysPerUser[userIdStr]) {
      distinctDaysPerUser[userIdStr] = new Set();
    }
    distinctDaysPerUser[userIdStr].add(dateStr);
  });

  const distinctDaysCount = {};
  Object.keys(distinctDaysPerUser).forEach((userId) => {
    distinctDaysCount[userId] = distinctDaysPerUser[userId].size;
  });

  const distinctDaysArray = Object.values(distinctDaysCount).sort(
    (a, b) => a - b,
  );
  const p90Threshold = calculatePercentile(distinctDaysArray, 90);

  // Now generate daily trend data from period data
  const dailyData = {};

  // Initialize date range
  if (periodData.length > 0) {
    const dates = periodData
      .map((row) => new Date(row.prompt_created_at).toISOString().split("T")[0])
      .filter((date) => date)
      .sort();

    const startDate = new Date(dates[0]);
    const endDateObj = endDate || new Date();

    for (
      let d = new Date(startDate);
      d <= endDateObj;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      dailyData[dateStr] = {
        date: dateStr,
        free: 0,
        trial: 0,
        pro: 0,
        freePower: 0,
        trialPower: 0,
        proPower: 0,
        total: 0,
      };
    }
  }

  // Process each day's data
  const userStatusMap = {};
  allData.forEach((row) => {
    if (!row.user_id) return;
    const userIdStr = String(row.user_id);
    if (!userStatusMap[userIdStr]) {
      userStatusMap[userIdStr] = row.user_status || "free";
    }
  });

  // Group data by date
  const dataByDate = {};
  periodData.forEach((row) => {
    if (!row.user_id || !row.prompt_created_at) return;

    const dateStr = new Date(row.prompt_created_at).toISOString().split("T")[0];
    if (!dataByDate[dateStr]) {
      dataByDate[dateStr] = [];
    }
    dataByDate[dateStr].push(row);
  });

  // For each date, calculate habit users
  Object.keys(dataByDate).forEach((dateStr) => {
    const dayData = dataByDate[dateStr];
    const usersActiveToday = new Set(dayData.map((row) => String(row.user_id)));

    // Calculate prompts per user for this day
    const dayPromptsPerUser = {};
    dayData.forEach((row) => {
      const uid = String(row.user_id);
      dayPromptsPerUser[uid] = (dayPromptsPerUser[uid] || 0) + 1;
    });

    // Check which users meet habit criteria and were active today
    usersActiveToday.forEach((userId) => {
      // Check if user meets P90 threshold
      if (distinctDaysCount[userId] >= p90Threshold) {
        const status = (userStatusMap[userId] || "free").toLowerCase();
        const isPower = (dayPromptsPerUser[userId] || 0) >= 5;

        if (
          status.includes("pro") ||
          status.includes("paid") ||
          status.includes("premium")
        ) {
          dailyData[dateStr].pro++;
          if (isPower) dailyData[dateStr].proPower++;
        } else if (status.includes("trial")) {
          dailyData[dateStr].trial++;
          if (isPower) dailyData[dateStr].trialPower++;
        } else {
          dailyData[dateStr].free++;
          if (isPower) dailyData[dateStr].freePower++;
        }
        dailyData[dateStr].total++;
      }
    });
  });

  // Return all dates in the range, not just those with activity
  return Object.values(dailyData);
}

function generateDormantTrendData(allData, periodData, endDate) {
  // Calculate P90 threshold using all data (same as daily habit)
  const promptsPerUser = {};
  allData.forEach((row) => {
    if (!row.user_id || !row.prompt_created_at) return;
    promptsPerUser[row.user_id] = (promptsPerUser[row.user_id] || 0) + 1;
  });

  const promptCounts = Object.values(promptsPerUser).sort((a, b) => a - b);
  const medianPrompts = calculateMedian(promptCounts);

  const highVolumeUsers = new Set(
    Object.keys(promptsPerUser).filter(
      (userId) => promptsPerUser[userId] >= medianPrompts,
    ),
  );

  const distinctDaysPerUser = {};
  allData.forEach((row) => {
    if (!row.user_id || !row.prompt_created_at) return;
    const userIdStr = String(row.user_id);
    if (!highVolumeUsers.has(userIdStr)) return;

    const dateStr = new Date(row.prompt_created_at).toISOString().split("T")[0];
    if (!distinctDaysPerUser[userIdStr]) {
      distinctDaysPerUser[userIdStr] = new Set();
    }
    distinctDaysPerUser[userIdStr].add(dateStr);
  });

  const distinctDaysCount = {};
  Object.keys(distinctDaysPerUser).forEach((userId) => {
    distinctDaysCount[userId] = distinctDaysPerUser[userId].size;
  });

  const distinctDaysArray = Object.values(distinctDaysCount).sort(
    (a, b) => a - b,
  );
  const p90Threshold = calculatePercentile(distinctDaysArray, 90);

  // Calculate the recency threshold (7 days ago from analysis end date)
  const sevenDaysAgo = endDate
    ? new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Now generate daily dormant trend data
  const dailyData = {};

  // Initialize date range
  if (periodData.length > 0) {
    const dates = periodData
      .map((row) => new Date(row.prompt_created_at).toISOString().split("T")[0])
      .filter((date) => date)
      .sort();

    const startDate = new Date(dates[0]);
    const endDateObj = endDate || new Date();

    for (
      let d = new Date(startDate);
      d <= endDateObj;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      dailyData[dateStr] = {
        date: dateStr,
        free: 0,
        trial: 0,
        pro: 0,
        freePower: 0,
        trialPower: 0,
        proPower: 0,
        total: 0,
      };
    }
  }

  // Calculate Average Prompts per Active Day for Power determination
  const avgPromptsMap = {};
  Object.keys(distinctDaysCount).forEach((userId) => {
    const distinctDays = distinctDaysCount[userId];
    const totalPrompts = promptsPerUser[userId] || 0;
    if (distinctDays > 0) {
      avgPromptsMap[userId] = totalPrompts / distinctDays;
    }
  });

  // Process each day's data to find dormant users
  const userStatusMap = {};
  const userLastActive = {};

  allData.forEach((row) => {
    if (!row.user_id || !row.prompt_created_at) return;
    const userIdStr = String(row.user_id);

    if (!userStatusMap[userIdStr]) {
      userStatusMap[userIdStr] = row.user_status || "free";
    }

    const rowDate = new Date(row.prompt_created_at);
    if (!userLastActive[userIdStr] || rowDate > userLastActive[userIdStr]) {
      userLastActive[userIdStr] = rowDate;
    }
  });

  // For each date in the period, count dormant users
  Object.keys(dailyData).forEach((dateStr) => {
    const currentDate = new Date(dateStr);

    // Check all high-volume users who meet P90 threshold
    Object.keys(distinctDaysCount).forEach((userId) => {
      if (distinctDaysCount[userId] >= p90Threshold) {
        // Check if user is dormant (meets P90 but NOT active in last 7 days)
        const lastActive = userLastActive[userId];
        const isDormant = lastActive && lastActive < sevenDaysAgo;

        if (isDormant) {
          const status = (userStatusMap[userId] || "free").toLowerCase();
          const isPower = (avgPromptsMap[userId] || 0) >= 5;

          if (
            status.includes("pro") ||
            status.includes("paid") ||
            status.includes("premium")
          ) {
            dailyData[dateStr].pro++;
            if (isPower) dailyData[dateStr].proPower++;
          } else if (status.includes("trial")) {
            dailyData[dateStr].trial++;
            if (isPower) dailyData[dateStr].trialPower++;
          } else {
            dailyData[dateStr].free++;
            if (isPower) dailyData[dateStr].freePower++;
          }
          dailyData[dateStr].total++;
        }
      }
    });
  });

  // Return all dates in the range, not just those with activity
  return Object.values(dailyData);
}
