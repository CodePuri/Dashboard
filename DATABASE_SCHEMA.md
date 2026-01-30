# Backend-V1 – Database Table Schema Reference

Complete list of tables and columns as defined in migrations and used in models.  
**Database:** PostgreSQL (with pgvector extension where noted).

---

## 1. all_emails

| Column     | Type         | Nullable | Default | Description        |
|-----------|--------------|----------|---------|--------------------|
| email    | VARCHAR(255) | NO      | —       | Primary key        |
| ref      | VARCHAR(255) | YES     | —       | Reference          |
| created_at | TIMESTAMP   | YES     | NOW()   | Creation time      |

**Used in:** `userModel.js` – `addEmailInAllEmails()`

---

## 2. api_error_logs

| Column       | Type         | Nullable | Default              | Description     |
|-------------|--------------|----------|----------------------|-----------------|
| id          | SERIAL       | NO       | —                    | Primary key     |
| error_id    | VARCHAR(255) | NO       | gen_random_uuid()::TEXT | Unique error ID |
| api_endpoint | VARCHAR(500) | NO       | —                    | API path        |
| api_method  | VARCHAR(10)  | YES      | —                    | HTTP method     |
| error_message | TEXT       | NO       | —                    | Error message   |
| error_type  | VARCHAR(100) | YES      | —                    | Error type      |
| user_id     | INTEGER      | YES      | —                    | User (optional) |
| source      | VARCHAR(50)  | YES      | —                    | lander / extension / button |
| created_at  | TIMESTAMP    | YES      | NOW()                | Creation time   |

**Used in:** `errorLogModel.js`  
**Indexes:** api_endpoint, created_at DESC, user_id, error_type, source

---

## 3. billing_plans

| Column            | Type         | Nullable | Default | Description        |
|-------------------|--------------|----------|---------|--------------------|
| id                | UUID         | NO       | gen_random_uuid() | Primary key |
| code              | VARCHAR(100) | NO       | —       | Unique plan code   |
| name              | VARCHAR(255) | NO       | —       | Plan name          |
| interval          | VARCHAR(50)  | NO       | —       | month / year       |
| interval_count    | INTEGER      | YES      | 1       | Interval count     |
| amount            | DECIMAL(10,2)| NO       | —       | Price              |
| currency          | VARCHAR(10)  | YES      | 'INR'   | Currency           |
| razorpay_plan_id  | VARCHAR(255) | YES      | —       | Razorpay plan ID   |
| is_active         | BOOLEAN      | YES      | true    | Active flag        |
| created_at        | TIMESTAMP    | YES      | NOW()   | Creation time      |
| updated_at        | TIMESTAMP    | YES      | NOW()   | Last update        |

**Used in:** `billingModel.js`

---

## 4. contact_messages

| Column     | Type         | Nullable | Default | Description     |
|------------|--------------|----------|---------|-----------------|
| id         | SERIAL       | NO       | —       | Primary key     |
| message_id | INTEGER      | —        | —       | *(Code uses in ORDER BY; may be alias of id)* |
| user_id    | INTEGER      | YES      | —       | User (optional) |
| name       | VARCHAR(255) | YES      | —       | Sender name     |
| email      | VARCHAR(255) | NO       | —       | Sender email    |
| message    | TEXT         | YES      | —       | Message body    |
| subject    | VARCHAR(255) | YES      | —       | Subject         |
| created_at | TIMESTAMP    | YES      | NOW()   | Creation time   |

**Used in:** `contactModel.js` (queries use `message_id` in ORDER BY)

---

## 5. conversation_contexts

| Column      | Type         | Nullable | Default | Description     |
|-------------|--------------|----------|---------|-----------------|
| id          | SERIAL       | NO       | —       | Primary key     |
| user_id     | INTEGER      | NO       | —       | User            |
| session_id  | VARCHAR(255) | NO       | —       | Session ID      |
| platform    | VARCHAR(100) | YES     | —       | Platform        |
| messages    | JSONB        | YES      | —       | Conversation    |
| url         | TEXT         | YES      | —       | Page URL        |
| raw_content | JSONB       | YES      | —       | Raw content     |
| summary     | TEXT         | YES      | —       | Summary         |
| created_at  | TIMESTAMP    | YES      | NOW()   | Creation time   |
| updated_at  | TIMESTAMP    | YES      | NOW()   | Last update     |

**Constraint:** UNIQUE(user_id, session_id)  
**Used in:** `contextModel.js`

