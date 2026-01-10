# Dashboard Implementation Quick Reference

## Dashboard Toggle Structure

```
┌─────────────────────────────────────────────────────────┐
│  📊 Analytics Dashboard    [Developer] [Business]  🔄   │
└─────────────────────────────────────────────────────────┘
                          │
                          ├─ Developer Mode
                          │  ├─ Section 1: Acquisition (Detailed)
                          │  ├─ Section 2: Impression (Detailed)
                          │  ├─ Section 3: Retention (Detailed)
                          │  ├─ Section 4: Engagement (Detailed)
                          │  └─ Section 5: Technical Metrics
                          │
                          └─ Business Mode
                             ├─ Section 1: Acquisition Overview
                             ├─ Section 2: Impression Overview
                             ├─ Section 3: Retention Overview
                             ├─ Section 4: Engagement Overview
                             └─ Section 5: Business KPIs
```

---

## Developer Dashboard Sections

### 1. Acquisition Metrics (Detailed)
- **1.1 User Signup Analytics**
  - Daily/Weekly/Monthly signups
  - Signup methods (email vs OAuth)
  - Signup sources breakdown
  - Onboarding completion rates
  - Waitlist metrics

- **1.2 Referral & Invite System**
  - Referral performance
  - Top referrers
  - Invite link usage
  - Conversion rates

- **1.3 Trial & Free User Acquisition**
  - Trial starts
  - User status transitions
  - Status distribution over time

### 2. Impression Metrics (Detailed)
- **2.1 Active User Metrics**
  - DAU/WAU/MAU
  - Activity patterns (hour/day)
  - Active users by status

- **2.2 Feature Impressions & Usage**
  - Feature usage counts
  - Feature adoption rates
  - Processing metrics

### 3. Retention Metrics (Detailed)
- **3.1 User Retention Analysis**
  - 1-day, 7-day, 30-day retention
  - Retention by cohort
  - Churn analysis

- **3.2 Subscription Retention**
  - Active subscriptions
  - Trial to paid conversion
  - Payment retention

- **3.3 User Lifecycle Stages**
  - Lifecycle distribution
  - Status transitions

### 4. Engagement Metrics (Detailed)
- **4.1 Usage Intensity**
  - Daily usage per user
  - Token consumption
  - Feature usage depth

- **4.2 Feature Engagement**
  - Prompt generation metrics
  - Enhancement engagement
  - Preference usage

- **4.3 Context & Personalization**
  - Context creation metrics
  - Personalization adoption

### 5. Technical Metrics
- **5.1 System Performance**
  - Processing times (P95/P99)
  - Token system performance

- **5.2 Database Health**
  - Table sizes
  - Data quality metrics

---

## Business Dashboard Sections

### 1. Acquisition Overview
- **Key Metrics**: Total users, New users, Growth rate, Conversion rate
- **Channels**: Top sources, Referral performance
- **Visualizations**: KPI cards, Growth trend, Funnel chart

### 2. Impression Overview
- **Key Metrics**: DAU, WAU, MAU, Stickiness (DAU/MAU)
- **Status Distribution**: Freetrial, Free, Pro breakdown
- **Visualizations**: KPI cards, Trend charts, Pie charts

### 3. Retention Overview
- **Key Metrics**: 7-day retention, 30-day retention, Churn rate
- **Subscription Health**: Active subscriptions, Trial conversion, MRR
- **Visualizations**: KPI cards, Retention trends, Funnel charts

### 4. Engagement Overview
- **Key Metrics**: Average daily usage, Heavy users %, Feature adoption
- **Engagement Health**: Engagement score, Session frequency
- **Visualizations**: KPI cards, Usage trends, Gauge charts

### 5. Business KPIs
- **Revenue Metrics**: Total revenue, ARPU, LTV (if applicable)
- **Growth Metrics**: User growth, Engagement growth, Feature growth
- **Visualizations**: KPI cards, Growth trend charts

---

## Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Add dashboard mode toggle
- [ ] Create router function
- [ ] Set up session state
- [ ] Create basic structure

### Phase 2: Developer - Acquisition
- [ ] Signup analytics functions
- [ ] Referral system functions
- [ ] Trial user functions
- [ ] Visualizations

### Phase 3: Developer - Impression & Retention
- [ ] Active user functions
- [ ] Feature usage functions
- [ ] Enhanced retention functions
- [ ] Subscription retention functions

### Phase 4: Developer - Engagement & Technical
- [ ] Usage intensity functions
- [ ] Feature engagement functions
- [ ] Context/personalization functions
- [ ] Technical metrics functions

