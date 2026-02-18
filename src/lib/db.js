import { Pool } from "pg";
import { TEST_USER_IDS } from "./constants";

// Decode URL-encoded password (e.g., %40 -> @)
const password = process.env.DB_PASSWORD
  ? decodeURIComponent(process.env.DB_PASSWORD)
  : undefined;

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
  excludeUsers = TEST_USER_IDS,
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
      sep.input_token,
      sep.output_token,
      sep.total_token,
      rp.input_token as refine_input_token,
      rp.output_token as refine_output_token,
      rp.total_token as refine_total_token,
      COALESCE(us.status, sep.user_status) as user_status,
      sep.created_at as enhanced_prompt_created_at,
      CASE WHEN rp.refine_id IS NOT NULL THEN true ELSE false END as has_refinement,
      u.name as user_name,
      u.email as user_email,
      u.installed
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
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    conditions.push(`u.user_id::text NOT IN (${placeholders.join(", ")})`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY up.created_at DESC`;

  return executeQuery(query, params).then((rows) => {
    if (rows.length > 0) {
      console.log("DB Analytics Sample Row:", {
        input_token: rows[0].input_token,
        output_token: rows[0].output_token,
        sep_enhanced_prompt: !!rows[0].enhanced_prompt,
      });
    }
    return rows;
  });
}

// Get total paid users cumulative count by date (regardless of activity)
export async function getTotalPaidUsersByDate(
  startDate,
  endDate,
  excludeUsers = TEST_USER_IDS,
) {
  const params = [];
  const conditions = [];

  // Paid status check - exact match for 'pro' status
  conditions.push(`COALESCE(us.status, 'free') = 'pro'`);

  // Exclude test users by ID
  if (excludeUsers.length > 0) {
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    conditions.push(`u.user_id::text NOT IN (${placeholders.join(", ")})`);
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
  excludeUsers = TEST_USER_IDS,
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
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    conditions.push(`u.user_id::text NOT IN (${placeholders.join(", ")})`);
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
export async function getUserAttritionData(
  startDate,
  endDate,
  source = "All",
  excludeUsers = TEST_USER_IDS,
) {
  const params = [];
  const sourceConditions = [];

  // Exclude test users by ID
  if (excludeUsers.length > 0) {
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    sourceConditions.push(
      `up.user_id::text NOT IN (${placeholders.join(", ")})`,
    );
  }

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
  source = "All",
  excludeUsers = [],
) {
  const params = [];
  const conditions = [];
  const sourceJoinConditions = [];

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
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    conditions.push(`u.user_id::text NOT IN (${placeholders.join(", ")})`);
  }

  // Source filtering logic
  let joinWithPrompts = "";
  if (source === "Chat") {
    params.push("velocity");
    sourceJoinConditions.push(`sep.llm_used ILIKE $${params.length}`);
    joinWithPrompts = `
      JOIN user_prompts up ON u.user_id::text = up.user_id::text
      JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
    `;
  } else if (source === "Extension") {
    params.push("velocity");
    sourceJoinConditions.push(
      `(sep.llm_used NOT ILIKE $${params.length} OR sep.llm_used IS NULL)`,
    );
    joinWithPrompts = `
      JOIN user_prompts up ON u.user_id = up.user_id
      JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
    `;
  }

  const whereClause =
    conditions.length > 0 || sourceJoinConditions.length > 0
      ? `WHERE ${[...conditions, ...sourceJoinConditions].join(" AND ")}`
      : "";

  // Query 1: Onboarding Completion (Distinct user_id to handle joins)
  const onboardingQuery = `
    SELECT 
        COUNT(DISTINCT u.user_id) AS total_signups,
        COUNT(DISTINCT ob.user_id) AS completed_onboarding
    FROM usertable u
    ${joinWithPrompts}
    LEFT JOIN onboarding_data ob ON u.user_id::text = ob.user_id::text
    ${whereClause}
  `;

  // Query 2: Signup Sources
  const sourcesQuery = `
    SELECT 
        COALESCE(ob.source, 'Others') as source,
        COUNT(DISTINCT u.user_id) as count
    FROM usertable u
    ${joinWithPrompts}
    LEFT JOIN onboarding_data ob ON u.user_id::text = ob.user_id::text
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
    SELECT 
      DATE(created_at) as date, 
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as users,
      COUNT(DISTINCT api_endpoint) as endpoints,
      COUNT(DISTINCT error_type) as types
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

// Get installation metrics (Signups, Installs, Uninstalls)
export async function getInstallationMetrics(
  startDate,
  endDate,
  excludeUsers = [],
) {
  const params = [];
  let whereConditions = [];

  if (startDate) {
    params.push(startDate.toISOString());
    whereConditions.push(`u.created_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate.toISOString());
    whereConditions.push(`u.created_at <= $${params.length}`);
  }

  if (excludeUsers.length > 0) {
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    whereConditions.push(`u.user_id::text NOT IN (${placeholders.join(", ")})`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const query = `
    SELECT 
      COUNT(DISTINCT u.user_id) as total_signups,
      COUNT(DISTINCT CASE WHEN u.installed = true THEN u.user_id END) as total_installs,
      COUNT(DISTINCT CASE WHEN u.installed = false AND sep.prompt_id IS NOT NULL THEN u.user_id END) as total_uninstalls
    FROM usertable u
    LEFT JOIN user_prompts up ON u.user_id::text = up.user_id::text
    LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id 
        AND (sep.llm_used NOT ILIKE 'velocity' OR sep.llm_used IS NULL)
    ${whereClause}
  `;

  const rows = await executeQuery(query, params);
  return (
    rows[0] || { total_signups: 0, total_installs: 0, total_uninstalls: 0 }
  );
}

// Get daily installation metrics for visualizations
export async function getDailyInstallationMetrics(
  startDate,
  endDate,
  excludeUsers = [],
) {
  const params = [];
  let whereConditions = [];

  if (startDate) {
    params.push(startDate.toISOString());
    whereConditions.push(`u.created_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate.toISOString());
    whereConditions.push(`u.created_at <= $${params.length}`);
  }

  if (excludeUsers.length > 0) {
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    whereConditions.push(`u.user_id::text NOT IN (${placeholders.join(", ")})`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // Daily signups
  const signupsQuery = `
    SELECT 
      DATE(u.created_at) as date,
      COUNT(DISTINCT u.user_id) as signups
    FROM usertable u
    ${whereClause}
    GROUP BY DATE(u.created_at)
    ORDER BY date ASC
  `;

  // Daily installs (users with installed = true, by their signup date as proxy)
  const installsQuery = `
    SELECT 
      DATE(u.created_at) as date,
      COUNT(DISTINCT CASE WHEN u.installed = true THEN u.user_id END) as installs,
      COUNT(DISTINCT CASE WHEN u.installed = false THEN u.user_id END) as uninstalls
    FROM usertable u
    LEFT JOIN user_prompts up ON u.user_id::text = up.user_id::text
    LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id 
        AND (sep.llm_used NOT ILIKE 'velocity' OR sep.llm_used IS NULL)
    ${whereClause}
    GROUP BY DATE(u.created_at)
    ORDER BY date ASC
  `;

  try {
    const [signupsData, installsData] = await Promise.all([
      executeQuery(signupsQuery, params),
      executeQuery(installsQuery, params),
    ]);

    // Merge the data by date
    const dateMap = {};

    signupsData.forEach((row) => {
      const dateStr = new Date(row.date).toISOString().split("T")[0];
      if (!dateMap[dateStr])
        dateMap[dateStr] = {
          date: dateStr,
          signups: 0,
          installs: 0,
          uninstalls: 0,
        };
      dateMap[dateStr].signups = parseInt(row.signups) || 0;
    });

    installsData.forEach((row) => {
      const dateStr = new Date(row.date).toISOString().split("T")[0];
      if (!dateMap[dateStr])
        dateMap[dateStr] = {
          date: dateStr,
          signups: 0,
          installs: 0,
          uninstalls: 0,
        };
      dateMap[dateStr].installs = parseInt(row.installs) || 0;
      dateMap[dateStr].uninstalls = parseInt(row.uninstalls) || 0;
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Failed to fetch daily installation metrics:", error);
    return [];
  }
}

// Get behavior data for usage analysis (Power, Casual, Dead segments)
export async function getUsageBehaviorData(
  startDate,
  endDate,
  source = "All",
  excludeUsers = [],
) {
  const params = [];
  const conditions = [];

  // Exclude test users by ID
  if (excludeUsers.length > 0) {
    const ids = excludeUsers.join(", ");
    conditions.push(`up.user_id NOT IN (${ids})`);
  }

  // Date filtering
  if (startDate) {
    params.push(startDate.toISOString());
    conditions.push(`up.created_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate.toISOString());
    conditions.push(`up.created_at <= $${params.length}`);
  }

  // Source filtering logic
  let sourceJoin = "";
  if (source === "Chat") {
    params.push("velocity");
    conditions.push(`sep.llm_used ILIKE $${params.length}`);
    sourceJoin = "JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id";
  } else if (source === "Extension") {
    params.push("velocity");
    conditions.push(
      `(sep.llm_used NOT ILIKE $${params.length} OR sep.llm_used IS NULL)`,
    );
    sourceJoin =
      "LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id";
  } else {
    sourceJoin =
      "LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id";
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // This query gets every prompt with its user context to calculate behavioral metrics
  const query = `
    WITH UserStats AS (
      SELECT 
        up.user_id,
        COUNT(up.prompt_id) as total_prompts,
        MIN(up.created_at) as first_active,
        MAX(up.created_at) as last_active
      FROM user_prompts up
      ${sourceJoin}
      ${whereClause}
      GROUP BY up.user_id
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
      up.prompt_id,
      up.user_id,
      up.user_prompt,
      up.created_at,
      sep.enhanced_prompt,
      sep.mode,
      sep.llm_used,
      sep.total_token,
      rp.total_token as refine_total_token,
      CASE WHEN rp.refine_id IS NOT NULL THEN true ELSE false END as has_refinement,
      COALESCE(us.status, 'free') as user_status,
      u.name,
      u.email,
      u.created_at as user_signup_date,
      od.occupation
    FROM user_prompts up
    LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
    LEFT JOIN refine_prompt rp ON sep.enhanced_prompt_id = rp.enhanced_prompt_id
    LEFT JOIN usertable u ON up.user_id = u.user_id
    LEFT JOIN userstatus us ON up.user_id = us.user_id
    LEFT JOIN onboarding_data od ON up.user_id = od.user_id
    ${whereClause}
    ORDER BY up.created_at DESC
  `;

  return executeQuery(query, params);
}

// Get active user breakdown by day (for combo chart)
export async function getActiveUsersBreakdown(
  startDate,
  endDate,
  source = "All",
  excludeUsers = TEST_USER_IDS,
) {
  const params = [];
  const conditions = [];

  // Exclude test users
  if (excludeUsers.length > 0) {
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    conditions.push(`up.user_id::text NOT IN (${placeholders.join(", ")})`);
  }

  // Date filtering
  if (startDate) {
    params.push(startDate.toISOString());
    conditions.push(`up.created_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate.toISOString());
    conditions.push(`up.created_at <= $${params.length}`);
  }

  // Source filtering
  let sourceJoin = "";
  if (source === "Chat" || source === "Extension") {
    sourceJoin =
      "LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id";
    if (source === "Chat") {
      params.push("velocity");
      conditions.push(`sep.llm_used ILIKE $${params.length}`);
    } else {
      params.push("velocity");
      conditions.push(
        `(sep.llm_used NOT ILIKE $${params.length} OR sep.llm_used IS NULL)`,
      );
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Query: Group by date and user, then aggregate by plan
  const query = `
    WITH daily_user_prompts AS (
      SELECT 
        DATE(up.created_at) as activity_date,
        up.user_id,
        COALESCE(us.status, 'free') as plan,
        COUNT(*) as prompt_count
      FROM user_prompts up
      LEFT JOIN userstatus us ON up.user_id = us.user_id
      ${sourceJoin}
      ${whereClause}
      GROUP BY DATE(up.created_at), up.user_id, us.status
    )
    SELECT 
      activity_date as date,
      SUM(CASE WHEN LOWER(plan) = 'free' THEN 1 ELSE 0 END) as free_users,
      SUM(CASE WHEN LOWER(plan) LIKE '%trial%' THEN 1 ELSE 0 END) as trial_users,
      SUM(CASE WHEN LOWER(plan) = 'pro' OR LOWER(plan) = 'paid' OR LOWER(plan) = 'premium' THEN 1 ELSE 0 END) as pro_users,
      SUM(CASE WHEN LOWER(plan) = 'free' AND prompt_count < 5 THEN 1 ELSE 0 END) as free_lt_5,
      SUM(CASE WHEN LOWER(plan) = 'free' AND prompt_count >= 5 THEN 1 ELSE 0 END) as free_ge_5,
      SUM(CASE WHEN LOWER(plan) LIKE '%trial%' AND prompt_count < 5 THEN 1 ELSE 0 END) as trial_lt_5,
      SUM(CASE WHEN LOWER(plan) LIKE '%trial%' AND prompt_count >= 5 THEN 1 ELSE 0 END) as trial_ge_5,
      SUM(CASE WHEN (LOWER(plan) = 'pro' OR LOWER(plan) = 'paid' OR LOWER(plan) = 'premium') AND prompt_count < 5 THEN 1 ELSE 0 END) as pro_lt_5,
      SUM(CASE WHEN (LOWER(plan) = 'pro' OR LOWER(plan) = 'paid' OR LOWER(plan) = 'premium') AND prompt_count >= 5 THEN 1 ELSE 0 END) as pro_ge_5,
      COUNT(*) as total_users
    FROM daily_user_prompts
    GROUP BY activity_date
    ORDER BY activity_date ASC
  `;

  return executeQuery(query, params);
}

// Get distinct active user IDs in a period
export async function getActiveUserIds(
  startDate,
  endDate,
  source = "All",
  excludeUsers = TEST_USER_IDS,
) {
  const params = [];
  const conditions = [];

  if (excludeUsers.length > 0) {
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    conditions.push(`up.user_id::text NOT IN (${placeholders.join(", ")})`);
  }

  if (startDate) {
    params.push(startDate.toISOString());
    conditions.push(`up.created_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate.toISOString());
    conditions.push(`up.created_at <= $${params.length}`);
  }

  let sourceJoin = "";
  if (source === "Chat" || source === "Extension") {
    sourceJoin =
      "LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id";
    if (source === "Chat") {
      params.push("velocity");
      conditions.push(`sep.llm_used ILIKE $${params.length}`);
    } else {
      params.push("velocity");
      conditions.push(
        `(sep.llm_used NOT ILIKE $${params.length} OR sep.llm_used IS NULL)`,
      );
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT DISTINCT up.user_id
    FROM user_prompts up
    ${sourceJoin}
    ${whereClause}
  `;

  const rows = await executeQuery(query, params);
  return rows.map((r) => r.user_id);
}

// Get daily churn activity accurately
export async function getDailyChurnActivity(
  startDate,
  endDate,
  source = "All",
  excludeUsers = TEST_USER_IDS,
) {
  const params = [];
  const sourceJoinConditions = [];

  // Exclude test users
  if (excludeUsers.length > 0) {
    const placeholders = excludeUsers.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    excludeUsers.forEach((id) => params.push(String(id)));
    sourceJoinConditions.push(
      `up.user_id::text NOT IN (${placeholders.join(", ")})`,
    );
  }

  // Source filtering logic
  // We ALWAYS need to join save_enhance_prompt to check last_status (Success/Failure)
  const sourceJoin =
    "LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id";

  if (source === "Chat") {
    params.push("velocity");
    sourceJoinConditions.push(`sep.llm_used ILIKE $${params.length}`);
  } else if (source === "Extension") {
    params.push("velocity");
    sourceJoinConditions.push(
      `(sep.llm_used NOT ILIKE $${params.length} OR sep.llm_used IS NULL)`,
    );
  }

  const whereClause =
    sourceJoinConditions.length > 0
      ? `WHERE ${sourceJoinConditions.join(" AND ")}`
      : "";

  // We need to find users whose last_active date + 7 days falls within [startDate, endDate]
  // This means last_active falls within [startDate - 7 days, endDate - 7 days]
  const finalParams = [...params];
  let dateConditions = [];
  if (startDate) {
    const sDateParam = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    finalParams.push(sDateParam.toISOString());
    dateConditions.push(`last_active >= $${finalParams.length}`);
  }
  if (endDate) {
    const eDateParam = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    finalParams.push(eDateParam.toISOString());
    dateConditions.push(`last_active <= $${finalParams.length}`);
  }

  const dateWhere =
    dateConditions.length > 0 ? `WHERE ${dateConditions.join(" AND ")}` : "";

  const query = `
    WITH UserLastPrompt AS (
      SELECT 
        up.user_id,
        MAX(up.created_at) as last_active,
        COUNT(up.prompt_id) as total_prompts,
        CASE WHEN MAX(sep.enhanced_prompt) IS NULL OR MAX(sep.enhanced_prompt) = '' THEN 'Failure' ELSE 'Success' END as last_status
      FROM user_prompts up
      ${sourceJoin}
      ${whereClause}
      GROUP BY up.user_id
    )
    SELECT 
      (last_active + INTERVAL '7 days')::date as date,
      COUNT(*) as "churnCount",
      SUM(CASE WHEN total_prompts >= 20 THEN 1 ELSE 0 END) as "regrettableChurn",
      SUM(CASE WHEN last_status = 'Failure' THEN 1 ELSE 0 END) as "exitTriggers"
    FROM UserLastPrompt
    ${dateWhere}
    GROUP BY date
    ORDER BY date ASC
  `;

  return executeQuery(query, finalParams);
}

// Close pool on exit
export async function closePool() {
  await pool.end();
}

export default pool;
