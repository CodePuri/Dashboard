# Dashboard Implementation Plan: Developer & Business Toggle

## Overview
This plan outlines the implementation of a dual-mode dashboard system with a toggle between **Developer Dashboard** (detailed technical metrics) and **Business Dashboard** (high-level business KPIs).

---

## Current State Analysis

### Existing Implementation
- **Framework**: Streamlit-based dashboard (`simple_dashboard.py`)
- **Database**: PostgreSQL via `database.py` (DatabaseManager class)
- **Current Sections**: 21+ analytics sections already implemented
- **Visualization**: Plotly Express charts
- **Data Access**: Read-only queries via `db_manager.execute_query()`

### Existing Sections (to be categorized)
1. `show_top_metrics()` - Key metrics overview
2. `show_natural_language_search()` - AI-powered search
3. `show_global_search_block()` - Global search
4. `show_user_table_full_section()` - Full user table
5. `show_user_status_table()` - User status data
6. `show_onboarding_data_section()` - Onboarding data
7. `show_user_prompts_table()` - User prompts
8. `show_save_enhance_prompt_table()` - Enhanced prompts
9. `show_refine_prompt_table()` - Refined prompts
10. `show_retention_analysis()` - Retention metrics
11. `show_cohort_analysis()` - Cohort analysis
12. `show_churn_analysis()` - Churn analysis
13. `show_prompt_reuse_analysis()` - Prompt reuse
14. `show_user_analysis()` - User statistics
15. `show_signup_trends()` - Signup trends
16. `show_installation_analysis()` - Installation metrics
17. `show_recent_users()` - Recent signups
18. `show_ai_usage_chart()` - AI usage distribution

---

## Implementation Plan

### Phase 1: Core Infrastructure (Foundation)

#### 1.1 Dashboard Toggle Mechanism
**Location**: Top of `main()` function, after header

**Implementation**:
- Add Streamlit toggle/radio button in header area
- Store selection in `st.session_state['dashboard_mode']`
- Options: "Developer" | "Business"
- Visual indicator (badge/icon) showing current mode

**Code Structure**:
```python
# In main() function
dashboard_mode = st.radio(
    "Dashboard Mode",
    ["Developer", "Business"],
    horizontal=True,
    key="dashboard_mode",
    label_visibility="visible"
)
```

#### 1.2 Dashboard Mode Router
**Location**: New function `render_dashboard_by_mode()`

**Implementation**:
- Check `st.session_state['dashboard_mode']`
- Route to appropriate dashboard renderer
- `render_developer_dashboard()` or `render_business_dashboard()`

#### 1.3 Session State Management
**Location**: Initialize at start of `main()`

**Implementation**:
- Initialize `dashboard_mode` if not exists (default: "Developer")
- Store date filters per mode
- Store refresh timestamps per mode

---

### Phase 2: Developer Dashboard Structure

#### 2.1 Section 1: Acquisition Metrics (Detailed)

**2.1.1 User Signup Analytics**
- **New Functions to Create**:
  - `get_daily_signups()` - Daily signups with auth method breakdown
  - `get_signup_sources()` - Breakdown by onboarding_data.source
  - `get_onboarding_completion()` - Completion rates and drop-off
  - `get_waitlist_metrics()` - Waitlist size and conversion

- **Visualizations**:
  - Line chart: Signups over time (daily/weekly/monthly)
  - Pie chart: Signup method (email vs OAuth)
  - Bar chart: Signup sources
  - Funnel chart: Onboarding completion

- **UI Section**: `show_acquisition_signup_analytics()`

**2.1.2 Referral & Invite System**
- **New Functions to Create**:
  - `get_referral_performance()` - Referral codes and top referrers
  - `get_invite_link_metrics()` - Invite link usage and redemptions
  - `get_referral_conversion()` - Conversion rates

- **Visualizations**:
  - Table: Top referrers
  - Bar chart: Invite link usage
  - Line chart: Referral growth

- **UI Section**: `show_acquisition_referral_system()`

**2.1.3 Trial & Free User Acquisition**
- **New Functions to Create**:
  - `get_trial_starts()` - Daily trial activations
  - `get_user_status_transitions()` - Status changes over time

- **Visualizations**:
  - Stacked area: User status distribution
  - Bar chart: Trial starts by day

- **UI Section**: `show_acquisition_trial_users()`

**Reuse Existing**:
- `show_signup_trends()` - Enhanced with more breakdowns
- `show_recent_users()` - Keep as-is

---

#### 2.2 Section 2: Impression Metrics (Detailed)

