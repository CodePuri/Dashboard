# Overview Dashboard - Complete Metrics Reference with Implementation Status

## 💎 Value Impact Metrics (Tier 1)

### 2. Time Saved ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** Total time saved by users by not manually typing enhanced content
- **Calculation:**
  - Extra words = Enhanced prompt word count - Original prompt word count
  - Time per prompt = Extra words ÷ 40 words/min
  - Total time saved = Sum of all time saved per enhanced prompt
- **Display:** Hours and minutes (e.g., "127.5 hours")
- **Visual:** Metric card + trend line chart
- **Why Core:** Quantifies tangible user value

### 3. Token Efficiency Saved ❌ PLACEHOLDER

- **Status:** ❌ **PLACEHOLDER** (Not yet defined)
- **Definition:** _To be determined - placeholder for future metric_
- **Visual:** Reserved space in dashboard

---

## 📈 Growth & Engagement Signals (Tier 1)

### 4. Weekly Active Users (WAU) ✅ IMPLEMENTED (Developer)

- **Status:** ✅ **IMPLEMENTED** in Developer Dashboard
- **Definition:** Unique users who submitted prompts in the last 7 days
- **YC Equivalent:** Weekly Active Users
- **Calculation:** DISTINCT count of `user_id` where `created_at >= NOW() - INTERVAL '7 days'`
- **Display:** Number with trend (e.g., "1,247 ↑8.2%")
- **Visual:** Metric card + week-over-week trend line
- **Why Core:** Absolute measure of viable user base
- **Note:** Also tracked as DAU/MAU in Developer

### 5. Power User Conversion Rate ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** Percentage of users who become power users (21+ prompts)
- **YC Equivalent:** Power User Conversion Rate
- **Calculation:** (Power Users ÷ Total Unique Users) × 100
- **Display:** Percentage (e.g., "18.3%")
- **Visual:** Metric card with segment breakdown
- **Why Core:** Leading indicator for monetization potential

### 6. Enhancements per WAU ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** Average prompts per weekly active user (usage intensity)
- **YC Equivalent:** Enhancements per WAU
- **Calculation:** Total Prompts (last 7 days) ÷ WAU
- **Display:** Number with 1 decimal (e.g., "8.7 prompts/user")
- **Visual:** Metric card + trend
- **Why Core:** Measures "dosage" - signal of product-market fit

### 6. User Lifetime Statistics ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** Engagement level across user's entire history (ignoring date filters)
- **Metric:** Avg Lifetime Prompts per User
- **Calculation:** Mean of `total_prompts` (all-time) for each user
- **Display:** Number (e.g. "24.5 prompts/user (Lifetime)")
- **Visual:** Metric card + Distribution of lifetime counts
- **Why Core:** Distinguishes temporary bursts from long-term retention

---

## 🔄 Retention Signals (Tier 1)

### 8. Day 7 Natural Retention ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** % of users who return on Day 7 without prompting
- **YC Equivalent:** Day 7 Natural Retention
- **Calculation:**
  - Cohort = Users who first enhanced on Day X
  - Retained = Users from cohort who enhanced on Day X+7
  - Rate = (Retained ÷ Cohort) × 100
- **Display:** Percentage (e.g., "42%")
- **Visual:** Metric card + cohort retention curve
- **Why Core:** Ultimate test of product value - recurring problem solver
- **Note:** Developer has retention by cohort - needs Day 7 specific view

---

## 📊 Quality Metrics (Tier 1)

### 7. Refine Rate ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** % of prompts that get refined by users
- **Calculation:** (Refined Prompts ÷ Enhanced Prompts) × 100
- **Display:** Percentage (e.g., "12.4%")
- **Visual:** Metric card
- **Why Core:** Inverse quality signal - high retry = poor initial output

---

## 📊 Key Performance Metrics (Tier 2)

### 8. Total Prompts ✅ IMPLEMENTED (Overview + Developer)

- **Status:** ✅ **IMPLEMENTED** in Overview & Developer Dashboards
- **Definition:** Total number of prompts submitted by users
- **Calculation:** Count of all records in `user_prompts` table
- **Display:** Number with comma separator
- **Visual:** Metric card

### 9. Enhanced Prompts ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Prompts successfully enhanced
- **Calculation:** Count of prompts with corresponding `save_enhance_prompt` record
- **Display:** Number with comma separator
- **Visual:** Metric card

