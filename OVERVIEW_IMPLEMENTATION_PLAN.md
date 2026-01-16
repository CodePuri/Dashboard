# Overview Dashboard Enhancement - Implementation Plan

## 🎯 Goal

Add 8 YC-inspired metrics to existing Overview Dashboard to answer "Are we winning?" while maintaining diagnostic depth.

## 📊 Metrics to Implement

### Phase 1: Enhanced Existing Metrics (Quick Wins)

1. **Failed Prompts** - Total - Enhanced
2. **Top 5 Power Users** - Expandable table
3. **Top 5 Slowest Prompts** - Expandable table
4. **Time Saved** - Typing time calculation
5. **Word Comparison** - Replace box plot with bars
6. **User Lifetime Statistics** - Avg Lifetime Prompts/User & Distribution Chart

### Phase 2: New Growth Metrics

7. **Weekly Active Users (WAU)** - Last 7 days unique users
8. **Power User Conversion Rate** - % becoming power users
9. **Enhancements per WAU** - Avg prompts per weekly user

### Phase 3: New Quality & Retention Metrics

10. **Day 7 Natural Retention** - Cohort retention
11. **Refine Rate** - % getting refined

---

## 🔧 Proposed Changes

### A. Data Processing (`overview_dashboard.py`)

#### New Helper Functions

```python
def calculate_failed_prompts(df):
    """Calculate failed prompts = total - enhanced"""
    total = len(df)
    enhanced = df['has_enhancement'].sum()
    failed = total - enhanced
    failure_rate = (failed / total * 100) if total > 0 else 0
    return failed, failure_rate

def calculate_time_saved(df):
    """Calculate typing time saved based on 40 words/min"""
    df = df[df['has_enhancement'] == True].copy()
    extra_words = df['enhanced_prompt_word_count'] - df['user_prompt_word_count']
    time_per_prompt = extra_words / 40  # minutes
    total_time_minutes = time_per_prompt.sum()
    hours = total_time_minutes / 60
    return hours

def get_top_power_users(df, n=5):
    """Get top N power users with their best prompts"""
    user_stats = df.groupby('user_id').agg({
        'prompt_id': 'count',
        'enhancement_ratio': 'max',
        'enhanced_prompt_length': 'max'
    }).reset_index()

    user_stats.columns = ['user_id', 'total_prompts', 'best_ratio', 'max_length']
    top_users = user_stats.nlargest(n, 'total_prompts')

    # Get best prompt for each user
    result = []
    for _, user in top_users.iterrows():
        user_prompts = df[df['user_id'] == user['user_id']]
        best_prompt = user_prompts.nlargest(1, 'enhancement_ratio').iloc[0]
        result.append({
            'user_id': user['user_id'],
            'total_prompts': user['total_prompts'],
            'best_prompt': best_prompt['user_prompt'][:50] + '...',
            'quality_score': best_prompt['enhancement_ratio']
        })
    return pd.DataFrame(result)

def get_slowest_prompts(df, n=5):
    """Get N slowest processing prompts"""
    slowest = df.nlargest(n, 'processing_time')[
        ['processing_time', 'user_prompt', 'domain', 'complexity', 'prompt_created_at']
    ].copy()
    slowest['user_prompt'] = slowest['user_prompt'].str[:50] + '...'
    return slowest

def calculate_wau_metrics(df):
    """Calculate WAU, power user conversion, enhancements per WAU"""
    # Get last 7 days
    cutoff = datetime.now() - timedelta(days=7)
    recent = df[df['prompt_created_at'] >= cutoff]

    wau = recent['user_id'].nunique()
    enhancements_per_wau = len(recent) / wau if wau > 0 else 0

    # Power user conversion
    user_counts = recent.groupby('user_id').size()
    power_users = (user_counts >= 21).sum()
    conversion_rate = (power_users / wau * 100) if wau > 0 else 0

    return wau, enhancements_per_wau, conversion_rate

def calculate_day_7_retention(df):
    """Calculate Day 7 retention by cohort"""
    # Group by first prompt date
    df['first_prompt_date'] = df.groupby('user_id')['prompt_created_at'].transform('min')
    df['days_since_first'] = (df['prompt_created_at'] - df['first_prompt_date']).dt.days

    # Get users who had first prompt 7+ days ago
    eligible_users = df[df['first_prompt_date'] <= datetime.now() - timedelta(days=7)]['user_id'].unique()

    # Check who came back on day 7
    retained = df[(df['user_id'].isin(eligible_users)) & (df['days_since_first'] == 7)]['user_id'].nunique()

    retention_rate = (retained / len(eligible_users) * 100) if len(eligible_users) > 0 else 0
    return retention_rate

def calculate_quality_metrics(df):
    """Calculate intent classification rate and retry rate"""
    # Retry rate - need to check if prompt was refined
    retry_rate = 0  # Placeholder - implement after checking database
    return retry_rate
```

#### Update `render_overview_dashboard()`

**Add to Key Metrics section:**

```python
# Failed Prompts
failed, failure_rate = calculate_failed_prompts(df)
with col3:  # Assuming we have a col3
    st.metric("Failed Prompts", f"{failed:,} ({failure_rate:.1f}%)")

# Time Saved - add as hero metric at top
time_saved_hours = calculate_time_saved(df)
st.metric("⏱️ Time Saved", f"{time_saved_hours:.1f} hours")
```

**Add expandable sections:**