**2.2.1 Active User Metrics**
- **New Functions to Create**:
  - `get_dau_wau_mau()` - Daily/Weekly/Monthly active users
  - `get_user_activity_patterns()` - Activity by hour/day

- **Visualizations**:
  - Line chart: DAU/WAU/MAU trends
  - Heatmap: Activity by hour and day
  - Bar chart: Active users by status

- **UI Section**: `show_impression_active_users()`

**2.2.2 Feature Impressions & Usage**
- **New Functions to Create**:
  - `get_feature_usage_counts()` - Usage by feature
  - `get_feature_adoption_rate()` - Adoption percentages
  - `get_processing_metrics()` - Processing times

- **Visualizations**:
  - Bar chart: Feature usage counts
  - Line chart: Feature adoption over time
  - Box plot: Processing time distribution

- **UI Section**: `show_impression_feature_usage()`

**Reuse Existing**:
- `show_user_prompts_table()` - Keep as-is
- `show_save_enhance_prompt_table()` - Keep as-is
- `show_refine_prompt_table()` - Keep as-is
- `show_ai_usage_chart()` - Keep as-is

---

#### 2.3 Section 3: Retention Metrics (Detailed)

**2.3.1 User Retention Analysis**
- **Enhance Existing**:
  - `show_retention_analysis()` - Add 1-day, 7-day, 30-day breakdowns
  - `show_cohort_analysis()` - Enhance with retention by cohort

- **New Functions to Create**:
  - `get_retention_by_cohort()` - Detailed cohort retention
  - `get_churn_analysis_detailed()` - Enhanced churn metrics
  - `get_return_user_metrics()` - Return user statistics

- **Visualizations**:
  - Cohort table: Retention by signup month
  - Line chart: Retention curves
  - Bar chart: Churn rate by status

- **UI Section**: `show_retention_user_analysis()` (enhance existing)

**2.3.2 Subscription Retention**
- **New Functions to Create**:
  - `get_subscription_metrics()` - Active subscriptions, churn
  - `get_trial_to_paid_conversion()` - Conversion rates
  - `get_payment_retention()` - Payment success rates

- **Visualizations**:
  - Funnel chart: Trial to paid conversion
  - Line chart: Subscription retention
  - Pie chart: Subscription status

- **UI Section**: `show_retention_subscription()`

**2.3.3 User Lifecycle Stages**
- **New Functions to Create**:
  - `get_lifecycle_distribution()` - New/Active/At-risk/Churned
  - `get_status_transitions()` - Status change patterns

- **Visualizations**:
  - Sankey diagram: Status transitions
  - Pie chart: Lifecycle distribution

- **UI Section**: `show_retention_lifecycle()`

**Reuse Existing**:
- `show_churn_analysis()` - Keep as-is (may enhance)
- `show_cohort_analysis()` - Keep as-is (may enhance)

---

#### 2.4 Section 4: Engagement Metrics (Detailed)

**2.4.1 Usage Intensity**
- **New Functions to Create**:
  - `get_daily_usage_intensity()` - Usage per user per day
  - `get_token_consumption()` - Token usage by feature/status
  - `get_feature_usage_depth()` - Prompts/enhancements per user

- **Visualizations**:
  - Histogram: Usage distribution
  - Line chart: Daily usage trends
  - Stacked bar: Token consumption by feature

- **UI Section**: `show_engagement_usage_intensity()`

**2.4.2 Feature Engagement**
- **New Functions to Create**:
  - `get_prompt_generation_metrics()` - Prompt creation stats
  - `get_enhancement_engagement()` - Enhancement/refinement rates
  - `get_preference_usage()` - Preference customization

- **Visualizations**:
  - Bar chart: Feature engagement rates
  - Line chart: Prompt generation trends

- **UI Section**: `show_engagement_feature_usage()`

**2.4.3 Context & Personalization Engagement**
- **New Functions to Create**:
  - `get_context_creation_metrics()` - Contexts per user, platform
  - `get_personalization_metrics()` - Profile completion, preferences

- **Visualizations**:
  - Bar chart: Context creation by platform
  - Line chart: Personalization adoption

- **UI Section**: `show_engagement_context_personalization()`

**Reuse Existing**:
- `show_prompt_reuse_analysis()` - Keep as-is
- `show_user_analysis()` - Keep as-is

---

#### 2.5 Section 5: Technical Metrics (Developer Only)

**2.5.1 System Performance**
- **New Functions to Create**:
  - `get_processing_performance()` - P95/P99 processing times
  - `get_token_system_performance()` - Token transaction metrics