### 10. Failed Prompts ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** Prompts that were NOT successfully enhanced
- **Calculation:** Total Prompts - Enhanced Prompts
- **Display:** Number + failure rate percentage (e.g., "15 (2.3%)")
- **Visual:** Metric card with percentage badge
- **Action:** Expandable to show list of failed prompts for investigation

### 11. Unique Users ✅ IMPLEMENTED (Overview + Developer)

- **Status:** ✅ **IMPLEMENTED** in Overview & Developer Dashboards
- **Definition:** Count of unique users who submitted prompts
- **Calculation:** DISTINCT count of `user_id` in `user_prompts`
- **Display:** Number with comma separator
- **Visual:** Metric card
- **Enhancement:** ⏳ **TO ADD** - Expandable section showing **Top 5 Power Users**

#### 11a. Top 5 Power Users (Sub-metric) ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** Users with most prompts, showing their best work
- **Columns:**
  - User ID/Email
  - Total Prompts
  - Best Prompt (highest quality score)
  - Enhancement Quality Score
- **Best Prompt Selection:**
  - Primary: Highest enhancement ratio (enhanced length ÷ original length)
  - Secondary: Longest enhanced prompt
  - Tertiary: Most recent
- **Visual:** Expandable table
- **Note:** Top Users leaderboard exists in Overview, needs enhancement with best prompts

### 12. Enhancement Rate ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Percentage of prompts successfully enhanced
- **Calculation:** (Enhanced Prompts ÷ Total Prompts) × 100
- **Display:** Percentage (e.g., "97.7%")
- **Visual:** Metric card

### 13. Avg Processing Time ✅ IMPLEMENTED (Overview + Developer)

- **Status:** ✅ **IMPLEMENTED** in Overview & Developer Dashboards
- **Definition:** Average time to enhance a prompt
- **Calculation:** Mean of `processing_time` from `save_enhance_prompt`
- **Display:** Seconds with 2 decimals (e.g., "2.34s")
- **Visual:** Metric card
- **Enhancement:** ⏳ **TO ADD** - Expandable section showing **Top 5 Slowest Prompts**

#### 13a. Top 5 Slowest Prompts (Sub-metric) ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** Prompts that took longest to process
- **Columns:**
  - Processing Time
  - Original Prompt (truncated to 50 chars)
  - Domain
  - Complexity
  - Date
- **Visual:** Expandable table

---

## 📝 Prompt Length Analytics (Tier 2)

### 14. User Prompt Statistics ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Metrics:** Mean, Min, Max, Std Dev (character count)
- **Calculation:** Statistical analysis of `user_prompt` length
- **Visual:** 4 metric cards + histogram

### 15. Enhanced Prompt Statistics ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Metrics:** Mean, Min, Max, Std Dev (character count)
- **Calculation:** Statistical analysis of `enhanced_prompt` length
- **Visual:** 4 metric cards + histogram

### 16. Enhancement Comparison ⏳ TO ENHANCE

- **Status:** ✅ **PARTIALLY IMPLEMENTED** (box plot exists) | ⏳ **TO ENHANCE** (replace with word bars)
- **Definition:** Visual comparison of average prompt lengths
- **Current:** Box plot of enhancement ratio
- **Planned:** Word-based horizontal bar comparison
- **Calculation:**
  - Avg user prompt words = Mean user prompt length ÷ 5 (chars per word)
  - Avg enhanced prompt words = Mean enhanced prompt length ÷ 5
  - Enhancement multiplier = Avg enhanced words ÷ Avg user words
- **Visual:**
  - Two horizontal bars showing word counts
  - Enhancement multiplier metric below
  - Simple, clean design

---

## 📊 Distribution Analytics (Tier 3)

### 17. LLM Distribution ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Breakdown of which LLMs are being used
- **Calculation:** Count by `llm_used` field
- **Visual:** Pie chart with hole (donut)

### 18. Intent Distribution ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Top 10 user intents/purposes
- **Calculation:** Count by `intent` field, top 10
- **Visual:** Horizontal bar chart

### 19. Domain Distribution ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Top 10 domains/topics
- **Calculation:** Count by `domain` field, top 10
- **Visual:** Horizontal bar chart

### 20. Complexity Distribution ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Breakdown by prompt complexity level
- **Calculation:** Count by `complexity` field
- **Visual:** Pie chart

### 21. Mode Distribution ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Usage split between modes (Standard/Deep Research)
- **Calculation:** Count by `mode` field
- **Visual:** Donut chart

### 22. Processing Time Distribution ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Distribution of processing times
- **Calculation:** Histogram of `processing_time` (filtered 0-60 seconds)
- **Visual:** Histogram with 30 bins