---

## 6. conversation_messages

| Column          | Type         | Nullable | Default | Description |
|-----------------|--------------|----------|---------|-------------|
| id              | SERIAL       | NO       | —       | Primary key |
| conversation_id | INTEGER      | YES      | —       | Conversation |
| user_id         | INTEGER      | YES      | —       | User        |
| role            | VARCHAR(50)  | YES      | —       | Role        |
| content         | TEXT         | YES      | —       | Content     |
| created_at      | TIMESTAMP    | YES      | NOW()   | Creation    |

---

## 7. conversations

| Column      | Type         | Nullable | Default | Description |
|-------------|--------------|----------|---------|-------------|
| id          | SERIAL       | NO       | —       | Primary key |
| user_id     | INTEGER      | YES      | —       | User        |
| title       | VARCHAR(255) | YES      | —       | Title       |
| created_at  | TIMESTAMP    | YES      | NOW()   | Creation    |
| updated_at  | TIMESTAMP    | YES      | NOW()   | Last update |

---

## 8. essence_usage_tracking

| Column            | Type         | Nullable | Default     | Description   |
|-------------------|--------------|----------|-------------|---------------|
| id                | SERIAL       | NO       | —           | Primary key   |
| user_id           | INTEGER      | NO       | —           | User          |
| date              | DATE         | NO       | CURRENT_DATE| Day           |
| essence_creations  | INTEGER      | YES      | 0           | Count         |
| api_calls         | INTEGER      | YES      | 0           | API calls     |
| cost_estimate     | DECIMAL(10,4)| YES      | 0           | Cost          |
| created_at        | TIMESTAMP    | YES      | NOW()       | Creation      |
| updated_at        | TIMESTAMP    | YES      | NOW()       | Last update   |

**Constraint:** UNIQUE(user_id, date)

---

## 9. feature_token_costs

| Column       | Type         | Nullable | Default | Description   |
|--------------|--------------|----------|---------|---------------|
| id           | SERIAL       | NO       | —       | Primary key   |
| feature_name | VARCHAR(255) | NO       | —       | Unique name   |
| token_cost   | INTEGER      | NO       | —       | Cost in tokens|
| created_at   | TIMESTAMP    | YES      | NOW()   | Creation      |
| updated_at   | TIMESTAMP    | YES      | NOW()   | Last update   |

---

## 10. invite_links

**Sync script columns:**

| Column       | Type         | Nullable | Default | Description   |
|--------------|--------------|----------|---------|---------------|
| id           | SERIAL       | NO       | —       | Primary key   |
| code         | VARCHAR(255) | NO       | —       | Unique code   |
| created_by   | INTEGER      | YES      | —       | Creator user  |
| max_uses     | INTEGER      | YES      | —       | Max redemptions |
| current_uses | INTEGER      | YES      | 0       | Current uses  |
| expires_at   | TIMESTAMP    | YES      | —       | Expiry        |
| is_active    | BOOLEAN      | YES      | true    | Active        |
| created_at   | TIMESTAMP    | YES      | NOW()   | Creation      |

**Code expects (inviteModel.js):** `invite_code`, `generated_by_user_id`, `link_url`, `usage_count`, `emails_sent` (TEXT[]), `updated_at`.  
Actual DB may use different names; verify against live schema.

---

## 11. invite_redemptions

| Column           | Type      | Nullable | Default | Description      |
|------------------|-----------|----------|---------|------------------|
| id               | SERIAL    | NO       | —       | Primary key      |
| invite_link_id   | INTEGER   | YES      | —       | FK invite_links  |
| redeemed_by_user_id | INTEGER | YES      | —       | User who redeemed |
| redeemed_email   | VARCHAR  | YES      | —       | Email redeemed   |
| reward_granted   | BOOLEAN   | YES      | —       | Reward given     |
| redeemed_at      | TIMESTAMP | YES      | NOW()   | Redemption time  |

**Used in:** `inviteModel.js`

---

## 12. onboarding_data

| Column        | Type         | Nullable | Default   | Description |
|---------------|--------------|----------|-----------|-------------|
| id            | SERIAL       | NO       | —         | Primary key |
| user_id       | INTEGER      | NO       | —         | User        |
| llm_platform  | VARCHAR(255) | YES      | —         | LLM platform |
| occupation   | VARCHAR(255) | YES      | —         | Occupation  |
| source        | VARCHAR(255) | YES      | —         | Source      |
| problems_faced| TEXT         | YES      | —         | Problems    |
| use_case      | TEXT         | YES      | —         | Use case    |
| ai_familiarity| VARCHAR(100) | YES      | 'Beginner'| Level       |
| created_at    | TIMESTAMP    | YES      | NOW()     | Creation    |

