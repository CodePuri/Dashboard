// Analytics data types

export interface AnalyticsMetrics {
  total: number;
  enhanced: number;
  failed: number;
  uniqueUsers: number;
  enhancementRate: number;
  failureRate: number;
  avgProcessingTime: number;
  totalTimeSavedHours: number;
  refineRate: number;
}

export interface GrowthMetrics {
  activeUsers: number;
  dailyHabitUsers: number;
  powerUserRate: number;
  intensity: number;
  retentionRate: number;
}

export interface ChartDataPoint {
  name: string;
  count: number;
}

export interface DailyActivityPoint {
  date: string;
  prompts: number;
  users: number;
}

export interface Distributions {
  topIntents: ChartDataPoint[];
  topDomains: ChartDataPoint[];
  complexity: ChartDataPoint[];
  mode: ChartDataPoint[];
  llm: ChartDataPoint[];
  userStatus: ChartDataPoint[];
}

export interface TimeAnalysis {
  dailyActivity: DailyActivityPoint[];
  dayOfWeek: ChartDataPoint[];
  timePeriod: ChartDataPoint[];
}

export interface PowerUser {
  userId: string;
  promptCount: number;
  lastActive: string;
  avgEnhancementScore: number;
}

export interface HighIntentAction {
  action: string;
  count: number;
  frequency: number;
}

export interface InsightsData {
  avgUserPromptLength: number;
  avgEnhancedPromptLength: number;
  avgUserWords: number;
  avgEnhancedWords: number;
  expansionRatio: number;
  userSegments: ChartDataPoint[];
  topPowerUsers: PowerUser[];
  highIntentActions: HighIntentAction[];
}

export interface AnalyticsData {
  metrics: AnalyticsMetrics;
  growth: GrowthMetrics;
  distributions: Distributions;
  timeAnalysis: TimeAnalysis;
  insights: InsightsData;
}

export type SourceFilterOption = "All" | "Chat" | "Extension";

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  count: number;
  error?: string;
}

export type DateFilterOption =
  | "Today"
  | "Yesterday"
  | "Last 7 Days"
  | "Last 14 Days"
  | "Last 30 Days"
  | "Last 90 Days"
  | "All Time"
  | "Custom";

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}
