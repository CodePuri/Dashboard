const { Pool } = require("pg");

// Decode URL-encoded password (e.g., %40 -> @)
const password = process.env.DB_PASSWORD
  ? decodeURIComponent(process.env.DB_PASSWORD)
  : undefined;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: password,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  ssl: false,
});

async function checkTokens() {
  try {
    const res = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(CASE WHEN sep.input_token > 0 THEN 1 END) as rows_with_input_tokens,
        COUNT(CASE WHEN sep.output_token > 0 THEN 1 END) as rows_with_output_tokens,
        SUM(COALESCE(sep.input_token, 0)) as total_input_tokens,
        SUM(COALESCE(sep.output_token, 0)) as total_output_tokens
      FROM user_prompts up
      LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
    `);
    console.log("Token Data Check:", res.rows[0]);
  } catch (err) {
    console.error("Error querying db:", err);
  } finally {
    await pool.end();
  }
}

checkTokens();
