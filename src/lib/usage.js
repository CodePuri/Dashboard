import { calculatePromptComplexity } from "./utils.js";
import { TIME_SAVED_CAP_MINUTES, POWER_USER_THRESHOLD } from "./constants.js";

/**
 * Logic for classifying users into behavioral segments: Power, Casual, Dead.
 */

export function processUsageData(rawData, startDate, endDate) {
  const users = {};
  const now = endDate || new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Group by user
  rawData.forEach((row) => {
    // Skip rows with invalid created_at
    if (!row.created_at) return;

    const uid = row.user_id;
    if (!users[uid]) {
      users[uid] = {
        id: uid,
        name: row.name || "Anonymous",
        email: row.email || "N/A",
        prompts: [],
        daysActive: new Set(),
        modesUsed: new Set(),
        llmsUsed: new Set(),
        refineCount: 0,
        totalTokens: 0,
        status: (row.user_status || "free").toLowerCase(),
        occupation:
          row.occupation && row.occupation !== "Unknown"
            ? row.occupation
            : "Not Specified",
        signupDate: row.user_signup_date
          ? new Date(row.user_signup_date)
          : new Date(),
      };
    }

    const u = users[uid];
    try {
      const dateStr = new Date(row.created_at).toISOString().split("T")[0];
      u.prompts.push(row);
      u.daysActive.add(dateStr);

      if (row.mode) u.modesUsed.add(row.mode);
      if (row.llm_used) u.llmsUsed.add(row.llm_used);
      if (row.has_refinement) u.refineCount++;
      u.totalTokens +=
        Number(row.total_token || 0) + Number(row.refine_total_token || 0);
    } catch (dateError) {
      console.warn(`Invalid date for user ${uid}:`, row.created_at);
      // Skip this row but continue processing others
      return;
    }
  });

  // Population stats for comparison
  const userList = Object.values(users);
  const totalTokensPopulation = userList.reduce(
    (sum, u) => sum + u.totalTokens,
    0,
  );
  const avgTokensPerUser =
    userList.length > 0 ? totalTokensPopulation / userList.length : 0;

  // Calculate distributions
  const complexityCounts = { low: 0, medium: 0, high: 0 };
  const promptSophistication = { short: [], medium: [], long: [] };
  let totalPromptsAnalyzed = 0;
  let totalTimeSaved = 0;

  rawData.forEach((row) => {
    if (row.user_prompt) {
      const result = calculatePromptComplexity(row.user_prompt);
      complexityCounts[result.level]++;
      totalPromptsAnalyzed++;

      // Prompt Sophistication by length + record info
      const len = row.user_prompt.length;
      const promptRecord = {
        id: row.prompt_id,
        name: row.name || "Anon",
        email: row.email || "N/A",
        content: row.user_prompt,
        length: len,
        date: row.created_at || null,
      };

      if (len < 50) promptSophistication.short.push(promptRecord);
      else if (len < 200) promptSophistication.medium.push(promptRecord);
      else promptSophistication.long.push(promptRecord);

      if (row.enhanced_prompt) {
        const userWords = row.user_prompt.split(/\s+/).length;
        const enhancedWords = row.enhanced_prompt.split(/\s+/).length;
        const extraWords = Math.max(0, enhancedWords - userWords);

        let multiplier = 1.0;
        if (result.level === "medium") multiplier = 1.2;
        if (result.level === "high") multiplier = 1.4;

        let savedMinutes = (extraWords / 40) * multiplier;
        savedMinutes = Math.min(savedMinutes, TIME_SAVED_CAP_MINUTES);
        totalTimeSaved += savedMinutes;
      }
    }
  });

  const segments = { power: [], casual: [], dead: [] };
  const subscription = { pro: [], free: [], freetrial: [] };
  const loyalty = { specialist: [], explorer: [] };
  const tokenUsage = { aboveAvg: [], belowAvg: [] };
  const featureLevel = { level1: [], level2: [], level3: [], level4: [] };
  const occupationRecords = {};
  let freePowerUsers = 0;

  userList.forEach((u) => {
    const totalPrompts = u.prompts.length;
    const activeDays = u.daysActive.size;
    const multiModes = u.modesUsed.size > 1;
    const multiLLMs = u.llmsUsed.size > 1;
    const heavyRefine = u.refineCount > 2;

    const lastPrompt = u.prompts[u.prompts.length - 1];
    const lastActive = new Date(lastPrompt.created_at);
    const isRecentlyActive = lastActive >= fourteenDaysAgo;

    const record = {
      id: u.id,
      name: u.name,
      email: u.email,
      totalPrompts,
      avgTokens: Math.round(u.totalTokens / (totalPrompts || 1)),
      lastActive: lastActive.toISOString(),
      status: u.status,
      occupation: u.occupation,
    };

    // 1. Engagement (Power/Casual/Dead)
    const daysInactive = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Enrich record with behavioral data
    record.activeDays = activeDays;
    record.daysInactive = daysInactive;
    record.modesCount = u.modesUsed.size;
    record.llmsList = Array.from(u.llmsUsed);
    record.modesList = Array.from(u.modesUsed);
    record.isPower = false;
    record.isDead = false;

    if (
      totalPrompts > POWER_USER_THRESHOLD &&
      activeDays > 1 &&
      (multiModes || heavyRefine) &&
      isRecentlyActive
    ) {
      record.segment = "Power";
      record.isPower = true;
      segments.power.push(record);
      if (u.status === "free") freePowerUsers++;
    } else if (!isRecentlyActive || totalPrompts === 1) {
      record.segment = "Dead";
      record.isDead = true;
      segments.dead.push(record);
    } else {
      record.segment = "Casual";
      segments.casual.push(record);
    }

    // 2. Subscription
    if (u.status.includes("pro") || u.status.includes("paid"))
      subscription.pro.push(record);
    else if (u.status.includes("trial")) subscription.freetrial.push(record);
    else subscription.free.push(record);

    // 3. Loyalty
    if (multiLLMs) loyalty.explorer.push(record);
    else if (u.llmsUsed.size === 1) loyalty.specialist.push(record);

    // 4. Tokens
    if (u.totalTokens > avgTokensPerUser) tokenUsage.aboveAvg.push(record);
    else tokenUsage.belowAvg.push(record);

    // 5. Occupations
    if (!occupationRecords[u.occupation]) occupationRecords[u.occupation] = [];
    occupationRecords[u.occupation].push(record);

    // 6. Feature Adaption
    const hasRefinement = u.refineCount > 0;
    const hasModes =
      u.modesUsed.size > 1 ||
      (u.modesUsed.size === 1 &&
        !u.modesUsed.has("standard") &&
        !u.modesUsed.has("enhance"));

    if (hasModes && hasRefinement) featureLevel.level4.push(record);
    else if (hasRefinement) featureLevel.level3.push(record);
    else if (hasModes) featureLevel.level2.push(record);
    else featureLevel.level1.push(record);
  });

  // Calculate daily trends with full date range coverage
  const startRange = startDate ? new Date(startDate) : null;
  const endRange = endDate ? new Date(endDate) : new Date();
  const dailyTrendMap = {};

  if (startRange) {
    let current = new Date(startRange);
    while (current <= endRange) {
      const dateStr = current.toISOString().split("T")[0];
      dailyTrendMap[dateStr] = {
        date: dateStr,
        totalTokens: 0,
        promptCount: 0,
        activeUsers: new Set(),
        explorers: new Set(),
        potentialUpgrades: new Set(),
      };
      current.setDate(current.getDate() + 1);
    }
  }

  // Fill in activity data
  rawData.forEach((row) => {
    // Skip rows with invalid created_at
    if (!row.created_at) return;

    try {
      const dateKey = new Date(row.created_at).toISOString().split("T")[0];
      if (!dailyTrendMap[dateKey]) {
        dailyTrendMap[dateKey] = {
          date: dateKey,
          totalTokens: 0,
          promptCount: 0,
          activeUsers: new Set(),
          explorers: new Set(),
          potentialUpgrades: new Set(),
        };
      }
      const day = dailyTrendMap[dateKey];
      day.promptCount++;
      day.totalTokens +=
        Number(row.total_token || 0) + Number(row.refine_total_token || 0);

      const uid = row.user_id;
      day.activeUsers.add(uid);

      const u = users[uid];
      if (u) {
        if (u.llmsUsed.size > 1) {
          day.explorers.add(uid);
        }
        // Power User logic for daily metric
        const totalPrompts = u.prompts.length;
        const activeDays = u.daysActive.size;
        if (
          u.status === "free" &&
          totalPrompts > 5 &&
          activeDays > 1 &&
          (u.modesUsed.size > 1 || u.refineCount > 2)
        ) {
          day.potentialUpgrades.add(uid);
        }
      }
    } catch (dateError) {
      console.warn(
        `Invalid date in trend data for user ${row.user_id}:`,
        row.created_at,
      );
      return;
    }
  });

  // Calculate Stateful/Cumulative Pro Totals
  const userProTimelines = userList
    .map((u) => {
      const isCurrentlyPro =
        u.status.includes("pro") || u.status.includes("paid");
      const proPrompts = u.prompts.filter(
        (p) =>
          p.prompt_status?.toLowerCase().includes("pro") ||
          p.prompt_status?.toLowerCase().includes("paid"),
      );
      const freePrompts = u.prompts.filter(
        (p) =>
          p.prompt_status &&
          !p.prompt_status.toLowerCase().includes("pro") &&
          !p.prompt_status.toLowerCase().includes("paid"),
      );

      let firstProDate = null;
      let churnDate = null;

      if (proPrompts.length > 0) {
        firstProDate = new Date(proPrompts[0].created_at);
        // Churn is defined by a Free prompt occurring after a Pro state started
        const firstFreeAfterPro = freePrompts.find(
          (p) => new Date(p.created_at) > firstProDate,
        );
        if (firstFreeAfterPro) {
          churnDate = new Date(firstFreeAfterPro.created_at);
        }
      } else if (isCurrentlyPro) {
        // If current status is Pro but no pro prompts in window, assume they started Pro on signup
        firstProDate = u.signupDate;
      }

      // If we see they ARE currently free, but were once Pro in prompts, they churned
      if (!isCurrentlyPro && firstProDate && !churnDate) {
        const lastProPrompt = proPrompts[proPrompts.length - 1];
        churnDate = new Date(lastProPrompt.created_at);
      }

      return firstProDate ? { start: firstProDate, end: churnDate } : null;
    })
    .filter(Boolean);

  const trends = Object.values(dailyTrendMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const dayDate = new Date(d.date);
      // Cumulative Pro count for this specific day
      const proCount = userProTimelines.filter((tl) => {
        const start = new Date(tl.start.toISOString().split("T")[0]);
        const end = tl.end
          ? new Date(tl.end.toISOString().split("T")[0])
          : null;
        return start <= dayDate && (!end || end > dayDate);
      }).length;

      return {
        date: d.date,
        upgrades: d.potentialUpgrades.size,
        proUsers: proCount,
        explorerRate:
          d.activeUsers.size > 0
            ? Number(((d.explorers.size / d.activeUsers.size) * 100).toFixed(1))
            : 0,
        avgTokens:
          d.promptCount > 0 ? Math.round(d.totalTokens / d.promptCount) : 0,
      };
    });

  return {
    segments: {
      power: {
        count: segments.power.length,
        label: "Power Users",
        freePower: freePowerUsers,
        records: segments.power,
      },
      casual: {
        count: segments.casual.length,
        label: "Casual Users",
        records: segments.casual,
      },
      dead: {
        count: segments.dead.length,
        label: "Dead Users",
        records: segments.dead,
      },
    },
    subscription: {
      pro: { count: subscription.pro.length, records: subscription.pro },
      free: { count: subscription.free.length, records: subscription.free },
      freetrial: {
        count: subscription.freetrial.length,
        records: subscription.freetrial,
      },
    },
    loyalty: {
      specialist: {
        count: loyalty.specialist.length,
        records: loyalty.specialist,
      },
      explorer: { count: loyalty.explorer.length, records: loyalty.explorer },
    },
    tokenUsage: {
      aboveAvg: {
        count: tokenUsage.aboveAvg.length,
        records: tokenUsage.aboveAvg,
      },
      belowAvg: {
        count: tokenUsage.belowAvg.length,
        records: tokenUsage.belowAvg,
      },
      avgTokens: Math.round(avgTokensPerUser),
    },
    promptSophistication: {
      short: {
        count: promptSophistication.short.length,
        records: promptSophistication.short,
      },
      medium: {
        count: promptSophistication.medium.length,
        records: promptSophistication.medium,
      },
      long: {
        count: promptSophistication.long.length,
        records: promptSophistication.long,
      },
    },
    featureLevel: {
      level1: {
        count: featureLevel.level1.length,
        records: featureLevel.level1,
      },
      level2: {
        count: featureLevel.level2.length,
        records: featureLevel.level2,
      },
      level3: {
        count: featureLevel.level3.length,
        records: featureLevel.level3,
      },
      level4: {
        count: featureLevel.level4.length,
        records: featureLevel.level4,
      },
    },
    occupations: Object.entries(occupationRecords)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, records]) => ({ name, count: records.length, records })),
    complexityDistribution: [
      { name: "Low", count: complexityCounts.low, fill: "#22c55e" },
      { name: "Medium", count: complexityCounts.medium, fill: "#f59e0b" },
      { name: "High", count: complexityCounts.high, fill: "#3b82f6" },
    ]
      .map((item) => ({
        ...item,
        percentage:
          totalPromptsAnalyzed > 0
            ? ((item.count / totalPromptsAnalyzed) * 100).toFixed(1)
            : "0.0",
      }))
      .filter((i) => i.count > 0),
    totalUsers: userList.length,
    avgTimeSavedPerPrompt:
      totalPromptsAnalyzed > 0 ? totalTimeSaved / totalPromptsAnalyzed : 0,
    trends,
  };
}