**Used in:** `userModel.js`, `personalizationModel.js`

---

## 13. otp_verification

| Column     | Type         | Nullable | Default | Description        |
|------------|--------------|----------|---------|--------------------|
| id         | SERIAL       | NO       | —       | Primary key        |
| email      | VARCHAR(255) | NO       | —       | Email              |
| otp        | VARCHAR(10)  | NO       | —       | OTP value          |
| created_at | TIMESTAMP    | YES      | NOW()   | Creation            |
| expires_at | TIMESTAMP    | YES      | GENERATED (created_at + 10 min) | Expiry |

**Used in:** `userModel.js`

---

## 14. password_reset_tokens

| Column      | Type         | Nullable | Default              | Description |
|-------------|--------------|----------|----------------------|-------------|
| id          | SERIAL       | NO       | —                    | Primary key |
| user_id     | INTEGER      | NO       | —                    | User        |
| email       | VARCHAR(255) | NO       | —                    | Email       |
| reset_token | VARCHAR(255) | NO       | —                    | Unique token|
| created_at  | TIMESTAMP    | YES      | NOW()                | Creation    |
| expires_at  | TIMESTAMP    | YES      | NOW() + 1 hour       | Expiry      |

**Used in:** `userModel.js`

---

## 15. payments

**Sync script (simplified):**

| Column              | Type         | Nullable | Default | Description   |
|---------------------|--------------|----------|---------|---------------|
| id                  | SERIAL       | NO       | —       | Primary key   |
| user_id             | INTEGER      | YES      | —       | User          |
| amount              | DECIMAL(10,2)| YES      | —       | Amount        |
| currency            | VARCHAR(10)  | YES      | 'INR'   | Currency      |
| razorpay_payment_id | VARCHAR(255) | YES      | —       | Razorpay ID   |
| razorpay_order_id   | VARCHAR(255) | YES      | —       | Order ID      |
| status              | VARCHAR(50)  | YES      | —       | Status        |
| payment_method      | VARCHAR(100) | YES      | —       | Method        |
| created_at          | TIMESTAMP    | YES      | NOW()   | Creation      |
| updated_at          | TIMESTAMP    | YES      | NOW()   | Last update   |

**paymentModel.js also uses:** `subscription_id` (UUID), `razorpay_invoice_id`, `error_code`, `error_description`, `captured_at`, `raw` (JSONB).  
Verify actual table has these if payment flows use them.

---

## 16. processed_contexts

| Column       | Type         | Nullable | Default | Description   |
|--------------|--------------|----------|---------|---------------|
| id           | SERIAL       | NO       | —       | Primary key   |
| user_id      | INTEGER      | NO       | —       | User          |
| session_id   | VARCHAR(255) | NO       | —       | Session       |
| essence      | TEXT         | YES      | —       | Essence text  |
| embedding    | vector(1024) | YES      | —       | pgvector      |
| intent       | VARCHAR(255) | YES      | —       | Intent        |
| domains      | TEXT[]       | YES      | —       | Domains       |
| message_count| INTEGER      | YES      | 0       | Message count |
| platform     | VARCHAR(50)  | YES      | —       | Platform      |
| version      | INTEGER      | YES      | 1       | Version       |
| created_at   | TIMESTAMP    | YES      | NOW()   | Creation      |
| updated_at   | TIMESTAMP    | YES      | NOW()   | Last update   |

**Requires:** pgvector extension.  
**Used in:** `processedContextModel.js`

---

## 17. processed_contexts_backup

| Column       | Type         | Nullable | Default | Description |
|--------------|--------------|----------|---------|-------------|
| id           | SERIAL       | NO       | —       | Primary key |
| user_id      | INTEGER      | YES      | —       | User        |
| session_id   | VARCHAR(255) | YES      | —       | Session     |
| essence      | TEXT         | YES      | —       | Essence     |
| embedding    | vector(1024) | YES      | —       | Embedding   |
| intent       | VARCHAR(255) | YES      | —       | Intent      |
| domains      | TEXT[]       | YES      | —       | Domains     |
| version      | INTEGER      | YES      | —       | Version     |
| created_at   | TIMESTAMP    | YES      | —       | Creation    |
| updated_at   | TIMESTAMP    | YES      | —       | Last update |
| backup_date  | TIMESTAMP    | YES      | NOW()   | Backup time |

