import { calculatePromptComplexity } from "./utils.js";
import {
  TIME_SAVED_CAP_MINUTES,
  POWER_USER_THRESHOLD,
  UPGRADE_CANDIDATE_THRESHOLD,
  TOKEN_PRICING,
} from "./constants.js";
import { getDisplayDate } from "./date-utils.js";

export function processData(
  data,
  initialPaidUserIds = [],
  allPaidUsers = [],
  startDate = null,
  endDate = null,
  installationMetrics = null,
  prevData = [],
) {
  const getSegment = (d) => {
    const status = (d.user_status || "").toLowerCase();
    if (
      status.includes("paid") ||
      status.includes("pro") ||
      status.includes("premium")
    )
      return "Pro User Prompts";
    if (status.includes("trial")) return "Freetrial User Prompts";
    return "Free User Prompts";
  };

  const buildDistribution = (data, keyFn) => {
    const counts = {};
    data.forEach((d) => {
      const key = keyFn(d);
      const segment = getSegment(d);
      if (!counts[key])
        counts[key] = {
          total: 0,
          "Free User Prompts": 0,
          "Freetrial User Prompts": 0,
          "Pro User Prompts": 0,
        };
      counts[key].total++;
      counts[key][segment]++;
    });
    return counts;
  };

  const toArray = (counts, topK = null) => {
    let entries = Object.entries(counts).map(([name, val]) => ({
      name,
      count: val.total,
      "Free User Prompts": val["Free User Prompts"],
      "Freetrial User Prompts": val["Freetrial User Prompts"],
      "Pro User Prompts": val["Pro User Prompts"],
    }));
    entries.sort((a, b) => b.count - a.count);
    if (topK) entries = entries.slice(0, topK);
    return entries;
  };

  const calculateCoreMetrics = (dataset) => {
    const seen = new Set();
    const unique = dataset.filter((item) => {
      if (String(item.user_id) === "329") return false;
      seen.add(item.prompt_id);
      return true;
    });

    const total = unique.length;
    const uniqueUsersSet = new Set(unique.map((d) => d.user_id));
    const uniqueUsers = uniqueUsersSet.size;

    let totalTimeSaved = 0;
    unique.forEach((d) => {
      if (d.enhanced_prompt && d.user_prompt) {
        const userWords = d.user_prompt.split(/\s+/).length;
        const enhancedWords = d.enhanced_prompt.split(/\s+/).length;
        const extraWords = Math.max(0, enhancedWords - userWords);

        // Apply Complexity Multiplier
        // Low -> 1.0, Medium -> 1.2, High -> 1.4
        const complexity = calculatePromptComplexity(d.user_prompt);
        let multiplier = 1.0;
        if (complexity.level === "medium") multiplier = 1.2;
        if (complexity.level === "high") multiplier = 1.4;

        // Base time in minutes (40 wpm)
        let savedMinutes = (extraWords / 40) * multiplier;

        // Hard Cap: 10 minutes max per prompt to prevent outliers
        savedMinutes = Math.min(savedMinutes, TIME_SAVED_CAP_MINUTES);

        totalTimeSaved += savedMinutes;
      }
    });

    return {
      total,
      uniqueUsers,
      timeSavedHours: totalTimeSaved / 60,
    };
  };

  const currentMetrics = calculateCoreMetrics(data);
  const previousMetrics = calculateCoreMetrics(prevData);

  // Calculate trends
  const calculateTrend = (curr, prev) => {
    // Return null if no comparison period (All Time)
    if (!startDate || !endDate || !prevData || prevData.length === 0)
      return null;

    // If current is 0 and prev is 0, no trend
    if (curr === 0 && prev === 0) return 0;

    // If prev is 0 but we have current data, it's 100% growth
    if (prev === 0) return 100;

    return ((curr - prev) / prev) * 100;
  };

  const calculateD1Retention = (dataset) => {
    if (!dataset || dataset.length === 0) return 0;

    const userActiveDates = {};
    dataset.forEach((d) => {
      if (String(d.user_id) === "329") return; // Exclude test user

      const displayDate = getDisplayDate(d.prompt_created_at);
      const date = displayDate.toISOString().split("T")[0];

      if (!userActiveDates[d.user_id]) userActiveDates[d.user_id] = new Set();
      userActiveDates[d.user_id].add(date);
    });

    // Use endDate as reference for 'now' if provided
    const refDate = endDate ? new Date(endDate) : new Date();
    let d1Count = 0;
    let eligibleUsers = 0;

    Object.values(userActiveDates).forEach((datesSet) => {
      const dates = Array.from(datesSet).sort();
      if (dates.length === 0) return;

      const firstDate = new Date(dates[0]);
      const d1Target = new Date(firstDate);
      d1Target.setDate(d1Target.getDate() + 1);
      const d1Str = d1Target.toISOString().split("T")[0];

      // Check eligibility (older than 1 day relative to reference date)
      if ((refDate - firstDate) / (1000 * 60 * 60 * 24) >= 1) {
        eligibleUsers++;
        if (datesSet.has(d1Str)) {
          d1Count++;
        }
      }
    });

    return eligibleUsers > 0 ? (d1Count / eligibleUsers) * 100 : 0;
  };

  const currentRetention = calculateD1Retention(data);
  const prevRetention = calculateD1Retention(prevData);

  const trends = {
    prompts: calculateTrend(currentMetrics.total, previousMetrics.total),
    users: calculateTrend(
      currentMetrics.uniqueUsers,
      previousMetrics.uniqueUsers,
    ),
    timeSaved: calculateTrend(
      currentMetrics.timeSavedHours,
      previousMetrics.timeSavedHours,
    ),
    retention: calculateTrend(currentRetention, prevRetention),
  };
  // Remove duplicates by prompt_id
  const seen = new Set();
  const unique = data.filter((item) => {
    // Exclude test user - ID 329
    if (String(item.user_id) === "329") {
      return false;
    }
    // Skip if we've already seen this prompt_id
    if (seen.has(item.prompt_id)) {
      return false;
    }
    seen.add(item.prompt_id);
    return true;
  });

  // Calculate metrics
  const total = unique.length;
  const enhanced = unique.filter(
    (d) => d.enhanced_prompt && d.enhanced_prompt.length > 0,
  ).length;
  const failed = total - enhanced;
  const uniqueUsers = new Set(unique.map((d) => d.user_id)).size;
  const enhancementRate = total > 0 ? (enhanced / total) * 100 : 0;
  const failureRate = total > 0 ? (failed / total) * 100 : 0;

  // Processing time
  const processingTimes = unique
    .filter((d) => d.processing_time != null)
    .map((d) => Number(d.processing_time)); // Ensure strictly numeric
  const avgProcessingTime =
    processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

  // Calculate time saved (words added * avg typing time)
  // Calculate time saved (words added * avg typing time)
  // Calculate time saved (words added * avg typing time)
  // Logic: Complexity Multiplier + Hard Cap
  let totalTimeSaved = 0;
  const debugLog = []; // Accumulate logs for a cleaner table output

  unique.forEach((d) => {
    if (d.enhanced_prompt && d.user_prompt) {
      const userWords = d.user_prompt.split(/\s+/).length;
      const enhancedWords = d.enhanced_prompt.split(/\s+/).length;
      const extraWords = Math.max(0, enhancedWords - userWords);

      // Complexity Multiplier
      const complexity = calculatePromptComplexity(d.user_prompt);
      let multiplier = 1.0;
      if (complexity.level === "medium") multiplier = 1.2;
      if (complexity.level === "high") multiplier = 1.4;

      // Base Calculation
      let savedMinutes = (extraWords / 40) * multiplier;

      // Hard Cap
      savedMinutes = Math.min(savedMinutes, TIME_SAVED_CAP_MINUTES);

      debugLog.push({
        prompt:
          d.user_prompt?.slice(0, 20) +
          (d.user_prompt?.length > 20 ? "..." : ""),
        level: complexity.level,
        multiplier,
        extraWords,
        rawMin: ((extraWords / 40) * multiplier).toFixed(2),
        cappedMin: savedMinutes.toFixed(2),
      });

      totalTimeSaved += savedMinutes;
    }
  });

  const totalTimeSavedHours = totalTimeSaved / 60;

  // Refinement rate
  const refinedCount = unique.filter((d) => d.has_refinement).length;
  const refineRate = total > 0 ? (refinedCount / total) * 100 : 0;

  // Intent distribution
  const intentCounts = buildDistribution(unique, (d) => {
    let intent = d.intent || "General";
    if (intent === "General") intent = "general_query";
    return intent;
  });
  const topIntents = toArray(intentCounts, 10);

  // Domain distribution
  const domainCounts = buildDistribution(unique, (d) => {
    let domain = d.domain || "General";
    if (domain === "General") domain = "general";
    return domain;
  });
  const topDomains = toArray(domainCounts, 10);

  // Mode distribution
  const modeCounts = buildDistribution(unique, (d) => {
    let mode = d.mode || "standard";
    if (mode === "enhance" || mode === null) mode = "standard";
    if (mode === "research") mode = "deep research";
    return mode;
  });
  const modeData = toArray(modeCounts);

  // Daily active users and active paid users
  const dailyActiveUsers = {};
  const dailyActivePaidUsersSet = {};
  const userDailyPrompts = {};
  const activeDaysByUser = {}; // Track set of active dates per user

  // Helper to check if user is paid (exact match for 'pro' status)
  const isPaidUser = (status) => {
    return (status || "free").toLowerCase() === "pro";
  };

  unique.forEach((d) => {
    const displayDate = getDisplayDate(d.prompt_created_at);
    const date = displayDate.toISOString().split("T")[0];

    // Track unique users per day
    if (!dailyActiveUsers[date]) dailyActiveUsers[date] = new Set();
    dailyActiveUsers[date].add(d.user_id);

    // Track prompts per user per day for peak usage
    if (!userDailyPrompts[d.user_id]) userDailyPrompts[d.user_id] = {};
    userDailyPrompts[d.user_id][date] =
      (userDailyPrompts[d.user_id][date] || 0) + 1;

    // Track all active dates for this user (for Habit User calc)
    if (!activeDaysByUser[d.user_id]) activeDaysByUser[d.user_id] = new Set();
    activeDaysByUser[d.user_id].add(date);

    // Track paid users active per day
    if (!dailyActivePaidUsersSet[date])
      dailyActivePaidUsersSet[date] = new Set();
    if (isPaidUser(d.user_status)) {
      dailyActivePaidUsersSet[date].add(d.user_id);
    }
  });

  // Daily activity counts
  const dailyCounts = {};
  unique.forEach((d) => {
    const displayDate = getDisplayDate(d.prompt_created_at);
    const date = displayDate.toISOString().split("T")[0];
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });

  const dailyActivity = Object.entries(dailyCounts).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  // Build array of all paid users with their creation dates
  const allPaidUsersList = allPaidUsers.map((user) => ({
    userId: user.user_id,
    createdDate: new Date(user.user_created_date).toISOString().split("T")[0],
  }));

  // Calculate cumulative totals and daily metrics
  const cumulativeActivePaidUsers = new Set(initialPaidUserIds);

  // Cache user segments to avoid repeated searching
  const userSegmentMap = {};
  unique.forEach((d) => {
    if (!userSegmentMap[d.user_id]) {
      const status = (d.user_status || "").toLowerCase();
      if (
        status.includes("paid") ||
        status.includes("pro") ||
        status.includes("premium")
      )
        userSegmentMap[d.user_id] = "Pro";
      else if (status.includes("trial"))
        userSegmentMap[d.user_id] = "Freetrial";
      else userSegmentMap[d.user_id] = "Free";
    }
  });

  const dailyActivityWithCumulative = dailyActivity.map(([date, count]) => {
    // Add active paid users from this day (for active line)
    if (dailyActivePaidUsersSet[date]) {
      dailyActivePaidUsersSet[date].forEach((userId) =>
        cumulativeActivePaidUsers.add(userId),
      );
    }

    // Peak Usage: Max prompts by any single user on this day
    const userPromptCountsOnDay = Object.values(userDailyPrompts).map(
      (u) => u[date] || 0,
    );
    const peakUsage = Math.max(...userPromptCountsOnDay, 0);

    // Habit Users on this day: Users who have been active on 5+ distinct days UP TO THIS DATE
    const habitUsersCount = Object.keys(activeDaysByUser).filter((uid) => {
      const datesUpToNow = Array.from(activeDaysByUser[uid]).filter(
        (d) => d <= date,
      );
      return datesUpToNow.length >= 5;
    }).length;

    // Power Users on this day: Users with 5+ prompts ON THIS DAY
    const powerUsersCount = Object.values(userDailyPrompts).filter(
      (u) => (u[date] || 0) >= 5,
    ).length;

    // Returning Users on this day: Users active today who had at least one active day BEFORE today in this dataset
    const returningUsersCount = Array.from(dailyActiveUsers[date] || []).filter(
      (uid) => {
        const previousDates = Array.from(activeDaysByUser[uid] || []).filter(
          (d) => d < date,
        );
        return previousDates.length > 0;
      },
    ).length;

    // Count ALL paid users created on or before this date (for total line)
    const totalPaidUsersUpToDate = allPaidUsersList.filter(
      (u) => u.createdDate <= date,
    ).length;

    // Calculate tokens and processing time for this date
    let dayInputTokens = 0;
    let dayOutputTokens = 0;
    let dayProcessingTimes = [];
    let dayTimeSavedMinutes = 0;
    let dayEnhancedCount = 0;
    let dayRefinedCount = 0;
    let dayTotalUserWords = 0;
    let dayTotalEnhancedWords = 0;

    unique.forEach((d) => {
      const displayDate = getDisplayDate(d.prompt_created_at);
      const dDate = displayDate.toISOString().split("T")[0];
      if (dDate === date) {
        // Accumulate word counts
        const userPromptWords = (d.user_prompt || "").split(/\s+/).length;
        dayTotalUserWords += userPromptWords;

        if (d.enhanced_prompt && d.enhanced_prompt.length > 0) {
          const enhancedPromptWords = (d.enhanced_prompt || "").split(
            /\s+/,
          ).length;
          dayTotalEnhancedWords += enhancedPromptWords;
        }

        dayInputTokens +=
          Number(d.input_token || 0) + Number(d.refine_input_token || 0);
        dayOutputTokens +=
          Number(d.output_token || 0) + Number(d.refine_output_token || 0);

        if (d.enhanced_prompt && d.enhanced_prompt.length > 0)
          dayEnhancedCount++;
        if (d.has_refinement) dayRefinedCount++;

        if (d.processing_time && !isNaN(Number(d.processing_time))) {
          dayProcessingTimes.push(Number(d.processing_time));
        }

        // Calculate Time Saved for this day
        if (d.enhanced_prompt && d.user_prompt) {
          const userWords = d.user_prompt.split(/\s+/).length;
          const enhancedWords = d.enhanced_prompt.split(/\s+/).length;
          const extraWords = Math.max(0, enhancedWords - userWords);

          const complexity = calculatePromptComplexity(d.user_prompt);
          let multiplier = 1.0;
          if (complexity.level === "medium") multiplier = 1.2;
          if (complexity.level === "high") multiplier = 1.4;

          let savedMinutes = (extraWords / 40) * multiplier;
          savedMinutes = Math.min(savedMinutes, TIME_SAVED_CAP_MINUTES); // Cap
          dayTimeSavedMinutes += savedMinutes;
        }
      }
    });

    const avgDayProcessingTime =
      dayProcessingTimes.length > 0
        ? dayProcessingTimes.reduce((a, b) => a + b, 0) /
          dayProcessingTimes.length /
          1000
        : 0;

    // Segmented Peak Usage Calculation
    // We want the average contribution of each segment to the daily intensity
    // Intensity = (Sum of max prompts per user on day) / (Total active users on day)
    const dayActiveUsersList = Array.from(dailyActiveUsers[date] || []);
    const totalDayActiveUsers = dayActiveUsersList.length;

    let daySegmentMaxSum = { Free: 0, Freetrial: 0, Pro: 0 };
    let daySegmentUserCounts = { Free: 0, Freetrial: 0, Pro: 0 };

    dayActiveUsersList.forEach((uid) => {
      const maxPromptsOnDay = userDailyPrompts[uid]?.[date] || 0;
      const segment = userSegmentMap[uid] || "Free";
      daySegmentMaxSum[segment] += maxPromptsOnDay;
      daySegmentUserCounts[segment]++;
    });

    return {
      date,
      prompts: count,
      users: totalDayActiveUsers,
      peakUsage,
      // Change: Divide by segment user count for "Avg Intensity of Segment" or total users?
      // User asked for "peak". If we stick to "Avg Max Prompts", splitting the average by segment user base is more accurate for "Segment Intensity".
      "Free User Prompts Intensity":
        daySegmentUserCounts.Free > 0
          ? daySegmentMaxSum.Free / daySegmentUserCounts.Free
          : 0,
      "Freetrial User Prompts Intensity":
        daySegmentUserCounts.Freetrial > 0
          ? daySegmentMaxSum.Freetrial / daySegmentUserCounts.Freetrial
          : 0,
      "Pro User Prompts Intensity":
        daySegmentUserCounts.Pro > 0
          ? daySegmentMaxSum.Pro / daySegmentUserCounts.Pro
          : 0,
      "Total Prompts Intensity":
        totalDayActiveUsers > 0
          ? (daySegmentMaxSum.Free +
              daySegmentMaxSum.Freetrial +
              daySegmentMaxSum.Pro) /
            totalDayActiveUsers
          : 0,
      habitUsers: habitUsersCount,
      powerUsers: powerUsersCount,
      returningUsers: returningUsersCount,
      retentionRate:
        dailyActiveUsers[date]?.size > 0
          ? (returningUsersCount / dailyActiveUsers[date].size) * 100
          : 0,
      activePaidUsers: cumulativeActivePaidUsers.size,
      totalPaidUsers: totalPaidUsersUpToDate,
      paidUsers: totalPaidUsersUpToDate,
      inputTokens: dayInputTokens,
      outputTokens: dayOutputTokens,
      totalTokens: dayInputTokens + dayOutputTokens,
      totalCost:
        (dayInputTokens / 1_000_000) * TOKEN_PRICING.input +
        (dayOutputTokens / 1_000_000) * TOKEN_PRICING.output,
      avgProcessingTime: avgDayProcessingTime,
      timeSavedHours: dayTimeSavedMinutes / 60,
      avgTimeSavedMinutes: count > 0 ? dayTimeSavedMinutes / count : 0,
      enhancementRate: count > 0 ? (dayEnhancedCount / count) * 100 : 0,
      refinedCount: dayRefinedCount,
      refineRate: count > 0 ? (dayRefinedCount / count) * 100 : 0,
      expansionRatio:
        dayTotalUserWords > 0 ? dayTotalEnhancedWords / dayTotalUserWords : 0,
    };
  });

  // Day of week distribution

  // Day of week distribution
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dowCounts = buildDistribution(unique, (d) => {
    const displayDate = getDisplayDate(d.prompt_created_at);
    return dayNames[displayDate.getUTCDay()];
  });

  // Ensure order
  const dayOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const dayOfWeekData = dayOrder.map((name) => {
    const val = dowCounts[name] || {
      total: 0,
      "Free User Prompts": 0,
      "Freetrial User Prompts": 0,
      "Pro User Prompts": 0,
    };
    return {
      name,
      count: val.total,
      "Free User Prompts": val["Free User Prompts"],
      "Freetrial User Prompts": val["Freetrial User Prompts"],
      "Pro User Prompts": val["Pro User Prompts"],
    };
  });

  // Time period distribution
  const periodCounts = buildDistribution(unique, (d) => {
    const displayDate = getDisplayDate(d.prompt_created_at);
    const hour = displayDate.getUTCHours();
    if (hour >= 6 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 18) return "Afternoon";
    if (hour >= 18 && hour < 24) return "Evening";
    return "Night";
  });

  const periodOrder = ["Morning", "Afternoon", "Evening", "Night"];
  const timePeriodData = periodOrder.map((name) => {
    const val = periodCounts[name] || {
      total: 0,
      "Free User Prompts": 0,
      "Freetrial User Prompts": 0,
      "Pro User Prompts": 0,
    };
    return {
      name,
      count: val.total,
      "Free User Prompts": val["Free User Prompts"],
      "Freetrial User Prompts": val["Freetrial User Prompts"],
      "Pro User Prompts": val["Pro User Prompts"],
    };
  });

  // LLM distribution
  const llmCounts = buildDistribution(unique, (d) => {
    let llm = d.llm_used || "Unknown";
    if (llm === "Unknown") llm = "ChatGPT";
    return llm;
  });
  const llmData = toArray(llmCounts);

  // User segments
  const userPromptCounts = {};
  unique.forEach((d) => {
    userPromptCounts[d.user_id] = (userPromptCounts[d.user_id] || 0) + 1;
  });

  const segmentCounts = {
    "Free User Prompts": 0,
    "Freetrial User Prompts": 0,
    "Pro User Prompts": 0,
  };
  const processedUsers = new Set();

  unique.forEach((d) => {
    if (processedUsers.has(d.user_id)) return;
    processedUsers.add(d.user_id);

    const status = (d.user_status || "").toLowerCase();
    if (
      status.includes("paid") ||
      status.includes("pro") ||
      status.includes("premium")
    ) {
      segmentCounts["Pro User Prompts"]++;
    } else if (status.includes("trial")) {
      segmentCounts["Freetrial User Prompts"]++;
    } else {
      segmentCounts["Free User Prompts"]++;
    }
  });

  const userSegments = Object.entries(segmentCounts).map(([name, count]) => ({
    name,
    count,
  }));

  // User Status distribution
  const statusCounts = {};
  unique.forEach((d) => {
    const status = d.user_status || "Unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const userStatusData = Object.entries(statusCounts).map(([name, count]) => ({
    name,
    count,
  }));

  // Prompt length stats
  const userPromptLengths = unique.map((d) => (d.user_prompt || "").length);
  const enhancedPromptLengths = unique
    .filter((d) => d.enhanced_prompt)
    .map((d) => (d.enhanced_prompt || "").length);

  const avgUserPromptLength =
    userPromptLengths.length > 0
      ? userPromptLengths.reduce((a, b) => a + b, 0) / userPromptLengths.length
      : 0;
  const avgEnhancedPromptLength =
    enhancedPromptLengths.length > 0
      ? enhancedPromptLengths.reduce((a, b) => a + b, 0) /
        enhancedPromptLengths.length
      : 0;

  // Word counts
  const userWordCounts = unique.map(
    (d) => (d.user_prompt || "").split(/\s+/).length,
  );
  const enhancedWordCounts = unique
    .filter((d) => d.enhanced_prompt)
    .map((d) => (d.enhanced_prompt || "").split(/\s+/).length);

  const avgUserWords =
    userWordCounts.length > 0
      ? userWordCounts.reduce((a, b) => a + b, 0) / userWordCounts.length
      : 0;
  const avgEnhancedWords =
    enhancedWordCounts.length > 0
      ? enhancedWordCounts.reduce((a, b) => a + b, 0) /
        enhancedWordCounts.length
      : 0;
  const expansionRatio = avgUserWords > 0 ? avgEnhancedWords / avgUserWords : 0;

  // Growth metrics

  // Calculate Stickiness (DAU/MAU)
  // Avg DAU = Sum(DAU) / Days
  // MAU = Total Unique Users in the period (Assuming period is ~30 days or sufficient)
  const totalDailyActive = Object.values(dailyActiveUsers).reduce(
    (sum, users) => sum + users.size,
    0,
  );
  const numberOfDays = Object.keys(dailyActiveUsers).length;
  const avgDAU = numberOfDays > 0 ? totalDailyActive / numberOfDays : 0;
  const stickiness = uniqueUsers > 0 ? (avgDAU / uniqueUsers) * 100 : 0;

  // Growth metrics

  const userDaysActive = {};
  const userActiveDates = {}; // userId -> sorted array of date strings

  Object.entries(dailyActiveUsers).forEach(([date, users]) => {
    users.forEach((userId) => {
      userDaysActive[userId] = (userDaysActive[userId] || 0) + 1;
      if (!userActiveDates[userId]) userActiveDates[userId] = [];
      userActiveDates[userId].push(date);
    });
  });

  // Calculate Daily Habit (New Logic)
  // 1. Users with prompts >= median of prompts per user
  // 2. Sort by distinct days prompting
  // 3. Get P75 (Top 25%) distinct days for these users
  // 4. Daily habit users = users with distinct prompt days >= calculated P75

  // Step 1: Calculate prompts per user
  const promptsPerUser = {};
  unique.forEach((d) => {
    promptsPerUser[d.user_id] = (promptsPerUser[d.user_id] || 0) + 1;
  });

  const allPromptCounts = Object.values(promptsPerUser).sort((a, b) => a - b);

  // Helper for percentile
  const calculatePercentile = (values, percentile) => {
    if (values.length === 0) return 0;
    const index = (percentile / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (upper >= values.length) return values[lower];
    return values[lower] * (1 - weight) + values[upper] * weight;
  };

  const calculateMedian = (values) => calculatePercentile(values, 50);

  const medianPrompts = calculateMedian(allPromptCounts);

  // Step 2: Filter users >= median prompts
  const activeUserIds = Object.keys(promptsPerUser).filter(
    (userId) => promptsPerUser[userId] >= medianPrompts,
  );

  // Step 3: Calculate distinct active days for these users
  const distinctDaysPerUser = {};

  // We need to look up days for these specific users.
  // We can reuse userActiveDateSets if available, or build it.
  // userActiveDates was built earlier: userId -> [date, date, ...]

  activeUserIds.forEach((userId) => {
    if (userActiveDates[userId]) {
      // distinct days count
      const distinctDays = new Set(
        userActiveDates[userId].map(
          (d) => new Date(d).toISOString().split("T")[0],
        ),
      ).size;
      distinctDaysPerUser[userId] = distinctDays;
    } else {
      distinctDaysPerUser[userId] = 0;
    }
  });

  const allDistinctDays = Object.values(distinctDaysPerUser).sort(
    (a, b) => a - b,
  );

  const p50DistinctDays = calculatePercentile(allDistinctDays, 50);
  const p75DistinctDays = calculatePercentile(allDistinctDays, 75);
  const p90DistinctDays = calculatePercentile(allDistinctDays, 90);

  // Step 4 & 5: Filter by P90 and Recency
  // Determine relevant "Now" (End of Period)
  const periodEndDate = endDate ? new Date(endDate) : new Date();
  const sevenDaysAgo = new Date(periodEndDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let dailyHabitUsersCount = 0;
  let dormantHabitUsersCount = 0;

  activeUserIds.forEach((userId) => {
    const distinctDays = distinctDaysPerUser[userId];
    if (distinctDays >= p90DistinctDays) {
      // Check Recency
      const userDates = userActiveDates[userId] || [];
      // Assuming userActiveDates are strings or Date objects. Ensure comparison works.
      const lastActiveDate = userDates.reduce((latest, current) => {
        const d = new Date(current);
        return d > latest ? d : latest;
      }, new Date(0));

      if (lastActiveDate >= sevenDaysAgo) {
        dailyHabitUsersCount++;
      } else {
        dormantHabitUsersCount++;
      }
    }
  });

  console.log(" Daily Habit Metric Calculation (Strict P90 + Recency):", {
    totalUniqueUsers: uniqueUsers,
    medianPromptsPerUser: medianPrompts,
    usersAboveMedianPrompts: activeUserIds.length,
    p50DistinctDays,
    p75DistinctDays,
    p90DistinctDays,
    finalDailyHabitUsers: dailyHabitUsersCount,
    dormantHabitUsers: dormantHabitUsersCount,
    recencyCutoff: sevenDaysAgo.toISOString().split("T")[0],
  });

  const dailyHabitUsers = dailyHabitUsersCount;
  const dormantHabitUsers = dormantHabitUsersCount;

  // Power User: > Threshold
  const powerUserRate =
    uniqueUsers > 0
      ? (Object.values(userPromptCounts).filter(
          (c) => c >= POWER_USER_THRESHOLD,
        ).length /
          uniqueUsers) *
        100
      : 0;

  // Calculate Intensity (Avg Max Daily Prompts per User)
  // Calculate Intensity (Avg Max Daily Prompts per User)
  const userMaxPrompts = Object.values(userDailyPrompts).map((days) =>
    Math.max(...Object.values(days)),
  );
  const intensity =
    userMaxPrompts.length > 0
      ? userMaxPrompts.reduce((a, b) => a + b, 0) / userMaxPrompts.length
      : 0;

  // Retention Rate: % of users who were active on more than 1 distinct day in this period
  const returningUsers = Object.values(userDaysActive).filter(
    (days) => days > 1,
  ).length;
  const retentionRate =
    uniqueUsers > 0 ? (returningUsers / uniqueUsers) * 100 : 0;

  // Calculate D1, D3, D7 Retention
  // Definition: % of users returning on Day X after their first seen date within the dataset

  const retentionMetrics = {
    d1: 0,
    d3: 0,
    d7: 0,
    bySegment: {
      d1: { Free: 0, Freetrial: 0, Pro: 0 },
      d3: { Free: 0, Freetrial: 0, Pro: 0 },
      d7: { Free: 0, Freetrial: 0, Pro: 0 },
    },
  };

  const segmentCountsD1 = { Free: 0, Freetrial: 0, Pro: 0 };
  const segmentCountsD3 = { Free: 0, Freetrial: 0, Pro: 0 };
  const segmentCountsD7 = { Free: 0, Freetrial: 0, Pro: 0 };

  let d1Count = 0,
    d3Count = 0,
    d7Count = 0;

  // Map userId -> Set of active dates (normalized to strings)
  const userActiveDateSets = {};
  Object.keys(userActiveDates).forEach((uid) => {
    userActiveDateSets[uid] = new Set(userActiveDates[uid]);
  });

  // Better Approach: Iterate all users
  const refDate = endDate ? new Date(endDate) : new Date();
  Object.keys(userActiveDates).forEach((userId) => {
    const dates = userActiveDates[userId].sort();
    if (dates.length === 0) return;

    const firstDate = new Date(dates[0]);
    const d1Target = new Date(firstDate);
    d1Target.setDate(d1Target.getDate() + 1);
    const d3Target = new Date(firstDate);
    d3Target.setDate(d3Target.getDate() + 3);
    const d7Target = new Date(firstDate);
    d7Target.setDate(d7Target.getDate() + 7);

    // Helper to check if user has activity on target date
    const hasActivityOn = (target) => {
      const tStr = target.toISOString().split("T")[0];
      return userActiveDateSets[userId].has(tStr);
    };

    const segment = userSegmentMap[userId] || "Free";

    // Only count towards denominator if user is "old enough" to have retained
    const diffDays = (refDate - firstDate) / (1000 * 60 * 60 * 24);

    if (diffDays >= 1) {
      if (hasActivityOn(d1Target)) {
        d1Count++;
        segmentCountsD1[segment]++;
      }
    }
    if (diffDays >= 3) {
      if (hasActivityOn(d3Target)) {
        d3Count++;
        segmentCountsD3[segment]++;
      }
    }
    if (diffDays >= 7) {
      if (hasActivityOn(d7Target)) {
        d7Count++;
        segmentCountsD7[segment]++;
      }
    }
  });

  // Denominator: We should count users whose first date was at least X days ago
  const usersOlderThan = (days) => {
    return Object.values(userActiveDates).filter((dates) => {
      if (dates.length === 0) return false;
      const firstDate = new Date(dates.sort()[0]);
      return (refDate - firstDate) / (1000 * 60 * 60 * 24) >= days;
    }).length;
  };

  const usersForD1 = usersOlderThan(1);
  const usersForD3 = usersOlderThan(3);
  const usersForD7 = usersOlderThan(7);

  retentionMetrics.d1 = usersForD1 > 0 ? (d1Count / usersForD1) * 100 : 0;
  retentionMetrics.d3 = usersForD3 > 0 ? (d3Count / usersForD3) * 100 : 0;
  retentionMetrics.d7 = usersForD7 > 0 ? (d7Count / usersForD7) * 100 : 0;

  // Calculate segmented percentages (Contribution to Total)
  // e.g. if 10% users retained D1, and 5% were Pro, 5% were Free.
  ["Pro", "Freetrial", "Free"].forEach((seg) => {
    retentionMetrics.bySegment.d1[seg] =
      usersForD1 > 0 ? (segmentCountsD1[seg] / usersForD1) * 100 : 0;
    retentionMetrics.bySegment.d1[`${seg}Count`] = segmentCountsD1[seg];

    retentionMetrics.bySegment.d3[seg] =
      usersForD3 > 0 ? (segmentCountsD3[seg] / usersForD3) * 100 : 0;
    retentionMetrics.bySegment.d3[`${seg}Count`] = segmentCountsD3[seg];

    retentionMetrics.bySegment.d7[seg] =
      usersForD7 > 0 ? (segmentCountsD7[seg] / usersForD7) * 100 : 0;
    retentionMetrics.bySegment.d7[`${seg}Count`] = segmentCountsD7[seg];
  });

  // Add total counts and denominators for each bucket
  retentionMetrics.d1Count = d1Count;
  retentionMetrics.d1Total = usersForD1;
  retentionMetrics.d3Count = d3Count;
  retentionMetrics.d3Total = usersForD3;
  retentionMetrics.d7Count = d7Count;
  retentionMetrics.d7Total = usersForD7;

  // Calculate Power User details (Top 5)
  // Updated threshold to 5+ prompts (handled in powerUserRate)
  const userStats = {};

  unique.forEach((d) => {
    if (!userStats[d.user_id]) {
      userStats[d.user_id] = {
        count: 0,
        lastActive: "",
        totalExpansion: 0,
        enhancedCount: 0,
        totalTimeSaved: 0,
        status: d.user_status || "Free",
        name: d.user_name || "",
        email: d.user_email || "",
      };
    }
    const stats = userStats[d.user_id];
    stats.count++;

    // Update status if present (assuming later prompts might have updated status)
    if (d.user_status) {
      stats.status = d.user_status;
    }

    // Update last active
    if (
      !stats.lastActive ||
      new Date(d.prompt_created_at) > new Date(stats.lastActive)
    ) {
      stats.lastActive = d.prompt_created_at;
    }

    // Calculate expansion and time saved
    if (d.enhanced_prompt && d.user_prompt) {
      const uWords = d.user_prompt.split(/\s+/).length || 1;
      const eWords = d.enhanced_prompt.split(/\s+/).length || 0;
      stats.totalExpansion += eWords / uWords;
      stats.enhancedCount++;

      const extraWords = Math.max(0, eWords - uWords);
      stats.totalTimeSaved += extraWords / 40; // minutes
    }
  });

  const topPowerUsers = Object.entries(userStats)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([userId, stats]) => ({
      userId,
      name: stats.name,
      email: stats.email,
      promptCount: stats.count,
      lastActive: stats.lastActive,
      avgEnhancementScore:
        stats.enhancedCount > 0
          ? stats.totalExpansion / stats.enhancedCount
          : 0,
      timeSavedHours: stats.totalTimeSaved / 60,
      status: stats.status,
    }));

  // High Intent Actions
  // 1. Refine (Explicit action)
  // 2. Deep Research (High value mode)
  // 3. Coding Intent (Value proxy)

  const deepResearchCount = unique.filter(
    (d) => d.mode === "research" || d.mode === "deep research",
  ).length;
  const codeIntentCount = unique.filter((d) =>
    (d.intent || "").toLowerCase().includes("code"),
  ).length;

  const highIntentActions = [
    {
      action: "Refine Prompt",
      count: refinedCount,
      frequency: total > 0 ? refinedCount / total : 0,
    },
    {
      action: "Deep Research",
      count: deepResearchCount,
      frequency: total > 0 ? deepResearchCount / total : 0,
    },
    {
      action: "Code Generation",
      count: codeIntentCount,
      frequency: total > 0 ? codeIntentCount / total : 0,
    },
  ];

  // Plan Analysis (Paid vs Free)
  const isPaid = (status) => {
    const s = (status || "").toLowerCase();
    return s.includes("paid") || s.includes("pro") || s.includes("premium");
  };

  const isTrial = (status) => {
    const s = (status || "").toLowerCase();
    return s.includes("trial");
  };

  const paidPrompts = unique.filter((d) => isPaid(d.user_status));
  const trialPrompts = unique.filter((d) => isTrial(d.user_status));
  const freePrompts = unique.filter(
    (d) => !isPaid(d.user_status) && !isTrial(d.user_status),
  );

  const calculateSegmentMetrics = (prompts) => {
    const uUsers = new Set(prompts.map((d) => d.user_id)).size;
    const count = prompts.length;
    const deepRes = prompts.filter(
      (d) => d.mode === "research" || d.mode === "deep research",
    ).length;

    // Time Saved per User
    let totalSaved = 0;
    prompts.forEach((d) => {
      if (d.enhanced_prompt && d.user_prompt) {
        const uW = d.user_prompt.split(/\s+/).length || 1;
        const eW = d.enhanced_prompt.split(/\s+/).length || 0;
        totalSaved += Math.max(0, eW - uW) / 40;
      }
    });

    return {
      userCount: uUsers,
      promptCount: count,
      promptsPerUser: uUsers > 0 ? count / uUsers : 0,
      deepResearchRate: count > 0 ? (deepRes / count) * 100 : 0,
      avgTimeSavedHours: uUsers > 0 ? totalSaved / 60 / uUsers : 0,
    };
  };

  const planAnalysis = {
    paid: calculateSegmentMetrics(paidPrompts),
    trial: calculateSegmentMetrics(trialPrompts),
    free: calculateSegmentMetrics(freePrompts),
  };

  // Business / Conversion Metrics
  const activePromptThreshold = 3;
  const activatedUsers = Object.values(userPromptCounts).filter(
    (c) => c >= activePromptThreshold,
  ).length;
  const activationRate =
    uniqueUsers > 0 ? (activatedUsers / uniqueUsers) * 100 : 0;

  // Potential Paid Users (Free users with > 20 prompts)
  let potentialPaidUsers = 0;
  Object.values(userStats).forEach((stats) => {
    const isFree =
      !stats.status ||
      (!stats.status.toLowerCase().includes("paid") &&
        !stats.status.toLowerCase().includes("pro") &&
        !stats.status.toLowerCase().includes("premium"));
    if (isFree && stats.count > 20) {
      potentialPaidUsers++;
    }
  });

  // ---------------------------------------------------------------------------
  // COHORT ANALYSIS
  // ---------------------------------------------------------------------------

  // 1. Engagement Cohort (Power vs Casual)
  const engagementCounts = { Power: 0, Casual: 0 };
  Object.values(userPromptCounts).forEach((count) => {
    if (count >= POWER_USER_THRESHOLD) engagementCounts.Power++;
    else engagementCounts.Casual++;
  });

  // 2. Model Loyalty (Single vs Multi)
  const userModels = {};
  unique.forEach((d) => {
    if (d.llm_used) {
      if (!userModels[d.user_id]) userModels[d.user_id] = new Set();
      userModels[d.user_id].add(d.llm_used);
    }
  });
  const modelLoyaltyCounts = { Single: 0, Multi: 0 };
  Object.values(userModels).forEach((models) => {
    if (models.size > 1) modelLoyaltyCounts.Multi++;
    else modelLoyaltyCounts.Single++;
  });

  // 3. Token Consumption (Whales vs Light)
  const userTokens = {};
  let totalTokensSum = 0;
  unique.forEach((d) => {
    const tokens =
      (Number(d.total_token) || 0) + (Number(d.refine_total_token) || 0);
    userTokens[d.user_id] = (userTokens[d.user_id] || 0) + tokens;
    totalTokensSum += tokens;
  });
  const avgTokensPerUser =
    Object.keys(userTokens).length > 0
      ? totalTokensSum / Object.keys(userTokens).length
      : 0;

  const tokenCohortCounts = { BelowAvg: 0, AboveAvg: 0 };
  Object.values(userTokens).forEach((t) => {
    if (t > avgTokensPerUser) tokenCohortCounts.AboveAvg++;
    else tokenCohortCounts.BelowAvg++;
  });

  // 4. Prompt Length (Short vs Medium vs Long)
  const userAvgLength = {};
  const userPromptCountForLength = {};
  unique.forEach((d) => {
    if (!d.user_prompt) return;
    const words = d.user_prompt.split(/\s+/).length;
    const uid = d.user_id;
    const currentAvg = userAvgLength[uid] || 0;
    const currentCount = userPromptCountForLength[uid] || 0;
    userAvgLength[uid] =
      (currentAvg * currentCount + words) / (currentCount + 1);
    userPromptCountForLength[uid] = currentCount + 1;
  });

  const lengthCohortCounts = { Short: 0, Medium: 0, Long: 0 };
  Object.values(userAvgLength).forEach((avg) => {
    if (avg < 10) lengthCohortCounts.Short++;
    else if (avg <= 50) lengthCohortCounts.Medium++;
    else lengthCohortCounts.Long++;
  });

  // 5. Feature Depth (Enhance vs Refine vs Multi-Mode)
  const userFeatures = {};
  unique.forEach((d) => {
    const uid = d.user_id;
    if (!userFeatures[uid])
      userFeatures[uid] = {
        hasEnhance: false,
        hasRefine: false,
        modes: new Set(),
      };
    if (d.enhanced_prompt_id) userFeatures[uid].hasEnhance = true;
    if (d.has_refinement || d.refine_id) userFeatures[uid].hasRefine = true;
    if (d.mode) userFeatures[uid].modes.add(d.mode);
  });

  const featureCohortCounts = {
    NonUser: 0,
    Basic: 0,
    Explorer: 0,
    Iterator: 0,
    Power: 0,
  };
  Object.values(userFeatures).forEach((u) => {
    const modeCount = u.modes.size;
    if (!u.hasEnhance) {
      featureCohortCounts.NonUser++;
    } else if (u.hasRefine && modeCount > 1) {
      featureCohortCounts.Power++;
    } else if (u.hasRefine) {
      featureCohortCounts.Iterator++;
    } else if (modeCount > 1) {
      featureCohortCounts.Explorer++;
    } else {
      featureCohortCounts.Basic++;
    }
  });

  const cohorts = {
    subscription: userSegments,
    engagement: Object.entries(engagementCounts).map(([name, count]) => ({
      name,
      count,
    })),
    modelLoyalty: Object.entries(modelLoyaltyCounts).map(([name, count]) => ({
      name,
      count,
    })),
    tokenConsumption: Object.entries(tokenCohortCounts).map(
      ([name, count]) => ({
        name,
        count,
      }),
    ),
    promptLength: Object.entries(lengthCohortCounts).map(([name, count]) => ({
      name,
      count,
    })),
    featureDepth: Object.entries(featureCohortCounts).map(([name, count]) => ({
      name,
      count,
    })),
  };

  return {
    cohorts,
    metrics: {
      total,
      enhanced,
      failed,
      uniqueUsers,
      enhancementRate,
      failureRate,
      avgProcessingTime,
      totalTimeSavedHours,
      avgTimeSavedPerPrompt: total > 0 ? totalTimeSaved / total : 0, // Minutes per prompt
      refineRate,
      refinedCount,
      stickiness,
      retentionMetrics,
      trends, // Added real trends from comparison
    },
    conversion: {
      activationRate,
      activatedUsers,
      potentialPaidUsers,
    },
    growth: {
      activeUsers: uniqueUsers,
      dailyHabitUsers,
      dormantHabitUsers,
      powerUserRate,
      intensity,
      retentionRate,
    },
    distributions: {
      topIntents,
      topDomains,
      mode: modeData,
      llm: llmData,
      userStatus: userStatusData,
    },
    timeAnalysis: {
      dailyActivity: dailyActivityWithCumulative,
      dayOfWeek: dayOfWeekData,
      timePeriod: timePeriodData,
    },
    installationMetrics: installationMetrics,
    // Get slowest prompts (top 5 by processing time)
    slowestPrompts: unique
      .filter((d) => d.processing_time && !isNaN(Number(d.processing_time)))
      .sort((a, b) => Number(b.processing_time) - Number(a.processing_time))
      .slice(0, 5)
      .map((d) => ({
        name: d.user_name || "Unknown",
        email: d.user_email || "—",
        prompt: d.user_prompt || "",
        enhancedPrompt: d.enhanced_prompt || "",
        processingTime: Number(d.processing_time),
        platform:
          d.llm_used && d.llm_used.toLowerCase().includes("velocity")
            ? "Chat"
            : "Ext",
        plan: (() => {
          const s = (d.user_status || "").toLowerCase();
          if (s.includes("paid") || s.includes("pro") || s.includes("premium"))
            return "Pro";
          if (s.includes("trial")) return "Freetrial";
          return "Free";
        })(),
        intent: d.intent || "General",
        domain: d.domain || "General",
        createdAt: d.prompt_created_at,
      })),
    latestPrompts: unique.map((d) => ({
      name: d.user_name || "Unknown",
      email: d.user_email || "—",
      prompt: d.user_prompt || "",
      enhancedPrompt: d.enhanced_prompt || "",
      processingTime: Number(d.processing_time || 0),
      installed: d.installed,
      platform:
        d.llm_used && d.llm_used.toLowerCase().includes("velocity")
          ? "Chat"
          : "Ext",
      plan: (() => {
        const s = (d.user_status || "").toLowerCase();
        if (s.includes("paid") || s.includes("pro") || s.includes("premium"))
          return "Pro";
        if (s.includes("trial")) return "Freetrial";
        return "Free";
      })(),
      totalPrompts: userPromptCounts[d.user_id] || 1,
      intent: d.intent || "General",
      domain: d.domain || "General",
      createdAt: d.prompt_created_at,
    })),
    insights: {
      avgUserPromptLength,
      avgEnhancedPromptLength,
      avgUserWords,
      avgEnhancedWords,
      expansionRatio,
      userSegments,
      topPowerUsers,
      highIntentActions,
      planAnalysis,
      tokens: calculateTokenMetrics(unique),
    },
  };
}

function calculateTokenMetrics(data) {
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  data.forEach((d) => {
    // Enhance tokens
    inputTokens += Number(d.input_token || 0);
    outputTokens += Number(d.output_token || 0);
    totalTokens += Number(d.total_token || 0);

    // Refine tokens (if available)
    inputTokens += Number(d.refine_input_token || 0);
    outputTokens += Number(d.refine_output_token || 0);
    totalTokens += Number(d.refine_total_token || 0);
  });

  // Simple cost calculation
  // Assuming $1 per 1M input tokens and $3 per 1M output tokens
  const inputCost = (inputTokens / 1_000_000) * 1.0;
  const outputCost = (outputTokens / 1_000_000) * 3.0;
  const totalCost = inputCost + outputCost;

  return {
    _debug: {
      sampleData: data.slice(0, 3).map((d) => ({
        in: d.input_token,
        out: d.output_token,
        rin: d.refine_input_token,
        rout: d.refine_output_token,
      })),
    },
    inputTokens,
    outputTokens,
    totalTokens,
    inputCost,
    outputCost,
    totalCost,
  };
}
// Ensure file ends correctly
