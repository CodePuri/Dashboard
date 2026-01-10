# Executive Dashboard Metrics Explanation

This document explains how each metric in the Business Dashboard is calculated, where the data comes from, and what it means. All metrics are calculated in real-time from our production database.

---

## Executive Summary Metrics

### 1. Total Users

**What it measures:** The total number of user accounts in the system.

**Why it exists:** Answers "How many total users do we have?"

**Data Source:** `usertable` - counts all user records regardless of activity status.

**Calculation Logic:**
1. Count all rows in the usertable
2. Return the total count

**Formula:** `COUNT(*) FROM usertable`

**What the number means:** This is the cumulative total of all users who have ever created an account. It includes active, inactive, and churned users.

---

### 2. Total Installs

**What it measures:** The total number of installations during the selected time period, with breakdowns by weekly/monthly/alltime/daily.

**Why it exists:** Answers "How many new installations occurred in this period?"

**Data Source:** `usertable` - filters by `created_at` date within the selected period.

**Calculation Logic:**
1. Filter users where `created_at` falls within the selected date range
2. Count the number of users in that range
3. Group by time periods (daily, weekly, monthly, all-time) as needed
4. Return the count with period breakdowns

**Formula:** `COUNT(*) FROM usertable WHERE created_at BETWEEN start_date AND end_date`

**What the number means:** This shows installation growth for the selected period. Higher numbers indicate successful growth in new installations. Available breakdowns:
- Daily: Installs per day
- Weekly: Installs per week
- Monthly: Installs per month
- All-time: Cumulative total installs

---

### 3. Growth Rate

**What it measures:** The percentage change in total installs compared to a previous comparison period.

**Why it exists:** Answers "Are we growing faster or slower than before?"

**Data Source:** `usertable` - compares total installs in current period vs. comparison period (last month/week/yesterday).

**Calculation Logic:**
1. Count total installs in the selected period
2. Count total installs in the comparison period (last month, last week, or yesterday)
3. Calculate: (Current period installs - Comparison period installs) / Comparison period installs
4. Multiply by 100 to get percentage

**Formula:** `((Total Installs Current Period - Total Installs Comparison Period) / Total Installs Comparison Period) × 100`

**What the number means:**
- Positive percentage = growth (e.g., +15% means 15% more installs than comparison period)
- Negative percentage = decline (e.g., -10% means 10% fewer installs than comparison period)
- 0% = no change
- Comparison periods available: compared to last month, last week, or yesterday

---

### 4. Daily Active Users (DAU)

**What it measures:** The number of unique users who generated at least one prompt today, segregated between Extension and Chat usage.

**Why it exists:** Answers "How many users are actively using the product today and through which channels?"

**Data Source:** `save_enhance_prompt` and `user_prompts` tables - counts distinct users with activity on the current day, filtered by product type.

**Calculation Logic:**
1. Find all prompt generation records from today
2. Filter by product type (Extension vs Chat)
3. Get the unique user IDs for each product type
4. Count the distinct users for each category
5. Return the count with Extension/Chat breakdown

**Formula:** `COUNT(DISTINCT user_id) WHERE DATE(created_at) = CURRENT_DATE AND product_type IN ('extension', 'chat')`

**What the number means:** This measures daily engagement by product channel. Higher DAU indicates more users are actively using the product each day. Segregation helps identify which product features are driving engagement.

---

### 5. Weekly Active Users (WAU)

**What it measures:** The number of unique users who generated at least 3 prompts in the last 7 days, segregated between Extension and Chat usage.

**Why it exists:** Answers "How many users have been consistently active in the past week?"

**Data Source:** `save_enhance_prompt` and `user_prompts` tables - counts distinct users with at least 3 prompt generations in the last 7 days, filtered by product type.

**Calculation Logic:**
1. Find all prompt generation records from the last 7 days
2. Group by user and product type, count prompts per user per product
3. Filter users who have at least 3 prompts in the period
4. Count distinct users for each product type (Extension vs Chat)
5. Return the count with Extension/Chat breakdown

**Formula:** `COUNT(DISTINCT user_id) WHERE created_at >= CURRENT_DATE - 7 days AND prompt_count >= 3 GROUP BY product_type`

**What the number means:** This measures consistent weekly engagement by product channel. WAU shows users who are regularly using the product rather than one-time users. Higher WAU indicates stronger user retention and habit formation.

---

### 6. Monthly Active Users (MAU)

**What it measures:** The number of unique users who generated at least 3 prompts in the last 30 days, segregated between Extension and Chat usage.

**Why it exists:** Answers "How many users have been consistently active in the past month?"

**Data Source:** `save_enhance_prompt` and `user_prompts` tables - counts distinct users with at least 3 prompt generations in the last 30 days, filtered by product type.

**Calculation Logic:**
1. Find all prompt generation records from the last 30 days
2. Group by user and product type, count prompts per user per product
3. Filter users who have at least 3 prompts in the period
4. Count distinct users for each product type (Extension vs Chat)
5. Return the count with Extension/Chat breakdown