```python
# Under Unique Users
with st.expander("👑 Top 5 Power Users"):
    top_users = get_top_power_users(df)
    st.dataframe(top_users, use_container_width=True)

# Under Avg Processing Time
with st.expander("🐌 Top 5 Slowest Prompts"):
    slowest = get_slowest_prompts(df)
    st.dataframe(slowest, use_container_width=True)

# User Lifetime Statistics (New Section)
st.subheader("👥 User Lifetime Engagement")
try:
    lifetime_query = "SELECT user_id, COUNT(*) as lifetime_count FROM user_prompts GROUP BY user_id"
    lifetime_df = db_manager.execute_query(lifetime_query)

    if not lifetime_df.empty:
        avg_lifetime = lifetime_df['lifetime_count'].mean()
        col1, col2 = st.columns([1, 2])
        with col1:
            st.metric("Avg Lifetime Prompts / User", f"{avg_lifetime:.1f}")
        with col2:
            fig = px.histogram(
                lifetime_df, x='lifetime_count', nbins=20,
                title="Distribution of Lifetime Prompts per User",
                labels={'lifetime_count': 'Total Prompts'},
                color_discrete_sequence=['#9467bd']
            )
            fig.update_layout(height=250, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
except Exception as e:
    st.error(f"Failed to load lifetime stats: {e}")
```

**Add new metrics section:**

```python
# WAU Metrics
wau, enhancements_per_wau, power_conversion = calculate_wau_metrics(df)
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Weekly Active Users", f"{wau:,}")
with col2:
    st.metric("Enhancements per WAU", f"{enhancements_per_wau:.1f}")
with col3:
    st.metric("Power User Conversion", f"{power_conversion:.1f}%")

# Quality & Retention
retry_rate = calculate_quality_metrics(df)
day_7_retention = calculate_day_7_retention(df)
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Day 7 Retention", f"{day_7_retention:.1f}%")
with col2:
    st.metric("Refine Rate", f"{retry_rate:.1f}%")
```

**Replace enhancement ratio box plot:**

```python
# Word Comparison Visualization
st.subheader("📝 Enhancement Impact")
avg_user_words = df['user_prompt_word_count'].mean()
avg_enhanced_words = df['enhanced_prompt_word_count'].mean()
multiplier = avg_enhanced_words / avg_user_words if avg_user_words > 0 else 0

# Create horizontal bar comparison
fig = go.Figure()
fig.add_trace(go.Bar(
    y=['User Prompts', 'Enhanced Prompts'],
    x=[avg_user_words, avg_enhanced_words],
    orientation='h',
    marker_color=['#3b82f6', '#10b981'],
    text=[f'{avg_user_words:.0f} words', f'{avg_enhanced_words:.0f} words'],
    textposition='auto'
))
fig.update_layout(
    title=f"Enhancement Multiplier: {multiplier:.1f}x",
    xaxis_title="Average Word Count",
    height=200
)
st.plotly_chart(fig, use_container_width=True)
```

---

## ✅ Verification Plan

### Manual Testing Steps

**Test 1: Verify All New Metrics Display**

1. Start dashboard: `cd c:\Users\rinip\Totem\DashBoard && .\start_dashboard.bat`
2. Open browser: http://localhost:8501
3. Click "Overview" tab
4. Verify presence of:
   - [ ] Failed Prompts metric with percentage
   - [ ] Time Saved metric in hours
   - [ ] Lifetime Prompts Stats section
   - [ ] Weekly Active Users metric
   - [ ] Enhancements per WAU metric
   - [ ] Power User Conversion metric
   - [ ] Day 7 Retention metric
   - [ ] Refine Rate metric

**Test 2: Verify Expandable Tables**

1. In Overview dashboard
2. Click "Top 5 Power Users" expander
3. Verify table shows: User ID, Total Prompts, Best Prompt, Quality Score
4. Click "Top 5 Slowest Prompts" expander
5. Verify table shows: Processing Time, Prompt, Domain, Complexity, Date

**Test 3: Verify Word Comparison Visual**

1. Scroll to Prompt Length Analytics section
2. Verify horizontal bar chart showing:
   - User Prompts bar with word count
   - Enhanced Prompts bar with word count
   - Enhancement multiplier in title (e.g., "3.5x")

**Test 4: Verify Date Filter Works**

1. Change date filter from "Last 7 Days" to "Last 30 Days"
2. Verify all metrics update
3. Verify WAU changes appropriately
4. Change to "All Time"
5. Verify metrics update again

**Test 5: Verify Calculations**

1. Note Total Prompts value (e.g., 1000)
2. Note Enhanced Prompts value (e.g., 970)
3. Verify Failed Prompts = Total - Enhanced (e.g., 30)
4. Verify failure rate = (30/1000) \* 100 = 3.0%

---

## 📋 Implementation Phases

**Phase 1 (1-2 hours):**

- Add Failed Prompts
- Add Time Saved
- Add Top 5 Power Users
- Add Top 5 Slowest Prompts
- Add User Lifetime Statistics
- Replace box plot with word comparison

**Phase 2 (1 hour):**

- Add WAU metric
- Add Enhancements per WAU
- Add Power User Conversion Rate

**Phase 3 (1-2 hours):**

- Add Day 7 Retention
- Add Refine Rate

**Total Estimated Time:** 3-5 hours

---

## 🚨 Risks & Considerations

1. **Day 7 Retention:** Requires enough historical data (7+ days). May show 0% for new deployments.
2. **Refine Rate:** Needs access to data to see if prompt was refined.
3. **Performance:** Adding metrics may slow dashboard load.
4. **Lifetime Stats:** Separate query required, might be slow on huge datasets (but fine for current scale).

---

## ✅ Ready for Review

This plan adds 9 new/enhanced metrics including User Lifetime Stats.
