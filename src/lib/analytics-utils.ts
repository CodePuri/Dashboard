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
    const date = new Date(d.prompt_created_at).toISOString().split("T")[0];
    if (!dailyActiveUsers[date]) dailyActiveUsers[date] = new Set();
    dailyActiveUsers[date].add(d.user_id);
  });

  // Daily activity
  const dailyCounts: Record<string, number> = {};
  unique.forEach((d) => {
    const date = new Date(d.prompt_created_at).toISOString().split("T")[0];
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
    const day = dayNames[new Date(d.prompt_created_at).getDay()];
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
    const hour = new Date(d.prompt_created_at).getHours();
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
  const intensity = uniqueUsers > 0 ? enhanced / uniqueUsers : 0;

  // Retention Rate: % of users who were active on more than 1 distinct day in this period
  const returningUsers = Object.values(userDaysActive).filter(
    (days) => days > 1,
  ).length;
  const retentionRate =
    uniqueUsers > 0 ? (returningUsers / uniqueUsers) * 100 : 0;

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
    },
  };
}
