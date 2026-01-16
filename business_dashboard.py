"""
Business Dashboard - High-level business KPIs and overview metrics.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
from typing import Optional
import logging

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
        get_acquisition_kpis, get_active_user_summary, get_retention_summary,
        get_usage_summary, get_engagement_score,
        get_daily_signups, get_signup_sources, get_dau_wau_mau,
        get_user_status_transitions, get_subscription_metrics,
        get_onboarding_completion, get_prompt_generation_metrics
    )
    from dashboard_components import kpi_card, trend_indicator
except ImportError as e:
    logger.error(f"Failed to import query functions: {e}")
    DATABASE_AVAILABLE = False


def render_business_dashboard():
    """
    Render the complete Business Dashboard with all sections.
    """
    st.markdown('<h2 class="section-header">💼 Business Dashboard</h2>', unsafe_allow_html=True)
    
    # Get date filter
    from dashboard_components import date_filter
    preset, start_date, end_date = date_filter("Business")
    
    # Executive Summary - Top KPIs
    st.markdown("## 📊 Executive Summary")
    show_executive_summary(start_date, end_date)
    
    st.markdown("---")
    
    # Section 1: Acquisition Overview
    with st.expander("📈 Section 1: Acquisition Overview", expanded=True):
        show_acquisition_overview(start_date, end_date)
    
    # Section 2: Impression Overview
    with st.expander("👁️ Section 2: Impression Overview", expanded=True):
        show_impression_overview(start_date, end_date)
    
    # Section 3: Retention Overview
    with st.expander("🔄 Section 3: Retention Overview", expanded=True):
        show_retention_overview(start_date, end_date)
    
    # Section 4: Engagement Overview
    with st.expander("⚡ Section 4: Engagement Overview", expanded=True):
        show_engagement_overview(start_date, end_date)


def show_executive_summary(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show top-level KPIs in executive summary format."""
    st.markdown("### Key Performance Indicators")
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    with st.spinner("Loading executive summary..."):
        # Get all KPIs
        acquisition = get_acquisition_kpis(start_date, end_date)
        active_users = get_active_user_summary()
        retention = get_retention_summary()
        engagement_score = get_engagement_score()
        
        # Calculate trends (simplified - would need previous period data)
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            kpi_card("Total Users", f"{acquisition['total_users']:,}", icon="👥", 
                    help_text="Total count of all users in the system (from usertable)")
        
        with col2:
            kpi_card("New Users", f"{acquisition['new_users']:,}", change=f"{acquisition['growth_rate']:+.1f}%", icon="🆕",
                    help_text="New users in selected period. Growth rate = ((New users - Previous period users) / Previous period users) × 100")
        
        with col3:
            kpi_card("Active Users (DAU)", f"{active_users['dau']:,}", icon="📊",
                    help_text="Daily Active Users: Count of unique users with activity (prompt generation) on the current day")
        
        with col4:
            retention_rate = retention.get('day_7_retention', 0.0)
            kpi_card("7-Day Retention", f"{retention_rate:.1f}%", icon="🔄",
                    help_text="Percentage of users who were active 7 days after signup. Formula: (Users active on day 7 / Total signups) × 100")
        
        with col5:
            kpi_card("Engagement Score", f"{engagement_score:.1f}", icon="⚡",
                    help_text="Composite engagement score (0-100). Calculated as: (Stickiness Score + Activity Score) / 2, where Stickiness = min(DAU/MAU × 100, 100) and Activity = min((DAU / 1000) × 50, 50)")
        
        # Additional metrics row
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            kpi_card("WAU", f"{active_users['wau']:,}", icon="📈",
                    help_text="Weekly Active Users: Count of unique users with activity in the last 7 days")
        
        with col2:
            kpi_card("MAU", f"{active_users['mau']:,}", icon="📉",
                    help_text="Monthly Active Users: Count of unique users with activity in the last 30 days")
        
        with col3:
            stickiness = active_users.get('stickiness', 0.0)
            kpi_card("Stickiness", f"{stickiness:.1f}%", icon="📌",
                    help_text="User stickiness metric. Formula: (DAU / MAU) × 100. Higher values indicate users return more frequently. Good: >20%, Excellent: >40%")
        
        with col4:
            churn_rate = retention.get('churn_rate', 0.0)
            kpi_card("Churn Rate", f"{churn_rate:.2f}%", icon="⚠️",
                    help_text="Percentage of users who have churned. Formula: (Churned users / Total users) × 100. Churned = users with no activity in last 30 days or no activity at all")
        
        # User activity metrics row
        prompt_metrics = get_prompt_generation_metrics(start_date, end_date)
        onboarding_metrics = get_onboarding_completion(start_date, end_date)
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            kpi_card("Total Prompts", f"{prompt_metrics['total_prompts']:,}", icon="💬",
                    help_text="Total number of prompts generated by users in the selected period (from save_enhance_prompt table)")
        
        with col2:
            kpi_card("Active Prompt Users", f"{prompt_metrics['unique_users']:,}", icon="👥",
                    help_text="Count of unique users who generated at least one prompt in the selected period")
        
        with col3:
            kpi_card("Onboarding Rate", f"{onboarding_metrics['completion_rate']:.1f}%", icon="✅",
                    help_text="Percentage of users who completed onboarding. Formula: (Completed onboarding / Total signups) × 100")
        
        with col4:
            prompts_per_user = prompt_metrics.get('prompts_per_user', 0.0)
            kpi_card("Prompts per User", f"{prompts_per_user:.1f}", icon="📊",
                    help_text="Average number of prompts generated per active user. Formula: Total prompts / Unique users who generated prompts")


