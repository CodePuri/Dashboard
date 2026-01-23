// Helper to get date shifted to IST (UTC + 5:30) for display alignment
function getDisplayDate(dateStr) {
  const date = new Date(dateStr);
  // Add 5 hours 30 minutes to recover Local Face Value from the UTC-shifted string
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
}

export function processData(data, initialPaidUserIds = [], allPaidUsers = []) {
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
  const intentCounts = {};
  unique.forEach((d) => {
    let intent = d.intent || "General";
    if (intent === "General") intent = "general_query";
    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
  });
  const topIntents = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Domain distribution
  const domainCounts = {};
  unique.forEach((d) => {
    let domain = d.domain || "General";
    if (domain === "General") domain = "general";
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  });
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Mode distribution
  const modeCounts = {};
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

  // Daily active users and active paid users
  const dailyActiveUsers = {};
  const dailyActivePaidUsersSet = {};

  // Helper to check if user is paid (exact match for 'pro' status)
  const isPaidUser = (status) => {
    return (status || "free").toLowerCase() === "pro";
  };

  unique.forEach((d) => {
    const displayDate = getDisplayDate(d.prompt_created_at);
    const date = displayDate.toISOString().split("T")[0];
    if (!dailyActiveUsers[date]) dailyActiveUsers[date] = new Set();
    if (!dailyActivePaidUsersSet[date])
      dailyActivePaidUsersSet[date] = new Set();
    dailyActiveUsers[date].add(d.user_id);
    if (isPaidUser(d.user_status)) {
      dailyActivePaidUsersSet[date].add(d.user_id);
    }
  });

  // Daily activity
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

  // Calculate cumulative totals for both metrics
  const cumulativeActivePaidUsers = new Set(initialPaidUserIds);

  const dailyActivityWithCumulative = dailyActivity.map(([date, count]) => {
    // Add active paid users from this day (for active line)
    if (dailyActivePaidUsersSet[date]) {
      dailyActivePaidUsersSet[date].forEach((userId) =>
        cumulativeActivePaidUsers.add(userId),
      );
    }

    // Count ALL paid users created on or before this date (for total line)
    const totalPaidUsersUpToDate = allPaidUsersList.filter(
      (u) => u.createdDate <= date,
    ).length;

    return {
      date,
      prompts: count,
      users: dailyActiveUsers[date] ? dailyActiveUsers[date].size : 0,
      activePaidUsers: cumulativeActivePaidUsers.size,
      totalPaidUsers: totalPaidUsersUpToDate,
      // Keep paidUsers for backward compatibility (use total)
      paidUsers: totalPaidUsersUpToDate,
    };
  });

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
  const dowCounts = {
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
  const periodCounts = {
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
  const llmCounts = {};
  unique.forEach((d) => {
    let llm = d.llm_used || "Unknown";
    if (llm === "Unknown") llm = "ChatGPT";
    llmCounts[llm] = (llmCounts[llm] || 0) + 1;
  });
  const llmData = Object.entries(llmCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // User segments
  const userPromptCounts = {};
  unique.forEach((d) => {
    userPromptCounts[d.user_id] = (userPromptCounts[d.user_id] || 0) + 1;
  });

  const segmentCounts = { Free: 0, Freetrial: 0, Pro: 0 };
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
      segmentCounts["Pro"]++;
    } else if (status.includes("trial")) {
      segmentCounts["Freetrial"]++;
    } else {
      segmentCounts["Free"]++;
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

  const userDaysActive = {};
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
  const userDailyPrompts = {};
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
      mode: modeData,
      llm: llmData,
      userStatus: userStatusData,
    },
    timeAnalysis: {
      dailyActivity: dailyActivityWithCumulative,
      dayOfWeek: dayOfWeekData,
      timePeriod: timePeriodData,
    },
    latestPrompts: unique.map((d) => ({
      name: d.user_name || "Unknown",
      email: d.user_email || "—",
      prompt: d.user_prompt || "",
      enhancedPrompt: d.enhanced_prompt || "",
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
    },
  };
}
