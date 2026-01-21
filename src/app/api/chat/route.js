import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Test users to exclude from analytics (same as analytics API for consistency)
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

// Simple SQL Rules for the LLM
const SQL_RULES = `
## 🚨 CRITICAL SQL RULES (Follow EXACTLY!)

### 1. ALWAYS Use DISTINCT for Counts
- Prompts: COUNT(DISTINCT up.prompt_id)
- Users: COUNT(DISTINCT up.user_id)

### 2. ALWAYS Exclude Test Users
Join usertable and filter:
\`\`\`sql
LEFT JOIN usertable u ON up.user_id = u.user_id
WHERE LOWER(u.name) NOT IN ('aniket gupta', 'arjun gujar', 'aakash puri', 'minal hussain', 'vaishnavi parab', 'rahul thokal', 'rana basant', 'shoeb', 'aniket', 'arjun', 'abhishek', 'test')
  AND LOWER(u.name) NOT LIKE 'test%'
\`\`\`

### 3. Timezone: All times are IST (UTC+05:30)
Use: \`up.created_at AT TIME ZONE 'Asia/Kolkata'\`

### 4. Date Ranges
- Last 7 days: \`WHERE up.created_at >= NOW() - INTERVAL '7 days'\`
- Last 30 days: \`WHERE up.created_at >= NOW() - INTERVAL '30 days'\`

### 5. Time Saved Calculation (Complex!)
Time Saved = SUM((enhanced_words - user_words) / 40) / 60 hours
Use this EXACT SQL:
\`\`\`sql
SELECT SUM(
  GREATEST(0, 
    array_length(regexp_split_to_array(sep.enhanced_prompt, '\\s+'), 1) - 
    array_length(regexp_split_to_array(up.user_prompt, '\\s+'), 1)
  ) / 40.0
) / 60.0 AS time_saved_hours
FROM user_prompts up
JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
LEFT JOIN usertable u ON up.user_id = u.user_id
WHERE sep.enhanced_prompt IS NOT NULL AND up.user_prompt IS NOT NULL
  AND LOWER(u.name) NOT IN ('aniket gupta', 'arjun gujar', 'aakash puri', 'minal hussain', 'vaishnavi parab', 'rahul thokal', 'rana basant', 'shoeb', 'aniket', 'arjun', 'abhishek', 'test')
  AND up.created_at >= NOW() - INTERVAL '7 days'
\`\`\`
`;

// Database Schema (from db_knowledge.md)
const DB_SCHEMA = `
## Database Tables

### user_prompts (Original prompts)
- prompt_id (TEXT PK) - UUID
- user_id (INTEGER)
- user_prompt (TEXT)
- conversation_id (TEXT) - NULL=Extension, UUID=Chat
- created_at (TIMESTAMP)

### save_enhance_prompt (Enhanced prompts)
- enhanced_prompt_id (TEXT PK)
- prompt_id (TEXT) - FK to user_prompts
- user_id (INTEGER)
- enhanced_prompt (TEXT)
- processing_time (DECIMAL)
- intent, llm_used, complexity, domain, mode
- created_at (TIMESTAMP)

### usertable (Users)
- user_id (SERIAL PK)
- name, email (UNIQUE)
- created_at (TIMESTAMP)

### userstatus (Subscription)
- user_id (INTEGER UNIQUE)
- status ('free', 'pro', 'freetrial', 'expired')

### refine_prompt (Refined prompts)
- refine_id (TEXT PK)
- prompt_id, enhanced_prompt_id
- refined_prompt (TEXT)
- created_at (TIMESTAMP)
`;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    // Get current IST time for context
    const nowIST = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    // Initial System Prompt
    const systemPrompt = `You are an Analytics Agent for the Velocity Dashboard. You answer questions by running SQL queries.

CURRENT TIME (IST): ${nowIST}

${SQL_RULES}

${DB_SCHEMA}

CAPABILITIES:
- Use the \`execute_sql\` tool to run READ-ONLY SELECT queries against the database.
- ALWAYS follow the SQL RULES above exactly.
- For Time Saved questions, use the EXACT SQL provided in the rules.
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
        } catch (e) {
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
          } catch (e) {
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
  } catch (error) {
    console.error("Chat API Agent Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