---

## 18. referrals

| Column         | Type         | Nullable | Default | Description   |
|----------------|--------------|----------|---------|---------------|
| id             | SERIAL       | NO       | —       | Primary key   |
| user_id        | INTEGER      | NO       | —       | Unique user   |
| referral_code  | VARCHAR(255) | NO       | —       | Unique code   |
| referred_by    | INTEGER      | YES      | —       | Referrer      |
| total_referrals| INTEGER      | YES      | 0       | Count         |
| created_at     | TIMESTAMP    | YES      | NOW()   | Creation      |
| updated_at     | TIMESTAMP    | YES      | NOW()   | Last update   |

**Used in:** `userModel.js`

---

## 19. refresh_tokens

| Column      | Type         | Nullable | Default | Description   |
|-------------|--------------|----------|---------|---------------|
| id          | SERIAL       | NO       | —       | Primary key   |
| user_id     | INTEGER      | NO       | —       | User          |
| token_hash  | VARCHAR(255) | NO       | —       | Hash          |
| token_id    | UUID         | NO       | —       | Unique ID     |
| expires_at  | TIMESTAMP    | NO       | —       | Expiry        |
| revoked     | BOOLEAN      | YES      | false   | Revoked       |
| device_info | JSONB        | YES      | —       | Device        |
| ip_address  | VARCHAR(45)  | YES      | —       | IP            |
| created_at  | TIMESTAMP    | YES      | NOW()   | Creation      |
| last_used_at| TIMESTAMP    | YES      | —       | Last use      |

**Used in:** `userModel.js`

---

## 20. refine_prompt

**Sync script (minimal):** id, user_id, prompt_text, created_at, updated_at.

**Code (promptModel.js) uses:**

| Column             | Type    | Nullable | Description        |
|--------------------|---------|----------|--------------------|
| refine_id          | TEXT/UUID| NO      | Primary key        |
| prompt_id          | TEXT    | NO       | FK user_prompts    |
| enhanced_prompt_id | TEXT    | NO       | FK save_enhance_prompt |
| user_id            | INTEGER | YES      | User               |
| refine_question_1  | TEXT    | YES      | Q1                 |
| refine_question_2  | TEXT    | YES      | Q2                 |
| refine_answer_1    | TEXT    | YES      | A1                 |
| refine_answer_2    | TEXT    | YES      | A2                 |
| refined_prompt     | TEXT    | YES      | Refined text       |
| processing_time    | NUMERIC | YES      | Time               |
| input_token        | INTEGER | YES      | (Migration 009)    |
| output_token       | INTEGER | YES      | (Migration 009)    |
| total_token        | INTEGER | YES      | (Migration 009)    |
| created_at         | TIMESTAMP | YES    | Creation           |
| updated_at         | TIMESTAMP | YES    | Last update        |

---

## 21. reviews

| Column     | Type         | Nullable | Default | Description |
|------------|--------------|----------|---------|-------------|
| id         | SERIAL       | NO       | —       | Primary key |
| user_id    | INTEGER      | YES      | —       | User        |
| reason     | VARCHAR(255) | YES      | —       | Reason      |
| feedback   | TEXT         | YES      | —       | Feedback    |
| image_url  | TEXT         | YES      | —       | Image       |
| created_at | TIMESTAMP    | YES      | NOW()   | Creation    |

**Used in:** `userModel.js`

---

## 22. save_enhance_prompt

**Sync script (minimal):** id, user_id, prompt_text, created_at, updated_at.

**Code (promptModel.js) uses:**

| Column             | Type     | Nullable | Description        |
|--------------------|----------|----------|--------------------|
| enhanced_prompt_id | TEXT/UUID | NO      | Primary key        |
| prompt_id          | TEXT     | NO       | FK user_prompts    |
| user_id            | INTEGER  | NO       | User               |
| enhanced_prompt    | TEXT     | YES      | Enhanced text      |
| processing_time    | NUMERIC  | YES      | Time               |
| intent             | VARCHAR  | YES      | Intent             |
| llm_used           | VARCHAR  | YES      | LLM                |
| complexity         | VARCHAR  | YES      | Complexity         |
| domain             | VARCHAR  | YES      | Domain             |
| metadata           | JSONB    | YES      | Metadata           |
| mode               | VARCHAR  | YES      | Mode               |
| user_status        | VARCHAR  | YES      | User status        |
| input_token        | INTEGER  | YES      | (Migration 009)    |
| output_token       | INTEGER  | YES      | (Migration 009)    |
| total_token        | INTEGER  | YES      | (Migration 009)    |
| created_at         | TIMESTAMP| YES      | Creation           |
| updated_at         | TIMESTAMP| YES      | Last update        |