- **Visualizations**:
  - Line chart: Processing time trends
  - Box plot: Processing time distribution

- **UI Section**: `show_technical_system_performance()`

**2.5.2 Database Health**
- **New Functions to Create**:
  - `get_table_sizes()` - Row counts, growth rates
  - `get_data_quality_metrics()` - Null rates, completeness

- **Visualizations**:
  - Bar chart: Table sizes
  - Line chart: Growth rates
  - Table: Data quality metrics

- **UI Section**: `show_technical_database_health()`

---

### Phase 3: Business Dashboard Structure

#### 3.1 Section 1: Acquisition Overview

**3.1.1 High-Level Acquisition Metrics**
- **New Functions to Create**:
  - `get_acquisition_kpis()` - Total users, new users, growth rates
  - `get_signup_conversion_rate()` - Waitlist to signup
  - `get_trial_activation_rate()` - Trial starts

- **Visualizations**:
  - KPI cards: Key numbers with trend indicators
  - Line chart: User growth trend
  - Funnel: Signup funnel

- **UI Section**: `show_business_acquisition_overview()`

**3.1.2 Acquisition Channels**
- **New Functions to Create**:
  - `get_top_acquisition_sources()` - Top 5 sources
  - `get_referral_program_summary()` - Referral summary

- **Visualizations**:
  - Pie chart: Source distribution
  - Bar chart: Source performance
  - KPI cards: Referral metrics

- **UI Section**: `show_business_acquisition_channels()`

---

#### 3.2 Section 2: Impression Overview

**3.2.1 Active User Summary**
- **New Functions to Create**:
  - `get_active_user_summary()` - DAU/WAU/MAU with ratios
  - `get_stickiness_metric()` - DAU/MAU ratio

- **Visualizations**:
  - KPI cards: DAU, WAU, MAU
  - Line chart: Active users trend
  - Gauge: DAU/MAU ratio

- **UI Section**: `show_business_active_users()`

**3.2.2 User Status Distribution**
- **New Functions to Create**:
  - `get_user_status_summary()` - Status breakdown with percentages

- **Visualizations**:
  - Pie chart: Status distribution
  - Stacked area: Status over time
  - KPI cards: Status counts

- **UI Section**: `show_business_user_status()`

---

#### 3.3 Section 3: Retention Overview

**3.3.1 Retention Summary**
- **New Functions to Create**:
  - `get_retention_summary()` - 7-day, 30-day retention
  - `get_churn_rate_summary()` - Monthly churn

- **Visualizations**:
  - KPI cards: Retention rates with trends
  - Line chart: Retention trends
  - Simplified cohort chart

- **UI Section**: `show_business_retention_summary()`

**3.3.2 Subscription Health**
- **New Functions to Create**:
  - `get_subscription_summary()` - Active subscriptions, MRR
  - `get_trial_conversion_summary()` - Trial to paid rate

- **Visualizations**:
  - KPI cards: Subscription metrics
  - Funnel: Trial to paid
  - Line chart: MRR trend (if applicable)

- **UI Section**: `show_business_subscription_health()`

---

#### 3.4 Section 4: Engagement Overview

**3.4.1 Usage Summary**
- **New Functions to Create**:
  - `get_usage_summary()` - Average daily usage, total usage
  - `get_heavy_users_percentage()` - Top 20% users
  - `get_feature_adoption_summary()` - Adoption rates

- **Visualizations**:
  - KPI cards: Usage metrics
  - Line chart: Usage trends
  - Bar chart: Feature adoption

- **UI Section**: `show_business_usage_summary()`

**3.4.2 Engagement Health**
- **New Functions to Create**:
  - `get_engagement_score()` - Composite engagement metric
  - `get_session_frequency()` - Average sessions
  - `get_feature_diversity()` - Feature usage diversity

- **Visualizations**:
  - Gauge: Engagement score
  - Line chart: Engagement trend
  - Bar chart: Feature diversity

- **UI Section**: `show_business_engagement_health()`

---

#### 3.5 Section 5: Business KPIs

**3.5.1 Revenue Metrics (if applicable)**
- **New Functions to Create**:
  - `get_revenue_metrics()` - Total revenue, ARPU, LTV
  - `get_revenue_growth()` - MoM growth

- **Visualizations**:
  - KPI cards: Revenue metrics
  - Line chart: Revenue trend

- **UI Section**: `show_business_revenue_metrics()`

**3.5.2 Growth Metrics**
- **New Functions to Create**:
  - `get_growth_metrics()` - User, engagement, feature growth

