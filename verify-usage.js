import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: decodeURIComponent(process.env.DB_PASSWORD),
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  ssl: false,
});

async function verifyUsageQuery() {
  try {
    console.log("Verifying Usage Behavior Query...");

    // Test the logic we added to db.js (manually adapted for raw pg)
    const query = `
      SELECT 
        up.user_id,
        up.prompt_id,
        up.created_at,
        sep.mode,
        sep.llm_used,
        CASE WHEN rp.refine_id IS NOT NULL THEN true ELSE false END as has_refinement,
        u.created_at as user_signup_date
      FROM user_prompts up
      LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
      LEFT JOIN refine_prompt rp ON sep.enhanced_prompt_id = rp.enhanced_prompt_id
      JOIN usertable u ON up.user_id = u.user_id
      WHERE u.user_id NOT IN (329)
      ORDER BY up.created_at ASC
      LIMIT 10
    `;

    const res = await pool.query(query);
    console.log(`Successfully fetched ${res.rows.length} behavior records.`);
    if (res.rows.length > 0) {
      console.log("Sample record:", JSON.stringify(res.rows[0], null, 2));
    } else {
      console.warn("No data returned!");
    }
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await pool.end();
  }
}

verifyUsageQuery();