---

## 23. subscriptions

| Column                    | Type         | Nullable | Default | Description   |
|---------------------------|--------------|----------|---------|---------------|
| id                        | UUID         | NO       | gen_random_uuid() | Primary key |
| user_id                   | INTEGER      | NO       | —       | User          |
| plan_id                   | UUID         | NO       | —       | FK billing_plans |
| status                    | VARCHAR(50)  | NO       | —       | Status        |
| current_period_start      | TIMESTAMP    | YES      | —       | Period start  |
| current_period_end        | TIMESTAMP    | YES      | —       | Period end    |
| cancel_at_period_end      | BOOLEAN      | YES      | false   | Cancel at end |
| cancel_at                 | TIMESTAMP    | YES      | —       | Cancel at     |
| canceled_at               | TIMESTAMP    | YES      | —       | Canceled at   |
| trial_end                 | TIMESTAMP    | YES      | —       | Trial end     |
| razorpay_subscription_id  | VARCHAR(255) | YES      | —       | Razorpay ID   |
| notes                     | JSONB        | YES      | —       | Notes         |
| created_at                | TIMESTAMP    | YES      | NOW()   | Creation      |
| updated_at                | TIMESTAMP    | YES      | NOW()   | Last update   |

**Used in:** `subscriptionModel.js`

---

## 24. token_ledger

**Sync script schema:**

| Column         | Type         | Nullable | Default | Description   |
|----------------|--------------|----------|---------|---------------|
| id             | SERIAL       | NO       | —       | Primary key   |
| user_id        | INTEGER      | NO       | —       | User          |
| transaction_type | VARCHAR(50) | NO       | —       | Type          |
| amount         | INTEGER      | NO       | —       | Amount        |
| balance_after  | INTEGER      | YES      | —       | Balance       |
| description    | TEXT         | YES      | —       | Description   |
| created_at     | TIMESTAMP    | YES      | NOW()   | Creation      |

**tokenLedgerModel.js expects:** `token_type`, `source_id`, `source_reference`, `initial_amount`, `current_amount`, `expires_at`, `metadata`, `updated_at`.  
There is a known schema mismatch; verify actual DB columns. See `TABLE_SCHEMA_VERIFICATION.md`.

---

## 25. token_packages

**Sync script:**

| Column        | Type         | Nullable | Default | Description   |
|---------------|--------------|----------|---------|---------------|
| id            | SERIAL       | NO       | —       | Primary key   |
| name          | VARCHAR(255) | NO       | —       | Name          |
| token_amount  | INTEGER      | NO       | —       | Tokens        |
| price         | DECIMAL(10,2)| NO       | —       | Price         |
| currency      | VARCHAR(10)  | YES      | 'INR'   | Currency      |
| is_active     | BOOLEAN      | YES      | true    | Active        |
| created_at    | TIMESTAMP    | YES      | NOW()   | Creation      |
| updated_at    | TIMESTAMP    | YES      | NOW()   | Last update   |

**tokenPackageModel.js** maps/expects: `code`, `description`, `price_cents`, `tokens`, `bonus_tokens`, `display_order`, `badge_text`, `metadata`.  
Verify actual table if using admin/API for packages.

---

## 26. token_reservations

| Column    | Type         | Nullable | Default | Description |
|-----------|--------------|----------|---------|-------------|
| id        | SERIAL       | NO       | —       | Primary key |
| user_id   | INTEGER      | NO       | —       | User        |
| amount    | INTEGER      | NO       | —       | Amount      |
| purpose   | VARCHAR(255) | YES      | —       | Purpose     |
| expires_at| TIMESTAMP    | YES      | —       | Expiry      |
| created_at| TIMESTAMP    | YES      | NOW()   | Creation    |

---

## 27. token_transactions