**Formula:** `COUNT(DISTINCT user_id) WHERE created_at >= CURRENT_DATE - 30 days AND prompt_count >= 3 GROUP BY product_type`

**What the number means:** This measures consistent monthly engagement by product channel. MAU shows users who are regularly using the product rather than occasional users. Higher MAU indicates stronger user retention and habit formation.

---

### 7. Stickiness

**What it measures:** The percentage of monthly active users who are also daily active users.

**Why it exists:** Answers "How often do our monthly users return on a daily basis?"

**Data Source:** Calculated from DAU and MAU metrics.

**Calculation Logic:**
1. Get Daily Active Users (DAU)
2. Get Monthly Active Users (MAU)
3. Divide DAU by MAU
4. Multiply by 100 to get percentage

**Formula:** `(DAU / MAU) × 100`

**What the number means:**
- **Tells you:** How often users come back
- **This is the real engagement signal**
- **Typical ranges:**
  - <5% → Very weak retention
  - 10–20% → Decent
  - 25%+ → Strong daily habit
- Example: 20% means 1 in 5 monthly users are active daily

---

### 8. Dead Users Rate / Churn Rate

**What it measures:** The percentage of total users who have no activity or haven't been active in the last 30 days.

**Why it exists:** Answers "What percentage of our users are inactive?"

**Data Source:** `usertable` and `save_enhance_prompt` - compares total users vs. users with recent activity.

**Calculation Logic:**
1. Find the last activity date for each user (from prompt generation records)
2. Mark users as "dead" if they have no activity OR last activity was more than 30 days ago
3. Count total dead users
4. Divide by total users
5. Multiply by 100 to get percentage

**Formula:** `(Dead Users / Total Users) × 100`  
Where Dead Users = users with no activity OR last activity > 30 days ago

**What the number means:**
- Lower percentage = better (more users are active)
- Higher percentage = worse (more users have stopped using the product)
- Example: 50% means half of all users are inactive

---

### 9. Onboarding Rate

**What it measures:** The percentage of users who completed the onboarding process after signing up during the selected period.

**Why it exists:** Answers "What percentage of new users complete onboarding in this period?"

**Data Source:** `usertable` and `onboarding_data` - compares total signups vs. users with onboarding records within the selected period.

**Calculation Logic:**
1. Count total users who signed up in the selected period
2. Count users who have a record in `onboarding_data` (completed onboarding) within the same period
3. Divide completed by total
4. Multiply by 100 to get percentage
5. Calculate non-onboarded users data below

**Formula:** `(Users with Onboarding Data / Total Signups in Period) × 100`

**What the number means:**
- Higher percentage = more users complete onboarding (good)
- Lower percentage = more users drop off during onboarding (concerning)
- Example: 75% means 3 out of 4 users complete onboarding

**Non-onboarded Users Data:**
- Total non-onboarded users in period
- Average time to first activity (if any)
- Conversion rate from non-onboarded to active users

---

## Engagement Metrics

### 10. Total Prompts

**What it measures:** The total number of prompts generated by users with advanced filtering options.

**Why it exists:** Answers "How much are users using the core feature with specific characteristics?"

**Data Source:** `user_prompts` table - counts all prompt records with multiple filter options.

**Calculation Logic:**
1. Apply selected filters:
   - Period-based: Filter by `created_at` date within the selected period
   - AI-based: Filter by AI model used
   - Product-based: Filter by product type (Extension or Lander)
   - Domain-based: Filter by content domain
   - Intent-based: Filter by user intent/purpose
2. Count all records matching the filter criteria
3. Return the total

**Formula:** `COUNT(*) FROM user_prompts WHERE [filter_conditions]`

**Available Filters:**
- **Period-based:** Daily, weekly, monthly, custom date ranges
- **AI-based:** Specific AI models or capabilities used
- **Product-based:** Extension usage vs Lander usage
- **Domain-based:** Content domains (e.g., marketing, technical, creative)
- **Intent-based:** User purposes (e.g., rewrite, generate, analyze)

**What the number means:** This measures filtered product usage volume. Higher numbers indicate more feature adoption and usage within the selected criteria.

---

### 11. Prompts per User

**What it measures:** The average number of prompts generated per total user in the selected period.

**Why it exists:** Answers "On average, how much does each user use the feature?"

**Data Source:** `user_prompts` table - divides total prompts by total users in the period.

**Calculation Logic:**
1. Count total prompts generated in the selected period
2. Count total users in the same period
3. Divide total prompts by total users

**Formula:** `Total Prompts in Period / Total Users in Period`

**What the number means:**
- Higher number = users are using the feature more frequently
- Lower number = users are using it less
- Period-based calculation shows usage intensity over time
- Example: 5.2 means each user generates about 5 prompts on average in the period

---

## User Lifecycle Metrics

### 14. Active Users (Lifecycle)

