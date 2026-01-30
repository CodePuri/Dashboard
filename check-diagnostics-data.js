const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
    ? decodeURIComponent(process.env.DB_PASSWORD)
    : undefined,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  ssl: false,
});

async function checkDiagnostics() {
  try {
    console.log("Checking diagnostics data...");

    // Check if table exists
    try {
      await pool.query("SELECT 1 FROM api_error_logs LIMIT 1");
    } catch (e) {
      console.error("Table api_error_logs might not exist:", e.message);
      return;
    }

    const timeSeriesQuery = `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM api_error_logs
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `;

    const res = await pool.query(timeSeriesQuery);
    console.log("Timeline query result rows:", res.rows);

    const timeline = res.rows;
    console.log("distributions.timeline value:", timeline);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkDiagnostics();
