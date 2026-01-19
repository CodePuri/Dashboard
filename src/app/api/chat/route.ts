import { NextResponse } from "next/server";
import { getAnalyticsData, executeQuery } from "@/lib/db";
import { PromptData, processData } from "@/lib/analytics-utils";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // 1. Fetch Summary Context (Keep this for fast high-level answers)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    const rawData = (await getAnalyticsData(
      startDate,
      new Date(),
    )) as unknown as PromptData[];
    const summaryData = processData(rawData);

    // Initial System Prompt
    const systemPrompt = `You are a sophisticated Analytics Agent for the Dashboard.
    
    CAPABILITIES:
    1. **Statistical Summary**: You have instant access to high-level stats (below). USE THIS for general trends/totals.
    2. **Deep Database Access**: You have a tool \`execute_sql\` to run READ-ONLY queries on the database. USE THIS for specific user lookups, top lists, or complex filtering not covered by the summary.
    
    DATABASE KNOWLEDGE BASE (SCHEMA):
    ${DB_SCHEMA}

    IMPORTANT RULES:
    - **Schema Fidelity**: ONLY query tables/columns that exist in the Schema above. Do NOT hallucinate columns like 'enhancement_status' (use 'failed' logic: total - enhanced).
    - **IDs**: 'user_id' is INTEGER (or string in prompts). 'prompt_id' is TEXT (UUID).
    - **Time**: 'processing_time' is usually stored in milliseconds or seconds (check data).
    - **Safety**: READ-ONLY. SELECT only.

    SUMMARY DATA (Context):
    ${JSON.stringify(
      {
        metrics: summaryData.metrics,
        insights: summaryData.insights,
      },
      null,
      2,
    )}
    `;

    // Agent Loop (Max 3 turns)
    let currentMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let turnCount = 0;
    const MAX_TURNS = 5;

    while (turnCount < MAX_TURNS) {
      turnCount++;

      // Retry logic for Rate Limits
      let response;
      let retries = 0;
      const MAX_RETRIES = 3;

      while (retries < MAX_RETRIES) {
        try {
          response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: currentMessages,
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "execute_sql",
                      description:
                        "Execute a read-only SQL query against the database.",
                      parameters: {
                        type: "object",
                        properties: {
                          query: {
                            type: "string",
                            description: "The SQL query to run",
                          },
                        },
                        required: ["query"],
                      },
                    },
                  },
                ],
                tool_choice: "auto",
                temperature: 0.1, // Lower temp for precision
                max_tokens: 1000,
              }),
            },
          );

          if (response.status === 429) {
            const errText = await response.text();
            // Extract wait time from error message, e.g., "Please try again in 9.86s"
            const waitMatch = errText.match(/in\s+(\d+(\.\d+)?)(s|ms)/);
            let waitMs = 2000; // Default 2s
            if (waitMatch) {
              const val = parseFloat(waitMatch[1]);
              const unit = waitMatch[3];
              waitMs = unit === "ms" ? val : val * 1000;
              // Add buffer
              waitMs += 1000;
            }
            console.warn(`Groq Rate Limit. Retrying in ${waitMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            retries++;
            continue;
          }

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API Error: ${errText}`);
          }

          break; // Success
        } catch (e: any) {
          if (retries === MAX_RETRIES - 1) throw e;
          console.warn(`Groq API Fetch Error. Retrying...`, e);
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (!response || !response.ok) {
        throw new Error("Groq API failed after retries");
      }

      const json = await response.json();
      const choice = json.choices[0];
      const message = choice.message;

      // If no tool call, we are done
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return NextResponse.json(json);
      }

      // Handle Tool Call
      currentMessages.push(message); // Add assistant's tool-call message to history

      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === "execute_sql") {
          const args = JSON.parse(toolCall.function.arguments);
          const query = args.query;

          // Security Check
          if (!/^\s*SELECT/i.test(query)) {
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: "Only SELECT queries are allowed.",
              }),
            });
            continue;
          }

          console.log("Agent Executing SQL:", query);
          try {
            const rows = await executeQuery(query);
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(rows.slice(0, 20)), // Limit rows to context window
            });
          } catch (e: any) {
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: e.message }),
            });
          }
        }
      }
      // Loop continues to next turn to interpret tool results
    }

    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content:
              "I reached my maximum thinking steps. Please try a simpler request.",
          },
        },
      ],
    });
  } catch (error: any) {
    console.error("Chat API Agent Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