---

## 🕐 Time-based Analytics (Tier 3)

### 23. Daily Activity ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Prompt count per day over date range
- **Calculation:** Count prompts grouped by date
- **Visual:** Line chart with markers and fill

### 24. Day of Week Activity ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Total prompts by day of week
- **Calculation:** Count prompts grouped by day name (Mon-Sun)
- **Visual:** Bar chart

### 25. Time Period Analysis ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Activity by time of day (Night/Morning/Afternoon/Evening)
- **Calculation:**
  - Night: 0-6
  - Morning: 6-12
  - Afternoon: 12-18
  - Evening: 18-24
- **Visual:** Bar chart

### 26. Weekend vs Weekday ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Activity split between weekends and weekdays
- **Calculation:** Count prompts grouped by is_weekend flag
- **Visual:** Pie chart

### 27. Hourly Activity Pattern ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Average prompts per hour of day
- **Calculation:** Mean count by hour (0-23)
- **Visual:** Bar chart

---

## 👥 User Behavior Analytics (Tier 2)

### 28. User Segmentation ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** User classification by activity level
- **Segments:**
  - One-time: 1 prompt
  - Casual: 2-5 prompts
  - Regular: 6-20 prompts
  - Power: 21+ prompts
- **Calculation:** Group users by prompt count
- **Visual:** Bar chart + pie chart + metrics table

### 30. User Statistics (Per Segment) ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Metrics:**
  - Total Unique Users
  - Power Users (count + percentage)
  - Regular Users (count + percentage)
  - One-time Users (count + percentage)
- **Visual:** Metric cards

### 31. User Lifetime Statistics ⏳ TO IMPLEMENT

- **Status:** ⏳ **TO IMPLEMENT**
- **Definition:** Engagement level across user's entire history (ignoring date filters)
- **Metric:** Avg Lifetime Prompts per User
- **Calculation:** Mean of `total_prompts` (all-time) for each user
- **Display:** Number (e.g. "24.5 prompts/user (Lifetime)")
- **Visual:** Metric card + Distribution of lifetime counts
- **Why Core:** Distinguishes temporary bursts from long-term retention

---

## 💡 Additional Insights (Tier 3)

### 30. Top Users Leaderboard ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Top 10 users by prompt count
- **Calculation:** Count prompts per user, sorted descending, limit 10
- **Visual:** Horizontal bar chart

### 31. Domain Trends ✅ IMPLEMENTED (Overview)

- **Status:** ✅ **IMPLEMENTED** in Overview Dashboard
- **Definition:** Trend of top 5 domains over last 7 days
- **Calculation:** Count by domain and date for recent data
- **Visual:** Multi-line chart

---

## 📌 Summary

**Total Metrics:** 30 main metrics (+ 2 sub-metrics = 32 total)

**Implementation Status:**

- ✅ **Fully Implemented:** 15 metrics (in Overview or Developer)
- ⏳ **To Implement:** 6 NEW YC-inspired metrics
- 🔨 **To Enhance:** 4 metrics (add sub-features like expandables)
- ❌ **Placeholder:** 1 metric (Token Efficiency - needs definition)

**NEW YC-Inspired Metrics to Implement:**

1. ⏳ Time Saved
2. ⏳ Power User Conversion Rate
3. ⏳ Enhancements per WAU
4. ⏳ Day 7 Natural Retention
5. ⏳ Refine Rate
6. ⏳ User Lifetime Statistics

**Enhancements to Existing Metrics:**

1. 🔨 Failed Prompts (new calculation from existing data)
2. 🔨 Top 5 Power Users (expandable for Unique Users)
3. 🔨 Top 5 Slowest Prompts (expandable for Avg Processing Time)
4. 🔨 Word Comparison Viz (replace box plot)

**By Dashboard:**

- **Overview:** 16 implemented metrics
- **Developer:** 18 implemented metrics (with overlap)
- **To Add to Overview:** 12 new/enhanced metrics

**Metric Categories:**

- **Tier 1 (Answer "Are we winning?"):** 9 metrics

  - Implemented: 1 (WAU in Developer)
  - To Implement: 6
  - Placeholder: 1
  - To Enhance: 1

- **Tier 2 (Diagnostic):** 11 metrics + 2 sub-metrics

  - Implemented: 7
  - To Implement: 3 (+ 1 duplicated lifetime)
  - To Enhance: 2 sub-metrics

- **Tier 3 (Deep Dive):** 10 metrics
  - Implemented: 10
  - All complete! ✅