- **Visualizations**:
  - KPI cards: Growth rates
  - Line chart: Growth trends

- **UI Section**: `show_business_growth_metrics()`

---

### Phase 4: UI/UX Enhancements

#### 4.1 Developer Dashboard Features
- **Real-time Updates**: Auto-refresh toggle (5-15 min intervals)
- **Detailed Filters**:
  - Date range picker (custom + presets)
  - User status filter (multi-select)
  - Platform filter
  - Feature filter
- **Export Capabilities**: CSV/Excel export buttons for all tables
- **Drill-down**: Click charts to see detailed breakdowns
- **User Lookup**: Search individual users by email/ID
- **Alert System**: Visual indicators for anomalies

#### 4.2 Business Dashboard Features
- **Daily Updates**: Refresh indicator (last update time)
- **High-Level Filters**:
  - Date range (preset: Today, Week, Month, Quarter)
  - Comparison period toggle
- **Executive Summary**: Top 5-10 key metrics at top
- **Trend Indicators**: Up/down arrows with % change
- **Goal Tracking**: Compare against targets (if configured)
- **PDF Export**: Executive report generation

#### 4.3 Common UI Elements
- **Header**: Dashboard title + mode toggle + refresh button
- **Sidebar**: Settings, filters, dashboard info
- **Loading States**: Spinners for all data loads
- **Error Handling**: Graceful error messages
- **Empty States**: Helpful messages when no data

---

### Phase 5: Data Layer Organization

#### 5.1 Query Functions Organization
**Create new file**: `dashboard_queries.py`

**Structure**:
```python
# Acquisition queries
def get_daily_signups(...)
def get_signup_sources(...)
# ... etc

# Impression queries
def get_dau_wau_mau(...)
# ... etc

# Retention queries
def get_retention_by_cohort(...)
# ... etc

# Engagement queries
def get_daily_usage_intensity(...)
# ... etc

# Business queries (aggregated versions)
def get_acquisition_kpis(...)
# ... etc
```

#### 5.2 Caching Strategy
- Use `@st.cache_data` for expensive queries
- Cache duration: 5-15 min for Developer, 1 day for Business
- Invalidate on manual refresh
- Cache key includes: query + date_filter + mode

#### 5.3 Performance Optimization
- Add database indexes for common queries
- Use materialized views for complex aggregations
- Batch queries where possible
- Lazy load sections (load on expand)

---

### Phase 6: Implementation Order

#### Sprint 1: Foundation (Week 1)
1. ✅ Add dashboard mode toggle
2. ✅ Create router functions
3. ✅ Set up session state management
4. ✅ Create basic structure for both dashboards

#### Sprint 2: Developer Dashboard - Acquisition (Week 2)
1. ✅ Implement signup analytics
2. ✅ Implement referral system metrics
3. ✅ Implement trial user metrics
4. ✅ Create visualizations

#### Sprint 3: Developer Dashboard - Impression & Retention (Week 3)
1. ✅ Implement active user metrics
2. ✅ Implement feature usage metrics
3. ✅ Enhance retention analysis
4. ✅ Implement subscription retention

#### Sprint 4: Developer Dashboard - Engagement & Technical (Week 4)
1. ✅ Implement usage intensity metrics
2. ✅ Implement feature engagement
3. ✅ Implement context/personalization
4. ✅ Implement technical metrics

#### Sprint 5: Business Dashboard (Week 5)
1. ✅ Implement all business overview sections
2. ✅ Create KPI cards with trend indicators
3. ✅ Implement executive summary
4. ✅ Add comparison period functionality

#### Sprint 6: Polish & Optimization (Week 6)
1. ✅ Add export functionality
2. ✅ Implement caching
3. ✅ Add error handling
4. ✅ Performance optimization
5. ✅ Documentation

---

### Phase 7: File Structure

```
DashBoard/
├── simple_dashboard.py          # Main dashboard file (refactor)
├── database.py                  # Database manager (existing)
├── dashboard_queries.py         # All query functions (new)
├── dashboard_components.py      # Reusable UI components (new)
│   ├── kpi_card()
│   ├── trend_indicator()
│   ├── date_filter()
│   └── export_button()
├── developer_dashboard.py       # Developer dashboard renderer (new)
│   ├── render_developer_dashboard()
│   ├── show_acquisition_section()
│   ├── show_impression_section()
│   ├── show_retention_section()
│   ├── show_engagement_section()
│   └── show_technical_section()
├── business_dashboard.py        # Business dashboard renderer (new)
│   ├── render_business_dashboard()
│   ├── show_acquisition_overview()
│   ├── show_impression_overview()
│   ├── show_retention_overview()
│   ├── show_engagement_overview()
│   └── show_business_kpis()
└── utils/
    ├── date_utils.py            # Date filtering utilities
    ├── chart_utils.py           # Chart creation helpers
    └── export_utils.py          # Export functionality
```