def show_acquisition_overview(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show high-level acquisition metrics."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    st.markdown("### 1.1 High-Level Acquisition Metrics")
    
    with st.spinner("Loading acquisition overview..."):
        acquisition = get_acquisition_kpis(start_date, end_date)
        signups_df = get_daily_signups(start_date, end_date)
        
        # Growth trend chart
        if not signups_df.empty:
            fig = px.line(
                signups_df,
                x='signup_date',
                y='cumulative_signups',
                title="User Growth Trend",
                labels={'signup_date': 'Date', 'cumulative_signups': 'Cumulative Users'},
                markers=True
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
        
        # Summary metrics
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Users", f"{acquisition['total_users']:,}",
                    help="Total count of all users in the system (from usertable)")
        with col2:
            st.metric("New Users (Period)", f"{acquisition['new_users']:,}",
                    help="New users who signed up in the selected date range")
        with col3:
            st.metric("Growth Rate", f"{acquisition['growth_rate']:+.1f}%",
                    help="Growth rate compared to previous period. Formula: ((New users - Previous period users) / Previous period users) × 100")
        with col4:
            onboarding_metrics = get_onboarding_completion(start_date, end_date)
            st.metric("Onboarding Rate", f"{onboarding_metrics['completion_rate']:.1f}%",
                    help="Percentage of users who completed onboarding. Formula: (Completed onboarding / Total signups) × 100")
    
    st.markdown("### 1.3 Onboarding Performance")
    
    with st.spinner("Loading onboarding performance..."):
        onboarding_metrics = get_onboarding_completion(start_date, end_date)
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Signups", f"{onboarding_metrics['total_signups']:,}",
                    help="Total number of user signups in the selected period")
        with col2:
            st.metric("Completed", f"{onboarding_metrics['completed_onboarding']:,}",
                    help="Number of users who completed the onboarding process")
        with col3:
            st.metric("Incomplete", f"{onboarding_metrics['incomplete_onboarding']:,}",
                    help="Number of users who started but did not complete onboarding")
        with col4:
            st.metric("Completion Rate", f"{onboarding_metrics['completion_rate']:.1f}%",
                    help="Onboarding completion percentage. Formula: (Completed / Total signups) × 100")
        
        # Onboarding funnel chart
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
        st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("### 1.2 Acquisition Channels")
    
    with st.spinner("Loading acquisition channels..."):
        sources_df = get_signup_sources(start_date, end_date)
        
        if not sources_df.empty:
            col1, col2 = st.columns([2, 1])
            
            with col1:
                # Top sources pie chart
                top_sources = sources_df.head(5)
                fig = px.pie(
                    top_sources,
                    values='signup_count',
                    names='source',
                    title="Top 5 Acquisition Sources"
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                st.dataframe(sources_df.head(10), use_container_width=True, hide_index=True)
        else:
            st.info("No acquisition source data available.")


def show_impression_overview(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show high-level impression metrics."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    st.markdown("### 2.1 Active User Summary")
    
    with st.spinner("Loading active user summary..."):
        active_users = get_active_user_summary()
        
        # Active users trend
        dau_wau_mau_data = get_dau_wau_mau(start_date, end_date)
        
        # Gauge chart for stickiness
        fig = go.Figure(go.Indicator(
            mode="gauge+number",
            value=active_users['stickiness'],
            domain={'x': [0, 1], 'y': [0, 1]},
            title={'text': "Stickiness (DAU/MAU)"},
            gauge={
                'axis': {'range': [None, 100]},
                'bar': {'color': "darkblue"},
                'steps': [
                    {'range': [0, 20], 'color': "lightgray"},
                    {'range': [20, 40], 'color': "gray"},
                    {'range': [40, 100], 'color': "lightgreen"}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 90
                }
            }
        ))
        fig.update_layout(height=300)
        st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("### 2.2 User Status Distribution")
    
    with st.spinner("Loading user status distribution..."):
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
                # Current status pie chart
                if 'status_date' in status_df.columns and len(status_df) > 0:
                    latest_date = status_df['status_date'].max()
                    latest_status = status_df[status_df['status_date'] == latest_date]
                    
                    if not latest_status.empty:
                        fig = px.pie(
                            latest_status,
                            values='user_count',
                            names='status',
                            title=f"Current User Status Distribution (as of {latest_date.strftime('%Y-%m-%d') if hasattr(latest_date, 'strftime') else latest_date})"
                        )
                        fig.update_layout(height=400)
                        st.plotly_chart(fig, use_container_width=True)
                
                # Status over time
                unique_dates = status_df['status_date'].nunique()
                
                if unique_dates > 1:
                    # Area chart for time series
                    fig = px.area(
                        status_df,
                        x='status_date',
                        y='user_count',
                        color='status',
                        title="User Status Distribution Over Time",
                        labels={'status_date': 'Date', 'user_count': 'Number of Users'}
                    )
                    fig.update_layout(
                        height=400,
                        xaxis_title="Date",
                        yaxis_title="Number of Users",
                        hovermode='x unified'
                    )
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    # Only one date - show info message
                    st.info("ℹ️ Only one date of data available. Status distribution shown in pie chart above.")
            else:
                st.warning("Data was loaded but became empty after processing. Check date formats.")
        else:
            st.info("No user status data available. The userstatus table may be empty or the date filter is too restrictive.")


def show_retention_overview(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show high-level retention metrics."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    st.markdown("### 3.1 Retention Summary")
    
    with st.spinner("Loading retention summary..."):
        retention = get_retention_summary()
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("7-Day Retention", f"{retention['day_7_retention']:.1f}%",
                    help="Percentage of users active 7 days after signup. Formula: (Users active on day 7 / Total signups) × 100. Based on users who signed up in last 90 days")
        with col2:
            st.metric("30-Day Retention", f"{retention['day_30_retention']:.1f}%",
                    help="Percentage of users active 30 days after signup. Formula: (Users active on day 30 / Total signups) × 100. Based on users who signed up in last 90 days")
        with col3:
            st.metric("Churn Rate", f"{retention['churn_rate']:.2f}%",
                    help="Percentage of churned users. Formula: (Churned users / Total users) × 100. Churned = users with no activity in last 30 days or no activity at all")
        
        # Retention comparison chart
        retention_df = pd.DataFrame({
            'Metric': ['7-Day Retention', '30-Day Retention'],
            'Rate (%)': [retention['day_7_retention'], retention['day_30_retention']]
        })
        
        fig = px.bar(
            retention_df,
            x='Metric',
            y='Rate (%)',
            title="Retention Rates",
            color='Metric',
            color_discrete_map={
                '7-Day Retention': '#1f77b4',
                '30-Day Retention': '#2ca02c'
            }
        )
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("### 3.2 Subscription Health")
    
    with st.spinner("Loading subscription health..."):
        sub_metrics = get_subscription_metrics(start_date, end_date)
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Active Subscriptions", f"{sub_metrics['active_subscriptions']:,}",
                    help="Count of active subscriptions (status = 'active' in subscriptions table)")
        with col2:
            st.metric("Trial Conversion Rate", f"{sub_metrics['trial_conversion_rate']:.2f}%",
                    help="Percentage of trial users who converted to paid. Formula: (Paid users / Trial users) × 100. Based on userstatus table")
        
        # Funnel chart for trial to paid
        if sub_metrics['trial_conversion_rate'] > 0:
            fig = go.Figure(go.Funnel(
                y=["Trials", "Paid Conversions"],
                x=[100, sub_metrics['trial_conversion_rate']],
                textposition="inside",
                textinfo="value+percent initial"
            ))
            fig.update_layout(
                title="Trial to Paid Conversion Funnel",
                height=300
            )
            st.plotly_chart(fig, use_container_width=True)


def show_engagement_overview(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show high-level engagement metrics."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    st.markdown("### 4.1 Usage Summary")
    
    with st.spinner("Loading usage summary..."):
        usage = get_usage_summary(start_date, end_date)
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Usage", f"{usage['total_usage']:,}",
                    help="Total number of actions/usage events in the selected period (sum of all prompt generations)")
        with col2:
            st.metric("Avg Daily Usage", f"{usage['avg_daily_usage']:.2f}",
                    help="Average number of actions per day. Formula: Total usage / Number of days in period")
        with col3:
            st.metric("Heavy Users %", f"{usage['heavy_users_percent']:.1f}%",
                    help="Percentage of users classified as heavy users (currently not implemented)")
    
    st.markdown("### 4.2 User Activity & Prompts")
    
    with st.spinner("Loading user activity metrics..."):
        prompt_metrics = get_prompt_generation_metrics(start_date, end_date)
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Prompts Generated", f"{prompt_metrics['total_prompts']:,}",
                    help="Total number of prompts generated in the selected period (from save_enhance_prompt table)")
        with col2:
            st.metric("Active Prompt Users", f"{prompt_metrics['unique_users']:,}",
                    help="Count of unique users who generated at least one prompt in the selected period")
        with col3:
            st.metric("Prompts per User", f"{prompt_metrics['prompts_per_user']:.2f}",
                    help="Average prompts per active user. Formula: Total prompts / Unique users who generated prompts")
        with col4:
            # Calculate prompt activity rate (users who generated prompts / total users)
            acquisition = get_acquisition_kpis(start_date, end_date)
            total_users = acquisition.get('total_users', 1)
            activity_rate = (prompt_metrics['unique_users'] / total_users * 100) if total_users > 0 else 0.0
            st.metric("Prompt Activity Rate", f"{activity_rate:.1f}%",
                    help="Percentage of total users who generated prompts. Formula: (Users who generated prompts / Total users) × 100")
        
        # Prompt activity visualization
        if prompt_metrics['total_prompts'] > 0:
            activity_data = pd.DataFrame({
                'Metric': ['Total Prompts', 'Unique Users'],
                'Count': [prompt_metrics['total_prompts'], prompt_metrics['unique_users']]
            })
            
            col1, col2 = st.columns(2)
            
            with col1:
                fig = px.bar(
                    activity_data,
                    x='Metric',
                    y='Count',
                    title="Prompt Activity Overview",
                    color='Metric',
                    color_discrete_map={
                        'Total Prompts': '#1f77b4',
                        'Unique Users': '#2ca02c'
                    }
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                # Show prompts per user distribution
                prompts_per_user = prompt_metrics.get('prompts_per_user', 0.0)
                fig = go.Figure(go.Indicator(
                    mode="gauge+number",
                    value=prompts_per_user,
                    domain={'x': [0, 1], 'y': [0, 1]},
                    title={'text': "Avg Prompts per User"},
                    gauge={
                        'axis': {'range': [None, 10]},
                        'bar': {'color': "darkblue"},
                        'steps': [
                            {'range': [0, 2], 'color': "lightgray"},
                            {'range': [2, 5], 'color': "yellow"},
                            {'range': [5, 10], 'color': "lightgreen"}
                        ],
                        'threshold': {
                            'line': {'color': "red", 'width': 4},
                            'thickness': 0.75,
                            'value': 8
                        }
                    }
                ))
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No prompt activity data available for the selected period.")
    
    st.markdown("### 4.3 Engagement Health")
    
    with st.spinner("Loading engagement health..."):
        engagement_score = get_engagement_score()
        
        # Engagement score gauge
        fig = go.Figure(go.Indicator(
            mode="gauge+number",
            value=engagement_score,
            domain={'x': [0, 1], 'y': [0, 1]},
            title={'text': "Engagement Score"},
            gauge={
                'axis': {'range': [None, 100]},
                'bar': {'color': "darkgreen"},
                'steps': [
                    {'range': [0, 30], 'color': "lightgray"},
                    {'range': [30, 60], 'color': "yellow"},
                    {'range': [60, 100], 'color': "lightgreen"}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 80
                }
            }
        ))
        fig.update_layout(height=300)
        st.plotly_chart(fig, use_container_width=True)
        
        st.metric("Engagement Score", f"{engagement_score:.1f}/100",
                help="Composite engagement score (0-100). Calculated as: (Stickiness Score + Activity Score) / 2, where Stickiness = min(DAU/MAU × 100, 100) and Activity = min((DAU / 1000) × 50, 50)")

