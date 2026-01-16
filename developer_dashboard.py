"""
Developer Dashboard - Detailed technical metrics and analytics.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import logging

# Theme management
from theme_utils import (
    is_dark_mode,
    get_theme_colors,
    get_plotly_template,
    get_plotly_layout_overrides,
    apply_theme_to_figure
)

logger = logging.getLogger(__name__)

# Import database manager
try:
    from database import db_manager
    DATABASE_AVAILABLE = db_manager is not None and (hasattr(db_manager, 'is_configured') and db_manager.is_configured)
except Exception as e:
    logger.error(f"Database import failed: {e}")
    db_manager = None
    DATABASE_AVAILABLE = False

# Import query functions
try:
    from dashboard_queries import (
        # Acquisition
        get_daily_signups, get_signup_sources, get_onboarding_completion,
        get_trial_starts, get_user_status_transitions,
        # Impression
        get_dau_wau_mau, get_user_activity_patterns, get_feature_usage_counts,
        get_feature_adoption_rate,
        # Retention
        get_retention_by_cohort, get_churn_analysis_detailed,
        get_subscription_metrics, get_lifecycle_distribution,
        # Engagement
        get_daily_usage_intensity, get_token_consumption,
        get_prompt_generation_metrics, get_context_creation_metrics,
        # Prompt Data
        get_prompt_reviews,
        # Database Tables Data
        get_user_table_data, get_user_prompts_data, get_enhanced_prompts_data,
        get_refined_prompts_data, get_user_status_data, get_onboarding_data
    )
except ImportError as e:
    logger.error(f"Failed to import query functions: {e}")
    DATABASE_AVAILABLE = False


def render_developer_dashboard():
    """
    Render the complete Developer Dashboard with all sections.
    """
    st.markdown('<h2 class="section-header">👨‍💻 Developer Dashboard</h2>', unsafe_allow_html=True)
    
    # Get date filter
    from dashboard_components import date_filter
    preset, start_date, end_date = date_filter("Developer")
    
    # Section 1: Database Tables Overview
    with st.expander("🗄️ Section 1: Database Tables Overview", expanded=True):
        show_database_tables_section(start_date, end_date)
    
    # Section 2: Acquisition Metrics
    with st.expander("📈 Section 2: Acquisition Metrics (Detailed)", expanded=True):
        show_acquisition_section(start_date, end_date)
    
    # Section 3: Impression Metrics
    with st.expander("👁️ Section 3: Impression Metrics (Detailed)", expanded=True):
        show_impression_section(start_date, end_date)
    
    # Section 4: Retention Metrics
    with st.expander("🔄 Section 4: Retention Metrics (Detailed)", expanded=True):
        show_retention_section(start_date, end_date)
    
    # Section 5: Engagement Metrics
    with st.expander("⚡ Section 5: Engagement Metrics (Detailed)", expanded=True):
        show_engagement_section(start_date, end_date)


def show_acquisition_section(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show detailed acquisition metrics."""
    
    # 1.1 User Signup Analytics
    st.markdown("### 1.1 User Signup Analytics")
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display signup analytics.")
        return
    
    # Daily signups with auth method breakdown
    with st.spinner("Loading signup analytics..."):
        signups_df = get_daily_signups(start_date, end_date)
        
        if not signups_df.empty:
            # KPI Cards
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                total_signups = int(signups_df['total_signups'].sum())
                st.metric("Total Signups", f"{total_signups:,}",
                        help="Total number of user signups in the selected period (sum of all daily signups)")
            with col2:
                oauth_signups = int(signups_df['oauth_signups'].sum())
                st.metric("OAuth Signups", f"{oauth_signups:,}",
                        help="Total signups using OAuth authentication method (sum of daily OAuth signups)")
            with col3:
                email_signups = int(signups_df['email_signups'].sum())
                st.metric("Email Signups", f"{email_signups:,}",
                        help="Total signups using email authentication method (sum of daily email signups)")
            with col4:
                avg_daily = round(signups_df['total_signups'].mean(), 1) if len(signups_df) > 0 else 0
                st.metric("Avg Daily Signups", f"{avg_daily}",
                        help="Average number of signups per day. Formula: Total signups / Number of days in period")
            
            st.markdown("---")
            
            # Charts
            col1, col2 = st.columns(2)
            
            with col1:
                # Line chart: Signups over time
                fig = go.Figure()
                fig.add_trace(go.Scatter(
                    x=signups_df['signup_date'],
                    y=signups_df['total_signups'],
                    mode='lines+markers',
                    name='Total Signups',
                    line=dict(color='#1f77b4', width=2)
                ))
                fig.add_trace(go.Scatter(
                    x=signups_df['signup_date'],
                    y=signups_df['oauth_signups'],
                    mode='lines+markers',
                    name='OAuth Signups',
                    line=dict(color='#ff7f0e', width=2)
                ))
                fig.add_trace(go.Scatter(
                    x=signups_df['signup_date'],
                    y=signups_df['email_signups'],
                    mode='lines+markers',
                    name='Email Signups',
                    line=dict(color='#2ca02c', width=2)
                ))
                fig.update_layout(
                    title="Daily Signups Over Time",
                    xaxis_title="Date",
                    yaxis_title="Number of Signups",
                    hovermode='x unified',
                    height=400
                )
                st.plotly_chart(fig, width="stretch")
            
            with col2:
                # Pie chart: Signup method distribution
                method_data = pd.DataFrame({
                    'Method': ['OAuth', 'Email'],
                    'Count': [oauth_signups, email_signups]
                })
                fig = px.pie(
                    method_data,
                    values='Count',
                    names='Method',
                    title="Signup Method Distribution",
                    color_discrete_map={'OAuth': '#ff7f0e', 'Email': '#2ca02c'}
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, width="stretch")
            
            # Cumulative signups
            st.markdown("#### Cumulative Signup Growth")
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=signups_df['signup_date'],
                y=signups_df['cumulative_signups'],
                mode='lines',
                name='Cumulative Signups',
                fill='tozeroy',
                line=dict(color='#1f77b4', width=3)
            ))
            fig.update_layout(
                title="Cumulative Signup Growth",
                xaxis_title="Date",
                yaxis_title="Cumulative Signups",
                hovermode='x unified',
                height=400
            )
            st.plotly_chart(fig, width="stretch")
            
            # Data table
            with st.expander("📊 View Raw Data"):
                from dashboard_components import export_button
                st.dataframe(signups_df, width="stretch", hide_index=True)
                export_button(signups_df, "daily_signups", "csv")
        else:
            st.info("No signup data available for the selected date range.")
    
    # Signup sources
    st.markdown("#### Signup Sources")
    with st.spinner("Loading signup sources..."):
        sources_df = get_signup_sources(start_date, end_date)
        
        if not sources_df.empty:
            col1, col2 = st.columns([2, 1])
            
            with col1:
                # Bar chart: Signup sources
                fig = px.bar(
                    sources_df,
                    x='source',
                    y='signup_count',
                    title="Signups by Source",
                    labels={'source': 'Source', 'signup_count': 'Number of Signups'},
                    color='signup_count',
                    color_continuous_scale='Blues'
                )
                fig.update_layout(height=400, xaxis_tickangle=-45)
                st.plotly_chart(fig, width="stretch")
            
            with col2:
                st.dataframe(sources_df, width="stretch", hide_index=True)
        else:
            st.info("No signup source data available.")
    
    # Onboarding completion
    st.markdown("#### Onboarding Completion")
    with st.spinner("Loading onboarding completion..."):
        onboarding_metrics = get_onboarding_completion(start_date, end_date)
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Signups", f"{onboarding_metrics['total_signups']:,}",
                    help="Total number of user signups in the selected period (from usertable)")
        with col2:
            st.metric("Completed", f"{onboarding_metrics['completed_onboarding']:,}",
                    help="Number of users who completed the onboarding process (from onboarding_data table)")
        with col3:
            st.metric("Incomplete", f"{onboarding_metrics['incomplete_onboarding']:,}",
                    help="Number of users who signed up but did not complete onboarding. Formula: Total signups - Completed")
        with col4:
            st.metric("Completion Rate", f"{onboarding_metrics['completion_rate']:.1f}%",
                    help="Onboarding completion percentage. Formula: (Completed onboarding / Total signups) × 100")
        
        # Funnel chart
        fig = go.Figure(go.Funnel(
            y=["Total Signups", "Completed Onboarding"],
            x=[onboarding_metrics['total_signups'], onboarding_metrics['completed_onboarding']],
            textposition="inside",
            textinfo="value+percent initial"
        ))
        fig.update_layout(
            title="Onboarding Completion Funnel",
            height=300
        )
        st.plotly_chart(fig, width="stretch")
    
    st.markdown("---")
    
    # 1.2 Trial & Free User Acquisition
    st.markdown("### 1.3 Trial & Free User Acquisition")
    
    # Trial starts
    st.markdown("#### Daily Trial Activations")
    with st.spinner("Loading trial starts..."):
        trial_df = get_trial_starts(start_date, end_date)
        
        if not trial_df.empty:
            col1, col2 = st.columns(2)
            
            with col1:
                total_trials = int(trial_df['trial_starts'].sum())
                st.metric("Total Trial Starts", f"{total_trials:,}",
                        help="Total number of trial activations in the selected period. Sum of daily trial starts from userstatus table where has_used_trial=true")
            
            with col2:
                avg_daily_trials = round(trial_df['trial_starts'].mean(), 1) if len(trial_df) > 0 else 0
                st.metric("Avg Daily Trials", f"{avg_daily_trials}",
                        help="Average number of trial activations per day. Formula: Total trial starts / Number of days in period")
            
            # Trial starts chart
            fig = px.bar(
                trial_df,
                x='trial_date',
                y='trial_starts',
                title="Daily Trial Starts",
                labels={'trial_date': 'Date', 'trial_starts': 'Number of Trials'},
                color='trial_starts',
                color_continuous_scale='Oranges'
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, width="stretch")
        else:
            st.info("No trial start data available.")
    
    # User status distribution
    st.markdown("#### User Status Distribution Over Time")
    with st.spinner("Loading user status transitions..."):
        status_df = get_user_status_transitions(start_date, end_date)
        
        if not status_df.empty:
            # Ensure status_date is datetime
            if 'status_date' in status_df.columns:
                status_df['status_date'] = pd.to_datetime(status_df['status_date'], errors='coerce')
                status_df = status_df.dropna(subset=['status_date'])
            
            # Ensure user_count is numeric
            if 'user_count' in status_df.columns:
                status_df['user_count'] = pd.to_numeric(status_df['user_count'], errors='coerce').fillna(0).astype(int)
            
            # Sort by date for proper chart rendering
            status_df = status_df.sort_values('status_date')
            
            if not status_df.empty:
                # Check if we have multiple dates for time series
                unique_dates = status_df['status_date'].nunique()
                
                if unique_dates > 1:
                    # Stacked area chart for time series
                    fig = px.area(
                        status_df,
                        x='status_date',
                        y='user_count',
                        color='status',
                        title="User Status Distribution Over Time",
                        labels={'status_date': 'Date', 'user_count': 'Number of Users', 'status': 'Status'},
                        line_group='status'
                    )
                    fig.update_layout(
                        height=400,
                        xaxis_title="Date",
                        yaxis_title="Number of Users",
                        hovermode='x unified'
                    )
                    st.plotly_chart(fig, width="stretch")
                else:
                    # Only one date - show as bar chart instead
                    st.info("ℹ️ Only one date of data available. Showing current status distribution.")
                    fig = px.bar(
                        status_df,
                        x='status',
                        y='user_count',
                        color='status',
                        title="Current User Status Distribution",
                        labels={'status': 'Status', 'user_count': 'Number of Users'},
                        color_discrete_map={
                            'free': '#1f77b4',
                            'freetrial': '#ff7f0e',
                            'pro': '#2ca02c'
                        }
                    )
                    fig.update_layout(
                        height=400,
                        xaxis_title="Status",
                        yaxis_title="Number of Users"
                    )
                    st.plotly_chart(fig, width="stretch")
                
                # Current status distribution
                if 'status_date' in status_df.columns and len(status_df) > 0:
                    latest_date = status_df['status_date'].max()
                    latest_status = status_df[status_df['status_date'] == latest_date]
                    
                    if not latest_status.empty:
                        fig = px.pie(
                            latest_status,
                            values='user_count',
                            names='status',
                            title=f"Current Status Distribution (as of {latest_date.strftime('%Y-%m-%d') if hasattr(latest_date, 'strftime') else latest_date})"
                        )
                        fig.update_layout(height=400)
                        st.plotly_chart(fig, width="stretch")
            else:
                st.warning("Data was loaded but became empty after processing. Check date formats.")
        else:
            st.info("No user status data available. The userstatus table may be empty or the date filter is too restrictive.")


