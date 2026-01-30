import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate prompt complexity using weighted composite scoring
 * @param {string} prompt - The user prompt to analyze
 * @returns {Object} - { score, level, factors }
 */
export function calculatePromptComplexity(prompt) {
  if (!prompt || typeof prompt !== "string") {
    return { score: 0, level: "low", factors: {} };
  }

  const text = prompt.trim();
  if (!text) return { score: 0, level: "low", factors: {} };

  // === Factor 1: Word Count (20% weight) ===
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const wordScore = Math.min(wordCount / 100, 1); // Cap at 100 words = 1.0

  // === Factor 2: Sentence Count (15% weight) ===
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const sentenceScore = Math.min(sentenceCount / 5, 1); // Cap at 5 sentences = 1.0

  // === Factor 3: Technical Terms (25% weight) ===
  const technicalTerms = [
    // Programming & Dev
    "api",
    "database",
    "algorithm",
    "implement",
    "integrate",
    "optimize",
    "architecture",
    "deploy",
    "configure",
    "migration",
    "authentication",
    "backend",
    "frontend",
    "server",
    "client",
    "endpoint",
    "query",
    "function",
    "class",
    "component",
    "module",
    "library",
    "framework",
    "debug",
    "refactor",
    "test",
    "unit test",
    "integration",
    // Data & Analysis
    "data",
    "analysis",
    "metrics",
    "dashboard",
    "report",
    "visualization",
    "aggregate",
    "filter",
    "sort",
    "join",
    "group by",
    "calculate",
    // Business
    "workflow",
    "process",
    "automate",
    "pipeline",
    "system",
    "platform",
    "scalable",
    "performance",
    "security",
    "compliance",
  ];
  const lowerText = text.toLowerCase();
  const techMatches = technicalTerms.filter((term) =>
    lowerText.includes(term),
  ).length;
  const techScore = Math.min(techMatches / 8, 1); // Cap at 8 terms = 1.0

  // === Factor 4: Multi-Intent Markers (20% weight) ===
  const multiIntentPatterns = [
    /\b(first|firstly)\b/gi,
    /\b(then|next|after that|afterwards)\b/gi,
    /\b(also|additionally|furthermore|moreover)\b/gi,
    /\b(finally|lastly)\b/gi,
    /\b(and also|as well as)\b/gi,
    /\b(step \d|part \d|\d\.|#\d)\b/gi,
    /\b(both|multiple|several|various)\b/gi,
  ];
  let intentMarkers = 0;
  multiIntentPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) intentMarkers += matches.length;
  });
  const intentScore = Math.min(intentMarkers / 4, 1); // Cap at 4 markers = 1.0

  // === Factor 5: Specificity (20% weight) ===
  let specificityCount = 0;

  // Numbers and specific values
  const numberMatches = text.match(/\b\d+(\.\d+)?\b/g);
  specificityCount += numberMatches ? Math.min(numberMatches.length, 3) : 0;

  // Quoted strings (specific requirements)
  const quotedMatches = text.match(/["'][^"']+["']/g);
  specificityCount += quotedMatches ? quotedMatches.length * 2 : 0;

  // File paths, URLs, or code references
  const pathMatches = text.match(/[\/\\][\w\/\\.-]+|https?:\/\/\S+|`[^`]+`/g);
  specificityCount += pathMatches ? pathMatches.length * 2 : 0;

  // Variable names or camelCase/snake_case
  const codeMatches = text.match(
    /\b[a-z]+[A-Z][a-zA-Z]*\b|\b[a-z]+_[a-z_]+\b/g,
  );
  specificityCount += codeMatches ? codeMatches.length : 0;

  const specificityScore = Math.min(specificityCount / 6, 1); // Cap at 6 specifics = 1.0

  // === Calculate Weighted Score ===
  const weights = {
    wordCount: 0.2,
    sentences: 0.15,
    technical: 0.25,
    multiIntent: 0.2,
    specificity: 0.2,
  };

  const weightedScore =
    wordScore * weights.wordCount +
    sentenceScore * weights.sentences +
    techScore * weights.technical +
    intentScore * weights.multiIntent +
    specificityScore * weights.specificity;

  // Normalize to 0-10 scale
  const finalScore = Math.round(weightedScore * 10 * 10) / 10;

  // Classify level
  let level;
  if (finalScore >= 6) {
    level = "high";
  } else if (finalScore >= 3) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    score: finalScore,
    level,
    factors: {
      wordCount: { value: wordCount, score: Math.round(wordScore * 100) / 100 },
      sentences: {
        value: sentenceCount,
        score: Math.round(sentenceScore * 100) / 100,
      },
      technicalTerms: {
        value: techMatches,
        score: Math.round(techScore * 100) / 100,
      },
      multiIntent: {
        value: intentMarkers,
        score: Math.round(intentScore * 100) / 100,
      },
      specificity: {
        value: specificityCount,
        score: Math.round(specificityScore * 100) / 100,
      },
    },
  };
}