### Phase 5: Business Dashboard
- [ ] All overview sections
- [ ] KPI cards with trends
- [ ] Executive summary
- [ ] Comparison period

### Phase 6: Polish
- [ ] Export functionality
- [ ] Caching
- [ ] Error handling
- [ ] Performance optimization
- [ ] Documentation

---

## Key Functions to Create

### Query Functions (dashboard_queries.py)
```
Acquisition:
- get_daily_signups()
- get_signup_sources()
- get_onboarding_completion()
- get_waitlist_metrics()
- get_referral_performance()
- get_invite_link_metrics()
- get_trial_starts()

Impression:
- get_dau_wau_mau()
- get_user_activity_patterns()
- get_feature_usage_counts()
- get_feature_adoption_rate()
- get_processing_metrics()

Retention:
- get_retention_by_cohort()
- get_churn_analysis_detailed()
- get_subscription_metrics()
- get_trial_to_paid_conversion()
- get_lifecycle_distribution()

Engagement:
- get_daily_usage_intensity()
- get_token_consumption()
- get_prompt_generation_metrics()
- get_context_creation_metrics()

Business (Aggregated):
- get_acquisition_kpis()
- get_active_user_summary()
- get_retention_summary()
- get_usage_summary()
- get_engagement_score()
- get_revenue_metrics()
```

### UI Functions (developer_dashboard.py)
```
- render_developer_dashboard()
- show_acquisition_section()
- show_impression_section()
- show_retention_section()
- show_engagement_section()
- show_technical_section()
```

### UI Functions (business_dashboard.py)
```
- render_business_dashboard()
- show_acquisition_overview()
- show_impression_overview()
- show_retention_overview()
- show_engagement_overview()
- show_business_kpis()
```

### Component Functions (dashboard_components.py)
```
- kpi_card()
- trend_indicator()
- date_filter()
- export_button()
```

---

## Data Sources by Section

### Acquisition
- `usertable` - User signups
- `onboarding_data` - Onboarding info
- `waitlistUsers` - Waitlist data
- `referrals` - Referral codes
- `invite_links` - Invite links
- `userstatus` - User status

### Impression
- `usertable` - User base
- `userstatus` - User status
- `user_prompts` - User activity
- `save_enhance_prompt` - Feature usage
- `refine_prompt` - Feature usage

### Retention
- `usertable` - User base
- `userstatus` - Status changes
- `user_prompts` - Activity tracking
- `subscriptions` - Subscription data
- `payments` - Payment data

### Engagement
- `userstatus` - User status
- `token_transactions` - Token usage
- `user_prompts` - Prompt usage
- `save_enhance_prompt` - Enhancements
- `refine_prompt` - Refinements
- `conversation_contexts` - Context usage
- `user_profiles` - Personalization

### Technical
- `save_enhance_prompt` - Processing times
- `refine_prompt` - Processing times
- `token_transactions` - Token system
- All tables - Database health

---

## Filter Options

### Developer Dashboard
- **Date Range**: Today, Yesterday, Last 7/30/90 Days, All Time, Custom
- **User Status**: Multi-select (freetrial, free, pro)
- **Platform**: Multi-select (chatgpt, claude, gemini)
- **Feature**: Multi-select (enhance, refine, etc.)

### Business Dashboard
- **Time Period**: Today, This Week, This Month, This Quarter, Custom
- **Comparison Period**: Toggle for period-over-period comparison

---

## Export Options

### Developer Dashboard
- CSV export for all tables
- Excel export for all tables
- Individual section exports
- Full dashboard export

### Business Dashboard
- PDF executive report
- CSV export for KPIs
- Excel export for detailed data

---

## Refresh Strategy

### Developer Dashboard
- **Real-time**: 5-15 minute auto-refresh
- **Manual**: Refresh button
- **Cache**: 5-15 minutes

### Business Dashboard
- **Daily**: Once per day (overnight)
- **Manual**: Refresh button
- **Cache**: 1 day

---

## Visual Indicators

### Trend Indicators
- ⬆️ Up arrow (green) - Positive change
- ⬇️ Down arrow (red) - Negative change
- ➡️ Flat arrow (gray) - No change

### Status Badges
- 🟢 Active
- 🟡 Warning
- 🔴 Critical
- ⚪ Inactive

### Mode Indicator
- 👨‍💻 Developer Mode
- 💼 Business Mode

---

*Quick reference for dashboard implementation. See DASHBOARD_IMPLEMENTATION_PLAN.md for detailed plan.*

