import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// user_id = 329 is excluded from all queries as per user request.

import { promises as fs } from "fs";
import path from "path";

async function getDatabaseSchema() {
  try {
    const schemaPath = path.join(process.cwd(), "DATABASE_SCHEMA.md");
    const schema = await fs.readFile(schemaPath, "utf8");
    return schema;
  } catch (error) {
    console.error("Failed to read DATABASE_SCHEMA.md:", error);
    // Fallback or re-throw depending on severity.
    // Since this is critical for the AI to know the schema, we should probably return a minimal fallback or throw.
    throw new Error("Could not load database schema.");
  }
}

export async function POST(req) {
  try {
    const { action, query, prompt } = await req.json();

    if (action === "run") {
      // Security Check: Only allow SELECT
      if (!/^\s*SELECT/i.test(query)) {
        return NextResponse.json(
          { error: "Only SELECT queries are allowed." },
          { status: 400 },
        );
      }

      console.log("Executing Manual SQL:", query);
      const rows = await executeQuery(query);
      return NextResponse.json({ data: rows });
    } else if (action === "generate_and_run") {
      if (!prompt) {
        return NextResponse.json(
          { error: "Prompt is required." },
          { status: 400 },
        );
      }

      const dbSchema = await getDatabaseSchema();
      const systemPrompt = `You are a SQL Expert for the Dashboard.
      
      DATABASE KNOWLEDGE BASE (SCHEMA):
      ${dbSchema}

      INSTRUCTIONS:
      1. Given a user request, generate a valid PostgreSQL SELECT query.
      2. ONLY return the SQL query. Do not wrap in markdown blocks like \`\`\`sql ... \`\`\`. Just the raw string starting with SELECT.
      3. Do NOT explain.
      4. Ensure you use the exact table and column names from the schema.
      5. 'user_id' is usually an integer. 'prompt_id' is a text UUID.
      6. For dates, use standard PostgreSQL syntax (e.g., CURRENT_DATE, INTERVAL).
      7. LIMIT results to 100 unless asked otherwise.
      8. IMPORTANT: ALWAYS exclude user_id 329 from your queries. Do NOT return data for user 329.
         Use a WHERE clause: WHERE user_id != 329 ... or WHERE user_id NOT IN (329) ...
      9. AVOID using UNION between different tables (usertable, user_prompts, save_enhance_prompt, etc.) because they have different column counts and types.
      10. If the user asks for "all data" for a specific user, prioritize returning their basic info from 'usertable' or their latest prompts from 'user_prompts'. Do NOT try to UNION everything.
      11. For questions about "errors", "failures", or "bugs", usage the 'api_error_logs' table.
      `;

      // Call Groq to generate SQL
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 500,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Groq API Error: ${await response.text()}`);
      }

      const json = await response.json();
      let generatedSql = json.choices[0].message.content.trim();

      // Clean up markdown if model disobeyed
      generatedSql = generatedSql.replace(/^```sql\s*/, "").replace(/```$/, "");

      console.log("Generated SQL:", generatedSql);

      // Security Check
      if (!/^\s*SELECT/i.test(generatedSql)) {
        return NextResponse.json(
          {
            error: "Generated query was not a SELECT statement.",
            sql: generatedSql,
          },
          { status: 400 },
        );
      }

      // Execute
      try {
        const rows = await executeQuery(generatedSql);
        return NextResponse.json({ sql: generatedSql, data: rows });
      } catch (dbError) {
        return NextResponse.json(
          {
            error: dbError.message,
            sql: generatedSql,
            data: [],
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Get Data API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