| Column          | Type         | Nullable | Default | Description   |
|-----------------|--------------|----------|---------|---------------|
| id              | SERIAL       | NO       | —       | Primary key   |
| user_id         | INTEGER      | NO       | —       | User          |
| transaction_type| VARCHAR(50)  | NO       | —       | Type          |
| amount          | INTEGER      | NO       | —       | Amount        |
| balance_before  | INTEGER      | YES      | —       | Before        |
| balance_after   | INTEGER      | YES      | —       | After         |
| reference_id    | VARCHAR(255) | YES      | —       | Reference     |
| description     | TEXT         | YES      | —       | Description   |
| created_at      | TIMESTAMP    | YES      | NOW()   | Creation      |

**tokenLedgerModel.js** also references: `ledger_id`, `reference_type`.  
Verify if these columns exist in your DB.

---

## 28. user_personalization

**Sync script:** id, user_id (UNIQUE), preferences (JSONB), settings (JSONB), created_at, updated_at.

**personalizationModel.js uses:**

| Column           | Type     | Nullable | Description |
|------------------|----------|----------|-------------|
| id               | SERIAL   | NO       | Primary key |
| user_id          | INTEGER  | NO       | Unique user  |
| preferred_name   | TEXT     | YES      | Name         |
| professional_world | TEXT  | YES      | Professional |
| velocity_traits  | TEXT     | YES      | Traits       |
| personal_life    | TEXT     | YES      | Personal     |
| hobbies          | TEXT     | YES      | Hobbies      |
| primary_model    | VARCHAR  | YES      | Model        |
| created_at       | TIMESTAMP| YES      | Creation     |
| updated_at       | TIMESTAMP| YES      | Last update  |

---

## 29. user_profiles

**Sync script:** id, user_id (UNIQUE), bio, location, website, social_links (JSONB), created_at, updated_at.

**processedContextModel.js uses:**

| Column          | Type     | Nullable | Description   |
|-----------------|----------|----------|---------------|
| user_id         | INTEGER  | NO       | Primary key   |
| primary_domains | JSONB    | YES      | Domains       |
| common_intents  | JSONB    | YES      | Intents       |
| recent_essences | TEXT[]   | YES      | Essences      |
| stats           | JSONB    | YES      | Stats         |
| first_seen      | TIMESTAMP| YES      | First seen    |
| last_active     | TIMESTAMP| YES      | Last active   |
| updated_at      | TIMESTAMP| YES      | Last update   |

---

## 30. user_prompts

**Sync script (minimal):** id, user_id, prompt_name, prompt_text, category, is_active, created_at, updated_at.

**Code (promptModel.js) uses:**

| Column          | Type     | Nullable | Description   |
|-----------------|----------|----------|---------------|
| prompt_id       | TEXT/UUID| NO       | Primary key (gen_random_uuid()) |
| user_id         | INTEGER  | NO       | User          |
| user_prompt     | TEXT     | YES      | Prompt text   |
| conversation_id | INTEGER  | YES      | Conversation  |
| platform        | VARCHAR  | YES      | e.g. ChatGPT  |
| created_at      | TIMESTAMP| YES      | Creation      |
| updated_at      | TIMESTAMP| YES      | Last update   |

---

## 31. userstatus

**Sync script (simplified):** id, user_id (UNIQUE), status, trial_end_date, subscription_status, created_at, updated_at.

**userStatusModel.js (unified) uses:**

| Column             | Type      | Nullable | Description   |
|--------------------|-----------|----------|---------------|
| status_id          | SERIAL    | NO       | Primary key   |
| user_id            | INTEGER   | NO       | Unique user    |
| status             | VARCHAR   | YES      | freetrial / free / pro |
| count              | INTEGER   | YES      | Usage count    |
| trial_started_at   | TIMESTAMP | YES      | Trial start    |
| trial_ended_at     | TIMESTAMP | YES      | Trial end      |
| has_used_trial     | BOOLEAN   | YES      | Trial used     |
| created_at         | TIMESTAMP | YES      | Creation      |
| updated_at         | TIMESTAMP | YES      | Last update   |

**statusModel.js (deprecated)** also references: fast, best, deep_research, reasoning, build, refine, clarify (usage limits per feature).

---

## 32. usertable

