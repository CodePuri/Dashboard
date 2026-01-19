export interface PromptData {
  prompt_id: string;
  user_id: string;
  user_prompt: string;
  prompt_created_at: string;
  enhanced_prompt: string | null;
  processing_time: number | null;
  intent: string | null;
  llm_used: string | null;
  complexity: string | null;
  domain: string | null;
  mode: string | null;
  enhanced_prompt_created_at: string | null;
  has_refinement: boolean;
  user_status: string | null;
}

// Helper to get date shifted to IST (UTC + 5:30) for display alignment
function getDisplayDate(dateStr: string): Date {
  const date = new Date(dateStr);
  // Add 5 hours 30 minutes to recover Local Face Value from the UTC-shifted string
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
}

export function processData(data: PromptData[]) {
  // Remove duplicates
  const seen = new Set();
  const unique = data.filter((item) => {
    if (seen.has(item.prompt_id)) return false;
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
  let totalTimeSaved = 0;
  unique.forEach((d) => {
    if (d.enhanced_prompt && d.user_prompt) {
      const userWords = d.user_prompt.split(/\s+/).length;
      const enhancedWords = d.enhanced_prompt.split(/\s+/).length;
      const extraWords = Math.max(0, enhancedWords - userWords);
      totalTimeSaved += extraWords / 40; // 40 words per minute
    }
  });
  const totalTimeSavedHours = totalTimeSaved / 60;

  // Refinement rate
  const refinedCount = unique.filter((d) => d.has_refinement).length;
  const refineRate = total > 0 ? (refinedCount / total) * 100 : 0;

  // Intent distribution
  const intentCounts: Record<string, number> = {};
  unique.forEach((d) => {
    const intent = d.intent || "Unknown";
    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
  });
  const topIntents = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Domain distribution
  const domainCounts: Record<string, number> = {};
  unique.forEach((d) => {
    const domain = d.domain || "Unknown";
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  });
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Complexity distribution
  const complexityCounts: Record<string, number> = {};
  unique.forEach((d) => {
    const complexity = d.complexity || "Unknown";
    complexityCounts[complexity] = (complexityCounts[complexity] || 0) + 1;
  });
  const complexityData = Object.entries(complexityCounts).map(
    ([name, count]) => ({ name, count }),
  );

  // Mode distribution
  const modeCounts: Record<string, number> = {};
  unique.forEach((d) => {
    let mode = d.mode || "standard";
    if (mode === "enhance" || mode === null) mode = "standard";
    if (mode === "research") mode = "deep research";
    modeCounts[mode] = (modeCounts[mode] || 0) + 1;
  });
  const modeData = Object.entries(modeCounts).map(([name, count]) => ({
    name,
    count,
  }));

  // Daily active users
  const dailyActiveUsers: Record<string, Set<string>> = {};
  unique.forEach((d) => {
    const displayDate = getDisplayDate(d.prompt_created_at);
    const date = displayDate.toISOString().split("T")[0];
    if (!dailyActiveUsers[date]) dailyActiveUsers[date] = new Set();
    dailyActiveUsers[date].add(d.user_id);
  });

  // Daily activity
  const dailyCounts: Record<string, number> = {};
  unique.forEach((d) => {
    const displayDate = getDisplayDate(d.prompt_created_at);
    const date = displayDate.toISOString().split("T")[0];
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });
  const dailyActivity = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({
      date,
      prompts: count,
      users: dailyActiveUsers[date] ? dailyActiveUsers[date].size : 0,
    }));

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
  const dowCounts: Record<string, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  };
  unique.forEach((d) => {
    const displayDate = getDisplayDate(d.prompt_created_at);
    const day = dayNames[displayDate.getUTCDay()]; // Use UTC methods on shifted date
    dowCounts[day] = (dowCounts[day] || 0) + 1;
  });
  const dayOfWeekData = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ].map((name) => ({ name, count: dowCounts[name] }));

  // Time period distribution
  const periodCounts: Record<string, number> = {
    Night: 0,
    Morning: 0,
    Afternoon: 0,
    Evening: 0,
  };
  unique.forEach((d) => {
    const displayDate = getDisplayDate(d.prompt_created_at);
    const hour = displayDate.getUTCHours(); // Use UTC methods on shifted date
    let period = "Night";
    if (hour >= 6 && hour < 12) period = "Morning";
    else if (hour >= 12 && hour < 18) period = "Afternoon";
    else if (hour >= 18 && hour < 24) period = "Evening";
    periodCounts[period] = (periodCounts[period] || 0) + 1;
  });
  const timePeriodData = ["Morning", "Afternoon", "Evening", "Night"].map(
    (name) => ({ name, count: periodCounts[name] }),
  );

  // LLM distribution
  const llmCounts: Record<string, number> = {};
  unique.forEach((d) => {
    const llm = d.llm_used || "Unknown";
    llmCounts[llm] = (llmCounts[llm] || 0) + 1;
  });
  const llmData = Object.entries(llmCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // User segments
  const userPromptCounts: Record<string, number> = {};
  unique.forEach((d) => {
    userPromptCounts[d.user_id] = (userPromptCounts[d.user_id] || 0) + 1;
  });
  const segmentCounts = { "One-time": 0, Casual: 0, Regular: 0, Power: 0 };
  Object.values(userPromptCounts).forEach((count) => {
    if (count === 1) segmentCounts["One-time"]++;
    else if (count <= 5) segmentCounts["Casual"]++;
    else if (count <= 20) segmentCounts["Regular"]++;
    else segmentCounts["Power"]++;
  });
  const userSegments = Object.entries(segmentCounts).map(([name, count]) => ({
    name,
    count,
  }));

  // User Status distribution
  const statusCounts: Record<string, number> = {};
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

  const userDaysActive: Record<string, number> = {};
  Object.values(dailyActiveUsers).forEach((users) => {
    users.forEach((userId) => {
      userDaysActive[userId] = (userDaysActive[userId] || 0) + 1;
    });
  });
  const dailyHabitUsers = Object.values(userDaysActive).filter(
    (days) => days >= 5,
  ).length;
  const powerUserRate =
    uniqueUsers > 0
      ? (Object.values(userPromptCounts).filter((c) => c > 20).length /
          uniqueUsers) *
        100
      : 0;
  // Calculate Intensity (Avg Max Daily Prompts per User)
  const userDailyPrompts: Record<string, Record<string, number>> = {};
  unique.forEach((d) => {
    const displayDate = getDisplayDate(d.prompt_created_at)
      .toISOString()
      .split("T")[0];
    if (!userDailyPrompts[d.user_id]) userDailyPrompts[d.user_id] = {};
    userDailyPrompts[d.user_id][displayDate] =
      (userDailyPrompts[d.user_id][displayDate] || 0) + 1;
  });

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

  // Calculate Power User details (Top 5)
  const userStats: Record<
    string,
    {
      count: number;
      lastActive: string;
      totalExpansion: number;
      enhancedCount: number;
      totalTimeSaved: number;
      status: string;
    }
  > = {};

  unique.forEach((d) => {
    if (!userStats[d.user_id]) {
      userStats[d.user_id] = {
        count: 0,
        lastActive: "",
        totalExpansion: 0,
        enhancedCount: 0,
        totalTimeSaved: 0,
        status: d.user_status || "Free",
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
    .slice(0, 5)
    .map(([userId, stats]) => ({
      userId,
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
  const isPaid = (status: string | null) => {
    const s = (status || "").toLowerCase();
    return s.includes("paid") || s.includes("pro") || s.includes("premium");
  };

  const paidPrompts = unique.filter((d) => isPaid(d.user_status));
  const freePrompts = unique.filter((d) => !isPaid(d.user_status));

  const calculateSegmentMetrics = (prompts: PromptData[]) => {
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

  return {
    metrics: {
      total,
      enhanced,
      failed,
      uniqueUsers,
      enhancementRate,
      failureRate,
      avgProcessingTime,
      totalTimeSavedHours,
      refineRate,
    },
    conversion: {
      activationRate,
      activatedUsers,
      potentialPaidUsers,
    },
    growth: {
      activeUsers: uniqueUsers,
      dailyHabitUsers,
      powerUserRate,
      intensity,
      retentionRate,
    },
    distributions: {
      topIntents,
      topDomains,
      complexity: complexityData,
      mode: modeData,
      llm: llmData,
      userStatus: userStatusData,
    },
    timeAnalysis: {
      dailyActivity,
      dayOfWeek: dayOfWeekData,
      timePeriod: timePeriodData,
    },
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
    },
  };
}