def show_impression_section(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show detailed impression metrics."""
    
    # 2.1 Active User Metrics
    st.markdown("### 2.1 Active User Metrics")
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    with st.spinner("Loading active user metrics..."):
        try:
            dau_wau_mau = get_dau_wau_mau(start_date, end_date)
        except Exception as e:
            logger.error(f"Failed to load DAU/WAU/MAU metrics: {e}")
            dau_wau_mau = {'dau': 0, 'wau': 0, 'mau': 0, 'dau_mau_ratio': 0.0}
            st.warning("⚠️ Could not load active user metrics. Showing default values.")
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Daily Active Users (DAU)", f"{dau_wau_mau.get('dau', 0):,}",
                    help="Daily Active Users: Count of unique users with activity (prompt generation in save_enhance_prompt) on the current day (DATE(created_at) = CURRENT_DATE)")
        with col2:
            st.metric("Weekly Active Users (WAU)", f"{dau_wau_mau.get('wau', 0):,}",
                    help="Weekly Active Users: Count of unique users with activity in the last 7 days (created_at >= CURRENT_DATE - INTERVAL '7 days')")
        with col3:
            st.metric("Monthly Active Users (MAU)", f"{dau_wau_mau.get('mau', 0):,}",
                    help="Monthly Active Users: Count of unique users with activity in the last 30 days (created_at >= CURRENT_DATE - INTERVAL '30 days')")
        with col4:
            st.metric("Stickiness (DAU/MAU)", f"{dau_wau_mau.get('dau_mau_ratio', 0.0):.1f}%",
                    help="User stickiness metric. Formula: (DAU / MAU) × 100. Measures how frequently users return. Higher values indicate better engagement. Good: >20%, Excellent: >40%")
        
        # DAU/WAU/MAU trend chart
        st.markdown("#### Active Users Trend")
        activity_patterns = get_user_activity_patterns(start_date, end_date)
        
        if not activity_patterns.empty:
            # Create heatmap data
            heatmap_data = activity_patterns.pivot_table(
                values='active_users',
                index='day_name',
                columns='hour_of_day',
                aggfunc='mean',
                fill_value=0
            )
            
            fig = px.imshow(
                heatmap_data,
                labels=dict(x="Hour of Day", y="Day of Week", color="Active Users"),
                title="User Activity Heatmap (by Hour and Day)",
                color_continuous_scale='Blues'
            )
            fig.update_layout(height=500)
            st.plotly_chart(fig, width="stretch")
        else:
            st.info("No activity pattern data available.")
    
    st.markdown("---")
    
    # 2.2 Feature Impressions & Usage
    st.markdown("### 2.2 Feature Impressions & Usage")
    
    with st.spinner("Loading feature usage..."):
        feature_usage = get_feature_usage_counts(start_date, end_date)
        adoption_rates = get_feature_adoption_rate(start_date, end_date)
        
        if not feature_usage.empty:
            col1, col2 = st.columns(2)
            
            with col1:
                # Feature usage bar chart
                fig = px.bar(
                    feature_usage,
                    x='feature_name',
                    y='usage_count',
                    title="Feature Usage Counts",
                    labels={'feature_name': 'Feature', 'usage_count': 'Usage Count'},
                    color='feature_name',
                    color_discrete_map={'Enhance': '#1f77b4', 'Refine': '#ff7f0e'}
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, width="stretch")
            
            with col2:
                # Adoption rates
                adoption_df = pd.DataFrame({
                    'Feature': ['Enhance', 'Refine'],
                    'Adoption Rate (%)': [adoption_rates['enhance_adoption'], adoption_rates['refine_adoption']]
                })
                fig = px.bar(
                    adoption_df,
                    x='Feature',
                    y='Adoption Rate (%)',
                    title="Feature Adoption Rates",
                    color='Feature',
                    color_discrete_map={'Enhance': '#1f77b4', 'Refine': '#ff7f0e'}
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, width="stretch")
            
            st.dataframe(feature_usage, width="stretch", hide_index=True)
        else:
            # Show at least adoption rates even if usage counts are empty
            if adoption_rates['enhance_adoption'] > 0 or adoption_rates['refine_adoption'] > 0:
                adoption_df = pd.DataFrame({
                    'Feature': ['Enhance', 'Refine'],
                    'Adoption Rate (%)': [adoption_rates['enhance_adoption'], adoption_rates['refine_adoption']]
                })
                fig = px.bar(
                    adoption_df,
                    x='Feature',
                    y='Adoption Rate (%)',
                    title="Feature Adoption Rates",
                    color='Feature',
                    color_discrete_map={'Enhance': '#1f77b4', 'Refine': '#ff7f0e'}
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, width="stretch")
            else:
                st.info("No feature usage data available.")


def show_retention_section(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show detailed retention metrics."""
    
    # 3.1 User Retention Analysis
    st.markdown("### 3.1 User Retention Analysis")
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    with st.spinner("Loading retention analysis..."):
        cohort_df = get_retention_by_cohort(start_date, end_date)
        churn_data = get_churn_analysis_detailed(start_date, end_date)
        
        # Churn metrics
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Users", f"{churn_data['total_users']:,}",
                    help="Total count of all users in the system (from usertable)")
        with col2:
            st.metric("Active Users", f"{churn_data['active_users']:,}",
                    help="Users with activity in the last 30 days. Active = users with last_activity_date >= CURRENT_DATE - INTERVAL '30 days'")
        with col3:
            st.metric("Churned Users", f"{churn_data['churned_users']:,}",
                    help="Users who have churned. Churned = users with no activity (last_activity_date IS NULL) OR last activity > 30 days ago")
        with col4:
            st.metric("Churn Rate", f"{churn_data['churn_rate']:.2f}%",
                    help="Percentage of churned users. Formula: (Churned users / Total users) × 100. Lower is better")
        
        # Cohort retention table
        if not cohort_df.empty:
            st.markdown("#### Retention by Cohort")
            st.dataframe(cohort_df, width="stretch", hide_index=True)
            
            # Retention curve chart
            if 'cohort_week' in cohort_df.columns:
                fig = go.Figure()
                for idx, row in cohort_df.head(5).iterrows():
                    fig.add_trace(go.Scatter(
                        x=['Week 0', 'Week 1', 'Week 2', 'Week 3'],
                        y=[
                            row.get('week_0_retention', 0),
                            row.get('week_1_retention', 0),
                            row.get('week_2_retention', 0),
                            row.get('week_3_retention', 0)
                        ],
                        mode='lines+markers',
                        name=str(row['cohort_week'])[:10]
                    ))
                fig.update_layout(
                    title="Retention Curves by Cohort",
                    xaxis_title="Weeks Since Signup",
                    yaxis_title="Active Users",
                    height=400
                )
                st.plotly_chart(fig, width="stretch")
        else:
            st.info("No cohort retention data available.")
    
    st.markdown("---")
    
    # 3.2 Subscription Retention
    st.markdown("### 3.2 Subscription Retention")
    
    with st.spinner("Loading subscription metrics..."):
        sub_metrics = get_subscription_metrics(start_date, end_date)
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Active Subscriptions", f"{sub_metrics['active_subscriptions']:,}",
                    help="Count of active subscriptions (status = 'active' in subscriptions table)")
        with col2:
            st.metric("Trial Conversion Rate", f"{sub_metrics['trial_conversion_rate']:.2f}%",
                    help="Percentage of trial users who converted to paid. Formula: (Paid users / Trial users) × 100. Based on userstatus table where paid_count = users with status='pro' and trial_count = users with has_used_trial=true")
    
    st.markdown("---")
    
    # 3.3 User Lifecycle Stages
    st.markdown("### 3.3 User Lifecycle Stages")
    
    with st.spinner("Loading lifecycle distribution..."):
        lifecycle = get_lifecycle_distribution()
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("New Users", f"{lifecycle['new_users']:,}",
                    help="Users who signed up in the last 7 days (created_at >= CURRENT_DATE - INTERVAL '7 days')")
        with col2:
            st.metric("Active Users", f"{lifecycle['active_users']:,}",
                    help="Users with recent activity (last activity within last 7 days and not new). Active = last_activity_date >= CURRENT_DATE - INTERVAL '7 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'")
        with col3:
            st.metric("At-Risk Users", f"{lifecycle['at_risk_users']:,}",
                    help="Users with activity between 7-30 days ago (showing signs of disengagement). At-Risk = last_activity_date < CURRENT_DATE - INTERVAL '7 days' AND last_activity_date >= CURRENT_DATE - INTERVAL '30 days'")
        with col4:
            st.metric("Churned Users", f"{lifecycle['churned_users']:,}",
                    help="Users with no activity or activity > 30 days ago. Churned = last_activity_date IS NULL OR last_activity_date < CURRENT_DATE - INTERVAL '30 days'")
        
        # Lifecycle distribution pie chart
        lifecycle_df = pd.DataFrame({
            'Stage': ['New', 'Active', 'At-Risk', 'Churned'],
            'Count': [
                lifecycle['new_users'],
                lifecycle['active_users'],
                lifecycle['at_risk_users'],
                lifecycle['churned_users']
            ]
        })
        
        fig = px.pie(
            lifecycle_df,
            values='Count',
            names='Stage',
            title="User Lifecycle Distribution",
            color='Stage',
            color_discrete_map={
                'New': '#2ca02c',
                'Active': '#1f77b4',
                'At-Risk': '#ff7f0e',
                'Churned': '#d62728'
            }
        )
        fig.update_layout(height=400)
        st.plotly_chart(fig, width="stretch")


