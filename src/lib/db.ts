import { Pool } from "pg";

// Decode URL-encoded password (e.g., %40 -> @)
const password = process.env.DB_PASSWORD
  ? decodeURIComponent(process.env.DB_PASSWORD)
  : undefined;

console.log("Database config:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  passwordProvided: !!password,
});

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: password,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  ssl: false, // Server doesn't support SSL
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Execute a query
export async function executeQuery<T = Record<string, unknown>>(
  query: string,
  params?: unknown[],
): Promise<T[]> {
  try {
    const result = await pool.query(query, params);
    return result.rows as T[];
  } catch (error) {
    console.error("Query execution failed:", error);
    throw error;
  }
}

// Get analytics data with date range (READ-ONLY QUERY)
export async function getAnalyticsData(
  startDate: Date | null,
  endDate: Date | null,
) {
  // Using correct table names from database schema:
  // - user_prompts: Original user prompts
  // - save_enhance_prompt: AI-enhanced prompts (not "enhanced_prompts")
  // - refine_prompt: Refined prompts (not "refined_prompts")
  let query = `
    SELECT 
      up.prompt_id,
      up.user_id,
      up.user_prompt,
      up.created_at as prompt_created_at,
      sep.enhanced_prompt,
      sep.processing_time,
      sep.intent,
      sep.llm_used,
      sep.complexity,
      sep.domain,
      sep.mode,
      sep.created_at as enhanced_prompt_created_at,
      CASE WHEN rp.refine_id IS NOT NULL THEN true ELSE false END as has_refinement
    FROM user_prompts up
    LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
    LEFT JOIN refine_prompt rp ON sep.enhanced_prompt_id = rp.enhanced_prompt_id
  `;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (startDate) {
    params.push(startDate.toISOString());
    conditions.push(`up.created_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate.toISOString());
    conditions.push(`up.created_at <= $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY up.created_at DESC`;

  return executeQuery(query, params);
}

// Close pool on exit
export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
