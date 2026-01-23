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

  // Exclude test users by ID
  if (excludeUsers.length > 0) {
    const ids = excludeUsers.join(", ");
    conditions.push(`u.user_id NOT IN (${ids})`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY up.created_at DESC`;

  return executeQuery(query, params);
}

// Get total paid users cumulative count by date (regardless of activity)
export async function getTotalPaidUsersByDate(
  startDate,
  endDate,
  excludeUsers = [],
) {
  const params = [];
  const conditions = [];

  // Paid status check - exact match for 'pro' status
  conditions.push(`COALESCE(us.status, 'free') = 'pro'`);

  // Exclude test users by ID
  if (excludeUsers.length > 0) {
    const ids = excludeUsers.join(", ");
    conditions.push(`u.user_id NOT IN (${ids})`);
  }

  // Get all paid users with their creation date
  const query = `
    SELECT 
      u.user_id,
      u.created_at::date as user_created_date
    FROM usertable u
    JOIN userstatus us ON u.user_id = us.user_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY u.created_at
  `;

  const rows = await executeQuery(query, params);
  return rows;
}

// Get distinct paid users active before a specific date (for cumulative baseline)
// Get distinct paid users active before a specific date (for cumulative baseline)
export async function getPriorPaidUsers(
  beforeDate,
  source = "All",
  excludeUsers = [],
) {
  if (!beforeDate) return [];

  const params = [beforeDate.toISOString()];
  const conditions = [`u.created_at < $1`];

  // Helper for paid status check matches the one in analytics-utils
  conditions.push(
    `(LOWER(COALESCE(us.status, '')) LIKE '%paid%' OR LOWER(COALESCE(us.status, '')) LIKE '%pro%' OR LOWER(COALESCE(us.status, '')) LIKE '%premium%')`,
  );

  let joinClause = "LEFT JOIN userstatus us ON u.user_id = us.user_id";

  if (source === "Chat") {
    joinClause +=
      " LEFT JOIN user_prompts up_filter ON u.user_id = up_filter.user_id LEFT JOIN save_enhance_prompt sep_filter ON up_filter.prompt_id = sep_filter.prompt_id";
    params.push("velocity");
    conditions.push(`sep_filter.llm_used ILIKE $${params.length}`);
  } else if (source === "Extension") {
    joinClause +=
      " LEFT JOIN user_prompts up_filter ON u.user_id = up_filter.user_id LEFT JOIN save_enhance_prompt sep_filter ON up_filter.prompt_id = sep_filter.prompt_id";
    params.push("velocity");
    conditions.push(
      `(sep_filter.llm_used NOT ILIKE $${params.length} OR sep_filter.llm_used IS NULL)`,
    );
  }

  // Exclude test users by ID
  if (excludeUsers.length > 0) {
    const ids = excludeUsers.join(", ");
    conditions.push(`u.user_id NOT IN (${ids})`);
  }

  const query = `
    SELECT DISTINCT u.user_id
    FROM usertable u
    ${joinClause}
    WHERE ${conditions.join(" AND ")}
  `;

  const rows = await executeQuery(query, params);
  return rows.map((r) => r.user_id);
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

  // Exclude test users by ID
  if (excludeUsers.length > 0) {
    const ids = excludeUsers.join(", ");
    conditions.push(`u.user_id NOT IN (${ids})`);
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

// Get diagnostics data for API error logs
export async function getDiagnosticsData(startDate, endDate, source = "All") {
  const params = [];
  const conditions = [];

  if (startDate) {
    params.push(startDate.toISOString());
    conditions.push(`created_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate.toISOString());
    conditions.push(`created_at <= $${params.length}`);
  }

  // Source/Platform filter heuristics
  if (source === "Chat") {
    params.push("%chat%");
    params.push("%conversation%");
    conditions.push(
      `(api_endpoint ILIKE $${params.length - 1} OR api_endpoint ILIKE $${params.length})`,
    );
  } else if (source === "Extension") {
    params.push("%chat%");
    params.push("%conversation%");
    conditions.push(
      `(api_endpoint NOT ILIKE $${params.length - 1} AND api_endpoint NOT ILIKE $${params.length})`,
    );
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Main query to get raw logs (limit for table)
  const logsQuery = `
    SELECT 
      id,
      error_id,
      api_endpoint,
      api_method,
      error_message,
      error_type,
      user_id,
      created_at
    FROM api_error_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 200
  `;

  // Aggregation queries
  const statsQuery = `
    SELECT
      COUNT(*) as total_errors,
      COUNT(DISTINCT user_id) as affected_users,
      COUNT(DISTINCT api_endpoint) as failing_endpoints,
      COUNT(DISTINCT error_type) as error_types_count
    FROM api_error_logs
    ${whereClause}
  `;

  // Aggregation by Error Type
  const typeDistributionQuery = `
    SELECT error_type, COUNT(*) as count
    FROM api_error_logs
    ${whereClause}
    GROUP BY error_type
    ORDER BY count DESC
    LIMIT 10
  `;

  // Aggregation by Endpoint
  const endpointDistributionQuery = `
    SELECT api_endpoint, COUNT(*) as count
    FROM api_error_logs
    ${whereClause}
    GROUP BY api_endpoint
    ORDER BY count DESC
    LIMIT 10
  `;

  // Aggregation over time (Daily)
  const timeSeriesQuery = `
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM api_error_logs
    ${whereClause}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  try {
    const [logs, stats, types, endpoints, timeline] = await Promise.all([
      executeQuery(logsQuery, params),
      executeQuery(statsQuery, params),
      executeQuery(typeDistributionQuery, params),
      executeQuery(endpointDistributionQuery, params),
      executeQuery(timeSeriesQuery, params),
    ]);

    return {
      logs,
      stats: stats[0] || {
        total_errors: 0,
        affected_users: 0,
        failing_endpoints: 0,
        error_types_count: 0,
      },
      distributions: {
        types,
        endpoints,
        timeline,
      },
    };
  } catch (error) {
    console.error("Failed to fetch diagnostics data:", error);
    throw error;
  }
}

// Close pool on exit
export async function closePool() {
  await pool.end();
}

export default pool;
