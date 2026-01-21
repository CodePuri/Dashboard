import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const TEST_USERS = [
  "aniket gupta",
  "arjun gujar",
  "aakash puri",
  "minal hussain",
  "vaishnavi parab",
  "rahul thokal",
  "rana basant",
  "shoeb",
  "aniket",
  "arjun",
  "abhishek",
  "test",
];

// Schema definition for the LLM
const DB_SCHEMA = `
# Database Schema

## 📝 Detailed Table Schemas

### 1. \`usertable\` - User Accounts
\`\`\`sql
CREATE TABLE usertable (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 2. \`userstatus\` - User Status/Subscription
\`\`\`sql
CREATE TABLE userstatus (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    status VARCHAR(50),           -- 'free', 'pro', 'freetrial', 'expired'
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 3. \`user_prompts\` - Original User Prompts ⭐
\`\`\`sql
CREATE TABLE user_prompts (
    prompt_id TEXT PRIMARY KEY,   -- UUID as text
    user_id INTEGER NOT NULL,     -- References usertable.user_id
    user_prompt TEXT,             -- The original prompt text
    conversation_id TEXT,         -- NULL for Extension, UUID for Velocity Chat
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 4. \`save_enhance_prompt\` - Enhanced Prompts ⭐
\`\`\`sql
CREATE TABLE save_enhance_prompt (
    enhanced_prompt_id TEXT PRIMARY KEY,  -- UUID as text
    prompt_id TEXT NOT NULL,              -- References user_prompts.prompt_id
    user_id INTEGER,
    enhanced_prompt TEXT,
    processing_time DECIMAL,              -- Time taken (seconds/ms check data)
    intent VARCHAR(255),
    llm_used VARCHAR(100),
    complexity VARCHAR(50),               -- 'low', 'medium', 'high'
    domain VARCHAR(255),
    mode VARCHAR(100),
    user_status VARCHAR(50),
    conversation_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 5. \`refine_prompt\` - Refined Prompts
\`\`\`sql
CREATE TABLE refine_prompt (
    refine_id TEXT PRIMARY KEY,
    prompt_id TEXT,
    enhanced_prompt_id TEXT,
    user_id INTEGER,
    refined_prompt TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 6. \`conversations\` - Velocity Chat
\`\`\`sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    conversation_id TEXT UNIQUE,
    user_id INTEGER,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 7. \`conversation_contexts\` - Extension Synced Contexts
\`\`\`sql
CREATE TABLE conversation_contexts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    platform VARCHAR(100),                -- 'chatgpt', 'claude', 'gemini', 'mistral'
    messages JSONB,                       -- Array of {role, content} messages
    url TEXT,
    summary TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 8. \`processed_contexts\` - Embeddings
\`\`\`sql
CREATE TABLE processed_contexts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    essence TEXT,
    intent VARCHAR(255),
    domains TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 9. \`essence_usage_tracking\` - Usage Analytics
\`\`\`sql
CREATE TABLE essence_usage_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    essence_creations INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    cost_estimate DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`
`;

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

      const systemPrompt = `You are a SQL Expert for the Dashboard.
      
      DATABASE KNOWLEDGE BASE (SCHEMA):
      ${DB_SCHEMA}

      INSTRUCTIONS:
      1. Given a user request, generate a valid PostgreSQL SELECT query.
      2. ONLY return the SQL query. Do not wrap in markdown blocks like \`\`\`sql ... \`\`\`. Just the raw string starting with SELECT.
      3. Do NOT explain.
      4. Ensure you use the exact table and column names from the schema.
      5. 'user_id' is usually an integer. 'prompt_id' is a text UUID.
      6. For dates, use standard PostgreSQL syntax (e.g., CURRENT_DATE, INTERVAL).
      7. LIMIT results to 100 unless asked otherwise.
      8. IMPORTANT: ALWAYS exclude test users from your queries if 'usertable' or user names are involved.
         Use a WHERE clause to filter out these names: ${JSON.stringify(TEST_USERS)}.
         Example: ... WHERE name NOT IN ('${TEST_USERS.join("', '")}') ...
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