**What it measures:** The number of users with activity in the last 7 days.

**Why it exists:** Answers "How many users are currently active?"

**Data Source:** `usertable` and `save_enhance_prompt` - identifies users with recent activity.

**Calculation Logic:**
1. Find the last activity date for each user
2. Mark users as "active" if last activity was within the last 7 days
3. Count users marked as active

**Formula:** Users where `last_activity_date >= CURRENT_DATE - 7 days`

**What the number means:** This shows the current active user base. These are users who are actively engaged right now.

---

### 15. At-Risk Users

**What it measures:** The number of users with activity between 7-30 days ago (showing signs of disengagement).

**Why it exists:** Answers "How many users are starting to disengage?"

**Data Source:** `usertable` and `save_enhance_prompt` - identifies users with activity 7-30 days ago.

**Calculation Logic:**
1. Find the last activity date for each user
2. Mark users as "at-risk" if last activity was 7-30 days ago
3. Count users marked as at-risk

**Formula:** Users where `last_activity_date >= CURRENT_DATE - 30 days AND last_activity_date < CURRENT_DATE - 7 days`

**What the number means:** These users are showing early signs of disengagement. They may need re-engagement efforts.

---

### 16. Dead Users (Lifecycle)

**What it measures:** The number of users with no activity or activity more than 30 days ago.

**Why it exists:** Answers "How many users have completely stopped using the product?"

**Data Source:** `usertable` and `save_enhance_prompt` - identifies users with no recent activity.

**Calculation Logic:**
1. Find the last activity date for each user
2. Mark users as "dead" if they have no activity OR last activity was more than 30 days ago
3. Count users marked as dead

**Formula:** Users where `last_activity_date IS NULL OR last_activity_date < CURRENT_DATE - 30 days`

**What the number means:** These users have churned or are inactive. High numbers indicate retention challenges.

---

## Lead Generation Metrics

### 12. User Activation Funnel

**What it measures:** Breakdown of user activation behavior into three categories: never activated, activated only on signup day, and returned on a later day.

**Why it exists:** Answers "How are users progressing through the activation funnel and where are the drop-off points?"

**Data Source:** `usertable` and `save_enhance_prompt` - compares signup date to activity patterns.

**Calculation Logic:**
1. For each user, find their signup date and activity dates
2. Categorize users into three groups:
   - Never Activated: Users who signed up but never generated any prompts
   - Day 0 Only: Users who activated only on their signup day
   - Returned Later: Users who returned and used the product after their signup day
3. Count each category

**Formula:**
- Never Activated: Users where no prompt activity exists
- Day 0 Only: Users where `first_activity_date = signup_date` and no later activity
- Returned Later: Users where `first_activity_date > signup_date` or multiple activity dates exist

**What the number means:**
- **Never Activated** = Users who signed up but never activated (onboarding/engagement issue)
- **Day 0 Only** = Users who activated only on signup day (may need better onboarding)
- **Returned Later** = Users who returned after signup (successful retention)
- This makes it easier to diagnose onboarding and retention issues instead of just labeling users as "new" or "returning"

---

### 13. Week-over-Week Comparison

**What it measures:** Comparison of signups and active users between the current week and previous week.

**Why it exists:** Answers "How did this week compare to last week?"

**Data Source:** `usertable` and `save_enhance_prompt` - compares current week (Monday-Sunday) to previous week.

**Calculation Logic:**
1. Count signups in current week (Monday to Sunday of current week)
2. Count signups in previous week (Monday to Sunday of previous week)
3. Calculate percentage change: ((Current - Previous) / Previous) × 100
4. Repeat for active users

**Formula:** `((Current Week - Previous Week) / Previous Week) × 100`

**What the number means:**
- **Technically sound** for spotting short-term momentum
- **Treat as diagnostic signal rather than success metric**
- WoW percentages can be misleading at low scale and should always be read alongside absolute numbers and retention metrics (like DAU/MAU)
- Positive percentage = growth week-over-week
- Negative percentage = decline week-over-week
- Shows short-term trends and momentum, but underlying engagement may be weak even with healthy-looking growth

---

## Data Sources Summary

All metrics pull from these database tables:

- **`usertable`** - User account information and signup dates
- **`user_prompts`** - Original prompts created by users
- **`save_enhance_prompt`** - Enhanced prompts and user activity
- **`onboarding_data`** - Onboarding completion records

All calculations are performed in real-time when you view the dashboard. Metrics are cached for 5-10 minutes to ensure fast loading while maintaining accuracy.

---

## Notes

- All date ranges are user-selectable in each dashboard section
- Metrics are calculated using PostgreSQL queries
- Percentages are rounded to 1-2 decimal places for readability
- Zero values are handled safely (no division by zero errors)
- All metrics exclude test accounts and system users

---

*Last Updated: Dashboard calculations are automatically updated in real-time. This document reflects the current calculation logic as of the latest dashboard version.*
