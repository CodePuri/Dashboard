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
export async function testConnection() {
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
export async function executeQuery(query, params) {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("Query execution failed:", error);
    throw error;
  }
}

// Get analytics data with date range and source filter (READ-ONLY QUERY)
export async function getAnalyticsData(
  startDate,
  endDate,
  source = "All",
  excludeUsers = [],
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
      COALESCE(us.status, sep.user_status) as user_status,
      sep.created_at as enhanced_prompt_created_at,
      CASE WHEN rp.refine_id IS NOT NULL THEN true ELSE false END as has_refinement,
      u.name as user_name,
      u.email as user_email
    FROM user_prompts up
    LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
    LEFT JOIN refine_prompt rp ON sep.enhanced_prompt_id = rp.enhanced_prompt_id
    LEFT JOIN usertable u ON up.user_id = u.user_id
    LEFT JOIN userstatus us ON up.user_id = us.user_id
  `;

  const conditions = [];
  const params = [];

  if (startDate) {
    params.push(startDate.toISOString());
    conditions.push(`up.created_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate.toISOString());
    conditions.push(`up.created_at <= $${params.length}`);
  }

  // Source filtering based on llm_used
  if (source === "Chat") {
    params.push("velocity");
    conditions.push(`sep.llm_used ILIKE $${params.length}`);
  } else if (source === "Extension") {
    params.push("velocity");
    conditions.push(
      `(sep.llm_used NOT ILIKE $${params.length} OR sep.llm_used IS NULL)`,
    );
  }

  // Exclude test users
  if (excludeUsers.length > 0) {
    // Check if user name matches any of the excluded names (case-insensitive)
    // We use LOWER() for comparison to ensure robustness
    const exclusionConditions = excludeUsers.map((name) => {
      params.push(`%${name.toLowerCase()}%`);
      return `LOWER(u.name) NOT LIKE $${params.length}`;
    });
    if (exclusionConditions.length > 0) {
      conditions.push(`(${exclusionConditions.join(" AND ")})`);
    }
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY up.created_at DESC`;

  return executeQuery(query, params);
}

// Get attrition data with filters
export async function getUserAttritionData(startDate, endDate, source = "All") {
  const params = [];
  const sourceConditions = [];

  // Source filtering conditions (applied to prompts before aggregation)
  if (source === "Chat") {
    params.push("velocity");
    sourceConditions.push(`sep.llm_used ILIKE $${params.length}`);
  } else if (source === "Extension") {
    params.push("velocity");
    sourceConditions.push(
      `(sep.llm_used NOT ILIKE $${params.length} OR sep.llm_used IS NULL)`,
    );
  }

  const whereClause =
    sourceConditions.length > 0
      ? `WHERE ${sourceConditions.join(" AND ")}`
      : "";

  // Date filtering conditions (applied to User Aggregates)
  // We use HAVING to filter by "First Active" date (Cohort Analysis)
  const havingConditions = [];

  if (startDate) {
    params.push(startDate.toISOString());
    havingConditions.push(`MIN(up.created_at) >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate.toISOString());
    havingConditions.push(`MIN(up.created_at) <= $${params.length}`);
  }

  const havingClause =
    havingConditions.length > 0
      ? `HAVING ${havingConditions.join(" AND ")}`
      : "";

  const query = `
    WITH UserStats AS (
      SELECT 
        up.user_id,
        COUNT(up.prompt_id) as total_prompts,
        MIN(up.created_at) as first_active,
        MAX(up.created_at) as last_active
      FROM user_prompts up
      LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
      ${whereClause}
      GROUP BY up.user_id
      ${havingClause}
    ),
    LastPrompt AS (
      SELECT DISTINCT ON (up.user_id) 
        up.user_id,
        sep.intent,
        sep.enhanced_prompt,
        sep.mode
      FROM user_prompts up
      LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
      ORDER BY up.user_id, up.created_at DESC
    )
    SELECT 
      s.user_id,
      s.total_prompts,
      s.first_active,
      s.last_active,
      l.intent as last_intent,
      l.enhanced_prompt as last_enhanced_prompt,
      l.mode as last_mode
    FROM UserStats s
    JOIN LastPrompt l ON s.user_id = l.user_id
  `;

  return executeQuery(query, params);
}

// Get conversion metrics (Onboarding & Sources)
export async function getConversionMetrics(
  startDate,
  endDate,
  excludeUsers = [],
) {
  const params = [];
  const conditions = [];

  if (startDate) {
    params.push(startDate.toISOString());
    conditions.push(`u.created_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate.toISOString());
    conditions.push(`u.created_at <= $${params.length}`);
  }

  // Exclude test users
  if (excludeUsers.length > 0) {
    const exclusionConditions = excludeUsers.map((name) => {
      params.push(`%${name.toLowerCase()}%`);
      return `LOWER(u.name) NOT LIKE $${params.length}`;
    });
    if (exclusionConditions.length > 0) {
      conditions.push(`(${exclusionConditions.join(" AND ")})`);
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Query 1: Onboarding Completion
  const onboardingQuery = `
    SELECT 
        COUNT(DISTINCT u.user_id) AS total_signups,
        COUNT(DISTINCT ob.user_id) AS completed_onboarding
    FROM usertable u
    LEFT JOIN onboarding_data ob ON u.user_id = ob.user_id
    ${whereClause}
  `;

  // Query 2: Signup Sources
  const sourcesQuery = `
    SELECT 
        COALESCE(ob.source, 'Others') as source,
        COUNT(*) as count
    FROM usertable u
    LEFT JOIN onboarding_data ob ON u.user_id = ob.user_id
    ${whereClause}
    GROUP BY COALESCE(ob.source, 'Others')
    ORDER BY count DESC
  `;

  try {
    const [onboardingResult, sourcesResult] = await Promise.all([
      executeQuery(onboardingQuery, params),
      executeQuery(sourcesQuery, params),
    ]);

    const total = parseInt(onboardingResult[0]?.total_signups || "0");
    const completed = parseInt(
      onboardingResult[0]?.completed_onboarding || "0",
    );

    return {
      onboarding: {
        totalSignups: total,
        completedOnboarding: completed,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
      },
      sources: sourcesResult.map((row) => ({
        name: row.source,
        count: parseInt(row.count),
      })),
    };
  } catch (error) {
    console.error("Failed to fetch conversion metrics:", error);
    return {
      onboarding: {
        totalSignups: 0,
        completedOnboarding: 0,
        completionRate: 0,
      },
      sources: [],
    };
  }
}

// Close pool on exit
export async function closePool() {
  await pool.end();
}

export default pool;
