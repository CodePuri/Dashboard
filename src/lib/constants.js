export const TEST_USER_IDS = [329];

// Time calculation constants
export const TIME_SAVED_CAP_MINUTES = 6;
export const TYPING_SPEED_WPM = 40; // Words per minute for time saved calculation

// User classification thresholds
export const POWER_USER_THRESHOLD = 5; // Prompts to qualify as Power User
export const UPGRADE_CANDIDATE_THRESHOLD = 20; // Prompts to qualify as upgrade candidate
export const ACTIVATION_THRESHOLD = 3; // Prompts to count as activated

// Retention and activity thresholds
export const CHURN_DAYS = 7; // Days inactive to count as churned
export const RECENTLY_ACTIVE_DAYS = 14; // Days for "recently active" check

// Token pricing - uses environment variables with fallback defaults
// Update these values as LLM pricing changes
export const TOKEN_PRICING = {
  input: parseFloat(process.env.TOKEN_PRICE_INPUT || "1.0"), // Cost per 1M tokens
  output: parseFloat(process.env.TOKEN_PRICE_OUTPUT || "3.0"), // Cost per 1M tokens
};

// Utility function for safe division
export const safeDivide = (numerator, denominator, defaultValue = 0) => {
  if (denominator === 0 || !isFinite(numerator / denominator)) {
    return defaultValue;
  }
  return numerator / denominator;
};
