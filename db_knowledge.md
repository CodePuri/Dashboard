# ThinkVelocity Database Schema Knowledge Base

> **Purpose**: This document provides comprehensive information about the ThinkVelocity PostgreSQL database schema for AI assistants and developers to query the database correctly.

---

## 🗄️ Database Connection Info

- **Database Engine**: PostgreSQL 16
- **Extension Required**: `pgvector` (for semantic search with embeddings)
- **Default Schema**: `public`

> ⚠️ **IMPORTANT**: Make sure you're connected to the correct database (NOT the `postgres` system database). The ThinkVelocity app database contains all the tables listed below.

---

## 📊 Production Tables (33 Total)

### Core Tables Overview

| Table                   | Purpose                                     | Primary Key                                      |
| ----------------------- | ------------------------------------------- | ------------------------------------------------ |
| `usertable`             | User accounts and authentication            | `user_id` (SERIAL)                               |
| `userstatus`            | User subscription/trial status              | `id` (SERIAL), unique on `user_id`               |
| `user_prompts`          | Original user prompts (from Extension/Chat) | `prompt_id` (UUID text)                          |
| `save_enhance_prompt`   | AI-enhanced prompts                         | `enhanced_prompt_id` (UUID text)                 |
| `refine_prompt`         | Refined prompts with Q&A pairs              | `refine_id` (UUID text)                          |
| `conversations`         | Velocity chat conversations                 | `conversation_id` (UUID), `user_id`              |
| `conversation_contexts` | Extension synced chat contexts              | `id` (SERIAL), unique on `(user_id, session_id)` |
| `processed_contexts`    | Processed contexts with embeddings          | `id` (SERIAL)                                    |

---

## 📝 Detailed Table Schemas

### 1. `usertable` - User Accounts

The main user table containing all registered users.

