import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export async function GET() {
  try {
    // Check what date ranges exist in the data
    const dateRangeQuery = `
      SELECT 
        MIN(created_at) as min_date,
        MAX(created_at) as max_date,
        COUNT(*) as total_prompts
      FROM user_prompts
    `;
    
    const userCountQuery = `
      SELECT COUNT(DISTINCT user_id) as unique_users
      FROM user_prompts
    `;
    
    const recentDataQuery = `
      SELECT 
        user_id,
        COUNT(*) as prompt_count,
        MIN(created_at) as first_prompt,
        MAX(created_at) as last_prompt
      FROM user_prompts
      GROUP BY user_id
      ORDER BY last_prompt DESC
      LIMIT 10
    `;
    
    const [dateRange, userCount, recentUsers] = await Promise.all([
      executeQuery(dateRangeQuery, []),
      executeQuery(userCountQuery, []),
      executeQuery(recentDataQuery, [])
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        dateRange: dateRange[0],
        userCount: userCount[0],
        recentUsers: recentUsers
      }
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}