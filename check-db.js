const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: decodeURIComponent(process.env.DB_PASSWORD),
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  ssl: false,
});

async function checkData() {
  try {
    console.log(
      `Checking database: ${process.env.DB_NAME} at ${process.env.DB_HOST}`,
    );

    const res = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(input_token) as non_null_input,
        COUNT(output_token) as non_null_output,
        COUNT(total_token) as non_null_total
      FROM save_enhance_prompt
    `);

    console.log("Results from save_enhance_prompt:");
    console.table(res.rows);

    const res2 = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(input_token) as non_null_input,
        COUNT(output_token) as non_null_output,
        COUNT(total_token) as non_null_total
      FROM refine_prompt
    `);
    console.log("Results from refine_prompt:");
    console.table(res2.rows);

    // Latest 5 rows with tokens
    const res3 = await pool.query(`
      SELECT enhanced_prompt_id, input_token, output_token, total_token, created_at
      FROM save_enhance_prompt
      WHERE input_token IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log("Latest 5 rows with tokens from save_enhance_prompt:");
    console.table(res3.rows);
  } catch (err) {
    console.error("Error checking data:", err);
  } finally {
    await pool.end();
  }
}

checkData();