```sql
CREATE TABLE usertable (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    phone VARCHAR(20),
    profile_picture TEXT,
    profile_img_url TEXT,
    tutorial BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    google_id VARCHAR(255),
    referral_code VARCHAR(255),
    referred_by INTEGER,
    installed BOOLEAN DEFAULT false,
    tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Columns:**

- `user_id`: Primary key, auto-increment integer
- `email`: Unique email address
- `tokens`: User's available token balance
- `installed`: Whether user has installed the extension

---

### 2. `userstatus` - User Status/Subscription

Tracks user subscription and trial status.

```sql
CREATE TABLE userstatus (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    status VARCHAR(50),           -- 'free', 'pro', 'freetrial', 'expired'
    count INTEGER,                -- Credits/usage left
    trial_started_at TIMESTAMP,
    trial_ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Status Values:**

- `free` - Free tier user
- `freetrial` - User on free trial
- `pro` - Paid/premium user
- `expired` - Trial/subscription expired

---

### 3. `user_prompts` - Original User Prompts ⭐

Stores the original prompts submitted by users from both Extension and Velocity Chat.

```sql
CREATE TABLE user_prompts (
    prompt_id TEXT PRIMARY KEY,   -- UUID as text
    user_id INTEGER NOT NULL,     -- References usertable.user_id (as TEXT in some contexts)
    user_prompt TEXT,             -- The original prompt text
    conversation_id TEXT,         -- NULL for Extension, UUID for Velocity Chat
    created_at TIMESTAMP DEFAULT NOW()
);
```

**🔑 Key Differentiator for Extension vs Chat:**

| Source            | `conversation_id` | How to Identify               |
| ----------------- | ----------------- | ----------------------------- |
| **Extension**     | `NULL`            | `conversation_id IS NULL`     |
| **Velocity Chat** | UUID present      | `conversation_id IS NOT NULL` |

**Example Query - Extension Prompts:**

```sql
SELECT * FROM user_prompts
WHERE user_id = $1 AND conversation_id IS NULL
ORDER BY created_at DESC;
```

**Example Query - Velocity Chat Prompts:**

```sql
SELECT * FROM user_prompts
WHERE user_id = $1 AND conversation_id IS NOT NULL
ORDER BY created_at DESC;
```

---

### 4. `save_enhance_prompt` - Enhanced Prompts ⭐

Stores AI-enhanced versions of user prompts.

```sql
CREATE TABLE save_enhance_prompt (
    enhanced_prompt_id TEXT PRIMARY KEY,  -- UUID as text
    prompt_id TEXT NOT NULL,              -- References user_prompts.prompt_id
    user_id INTEGER,                      -- User who created this
    enhanced_prompt TEXT,                 -- The AI-enhanced prompt
    processing_time DECIMAL,              -- Time taken to enhance (seconds)
    intent VARCHAR(255),                  -- Detected intent category
    llm_used VARCHAR(100),                -- 'Velocity' for Chat, other values for Extension
    complexity VARCHAR(50),               -- 'low', 'medium', 'high'
    domain VARCHAR(255),                  -- Detected domain
    metadata JSONB,                       -- Additional metadata
    mode VARCHAR(100),                    -- Enhancement mode used
    user_status VARCHAR(50),              -- 'free', 'pro', 'freetrial'
    conversation_id TEXT,                 -- NULL for Extension, UUID for Velocity Chat
    accept BOOLEAN,                       -- Whether user accepted the enhancement
    input_token INTEGER,                  -- Number of input tokens
    output_token INTEGER,                 -- Number of output tokens
    total_token INTEGER,                  -- Total tokens used
    created_at TIMESTAMP DEFAULT NOW()
);
```

**🔑 Key Differentiator for Extension vs Chat:**

| Source            | `llm_used`                            | `conversation_id` |
| ----------------- | ------------------------------------- | ----------------- |
| **Extension**     | Various (GPT-4, Claude, etc.) or NULL | `NULL`            |
| **Velocity Chat** | `'Velocity'`                          | UUID present      |

**Example Query - Chat (Velocity) Enhanced Prompts:**

```sql
SELECT * FROM save_enhance_prompt
WHERE user_id = $1
  AND llm_used = 'Velocity'
  AND conversation_id IS NOT NULL
ORDER BY created_at DESC;
```

**Example Query - Extension Enhanced Prompts:**

```sql
SELECT * FROM save_enhance_prompt
WHERE user_id = $1
  AND conversation_id IS NULL
  AND (llm_used IS NULL OR llm_used != 'Velocity')
ORDER BY created_at DESC;
```

---

### 5. `refine_prompt` - Refined Prompts with Q&A

Stores refined prompts created from Q&A interactions.

```sql
CREATE TABLE refine_prompt (
    refine_id TEXT PRIMARY KEY,           -- UUID as text
    prompt_id TEXT,                       -- References user_prompts.prompt_id
    enhanced_prompt_id TEXT,              -- References save_enhance_prompt.enhanced_prompt_id
    user_id INTEGER,                      -- User who created this
    refine_question_1 TEXT,               -- First clarifying question
    refine_question_2 TEXT,               -- Second clarifying question
    refine_question_3 TEXT,               -- Third clarifying question (optional)
    refine_question_4 TEXT,               -- Fourth clarifying question (optional)
    refine_answer_1 TEXT,                 -- Answer to first question
    refine_answer_2 TEXT,                 -- Answer to second question
    refine_answer_3 TEXT,                 -- Answer to third question (optional)
    refine_answer_4 TEXT,                 -- Answer to fourth question (optional)
    refined_prompt TEXT,                  -- The final refined prompt
    processing_time DECIMAL,              -- Time taken to refine
    conversation_id TEXT,                 -- NULL for Extension, UUID for Chat
    input_token INTEGER,                  -- Number of input tokens
    output_token INTEGER,                 -- Number of output tokens
    total_token INTEGER,                  -- Total tokens used
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Notes:**

- Extension typically sends 2 Q&A pairs (questions 3 & 4 are NULL)
- Web/Chat can send up to 4 Q&A pairs
- Multiple refines allowed per enhanced prompt

---

### 6. `conversations` - Velocity Chat Conversations

Stores Velocity Chat conversation metadata.

```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    conversation_id TEXT UNIQUE,          -- UUID for the conversation
    user_id INTEGER,
    title VARCHAR(255),                   -- Conversation title
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 7. `conversation_contexts` - Extension Synced Contexts

Stores chat contexts synced from the browser Extension.

```sql
CREATE TABLE conversation_contexts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255) NOT NULL,     -- Unique session identifier
    platform VARCHAR(100),                -- 'chatgpt', 'claude', 'gemini', 'mistral'
    messages JSONB,                       -- Array of {role, content} messages
    url TEXT,                             -- URL where conversation happened
    raw_content JSONB,                    -- Raw scraped content
    summary TEXT,                         -- AI-generated summary
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, session_id)
);
```

**Platform Values:**

- `chatgpt` - ChatGPT conversations
- `claude` - Claude conversations
- `gemini` - Google Gemini conversations
- `mistral` - Mistral AI conversations

---

### 8. `processed_contexts` - Processed Contexts with Embeddings

Stores processed conversation contexts with semantic embeddings.

```sql
CREATE TABLE processed_contexts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,             -- VARCHAR(255) in some contexts
    session_id VARCHAR(255) NOT NULL,
    essence TEXT,                         -- Natural language essence description
    embedding vector(1024),               -- 1024-dimension embedding vector
    intent VARCHAR(255),                  -- Classified intent
    domains TEXT[],                       -- Array of domains ['FastAPI', 'Python']
    message_count INTEGER DEFAULT 0,
    platform VARCHAR(50),                 -- 'chatgpt', 'claude', 'gemini', 'mistral'
    version INTEGER DEFAULT 1,            -- Embedding version
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Note:** Uses `pgvector` extension for vector similarity search.

---

### 9. `onboarding_data` - User Onboarding Information

```sql
CREATE TABLE onboarding_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    llm_platform VARCHAR(255),            -- Preferred LLM platform
    occupation VARCHAR(255),              -- User's occupation
    source VARCHAR(255),                  -- How they found ThinkVelocity
    problems_faced TEXT,                  -- Problems they want to solve
    use_case TEXT,                        -- Primary use case
    ai_familiarity VARCHAR(100) DEFAULT 'Beginner',  -- 'Beginner', 'Intermediate', 'Expert'
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 10. Token & Payment Tables

#### `subscriptions`

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    plan_id UUID NOT NULL,                -- References billing_plans.id
    status VARCHAR(50) NOT NULL,          -- 'active', 'canceled', 'expired'
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    razorpay_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `token_transactions`

```sql
CREATE TABLE token_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,  -- 'credit', 'debit', 'refund'
    amount INTEGER NOT NULL,                -- Token amount
    balance_before INTEGER,
    balance_after INTEGER,
    reference_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `billing_plans`

```sql
CREATE TABLE billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,    -- 'monthly', 'yearly', etc.
    name VARCHAR(255) NOT NULL,
    interval VARCHAR(50) NOT NULL,        -- 'month', 'year'
    interval_count INTEGER DEFAULT 1,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    razorpay_plan_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 11. Analytics & Usage Tables

#### `essence_usage_tracking`

```sql
CREATE TABLE essence_usage_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    essence_creations INTEGER DEFAULT 0,  -- Number of essences created
    api_calls INTEGER DEFAULT 0,          -- Number of API calls
    cost_estimate DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);
```

---

### 12. `api_error_logs` - API Error Tracking

Stores logs of API errors for diagnostics and debugging.

```sql
CREATE TABLE api_error_logs (
    id SERIAL PRIMARY KEY,
    error_id VARCHAR(255),                -- Unique error identifier
    api_endpoint VARCHAR(500),            -- The failing API endpoint
    api_method VARCHAR(10),               -- HTTP method (GET, POST, etc.)
    error_message TEXT,                   -- Detailed error message
    error_type VARCHAR(100),              -- Type of error (e.g., 'Network timeout', 'HTTP error')
    user_id INTEGER,                      -- User ID if authenticated, else NULL
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔗 Table Relationships

```
usertable (user_id)
    │
    ├── user_prompts (user_id → usertable.user_id)
    │       │
    │       └── save_enhance_prompt (prompt_id → user_prompts.prompt_id)
    │               │
    │               └── refine_prompt (enhanced_prompt_id → save_enhance_prompt.enhanced_prompt_id)
    │
    ├── userstatus (user_id → usertable.user_id)
    │
    ├── conversation_contexts (user_id → usertable.user_id)
    │
    ├── processed_contexts (user_id → usertable.user_id)
    │
    ├── subscriptions (user_id → usertable.user_id)
    │
    ├── token_transactions (user_id → usertable.user_id)
    │
    └── onboarding_data (user_id → usertable.user_id)
```

---

## 🔍 Common Query Patterns

### 1. Get All Prompts with Enhanced Data (Last 7 Days)

```sql
SELECT
    up.user_id,
    up.prompt_id,
    up.user_prompt,
    up.created_at AS prompt_created_at,
    up.conversation_id,
    sep.enhanced_prompt_id,
    sep.enhanced_prompt,
    sep.created_at AS enhanced_prompt_created_at,
    sep.processing_time,
    sep.intent,
    sep.llm_used,
    sep.complexity,
    sep.domain,
    sep.mode
FROM user_prompts up
LEFT JOIN save_enhance_prompt sep
    ON up.prompt_id = sep.prompt_id
LEFT JOIN usertable u
    ON up.user_id = u.user_id
WHERE
    up.created_at >= NOW() - INTERVAL '7 days'
ORDER BY up.created_at DESC;
```

### 2. Separate Extension vs Chat (Velocity) Prompts

**Extension Only:**

```sql
SELECT * FROM user_prompts up
LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
WHERE
    up.conversation_id IS NULL
    AND (sep.llm_used IS NULL OR sep.llm_used != 'Velocity')
ORDER BY up.created_at DESC;
```

**Velocity Chat Only:**

```sql
SELECT * FROM user_prompts up
LEFT JOIN save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
WHERE
    up.conversation_id IS NOT NULL
    AND sep.llm_used = 'Velocity'
ORDER BY up.created_at DESC;
```

### 3. Filter Out Internal/Test Users

Many queries should exclude internal team members and test users:

```sql
-- Add this to your WHERE clause
AND (
    u.name IS NULL
    OR (
        LOWER(u.name) NOT IN (
            'aniket gupta', 'arjun gujar', 'aakash puri',
            'minal hussain', 'vaishnavi parab', 'rahul thokal',
            'rana basant', 'shoeb',
            'aniket', 'arjun', 'abhishek'
        )
        AND LOWER(u.name) NOT LIKE 'test%'
    )
)
```

### 4. Get User Activity Summary

```sql
SELECT
    (SELECT COUNT(*) FROM user_prompts WHERE user_id::INTEGER = $1) as total_user_prompts,
    (SELECT COUNT(*) FROM save_enhance_prompt WHERE user_id = $1) as total_enhanced_prompts,
    (SELECT COUNT(*) FROM refine_prompt WHERE user_id = $1) as total_refined_prompts,
    (SELECT COUNT(*) FROM conversations WHERE user_id = $1) as total_conversations,
    (SELECT COUNT(DISTINCT session_id) FROM conversation_contexts WHERE user_id = $1) as total_sessions,
    (SELECT COALESCE(SUM(essence_creations), 0) FROM essence_usage_tracking WHERE user_id = $1) as total_essence_creations
FROM usertable WHERE user_id = $1;
```

### 5. Get Velocity Conversation with Messages

```sql
WITH conversation_data AS (
    SELECT 'user' as type, prompt_id as id, user_prompt as content, created_at
    FROM user_prompts
    WHERE conversation_id = $1
    UNION ALL
    SELECT 'enhanced' as type, enhanced_prompt_id as id, enhanced_prompt as content, created_at
    FROM save_enhance_prompt
    WHERE conversation_id = $1
    UNION ALL
    SELECT 'refined' as type, refine_id as id, refined_prompt as content, created_at
    FROM refine_prompt
    WHERE conversation_id = $1
)
SELECT * FROM conversation_data
ORDER BY created_at ASC;
```

### 6. Daily Usage Analytics

```sql
SELECT
    DATE(up.created_at) as date,
    COUNT(*) as prompts_count,
    COUNT(DISTINCT up.user_id) as unique_users,
    COUNT(CASE WHEN up.conversation_id IS NOT NULL THEN 1 END) as chat_prompts,
    COUNT(CASE WHEN up.conversation_id IS NULL THEN 1 END) as extension_prompts
FROM user_prompts up
WHERE up.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(up.created_at)
ORDER BY date DESC;
```

---

## ⚠️ Important Notes

1. **Date Filtering**: Use `NOW() - INTERVAL 'N days'` or explicit timestamps:

   ```sql
   WHERE created_at >= '2024-12-27'::timestamp
   AND created_at < '2024-12-29'::timestamp
   ```

2. **user_id Types**:
   - `usertable.user_id` is INTEGER
   - `user_prompts.user_id` may be stored as TEXT in some contexts
   - Cast when needed: `user_id::INTEGER = $1`

3. **UUID Fields**: `prompt_id`, `enhanced_prompt_id`, `refine_id`, `conversation_id` are all UUID stored as TEXT

4. **Timestamps**: All tables use `created_at` and most have `updated_at`

5. **Embeddings**: `processed_contexts.embedding` uses pgvector's `vector(1024)` type

---

## 📌 Quick Reference: Which Table for What?

| Need                     | Table(s)                                                          |
| ------------------------ | ----------------------------------------------------------------- |
| User info                | `usertable`                                                       |
| User subscription status | `userstatus`                                                      |
| Original prompts         | `user_prompts`                                                    |
| Enhanced prompts         | `save_enhance_prompt`                                             |
| Refined prompts          | `refine_prompt`                                                   |
| Extension chat history   | `conversation_contexts`                                           |
| Velocity chat history    | Query `user_prompts` + `save_enhance_prompt` by `conversation_id` |
| Semantic search          | `processed_contexts` (with embeddings)                            |
| Token balance            | `usertable.tokens`                                                |
| Token history            | `token_transactions`                                              |
| Usage analytics          | `essence_usage_tracking`                                          |