def show_engagement_section(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show detailed engagement metrics."""
    
    # 4.1 Usage Intensity
    st.markdown("### 4.1 Usage Intensity")
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    with st.spinner("Loading usage intensity..."):
        usage_df = get_daily_usage_intensity(start_date, end_date)
        
        if not usage_df.empty:
            col1, col2, col3 = st.columns(3)
            with col1:
                total_actions = int(usage_df['total_actions'].sum())
                st.metric("Total Actions", f"{total_actions:,}",
                        help="Total number of actions (prompt generations) in the selected period. Sum of all daily actions from save_enhance_prompt table")
            with col2:
                avg_daily = float(usage_df['avg_actions_per_user'].mean()) if len(usage_df) > 0 else 0.0
                st.metric("Avg Actions per User", f"{avg_daily:.2f}",
                        help="Average number of actions per active user per day. Formula: Mean of (total_actions / unique_users) across all days")
            with col3:
                peak_day = usage_df.loc[usage_df['total_actions'].idxmax()] if len(usage_df) > 0 else None
                if peak_day is not None:
                    st.metric("Peak Day Actions", f"{int(peak_day['total_actions']):,}",
                            help="Maximum number of actions recorded on a single day in the selected period")
            
            # Usage trend chart
            fig = px.line(
                usage_df,
                x='usage_date',
                y='total_actions',
                title="Daily Usage Trend",
                labels={'usage_date': 'Date', 'total_actions': 'Total Actions'},
                markers=True
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, width="stretch")
        else:
            st.info("No usage intensity data available.")
        
        # Token consumption (optional - only show if data exists)
        token_df = get_token_consumption(start_date, end_date)
        
        if not token_df.empty:
            st.markdown("#### Token Consumption")
            col1, col2 = st.columns(2)
            
            with col1:
                total_tokens = int(token_df['tokens_consumed'].sum())
                st.metric("Total Tokens Consumed", f"{total_tokens:,}",
                        help="Total tokens consumed across all AI transactions in the selected period. Sum of tokens from save_enhance_prompt metadata")
            
            with col2:
                avg_tokens = float(token_df['avg_tokens_per_transaction'].mean()) if len(token_df) > 0 else 0.0
                st.metric("Avg Tokens per Transaction", f"{avg_tokens:.2f}",
                        help="Average tokens consumed per transaction. Formula: Mean of (tokens_consumed / transaction_count) across all days")
            
            # Token consumption chart
            fig = px.bar(
                token_df,
                x='transaction_date',
                y='tokens_consumed',
                title="Daily Token Consumption",
                labels={'transaction_date': 'Date', 'tokens_consumed': 'Tokens Consumed'},
                color='tokens_consumed',
                color_continuous_scale='Viridis'
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, width="stretch")
    
    st.markdown("---")
    
    # 4.2 Feature Engagement
    st.markdown("### 4.2 Feature Engagement")
    
    with st.spinner("Loading feature engagement..."):
        try:
            prompt_metrics = get_prompt_generation_metrics(start_date, end_date)
        except Exception as e:
            logger.error(f"Failed to load prompt generation metrics: {e}")
            prompt_metrics = {'total_prompts': 0, 'unique_users': 0, 'prompts_per_user': 0.0}
            st.warning("⚠️ Could not load feature engagement metrics. Showing default values.")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Prompts", f"{prompt_metrics.get('total_prompts', 0):,}",
                    help="Total number of prompts generated in the selected period. Count of records in save_enhance_prompt table")
        with col2:
            st.metric("Unique Users", f"{prompt_metrics.get('unique_users', 0):,}",
                    help="Count of unique users who generated at least one prompt in the selected period. DISTINCT count of user_id from save_enhance_prompt")
        with col3:
            st.metric("Prompts per User", f"{prompt_metrics.get('prompts_per_user', 0.0):.2f}",
                    help="Average number of prompts generated per active user. Formula: Total prompts / Unique users who generated prompts")
    
    st.markdown("---")
    
    # 4.2.1 Prompt Reviews - Detailed Data
    st.markdown("### 4.2.1 Prompt Reviews & Details")
    st.info("📝 Relationship: user_prompts.prompt_id → save_enhance_prompt.prompt_id; refine_prompt links by prompt_id (primary) or enhanced_prompt_id (fallback).")
    
    with st.spinner("Loading prompt reviews..."):
        prompt_reviews = get_prompt_reviews(start_date, end_date)
        
        if not prompt_reviews.empty:
            # Summary metrics
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                total_reviews = len(prompt_reviews)
                st.metric("Total Entries", f"{total_reviews:,}")
            
            with col2:
                unique_users = prompt_reviews['user_name'].nunique() if 'user_name' in prompt_reviews.columns else 0
                st.metric("Unique Users", f"{unique_users}")
            
            with col3:
                if 'processing_time_ms' in prompt_reviews.columns:
                    avg_processing = prompt_reviews['processing_time_ms'].mean()
                    st.metric("Avg Processing Time", f"{avg_processing:.1f}ms")
                else:
                    st.metric("Avg Processing Time", "N/A")
            
            with col4:
                if 'created_at' in prompt_reviews.columns and len(prompt_reviews) > 0:
                    latest_date = prompt_reviews['created_at'].max()
                    if pd.notna(latest_date):
                        if hasattr(latest_date, 'strftime'):
                            st.metric("Latest Entry", latest_date.strftime('%Y-%m-%d'))
                        else:
                            st.metric("Latest Entry", str(latest_date)[:10])
                    else:
                        st.metric("Latest Entry", "N/A")
                else:
                    st.metric("Latest Entry", "N/A")
            
            st.markdown("---")
            
            # Format display dataframe
            display_df = prompt_reviews.copy()
            
            # Format datetime
            if 'created_at' in display_df.columns:
                try:
                    display_df['created_at'] = pd.to_datetime(display_df['created_at'], errors='coerce').dt.strftime('%Y-%m-%d %H:00')
                except Exception:
                    display_df['created_at'] = display_df['created_at'].astype(str)
            
            # Truncate long prompts for table display
            if 'prompt' in display_df.columns:
                display_df['prompt_preview'] = display_df['prompt'].astype(str).apply(
                    lambda x: x[:100] + "..." if len(str(x)) > 100 else str(x)
                )
            if 'enhanced_prompt' in display_df.columns:
                display_df['enhanced_preview'] = display_df['enhanced_prompt'].astype(str).apply(
                    lambda x: x[:100] + "..." if len(str(x)) > 100 else str(x)
                )
            if 'refined_prompt' in display_df.columns:
                display_df['refined_preview'] = display_df['refined_prompt'].astype(str).apply(
                    lambda x: x[:100] + "..." if len(str(x)) > 100 else str(x) if pd.notna(x) else ""
                )
            
            # Select columns for display
            display_cols = []
            col_mapping = {
                'user_name': 'User Name',
                'email': 'Email',
                'prompt_preview': 'Original Prompt',
                'enhanced_preview': 'Enhanced Prompt',
                'refined_preview': 'Refined Prompt',
                'domain': 'Domain',
                'intent': 'Intent',
                'llm_used': 'LLM Used',
                'mode': 'Mode',
                'user_status': 'User Status',
                'created_at': 'Created At',
                'processing_time_ms': 'Processing Time (ms)',
                'prompt_id': 'Prompt ID',
                'enhanced_prompt_id': 'Enhanced Prompt ID'
            }
            
            for col, display_name in col_mapping.items():
                if col in display_df.columns:
                    display_cols.append(col)
            
            if display_cols:
                display_df_final = display_df[display_cols].copy()
                display_df_final = display_df_final.rename(columns=col_mapping)
                
                # Show main table
                st.dataframe(display_df_final, width="stretch", hide_index=True)
            
            # Full details expander
            with st.expander("🔍 View Full Details of Recent Entries (Latest 10)", expanded=False):
                recent_reviews = prompt_reviews.head(10)
                for idx, row in recent_reviews.iterrows():
                    st.markdown(f"### Entry #{idx+1}")
                    
                    col_info1, col_info2 = st.columns(2)
                    with col_info1:
                        if 'user_name' in row and pd.notna(row['user_name']):
                            st.markdown(f"**User:** {row['user_name']}")
                        if 'email' in row and pd.notna(row['email']):
                            st.markdown(f"**Email:** {row['email']}")
                        if 'domain' in row and pd.notna(row['domain']):
                            st.markdown(f"**Domain:** {row['domain']}")
                        if 'intent' in row and pd.notna(row['intent']):
                            st.markdown(f"**Intent:** {row['intent']}")
                    
                    with col_info2:
                        if 'created_at' in row and pd.notna(row['created_at']):
                            created_str = str(row['created_at'])
                            if hasattr(row['created_at'], 'strftime'):
                                created_str = row['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                            st.markdown(f"**Created:** {created_str}")
                        if 'processing_time_ms' in row and pd.notna(row['processing_time_ms']):
                            st.markdown(f"**Processing Time:** {row['processing_time_ms']}ms")
                        if 'llm_used' in row and pd.notna(row['llm_used']):
                            st.markdown(f"**LLM Used:** {row['llm_used']}")
                        if 'mode' in row and pd.notna(row['mode']):
                            st.markdown(f"**Mode:** {row['mode']}")
                    
                    col_prompt1, col_prompt2 = st.columns(2)
                    
                    with col_prompt1:
                        st.markdown("**Original Prompt:**")
                        prompt_text = str(row.get('prompt', '')) if 'prompt' in row else ''
                        st.text_area(
                            f"Original {idx}",
                            value=prompt_text,
                            height=150,
                            disabled=True,
                            key=f"original_prompt_{idx}"
                        )
                    
                    with col_prompt2:
                        st.markdown("**Enhanced Prompt:**")
                        enhanced_text = str(row.get('enhanced_prompt', '')) if 'enhanced_prompt' in row else ''
                        st.text_area(
                            f"Enhanced {idx}",
                            value=enhanced_text,
                            height=150,
                            disabled=True,
                            key=f"enhanced_prompt_{idx}"
                        )
                    
                    if 'refined_prompt' in row and pd.notna(row['refined_prompt']) and str(row['refined_prompt']).strip():
                        st.markdown("**Refined Prompt:**")
                        refined_text = str(row['refined_prompt'])
                        st.text_area(
                            f"Refined {idx}",
                            value=refined_text,
                            height=150,
                            disabled=True,
                            key=f"refined_prompt_{idx}"
                        )
                    
                    st.markdown("---")
        else:
            st.warning("No prompt review data available for the selected date range.")
            st.info("💡 This section shows detailed prompt data from user_prompts, save_enhance_prompt, and refine_prompt tables.")
    
    st.markdown("---")
    
    # 4.3 Context & Personalization Engagement (optional - only show if data exists)
    context_df = get_context_creation_metrics(start_date, end_date)
    
    if not context_df.empty:
        st.markdown("### 4.3 Context & Personalization Engagement")
        with st.spinner("Loading context metrics..."):
            col1, col2 = st.columns(2)
            
            with col1:
                # Context creation by platform
                fig = px.bar(
                    context_df,
                    x='platform',
                    y='context_count',
                    title="Context Creation by Platform",
                    labels={'platform': 'Platform', 'context_count': 'Context Count'},
                    color='platform'
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, width="stretch")
            
            with col2:
                st.dataframe(context_df, width="stretch", hide_index=True)


def apply_filters_and_search(df: pd.DataFrame, filters: Dict, search_text: str, search_columns: List[str]) -> pd.DataFrame:
    """Apply filters and search to dataframe."""
    filtered_df = df.copy()
    
    # Apply filters (text-based, case-insensitive partial match)
    for col, value in filters.items():
        if col in filtered_df.columns and value:
            value_lower = str(value).lower()
            mask = filtered_df[col].astype(str).str.lower().str.contains(value_lower, na=False)
            filtered_df = filtered_df[mask]
    
    # Apply search
    if search_text:
        search_lower = search_text.lower()
        mask = pd.Series([False] * len(filtered_df))
        for col in search_columns:
            if col in filtered_df.columns:
                mask |= filtered_df[col].astype(str).str.lower().str.contains(search_lower, na=False)
        filtered_df = filtered_df[mask]
    
    return filtered_df


def show_database_tables_section(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show comprehensive overview of all database tables with easy-to-understand displays."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    # 1. User Table
    st.markdown("### 1. User Table (usertable)")
    
    with st.spinner("Loading user data..."):
        # Try with date filter first, fallback to all data if empty
        user_df = get_user_table_data(start_date, end_date, limit=0)
        if user_df.empty:
            user_df = get_user_table_data(None, None, limit=0)
        
        if not user_df.empty:
            # Filters in a single row
            st.markdown("#### 🔍 Filters")
            filter_row = st.columns(5)
            
            with filter_row[0]:
                # Date filter - Start
                table_start_date = st.date_input(
                    "Start Date",
                    value=user_df['created_at'].min().date() if 'created_at' in user_df.columns and not user_df['created_at'].isna().all() else None,
                    key="user_start_date"
                )
            
            with filter_row[1]:
                # Date filter - End
                table_end_date = st.date_input(
                    "End Date",
                    value=user_df['created_at'].max().date() if 'created_at' in user_df.columns and not user_df['created_at'].isna().all() else None,
                    key="user_end_date"
                )
            
            with filter_row[2]:
                # Auth method filter
                auth_filter = st.text_input("Auth Method", "", placeholder="OAuth/Email...", key="user_auth_filter")
            
            with filter_row[3]:
                # User ID filter
                user_id_filter = st.text_input("User ID", "", placeholder="Filter user_id...", key="user_id_filter")
            
            with filter_row[4]:
                # Search
                search_text = st.text_input("🔎 Search", "", placeholder="Search name, email...", key="user_search")
            
            # Apply date filter
            filtered_df = user_df.copy()
            if 'created_at' in filtered_df.columns:
                if table_start_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date >= table_start_date]
                if table_end_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date <= table_end_date]
            
            # Apply text filters
            filters = {}
            if auth_filter and 'auth_method' in filtered_df.columns:
                filters['auth_method'] = auth_filter
            if user_id_filter and 'user_id' in filtered_df.columns:
                filters['user_id'] = user_id_filter
            
            # Apply all filters
            filtered_df = apply_filters_and_search(
                filtered_df,
                filters,
                search_text,
                ['name', 'email']
            )
            
            # Metrics
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Total Users", f"{len(filtered_df):,}", delta=f"{len(user_df):,} total" if len(filtered_df) != len(user_df) else None)
            with col2:
                oauth_count = len(filtered_df[filtered_df['auth_method'] == 'OAuth']) if 'auth_method' in filtered_df.columns else 0
                st.metric("OAuth Users", f"{oauth_count:,}")
            with col3:
                email_count = len(filtered_df[filtered_df['auth_method'] == 'Email']) if 'auth_method' in filtered_df.columns else 0
                st.metric("Email Users", f"{email_count:,}")
            with col4:
                if 'created_at' in filtered_df.columns:
                    latest_signup = filtered_df['created_at'].max()
                    if pd.notna(latest_signup):
                        st.metric("Latest Signup", latest_signup.strftime('%Y-%m-%d') if hasattr(latest_signup, 'strftime') else str(latest_signup)[:10])
                    else:
                        st.metric("Latest Signup", "N/A")
                else:
                    st.metric("Latest Signup", "N/A")
            
            # Charts and Data together
            col_chart, col_table = st.columns([1, 1])
            
            with col_chart:
                # Auth method distribution
                if 'auth_method' in filtered_df.columns and len(filtered_df) > 0:
                    auth_dist = filtered_df['auth_method'].value_counts()
                    fig = px.pie(
                        values=auth_dist.values,
                        names=auth_dist.index,
                        title="Authentication Method Distribution",
                        color_discrete_map={'OAuth': '#ff7f0e', 'Email': '#2ca02c', 'Unknown': '#d62728'}
                    )
                    fig.update_layout(height=400)
                    st.plotly_chart(fig, width="stretch")
            
            with col_table:
                # Data table
                display_cols = ['user_id', 'name', 'email', 'auth_method', 'created_at']
                display_cols = [c for c in display_cols if c in filtered_df.columns]
                st.dataframe(filtered_df[display_cols], width="stretch", hide_index=True, height=400)
        else:
            st.warning("No user data available. The usertable may be empty.")
    
    st.markdown("---")
    
    # 2. User Prompts Table
    st.markdown("### 2. User Prompts Table (user_prompts)")
    
    with st.spinner("Loading user prompts data..."):
        prompts_df = get_user_prompts_data(start_date, end_date, limit=0)
        if prompts_df.empty:
            prompts_df = get_user_prompts_data(None, None, limit=0)
        
        if not prompts_df.empty:
            # Filters in a single row
            st.markdown("#### 🔍 Filters")
            filter_row = st.columns(5)
            
            with filter_row[0]:
                table_start_date = st.date_input(
                    "Start Date",
                    value=prompts_df['created_at'].min().date() if 'created_at' in prompts_df.columns and not prompts_df['created_at'].isna().all() else None,
                    key="prompts_start_date"
                )
            
            with filter_row[1]:
                table_end_date = st.date_input(
                    "End Date",
                    value=prompts_df['created_at'].max().date() if 'created_at' in prompts_df.columns and not prompts_df['created_at'].isna().all() else None,
                    key="prompts_end_date"
                )
            
            with filter_row[2]:
                prompt_id_filter = st.text_input("Prompt ID", "", placeholder="Filter prompt_id...", key="prompts_prompt_id_filter")
            
            with filter_row[3]:
                user_id_filter = st.text_input("User ID", "", placeholder="Filter user_id...", key="prompts_user_id_filter")
            
            with filter_row[4]:
                search_text = st.text_input("🔎 Search", "", placeholder="Search prompt text...", key="prompts_search")
            
            # Apply date filter
            filtered_df = prompts_df.copy()
            if 'created_at' in filtered_df.columns:
                if table_start_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date >= table_start_date]
                if table_end_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date <= table_end_date]
            
            # Apply text filters
            filters = {}
            if prompt_id_filter and 'prompt_id' in filtered_df.columns:
                filters['prompt_id'] = prompt_id_filter
            if user_id_filter and 'user_id' in filtered_df.columns:
                filters['user_id'] = user_id_filter
            
            # Apply all filters
            filtered_df = apply_filters_and_search(
                filtered_df,
                filters,
                search_text,
                ['prompt_preview']
            )
            
            # Metrics
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Prompts", f"{len(filtered_df):,}", delta=f"{len(prompts_df):,} total" if len(filtered_df) != len(prompts_df) else None)
            with col2:
                unique_users = filtered_df['user_id'].nunique() if 'user_id' in filtered_df.columns else 0
                st.metric("Unique Users", f"{unique_users:,}")
            with col3:
                if 'prompt_length' in filtered_df.columns:
                    avg_length = filtered_df['prompt_length'].mean()
                    st.metric("Avg Prompt Length", f"{avg_length:.0f} chars")
                else:
                    st.metric("Avg Prompt Length", "N/A")
            
            # Charts and Data together
            col_chart, col_table = st.columns([1, 1])
            
            with col_chart:
                # Prompt length distribution
                if 'prompt_length' in filtered_df.columns and len(filtered_df) > 0:
                    fig = px.histogram(
                        filtered_df,
                        x='prompt_length',
                        nbins=20,
                        title="Prompt Length Distribution",
                        labels={'prompt_length': 'Prompt Length (characters)', 'count': 'Number of Prompts'}
                    )
                    fig.update_layout(height=400)
                    st.plotly_chart(fig, width="stretch")
            
            with col_table:
                # Data table
                display_cols = ['prompt_id', 'user_id', 'prompt_preview', 'prompt_length', 'created_at']
                display_cols = [c for c in display_cols if c in filtered_df.columns]
                st.dataframe(filtered_df[display_cols], width="stretch", hide_index=True, height=400)
        else:
            st.warning("No user prompts data available. The user_prompts table may be empty.")
    
    st.markdown("---")
    
    # 3. Enhanced Prompts Table
    st.markdown("### 3. Enhanced Prompts Table (save_enhance_prompt)")
    
    with st.spinner("Loading enhanced prompts data..."):
        enhanced_df = get_enhanced_prompts_data(start_date, end_date, limit=0)
        if enhanced_df.empty:
            enhanced_df = get_enhanced_prompts_data(None, None, limit=0)
        
        if not enhanced_df.empty:
            # Filters in a single row
            st.markdown("#### 🔍 Filters")
            filter_row = st.columns(6)
            
            with filter_row[0]:
                table_start_date = st.date_input(
                    "Start Date",
                    value=enhanced_df['created_at'].min().date() if 'created_at' in enhanced_df.columns and not enhanced_df['created_at'].isna().all() else None,
                    key="enhanced_start_date"
                )
            
            with filter_row[1]:
                table_end_date = st.date_input(
                    "End Date",
                    value=enhanced_df['created_at'].max().date() if 'created_at' in enhanced_df.columns and not enhanced_df['created_at'].isna().all() else None,
                    key="enhanced_end_date"
                )
            
            with filter_row[2]:
                llm_filter = st.text_input("LLM", "", placeholder="Filter llm_used...", key="enhanced_llm_filter")
            
            with filter_row[3]:
                domain_filter = st.text_input("Domain", "", placeholder="Filter domain...", key="enhanced_domain_filter")
            
            with filter_row[4]:
                mode_filter = st.text_input("Mode", "", placeholder="Filter mode...", key="enhanced_mode_filter")
            
            with filter_row[5]:
                search_text = st.text_input("🔎 Search", "", placeholder="Search ID, intent, prompt...", key="enhanced_search")
            
            # Apply date filter
            filtered_df = enhanced_df.copy()
            if 'created_at' in filtered_df.columns:
                if table_start_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date >= table_start_date]
                if table_end_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date <= table_end_date]
            
            # Apply text filters
            filters = {}
            if llm_filter and 'llm_used' in filtered_df.columns:
                filters['llm_used'] = llm_filter
            if domain_filter and 'domain' in filtered_df.columns:
                filters['domain'] = domain_filter
            if mode_filter and 'mode' in filtered_df.columns:
                filters['mode'] = mode_filter
            
            # Apply all filters
            filtered_df = apply_filters_and_search(
                filtered_df,
                filters,
                search_text,
                ['enhanced_prompt_id', 'prompt_id', 'user_id', 'intent', 'enhanced_prompt_preview']
            )
            
            # Metrics
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Total Enhanced", f"{len(filtered_df):,}", delta=f"{len(enhanced_df):,} total" if len(filtered_df) != len(enhanced_df) else None)
            with col2:
                if 'llm_used' in filtered_df.columns:
                    unique_llms = filtered_df['llm_used'].nunique()
                    st.metric("LLM Models Used", f"{unique_llms}")
                else:
                    st.metric("LLM Models Used", "N/A")
            with col3:
                if 'processing_time' in filtered_df.columns:
                    avg_time = filtered_df['processing_time'].mean()
                    st.metric("Avg Processing Time", f"{avg_time:.0f}ms")
                else:
                    st.metric("Avg Processing Time", "N/A")
            with col4:
                if 'domain' in filtered_df.columns:
                    unique_domains = filtered_df['domain'].nunique()
                    st.metric("Unique Domains", f"{unique_domains}")
                else:
                    st.metric("Unique Domains", "N/A")
            
            # Charts and Data together
            col_chart1, col_chart2 = st.columns(2)
            
            with col_chart1:
                # LLM usage distribution
                if 'llm_used' in filtered_df.columns and len(filtered_df) > 0:
                    llm_dist = filtered_df['llm_used'].value_counts().head(10)
                    fig = px.bar(
                        x=llm_dist.index,
                        y=llm_dist.values,
                        title="LLM Model Usage Distribution",
                        labels={'x': 'LLM Model', 'y': 'Usage Count'}
                    )
                    fig.update_layout(height=300, xaxis_tickangle=-45)
                    st.plotly_chart(fig, width="stretch")
            
            with col_chart2:
                # Domain distribution
                if 'domain' in filtered_df.columns and len(filtered_df) > 0:
                    domain_dist = filtered_df['domain'].value_counts().head(10)
                    fig = px.pie(
                        values=domain_dist.values,
                        names=domain_dist.index,
                        title="Top 10 Domain Distribution"
                    )
                    fig.update_layout(height=300)
                    st.plotly_chart(fig, width="stretch")
            
            # Data table
            display_cols = ['enhanced_prompt_id', 'prompt_id', 'user_id', 'enhanced_prompt_preview', 
                          'domain', 'intent', 'llm_used', 'mode', 'processing_time', 'created_at']
            display_cols = [c for c in display_cols if c in filtered_df.columns]
            st.dataframe(filtered_df[display_cols], width="stretch", hide_index=True)
        else:
            st.warning("No enhanced prompts data available. The save_enhance_prompt table may be empty.")
    
    st.markdown("---")
    
    # 4. Refined Prompts Table
    st.markdown("### 4. Refined Prompts Table (refine_prompt)")
    
    with st.spinner("Loading refined prompts data..."):
        refined_df = get_refined_prompts_data(start_date, end_date, limit=0)
        if refined_df.empty:
            refined_df = get_refined_prompts_data(None, None, limit=0)
        
        if not refined_df.empty:
            # Filters in a single row
            st.markdown("#### 🔍 Filters")
            filter_row = st.columns(5)
            
            with filter_row[0]:
                table_start_date = st.date_input(
                    "Start Date",
                    value=refined_df['created_at'].min().date() if 'created_at' in refined_df.columns and not refined_df['created_at'].isna().all() else None,
                    key="refined_start_date"
                )
            
            with filter_row[1]:
                table_end_date = st.date_input(
                    "End Date",
                    value=refined_df['created_at'].max().date() if 'created_at' in refined_df.columns and not refined_df['created_at'].isna().all() else None,
                    key="refined_end_date"
                )
            
            with filter_row[2]:
                refine_id_filter = st.text_input("Refine ID", "", placeholder="Filter refine_id...", key="refined_refine_id_filter")
            
            with filter_row[3]:
                prompt_id_filter = st.text_input("Prompt ID", "", placeholder="Filter prompt_id...", key="refined_prompt_id_filter")
            
            with filter_row[4]:
                search_text = st.text_input("🔎 Search", "", placeholder="Search enhanced_prompt_id, prompt...", key="refined_search")
            
            # Apply date filter
            filtered_df = refined_df.copy()
            if 'created_at' in filtered_df.columns:
                if table_start_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date >= table_start_date]
                if table_end_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date <= table_end_date]
            
            # Apply text filters
            filters = {}
            if refine_id_filter and 'refine_id' in filtered_df.columns:
                filters['refine_id'] = refine_id_filter
            if prompt_id_filter and 'prompt_id' in filtered_df.columns:
                filters['prompt_id'] = prompt_id_filter
            
            # Apply all filters
            filtered_df = apply_filters_and_search(
                filtered_df,
                filters,
                search_text,
                ['enhanced_prompt_id', 'refined_prompt_preview']
            )
            
            # Metrics
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Refined", f"{len(filtered_df):,}", delta=f"{len(refined_df):,} total" if len(filtered_df) != len(refined_df) else None)
            with col2:
                if 'processing_time' in filtered_df.columns:
                    avg_time = filtered_df['processing_time'].mean()
                    st.metric("Avg Processing Time", f"{avg_time:.0f}ms")
                else:
                    st.metric("Avg Processing Time", "N/A")
            with col3:
                has_prompt_id = len(filtered_df[filtered_df['prompt_id'].notna()]) if 'prompt_id' in filtered_df.columns else 0
                st.metric("Linked via prompt_id", f"{has_prompt_id:,}")
            
            # Charts and Data together
            col_chart, col_table = st.columns([1, 1])
            
            with col_chart:
                # Processing time distribution
                if 'processing_time' in filtered_df.columns and len(filtered_df) > 0:
                    fig = px.histogram(
                        filtered_df,
                        x='processing_time',
                        nbins=20,
                        title="Refinement Processing Time Distribution",
                        labels={'processing_time': 'Processing Time (ms)', 'count': 'Number of Refinements'}
                    )
                    fig.update_layout(height=400)
                    st.plotly_chart(fig, width="stretch")
            
            with col_table:
                # Data table
                display_cols = ['refine_id', 'prompt_id', 'enhanced_prompt_id', 'refined_prompt_preview', 
                              'processing_time', 'created_at']
                display_cols = [c for c in display_cols if c in filtered_df.columns]
                st.dataframe(filtered_df[display_cols], width="stretch", hide_index=True, height=400)
        else:
            st.warning("No refined prompts data available. The refine_prompt table may be empty.")
    
    st.markdown("---")
    
    # 5. User Status Table
    st.markdown("### 5. User Status Table (userstatus)")
    
    with st.spinner("Loading user status data..."):
        status_df = get_user_status_data(start_date, end_date, limit=0)
        if status_df.empty:
            status_df = get_user_status_data(None, None, limit=0)
        
        if not status_df.empty:
            # Filters in a single row
            st.markdown("#### 🔍 Filters")
            filter_row = st.columns(4)
            
            with filter_row[0]:
                table_start_date = st.date_input(
                    "Start Date",
                    value=status_df['created_at'].min().date() if 'created_at' in status_df.columns and not status_df['created_at'].isna().all() else None,
                    key="status_start_date"
                )
            
            with filter_row[1]:
                table_end_date = st.date_input(
                    "End Date",
                    value=status_df['created_at'].max().date() if 'created_at' in status_df.columns and not status_df['created_at'].isna().all() else None,
                    key="status_end_date"
                )
            
            with filter_row[2]:
                status_filter = st.text_input("Status", "", placeholder="free/freetrial/pro...", key="status_status_filter")
            
            with filter_row[3]:
                search_text = st.text_input("🔎 Search", "", placeholder="Search user_id...", key="status_search")
            
            # Apply date filter
            filtered_df = status_df.copy()
            if 'created_at' in filtered_df.columns:
                if table_start_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date >= table_start_date]
                if table_end_date:
                    filtered_df = filtered_df[filtered_df['created_at'].dt.date <= table_end_date]
            
            # Apply text filters
            filters = {}
            if status_filter and 'status' in filtered_df.columns:
                filters['status'] = status_filter
            
            # Apply all filters
            filtered_df = apply_filters_and_search(
                filtered_df,
                filters,
                search_text,
                ['user_id']
            )
            
            # Metrics
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Total Status Records", f"{len(filtered_df):,}", delta=f"{len(status_df):,} total" if len(filtered_df) != len(status_df) else None)
            with col2:
                unique_users = filtered_df['user_id'].nunique() if 'user_id' in filtered_df.columns else 0
                st.metric("Unique Users", f"{unique_users:,}")
            with col3:
                if 'status' in filtered_df.columns:
                    unique_statuses = filtered_df['status'].nunique()
                    st.metric("Unique Statuses", f"{unique_statuses}")
                else:
                    st.metric("Unique Statuses", "N/A")
            with col4:
                if 'status' in filtered_df.columns:
                    most_common = filtered_df['status'].mode()[0] if len(filtered_df['status'].mode()) > 0 else "N/A"
                    st.metric("Most Common Status", most_common)
                else:
                    st.metric("Most Common Status", "N/A")
            
            # Charts and Data together
            col_chart, col_table = st.columns([1, 1])
            
            with col_chart:
                # Status distribution
                if 'status' in filtered_df.columns and len(filtered_df) > 0:
                    status_dist = filtered_df['status'].value_counts()
                    fig = px.pie(
                        values=status_dist.values,
                        names=status_dist.index,
                        title="User Status Distribution",
                        color_discrete_map={
                            'free': '#1f77b4',
                            'freetrial': '#ff7f0e',
                            'pro': '#2ca02c'
                        }
                    )
                    fig.update_layout(height=400)
                    st.plotly_chart(fig, width="stretch")
            
            with col_table:
                # Data table
                display_cols = ['user_id', 'status', 'created_at', 'updated_at']
                display_cols = [c for c in display_cols if c in filtered_df.columns]
                st.dataframe(filtered_df[display_cols], width="stretch", hide_index=True, height=400)
        else:
            st.warning("No user status data available. The userstatus table may be empty.")
    
    st.markdown("---")
    
    # 6. Onboarding Data Table
    st.markdown("### 6. Onboarding Data Table (onboarding_data)")
    
    with st.spinner("Loading onboarding data..."):
        onboarding_df = get_onboarding_data(start_date, end_date, limit=0)
        if onboarding_df.empty:
            onboarding_df = get_onboarding_data(None, None, limit=0)
        
        # Diagnostic: Check if table exists and has data
        if onboarding_df.empty:
            with st.expander("🔧 Diagnostic: Check Table Status", expanded=False):
                try:
                    count_query = "SELECT COUNT(*) as total FROM public.onboarding_data"
                    count_df = db_manager.execute_query(count_query)
                    if not count_df.empty:
                        total = count_df.iloc[0]['total']
                        st.info(f"📊 Table `onboarding_data` exists and has {total} total rows.")
                        if total > 0:
                            st.warning("⚠️ Data exists but query returned empty. This might be due to:")
                            st.markdown("- Date filter is too restrictive")
                            st.markdown("- Column names don't match expected schema")
                            st.markdown("- JOIN conditions failing")
                            # Try to show sample data
                            try:
                                sample_query = "SELECT * FROM public.onboarding_data LIMIT 5"
                                sample_df = db_manager.execute_query(sample_query)
                                if not sample_df.empty:
                                    st.markdown("**Sample data (first 5 rows):**")
                                    st.dataframe(sample_df, width="stretch", hide_index=True)
                                    st.markdown("**Available columns:**")
                                    st.write(list(sample_df.columns))
                            except Exception as e2:
                                st.error(f"Could not fetch sample: {e2}")
                    else:
                        st.warning("⚠️ Could not determine table row count.")
                except Exception as e:
                    st.error(f"❌ Diagnostic query failed: {e}")
                    st.info("The `onboarding_data` table might not exist or you don't have permission to access it.")
        
        if not onboarding_df.empty:
            # Filters in a single row
            st.markdown("#### 🔍 Filters")
            filter_row = st.columns(5)
            
            with filter_row[0]:
                # Use created_at or user_signup_date for date filter
                date_col = 'created_at' if 'created_at' in onboarding_df.columns else 'user_signup_date'
                table_start_date = st.date_input(
                    "Start Date",
                    value=onboarding_df[date_col].min().date() if date_col in onboarding_df.columns and not onboarding_df[date_col].isna().all() else None,
                    key="onboarding_start_date"
                )
            
            with filter_row[1]:
                table_end_date = st.date_input(
                    "End Date",
                    value=onboarding_df[date_col].max().date() if date_col in onboarding_df.columns and not onboarding_df[date_col].isna().all() else None,
                    key="onboarding_end_date"
                )
            
            with filter_row[2]:
                source_filter = st.text_input("Source", "", placeholder="Filter source...", key="onboarding_source_filter")
            
            with filter_row[3]:
                user_id_filter = st.text_input("User ID", "", placeholder="Filter user_id...", key="onboarding_user_id_filter")
            
            with filter_row[4]:
                search_text = st.text_input("🔎 Search", "", placeholder="Search name, email...", key="onboarding_search")
            
            # Apply date filter
            filtered_df = onboarding_df.copy()
            date_col = 'created_at' if 'created_at' in filtered_df.columns else 'user_signup_date'
            if date_col in filtered_df.columns:
                if table_start_date:
                    filtered_df = filtered_df[filtered_df[date_col].dt.date >= table_start_date]
                if table_end_date:
                    filtered_df = filtered_df[filtered_df[date_col].dt.date <= table_end_date]
            
            # Apply text filters
            filters = {}
            if source_filter and 'source' in filtered_df.columns:
                filters['source'] = source_filter
            if user_id_filter and 'user_id' in filtered_df.columns:
                filters['user_id'] = user_id_filter
            
            # Apply all filters
            filtered_df = apply_filters_and_search(
                filtered_df,
                filters,
                search_text,
                ['user_name', 'email']
            )
            
            # Metrics
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Total Onboarding Records", f"{len(filtered_df):,}", delta=f"{len(onboarding_df):,} total" if len(filtered_df) != len(onboarding_df) else None)
            with col2:
                unique_users = filtered_df['user_id'].nunique() if 'user_id' in filtered_df.columns else 0
                st.metric("Unique Users", f"{unique_users:,}")
            with col3:
                if 'completed_at' in filtered_df.columns:
                    completed = len(filtered_df[filtered_df['completed_at'].notna()])
                    st.metric("Completed", f"{completed:,}")
                else:
                    st.metric("Completed", "N/A")
            with col4:
                if 'source' in filtered_df.columns:
                    unique_sources = filtered_df['source'].nunique()
                    st.metric("Unique Sources", f"{unique_sources}")
                else:
                    st.metric("Unique Sources", "N/A")
            
            # Charts and Data together
            col_chart1, col_chart2 = st.columns(2)
            
            with col_chart1:
                # Source distribution
                if 'source' in filtered_df.columns and len(filtered_df) > 0:
                    source_dist = filtered_df['source'].value_counts().head(10)
                    fig = px.bar(
                        x=source_dist.index,
                        y=source_dist.values,
                        title="Onboarding Source Distribution",
                        labels={'x': 'Source', 'y': 'Count'}
                    )
                    fig.update_layout(height=300, xaxis_tickangle=-45)
                    st.plotly_chart(fig, width="stretch")
            
            with col_chart2:
                # Completion status
                if 'completed_at' in filtered_df.columns and len(filtered_df) > 0:
                    completed_count = len(filtered_df[filtered_df['completed_at'].notna()])
                    incomplete_count = len(filtered_df) - completed_count
                    completion_data = pd.DataFrame({
                        'Status': ['Completed', 'Incomplete'],
                        'Count': [completed_count, incomplete_count]
                    })
                    fig = px.pie(
                        completion_data,
                        values='Count',
                        names='Status',
                        title="Onboarding Completion Status",
                        color_discrete_map={'Completed': '#2ca02c', 'Incomplete': '#d62728'}
                    )
                    fig.update_layout(height=300)
                    st.plotly_chart(fig, width="stretch")
            
            # Data table
            display_cols = ['user_id', 'user_name', 'email', 'source', 'completed_at', 'user_signup_date']
            display_cols = [c for c in display_cols if c in filtered_df.columns]
            st.dataframe(filtered_df[display_cols], width="stretch", hide_index=True)
        else:
            st.warning("No onboarding data available. The onboarding_data table may be empty.")
    