---

### Phase 8: Key Implementation Details

#### 8.1 Toggle Implementation
```python
# In main() function
col1, col2, col3 = st.columns([3, 1, 1])

with col1:
    st.markdown('<h1 class="main-header">📊 Analytics Dashboard</h1>', unsafe_allow_html=True)

with col2:
    dashboard_mode = st.radio(
        "",
        ["Developer", "Business"],
        horizontal=True,
        key="dashboard_mode",
        label_visibility="collapsed",
        index=0 if st.session_state.get('dashboard_mode') != 'Business' else 1
    )

with col3:
    if st.button("🔄 Refresh"):
        st.cache_data.clear()
        st.rerun()
```

#### 8.2 Router Function
```python
def render_dashboard_by_mode():
    """Route to appropriate dashboard based on mode."""
    mode = st.session_state.get('dashboard_mode', 'Developer')
    
    if mode == 'Developer':
        render_developer_dashboard()
    else:
        render_business_dashboard()
```

#### 8.3 Date Filter Component
```python
def get_date_filter(mode='Developer'):
    """Get date filter based on dashboard mode."""
    if mode == 'Business':
        preset = st.selectbox(
            "Time Period",
            ["Today", "This Week", "This Month", "This Quarter", "Custom"],
            key="business_date_preset"
        )
        # Return appropriate date range
    else:
        # Developer mode: more granular options
        preset = st.selectbox(
            "Date Range",
            ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Last 90 Days", "All Time", "Custom"],
            key="developer_date_preset"
        )
        # Return appropriate date range
```

#### 8.4 KPI Card Component
```python
def kpi_card(title, value, change=None, trend=None, icon="📊"):
    """Create a KPI card with optional trend indicator."""
    col1, col2 = st.columns([1, 3])
    with col1:
        st.markdown(f"### {icon}")
    with col2:
        st.metric(
            label=title,
            value=value,
            delta=change if change else None
        )
        if trend:
            st.caption(f"Trend: {trend}")
```

---

### Phase 9: Testing Checklist

#### 9.1 Functional Testing
- [ ] Toggle switches between modes correctly
- [ ] All sections load without errors
- [ ] Date filters work correctly
- [ ] Export functions work
- [ ] Refresh clears cache
- [ ] Empty states display correctly
- [ ] Error handling works

#### 9.2 Data Validation
- [ ] All queries return correct data
- [ ] Calculations are accurate
- [ ] Aggregations match source data
- [ ] Date ranges filter correctly
- [ ] Null values handled gracefully

#### 9.3 Performance Testing
- [ ] Dashboard loads in < 10 seconds
- [ ] Caching works effectively
- [ ] No memory leaks
- [ ] Database queries optimized

#### 9.4 UI/UX Testing
- [ ] Responsive layout
- [ ] Charts render correctly
- [ ] Filters update data
- [ ] Loading states visible
- [ ] Error messages clear

---

### Phase 10: Documentation

#### 10.1 Code Documentation
- Docstrings for all functions
- Inline comments for complex logic
- Type hints where applicable

#### 10.2 User Documentation
- Dashboard user guide
- Metric definitions
- How to use filters
- Export instructions

#### 10.3 Developer Documentation
- Architecture overview
- Adding new metrics guide
- Query optimization guide
- Deployment instructions

---

## Summary

### Key Deliverables
1. **Toggle Mechanism**: Seamless switching between Developer and Business views
2. **Developer Dashboard**: 5 detailed sections (Acquisition, Impression, Retention, Engagement, Technical)
3. **Business Dashboard**: 5 high-level overview sections with KPIs
4. **Reusable Components**: KPI cards, filters, export functions
5. **Performance**: Cached queries, optimized database access
6. **Documentation**: Complete user and developer guides

### Estimated Timeline
- **Total Duration**: 6 weeks
- **Team Size**: 1-2 developers
- **Complexity**: Medium-High

### Success Criteria
- ✅ Toggle works smoothly
- ✅ All metrics display correctly
- ✅ Dashboard loads in < 10 seconds
- ✅ Export functionality works
- ✅ No data discrepancies
- ✅ User-friendly interface

---

*This plan is based on the current Streamlit implementation and the comprehensive dashboard requirements document.*