| Column         | Type         | Nullable | Default | Description   |
|----------------|--------------|----------|---------|---------------|
| user_id        | SERIAL       | NO       | —       | Primary key   |
| name           | VARCHAR(255) | YES      | —       | Name          |
| email          | VARCHAR(255) | NO       | —       | Unique email  |
| password       | VARCHAR(255) | YES      | —       | Password hash |
| phone          | VARCHAR(20)  | YES      | —       | Phone         |
| profile_picture| TEXT         | YES      | —       | Picture       |
| profile_img_url| TEXT         | YES      | —       | Image URL     |
| tutorial       | BOOLEAN      | YES      | false   | Tutorial done |
| email_verified | BOOLEAN      | YES      | false   | Verified      |
| google_id      | VARCHAR(255) | YES      | —       | Google ID     |
| referral_code  | VARCHAR(255) | YES      | —       | Referral code |
| referred_by    | INTEGER      | YES      | —       | Referrer      |
| installed      | BOOLEAN      | YES      | false   | Extension     |
| tokens         | INTEGER      | YES      | 0       | Legacy tokens |
| created_at     | TIMESTAMP    | YES      | NOW()   | Creation      |
| updated_at     | TIMESTAMP    | YES      | NOW()   | Last update   |

**Used in:** `userModel.js`, `tokenModel.js`

---

## 33. webhook_events

**Sync script (simplified):** id, event_type, razorpay_event_id, payload (JSONB), processed, error_message, created_at, processed_at.

**webhookModel.js uses:**

| Column            | Type         | Nullable | Default | Description   |
|-------------------|--------------|----------|---------|---------------|
| id                | UUID/SERIAL  | NO       | —       | Primary key   |
| event_type        | VARCHAR(100) | NO       | —       | Event type    |
| razorpay_event_id | VARCHAR(255) | YES      | —       | Razorpay ID   |
| signature_valid   | BOOLEAN      | YES      | false   | Signature     |
| status            | VARCHAR      | YES      | 'received' | received/processed/failed |
| retry_count       | INTEGER      | YES      | 0       | Retries       |
| payload           | JSONB        | YES      | —       | Payload       |
| processed_at      | TIMESTAMP    | YES      | —       | Processed at  |
| created_at        | TIMESTAMP    | YES      | NOW()   | Creation      |

---

## Tables referenced in code but not in sync_production_tables.sql

These are used in models; they may exist only in certain environments or older migrations.

| Table                        | Purpose / Columns (from code) |
|-----------------------------|---------------------------------|
| **launchlist**              | email; `userModel.addEmailInLaunchList()` |
| **free_trial_user_availability** | email, threshold; `userModel` trial checks |
| **waitlistUsers**           | waitlist_id, name, email, verified; `userModel` waitlist |
| **prompt_history**          | prompt_id, user_id, content_type, prompt, ref_prompt_id, ai_type, selected_style, tokens_used, deleted, created_at, updated_at, rating, feedback, is_deleted; `promptModel`, `personalizationModel` |
| **prompt_preferences**      | id, user_id, word_count, custom_instructions, template, language, complexity, output_format; `promptModel` |
| **user_context**            | user_id, prompt_id, embedding; `promptModel.saveEmbedding()` |
| **suggestion_prompt**        | prompt, occupation; `promptModel` |
| **prompt_marketplace**      | marketplace_prompt_id, prompt_title, prompt_content, intent, domain, sub_domain, context, platform, llm_model, complexity, attachment, mode, img_url, is_deleted, created_at; `promptModel` |
| **prompt_memory**           | prompt_memory_id, marketplace_prompt_id, user_id, created_at; `promptModel` |
| **marketplace_prompt_content_embedding** | marketplace_prompt_id, prompt_content_embedding (vector), metadata; `promptModel` (pgvector) |
| **prompt_actions**          | user_id, action, marketplace_prompt_id, performed_at; `promptModel` |
| **coupon_codes**            | coupon_code, etc.; `tokenModel.getRedeemCoupon()` |
| **credits**                 | generic credits; `tokenModel.getAllCredits()` |

---

## Summary

- **33 tables** are listed in `sync_production_tables.sql` as production tables.
- Several tables have **more columns in code** than in the sync script (e.g. user_prompts, save_enhance_prompt, refine_prompt, user_personalization, user_profiles, userstatus, payments, webhook_events, token_ledger, token_packages, invite_links).
- **token_ledger** has a documented mismatch between sync script and `tokenLedgerModel.js`; confirm schema before relying on ledger APIs.
- For **exact** column names and types, run on your database:

```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

See also: `TABLE_SCHEMA_VERIFICATION.md`, `migrations/`, and `models/` for per-table usage.
