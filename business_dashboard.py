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
        get_acquisition_kpis, get_active_user_summary, get_retention_summary,
        get_usage_summary,
        get_daily_signups, get_signup_sources, get_dau_wau_mau,
        get_user_status_transitions, get_subscription_metrics,
        get_onboarding_completion, get_prompt_generation_metrics,
        # GA-style metrics
        get_user_activation_funnel, get_traffic_sources, get_geographic_distribution,
        get_weekly_cohort_retention, get_rolling_28day_trends, get_week_over_week_comparison,
        get_qualified_leads
    )
    from dashboard_components import kpi_card, trend_indicator, section_date_filter
    # Import validation
    from metrics_validation import MetricValidator, validate_business_metrics, display_data_quality_summary
    VALIDATION_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import query functions: {e}")
    DATABASE_AVAILABLE = False
    VALIDATION_AVAILABLE = False


def render_business_dashboard():
    """
    Render the complete Business Dashboard with all sections.
    """
    st.markdown('<h2 class="section-header">💼 Business Dashboard</h2>', unsafe_allow_html=True)
    
    # Executive Summary - Top KPIs
    # Note: Each section has its own date filter, so no global date filter needed
    start_date, end_date = None, None
    st.markdown("## 📊 Executive Summary")
    show_executive_summary(start_date, end_date)
    
    st.markdown("---")
    
    # Section 0: Lead Generation Metrics (GA-style)
    with st.expander("🎯 Section 0: Lead Generation Metrics", expanded=True):
        show_lead_generation_section(start_date, end_date)
    
    # Section 1: Acquisition Overview
    with st.expander("📈 Section 1: Acquisition Overview", expanded=True):
        show_acquisition_overview(start_date, end_date)
    
    # Section 2: Impression Overview
    with st.expander("👁️ Section 2: Impression Overview", expanded=True):
        show_impression_overview(start_date, end_date)
    
    # Section 3: User Lifecycle & Health
    with st.expander("👥 Section 3: User Lifecycle & Health", expanded=True):
        show_user_lifecycle_section(start_date, end_date)
    
    # Section 4: Engagement Overview
    with st.expander("⚡ Section 4: Engagement Overview", expanded=True):
        show_engagement_overview(start_date, end_date)
    
    # Section 5: Time-Based Trends
    with st.expander("📅 Section 5: Time-Based Trends", expanded=True):
        show_time_trends_section(start_date, end_date)


def show_executive_summary(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show top-level KPIs in executive summary format."""
    # Date filter for this section
    preset, section_start, section_end = section_date_filter("executive_summary", "Last 7 Days")
    # Use section dates if provided, otherwise use global dates
    effective_start = section_start if section_start else start_date
    effective_end = section_end if section_end else end_date
    
    st.markdown("### Key Performance Indicators")
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    with st.spinner("Loading executive summary..."):
        # Initialize validator if available
        validator = None
        if VALIDATION_AVAILABLE:
            validator = MetricValidator()
        
        # Get all KPIs with section date filter
        acquisition = get_acquisition_kpis(effective_start, effective_end, "previous_period")
        active_users = get_active_user_summary()
        retention = get_retention_summary()
        prompt_metrics = get_prompt_generation_metrics(effective_start, effective_end)
        onboarding_metrics = get_onboarding_completion(effective_start, effective_end)
        
        # Validate all metrics
        if validator:
            validator = validate_business_metrics(
                acquisition, active_users, retention,
                prompt_metrics, onboarding_metrics
            )
            
            # Display validation summary
            summary = validator.get_validation_summary()
            if summary["errors"] > 0 or summary["warnings"] > 0:
                col1, col2 = st.columns([3, 1])
                with col1:
                    if summary["errors"] > 0:
                        st.error(f"⚠️ **Data Quality Issues:** {summary['errors']} error(s), {summary['warnings']} warning(s)")
                    else:
                        st.warning(f"⚠️ **Data Quality Warnings:** {summary['warnings']} warning(s)")
                with col2:
                    if summary["valid_metrics"] == summary["total_metrics"]:
                        st.success(f"✅ {summary['valid_metrics']}/{summary['total_metrics']} metrics valid")
                    else:
                        st.info(f"📊 {summary['valid_metrics']}/{summary['total_metrics']} metrics valid")
        
        # Key Insights Box
        insights = []
        if acquisition['growth_rate'] < 0:
            insights.append(f"⚠️ **Declining Growth:** New user signups decreased by {abs(acquisition['growth_rate']):.1f}% - consider reviewing acquisition channels")
        elif acquisition['growth_rate'] > 20:
            insights.append(f"✅ **Strong Growth:** New user signups increased by {acquisition['growth_rate']:.1f}% - excellent momentum")
        
        dead_users_rate = retention.get('churn_rate', 0.0)
        if dead_users_rate > 50:
            insights.append(f"🔴 **High Dead Users Rate:** {dead_users_rate:.1f}% of users are inactive - urgent action needed to re-engage users")
        elif dead_users_rate > 30:
            insights.append(f"🟡 **Moderate Dead Users Rate:** {dead_users_rate:.1f}% of users are inactive - consider re-engagement campaigns")
        
        onboarding_rate = onboarding_metrics['completion_rate']
        if onboarding_rate < 50:
            insights.append(f"⚠️ **Low Onboarding:** Only {onboarding_rate:.1f}% complete onboarding - review onboarding flow for friction points")
        elif onboarding_rate > 80:
            insights.append(f"✅ **Excellent Onboarding:** {onboarding_rate:.1f}% completion rate - onboarding flow is effective")
        
        stickiness = active_users.get('stickiness', 0.0)
        if stickiness < 10:
            insights.append(f"🔴 **Low Stickiness:** {stickiness:.1f}% indicates users rarely return - focus on improving daily engagement")
        elif stickiness > 30:
            insights.append(f"✅ **High Stickiness:** {stickiness:.1f}% indicates strong user retention and daily engagement")
        
        
        if insights:
            st.markdown("### 💡 Key Insights")
            for insight in insights[:5]:  # Show top 5 insights
                st.markdown(f"- {insight}")
            st.markdown("---")
        
        # Core Business KPIs - Only most critical metrics (5 total)
        col1, col2, col3, col4, col5 = st.columns(5)

        with col1:
            kpi_card("Total Users", f"{acquisition['total_users']:,}", icon="👥",
                    help_text="Total count of all users in the system (from usertable)")

        with col2:
            kpi_card("Total Installs", f"{acquisition['total_installs']:,}", change=f"{acquisition['growth_rate']:+.1f}%", icon="🆕",
                    help_text="Total installs in selected period. Growth rate = ((Total installs current period - Total installs comparison period) / Total installs comparison period) × 100")

        with col3:
            kpi_card("Active Users (DAU)", f"{active_users['dau']:,}", icon="📊",
                    help_text="Daily Active Users: Count of unique users with at least 1 prompt on the current day")

        with col4:
            kpi_card("Dead Users Rate", f"{dead_users_rate:.2f}%", icon="⚠️",
                    help_text="Percentage of dead/inactive users. Formula: (Dead users / Total users) × 100. Dead users = users with no activity in last 30 days or no activity at all")

        with col5:
            kpi_card("Onboarding Rate", f"{onboarding_rate:.1f}%", icon="✅",
                    help_text="Percentage of users who completed onboarding. Formula: (Completed onboarding / Total signups) × 100")


def show_acquisition_overview(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show high-level acquisition metrics."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    # Date filter for this section
    preset, section_start, section_end = section_date_filter("acquisition", "Last 7 Days")
    effective_start = section_start if section_start else start_date
    effective_end = section_end if section_end else end_date
    
    st.markdown("### 1.1 High-Level Acquisition Metrics")
    
    with st.spinner("Loading acquisition overview..."):
        acquisition = get_acquisition_kpis(effective_start, effective_end, "previous_period")
        signups_df = get_daily_signups(effective_start, effective_end)
        onboarding_metrics = get_onboarding_completion(effective_start, effective_end)
        
        # Acquisition Insights
        insights = []
        if not signups_df.empty:
            recent_signups = signups_df['total_signups'].tail(7).mean() if len(signups_df) >= 7 else signups_df['total_signups'].mean()
            earlier_signups = signups_df['total_signups'].head(7).mean() if len(signups_df) >= 14 else recent_signups
            if recent_signups > earlier_signups * 1.2:
                insights.append(f"📈 **Growing Signups:** Recent 7-day average ({recent_signups:.0f}) is {((recent_signups/earlier_signups-1)*100):.0f}% higher - strong acquisition momentum")
            elif recent_signups < earlier_signups * 0.8:
                insights.append(f"📉 **Declining Signups:** Recent 7-day average ({recent_signups:.0f}) is {((1-recent_signups/earlier_signups)*100):.0f}% lower - review acquisition strategy")
        
        if acquisition['growth_rate'] > 0:
            insights.append(f"✅ **Positive Growth:** {acquisition['growth_rate']:+.1f}% growth rate indicates healthy user acquisition")
        
        onboarding_rate = onboarding_metrics['completion_rate']
        if onboarding_rate < 50:
            insights.append(f"⚠️ **Onboarding Opportunity:** {onboarding_rate:.1f}% completion rate - {100-onboarding_rate:.1f}% of users drop off during onboarding. Consider simplifying the flow.")
        
        if insights:
            st.info("💡 **Insights:** " + " | ".join(insights))
        
        # Validate acquisition metrics
        if VALIDATION_AVAILABLE:
            validator = MetricValidator()
            validator.validate_metric(
                "Total Users",
                acquisition.get('total_users', 0),
                expected_range=(0, 10000000),
                data_source="usertable",
                calculation_method="COUNT(*) FROM usertable",
                allow_zero=False
            )
            validator.validate_metric(
                "Total Installs",
                acquisition.get('total_installs', 0),
                expected_range=(0, 1000000),
                data_source="usertable",
                calculation_method="COUNT(*) WHERE created_at IN date range",
                allow_zero=True
            )
            validator.validate_metric(
                "Growth Rate",
                acquisition.get('growth_rate', 0.0),
                expected_range=(-100, 1000),
                data_source="Calculated",
                calculation_method="((New users - Previous period) / Previous period) × 100",
                allow_zero=True
            )
        
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
            st.plotly_chart(fig, use_container_width=True, key="acq_growth_trend")
        
        # Summary metrics
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Users", f"{acquisition['total_users']:,}",
                    help="Total count of all users in the system (from usertable)")
        with col2:
            st.metric("Total Installs (Period)", f"{acquisition['total_installs']:,}",
                    help="Total installs who signed up in the selected date range")
        with col3:
            st.metric("Growth Rate", f"{acquisition['growth_rate']:+.1f}%",
                    help="Growth rate based on installs compared to previous period. Formula: ((Total installs current period - Total installs comparison period) / Total installs comparison period) × 100")
        with col4:
            onboarding_metrics = get_onboarding_completion(effective_start, effective_end)
            st.metric("Onboarding Rate", f"{onboarding_metrics['completion_rate']:.1f}%",
                    help="Percentage of users who completed onboarding in the selected period. Formula: (Completed onboarding / Total signups in period) × 100")

        # Non-onboarded users data below
        st.markdown("**Non-onboarded Users Data:**")
        st.markdown(f"- Total non-onboarded users in period: {onboarding_metrics['incomplete_onboarding']:,}")
        if onboarding_metrics['total_signups'] > 0:
            non_onboarded_rate = (onboarding_metrics['incomplete_onboarding'] / onboarding_metrics['total_signups']) * 100
            st.markdown(f"- Non-onboarding rate: {non_onboarded_rate:.1f}%")
        st.markdown("- Average time to first activity (if any): Data not available in current implementation")
        st.markdown("- Conversion rate from non-onboarded to active users: Requires additional tracking")
    
    st.markdown("### 1.2 Acquisition Channels")
    
    with st.spinner("Loading acquisition channels..."):
        sources_df = get_signup_sources(effective_start, effective_end)
        
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
                st.plotly_chart(fig, use_container_width=True, key="acq_sources_pie")
            
            with col2:
                st.dataframe(sources_df.head(10), use_container_width=True, hide_index=True)
        else:
            st.info("No acquisition source data available.")


def show_impression_overview(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show high-level impression metrics."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    # Date filter for this section
    preset, section_start, section_end = section_date_filter("impression", "Last 7 Days")
    effective_start = section_start if section_start else start_date
    effective_end = section_end if section_end else end_date
    
    st.markdown("### 2.1 Active User Summary")
    
    with st.spinner("Loading active user summary..."):
        active_users = get_active_user_summary()
        
        # Active users trend
        dau_wau_mau_data = get_dau_wau_mau(effective_start, effective_end)
        
        # Impression Insights
        insights = []
        dau = active_users.get('dau', 0)
        mau = active_users.get('mau', 0)
        stickiness = active_users.get('stickiness', 0.0)
        
        if dau > 0 and mau > 0:
            dau_to_mau_ratio = (dau / mau) * 100
            if dau_to_mau_ratio < 10:
                insights.append(f"🔴 **Low Daily Engagement:** Only {dau_to_mau_ratio:.1f}% of monthly users are active daily - users need more reasons to return")
            elif dau_to_mau_ratio > 30:
                insights.append(f"✅ **Strong Daily Engagement:** {dau_to_mau_ratio:.1f}% of monthly users are active daily - excellent retention")
        
        if stickiness < 10:
            insights.append(f"⚠️ **Low Stickiness:** {stickiness:.1f}% indicates infrequent usage - consider push notifications or daily value propositions")
        elif stickiness > 30:
            insights.append(f"✅ **High Stickiness:** {stickiness:.1f}% indicates users return frequently - strong product-market fit")
        
        if insights:
            st.info("💡 **Insights:** " + " | ".join(insights))
        
        # Validate active user metrics
        if VALIDATION_AVAILABLE:
            validator = MetricValidator()
            validator.validate_metric(
                "DAU",
                active_users.get('dau', 0),
                expected_range=(0, 1000000),
                data_source="save_enhance_prompt",
                calculation_method="COUNT(DISTINCT user_id) WHERE DATE(created_at) = CURRENT_DATE AND daily_uses >= 1",
                allow_zero=True
            )
            validator.validate_metric(
                "WAU",
                active_users.get('wau', 0),
                expected_range=(0, 1000000),
                data_source="save_enhance_prompt",
                calculation_method="COUNT(DISTINCT user_id) WHERE created_at >= CURRENT_DATE - 7 days AND weekly_uses >= 3",
                allow_zero=True
            )
            validator.validate_metric(
                "MAU",
                active_users.get('mau', 0),
                expected_range=(0, 1000000),
                data_source="save_enhance_prompt",
                calculation_method="COUNT(DISTINCT user_id) WHERE created_at >= CURRENT_DATE - 30 days AND monthly_uses >= 3",
                allow_zero=True
            )
            validator.validate_metric(
                "Stickiness",
                active_users.get('stickiness', 0.0),
                expected_range=(0, 100),
                data_source="Calculated",
                calculation_method="(DAU / MAU) × 100",
                allow_zero=True
            )
            
            # Cross-validate DAU <= WAU <= MAU
            validator.cross_validate_metrics({
                'dau': active_users.get('dau', 0),
                'wau': active_users.get('wau', 0),
                'mau': active_users.get('mau', 0)
            })
        
        # Active users metrics and trends
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Daily Active Users (DAU)", f"{active_users['dau']:,}",
                    help="Daily Active Users: Count of unique users with at least 1 prompt on the current day")
        with col2:
            st.metric("Weekly Active Users (WAU)", f"{active_users['wau']:,}",
                    help="Weekly Active Users: Count of unique users with at least 3 prompts in the last 7 days")
        with col3:
            st.metric("Monthly Active Users (MAU)", f"{active_users['mau']:,}",
                    help="Monthly Active Users: Count of unique users with at least 3 prompts in the last 30 days")
        with col4:
            stickiness = active_users.get('stickiness', 0.0)
            st.metric("Stickiness", f"{stickiness:.1f}%",
                    help="User stickiness metric. Formula: (DAU / MAU) × 100. Higher values indicate users return more frequently. Good: >20%, Excellent: >40%")
        
        # DAU/WAU/MAU comparison chart
        comparison_df = pd.DataFrame({
            'Metric': ['DAU', 'WAU', 'MAU'],
            'Active Users': [active_users['dau'], active_users['wau'], active_users['mau']]
        })
        fig = px.bar(
            comparison_df,
            x='Metric',
            y='Active Users',
            title="Active Users Overview",
            color='Metric',
            color_discrete_map={'DAU': '#1f77b4', 'WAU': '#2ca02c', 'MAU': '#ff7f0e'}
        )
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True, key="impression_dau_mau_comparison")
    
    st.markdown("### 2.2 User Activity Patterns")
    
    with st.spinner("Loading user activity patterns..."):
        from dashboard_queries import get_user_activity_patterns
        activity_patterns = get_user_activity_patterns(effective_start, effective_end)
        
        if not activity_patterns.empty:
            # Activity heatmap by hour and day of week
            if 'hour_of_day' in activity_patterns.columns and 'day_name' in activity_patterns.columns:
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
                    title="User Activity Heatmap (Peak Usage Times)",
                    color_continuous_scale='Blues',
                    aspect="auto"
                )
                fig.update_layout(height=500)
                st.plotly_chart(fig, use_container_width=True, key="impression_activity_heatmap")
            
            # Daily activity trend
            if 'date' in activity_patterns.columns:
                daily_activity = activity_patterns.groupby('date')['active_users'].sum().reset_index()
                fig = px.line(
                    daily_activity,
                    x='date',
                    y='active_users',
                    title="Daily Active Users Trend",
                    labels={'date': 'Date', 'active_users': 'Active Users'},
                    markers=True
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True, key="impression_daily_activity_trend")
        else:
            st.info("No activity pattern data available.")


def show_user_lifecycle_section(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show user lifecycle and health metrics."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    # Date filter for this section
    preset, section_start, section_end = section_date_filter("user_lifecycle", "Last 7 Days")
    effective_start = section_start if section_start else start_date
    effective_end = section_end if section_end else end_date
    
    st.markdown("### 3.1 User Lifecycle Stages")
    
    with st.spinner("Loading user lifecycle data..."):
        from dashboard_queries import get_lifecycle_distribution
        lifecycle = get_lifecycle_distribution()
        
        # Lifecycle Insights
        insights = []
        total_lifecycle = lifecycle['active_users'] + lifecycle['at_risk_users'] + lifecycle['churned_users']
        if total_lifecycle > 0:
            at_risk_pct = (lifecycle['at_risk_users'] / total_lifecycle) * 100
            dead_pct = (lifecycle['churned_users'] / total_lifecycle) * 100
            
            if at_risk_pct > 30:
                insights.append(f"⚠️ **High At-Risk Users:** {at_risk_pct:.1f}% of users are at-risk - implement re-engagement campaigns immediately")
            
            if dead_pct > 50:
                insights.append(f"🔴 **Critical:** {dead_pct:.1f}% of users are dead - urgent need to improve product value and retention")
            elif dead_pct < 20:
                insights.append(f"✅ **Healthy Retention:** Only {dead_pct:.1f}% of users are dead - strong user retention")
        
        if insights:
            st.info("💡 **Insights:** " + " | ".join(insights))
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Active Users", f"{lifecycle['active_users']:,}",
                    help="Users with recent activity (last activity within last 7 days)")
        with col2:
            st.metric("At-Risk Users", f"{lifecycle['at_risk_users']:,}",
                    help="Users with activity between 7-30 days ago (showing signs of disengagement)")
        with col3:
            st.metric("Dead Users", f"{lifecycle['churned_users']:,}",
                    help="Users with no activity or activity > 30 days ago. Dead users = last_activity_date IS NULL OR last_activity_date < CURRENT_DATE - INTERVAL '30 days'")
        
        # Lifecycle distribution visualization
        lifecycle_df = pd.DataFrame({
            'Stage': ['Active', 'At-Risk', 'Dead'],
            'Count': [
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
                'Active': '#1f77b4',
                'At-Risk': '#ff7f0e',
                'Dead': '#d62728'
            }
        )
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True, key="lifecycle_distribution_pie")
    
    st.markdown("### 3.2 User Health Summary")
    
    with st.spinner("Loading user health summary..."):
        from dashboard_queries import get_churn_analysis_detailed
        churn_data = get_churn_analysis_detailed(effective_start, effective_end)
        
        total_users = churn_data.get('total_users', 0)
        active_users = churn_data.get('active_users', 0)
        dead_users = churn_data.get('churned_users', 0)
        dead_users_rate = churn_data.get('churn_rate', 0.0)
        
        # Calculate health metrics
        active_rate = (active_users / total_users * 100) if total_users > 0 else 0.0
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Active Users", f"{active_users:,}",
                    help="Users with activity in the last 30 days")
        with col2:
            st.metric("Dead Users Rate", f"{dead_users_rate:.2f}%",
                    help="Percentage of dead/inactive users. Formula: (Dead users / Total users) × 100. Dead users = users with no activity in last 30 days or no activity at all")
        with col3:
            st.metric("Active Rate", f"{active_rate:.1f}%",
                    help="Percentage of users who are active. Formula: (Active users / Total users) × 100")
        
        # Health visualization
        health_df = pd.DataFrame({
            'Category': ['Active', 'Dead'],
            'Count': [active_users, dead_users]
        })
        
        fig = px.pie(
            health_df,
            values='Count',
            names='Category',
            title="User Health Overview",
            color='Category',
            color_discrete_map={'Active': '#2ca02c', 'Dead': '#d62728'}
        )
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True, key="lifecycle_health_pie")


def show_engagement_overview(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show high-level engagement metrics."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    # Date filter for this section
    preset, section_start, section_end = section_date_filter("engagement", "Last 7 Days")
    effective_start = section_start if section_start else start_date
    effective_end = section_end if section_end else end_date
    
    st.markdown("### 4.1 User Activity & Prompts")
    
    with st.spinner("Loading user activity metrics..."):
        prompt_metrics = get_prompt_generation_metrics(effective_start, effective_end)
        
        # Engagement Insights
        insights = []
        total_prompts = prompt_metrics.get('total_prompts', 0)
        unique_users = prompt_metrics.get('unique_users', 0)
        prompts_per_user = prompt_metrics.get('prompts_per_user', 0.0)
        
        if unique_users > 0:
            if prompts_per_user < 2:
                insights.append(f"⚠️ **Low Usage:** {prompts_per_user:.1f} prompts per user - users may not be finding enough value. Consider feature education.")
            elif prompts_per_user > 5:
                insights.append(f"✅ **High Usage:** {prompts_per_user:.1f} prompts per user - users are highly engaged with the platform")
        
        # Calculate activity rate
        acquisition = get_acquisition_kpis(effective_start, effective_end, "previous_period")
        total_users = acquisition.get('total_users', 1)
        activity_rate = (unique_users / total_users * 100) if total_users > 0 else 0.0
        
        if activity_rate < 30:
            insights.append(f"🔴 **Low Activity Rate:** Only {activity_rate:.1f}% of users generate prompts - focus on increasing feature adoption")
        elif activity_rate > 70:
            insights.append(f"✅ **High Activity Rate:** {activity_rate:.1f}% of users are actively using the platform - excellent engagement")
        
        if insights:
            st.info("💡 **Insights:** " + " | ".join(insights))
        
        # Validate prompt metrics
        if VALIDATION_AVAILABLE:
            validator = MetricValidator()
            validator.validate_metric(
                "Total Prompts",
                prompt_metrics.get('total_prompts', 0),
                expected_range=(0, 10000000),
                data_source="save_enhance_prompt",
                calculation_method="COUNT(*) FROM save_enhance_prompt",
                allow_zero=True
            )
            validator.validate_metric(
                "Prompts per User",
                prompt_metrics.get('prompts_per_user', 0.0),
                expected_range=(0, 10000),
                data_source="Calculated",
                calculation_method="Total prompts in period / Total users in period",
                allow_zero=True
            )
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Total Prompts", f"{prompt_metrics['total_prompts']:,}",
                    help="Total number of prompts generated in the selected period with applied filters (from save_enhance_prompt table)")
        with col2:
            st.metric("Prompts per User", f"{prompt_metrics['prompts_per_user']:.2f}",
                    help="Average prompts per user in the period. Formula: Total prompts in period / Total users in period")
        
        # Prompt activity visualization
        if prompt_metrics['total_prompts'] > 0:
            activity_data = pd.DataFrame({
                'Metric': ['Total Prompts'],
                'Count': [prompt_metrics['total_prompts']]
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
                st.plotly_chart(fig, use_container_width=True, key="engagement_prompt_activity_bar")
            
            with col2:
                # Prompt generation trend over time
                from dashboard_queries import get_daily_usage_intensity
                usage_df = get_daily_usage_intensity(effective_start, effective_end)
                if not usage_df.empty and 'usage_date' in usage_df.columns:
                    fig = px.line(
                        usage_df,
                        x='usage_date',
                        y='total_actions',
                        title="Daily Prompt Generation Trend",
                        labels={'usage_date': 'Date', 'total_actions': 'Total Prompts Generated'},
                        markers=True
                    )
                    fig.update_layout(height=400)
                    st.plotly_chart(fig, use_container_width=True, key="engagement_prompt_trend_line")
                else:
                    st.info("Usage trend data not available for the selected period.")
        else:
            st.info("No prompt activity data available for the selected period.")


def show_lead_generation_section(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show lead generation metrics (GA-style)."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    # Date filter for this section
    preset, section_start, section_end = section_date_filter("lead_generation", "Last 7 Days")
    effective_start = section_start if section_start else start_date
    effective_end = section_end if section_end else end_date
    
    st.markdown("### 0.1 New vs Returning Users")
    
    with st.spinner("Loading new vs returning users..."):
        activation_funnel = get_user_activation_funnel(effective_start, effective_end)
        
        # Activation Funnel Insights
        insights = []
        never_pct = activation_funnel.get('never_activated_pct', 0.0)
        day_0_pct = activation_funnel.get('day_0_only_pct', 0.0)
        returned_pct = activation_funnel.get('returned_later_pct', 0.0)

        if never_pct > 50:
            insights.append(f"🔴 **Critical Onboarding Issue:** {never_pct:.1f}% of users never activate - major barrier to adoption")
        elif never_pct > 30:
            insights.append(f"⚠️ **Onboarding Challenge:** {never_pct:.1f}% of users never activate - review signup flow")

        if returned_pct > 40:
            insights.append(f"✅ **Strong Retention:** {returned_pct:.1f}% of users return after signup - good product-market fit")
        elif returned_pct < 20:
            insights.append(f"⚠️ **Retention Opportunity:** Only {returned_pct:.1f}% return after signup - improve user value delivery")

        if insights:
            st.info("💡 **Insights:** " + " | ".join(insights))

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Never Activated", f"{activation_funnel['never_activated']:,}",
                    help="Users who signed up but never generated any prompts")
        with col2:
            st.metric("Day 0 Only", f"{activation_funnel['day_0_only']:,}",
                    help="Users who activated only on their signup day")
        with col3:
            st.metric("Returned Later", f"{activation_funnel['returned_later']:,}",
                    help="Users who returned and used the product after their signup day")

        # Visualization
        fig = px.pie(
            values=[activation_funnel['never_activated'], activation_funnel['day_0_only'], activation_funnel['returned_later']],
            names=['Never Activated', 'Day 0 Only', 'Returned Later'],
            title="User Activation Funnel",
            color_discrete_map={
                'Never Activated': '#d62728',
                'Day 0 Only': '#ff7f0e',
                'Returned Later': '#2ca02c'
            }
        )
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True, key="lead_activation_funnel_pie")
    
    st.markdown("### 0.2 Traffic Sources")
    
    with st.spinner("Loading traffic sources..."):
        sources_df = get_traffic_sources(effective_start, effective_end)
        
        # Traffic Source Insights
        if not sources_df.empty:
            top_source = sources_df.iloc[0]
            top_source_pct = (top_source['user_count'] / sources_df['user_count'].sum()) * 100
            
            insights = []
            if top_source_pct > 60:
                insights.append(f"⚠️ **Over-reliance on Single Channel:** {top_source['source']} accounts for {top_source_pct:.1f}% of users - diversify acquisition channels to reduce risk")
            elif top_source_pct < 30:
                insights.append(f"✅ **Diversified Acquisition:** Top source ({top_source['source']}) is {top_source_pct:.1f}% - healthy channel diversification")
            
            if len(sources_df) > 1:
                second_source = sources_df.iloc[1] if len(sources_df) > 1 else None
                if second_source is not None:
                    gap = top_source['user_count'] - second_source['user_count']
                    if gap > top_source['user_count'] * 0.5:
                        insights.append(f"💡 **Opportunity:** Large gap between top channels - consider investing more in {second_source['source']}")
            
            if insights:
                st.info("💡 **Insights:** " + " | ".join(insights))
        
        if not sources_df.empty:
            col1, col2 = st.columns([2, 1])
            
            with col1:
                # Bar chart
                fig = px.bar(
                    sources_df,
                    x='source',
                    y='user_count',
                    title="User Acquisition by Channel",
                    labels={'source': 'Traffic Source', 'user_count': 'Number of Users'},
                    color='user_count',
                    color_continuous_scale='Blues'
                )
                fig.update_layout(height=400, xaxis_tickangle=-45)
                st.plotly_chart(fig, use_container_width=True, key="lead_traffic_sources_bar")
            
            with col2:
                st.dataframe(sources_df, use_container_width=True, hide_index=True)
        else:
            st.info("No traffic source data available.")
    


def show_time_trends_section(start_date: Optional[datetime], end_date: Optional[datetime]):
    """Show time-based trends (28-day rolling, week-over-week)."""
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    
    # Date filter for this section
    preset, section_start, section_end = section_date_filter("time_trends", "Last 90 Days")
    effective_start = section_start if section_start else start_date
    effective_end = section_end if section_end else end_date
    
    st.markdown("### 5.1 28-Day Rolling Trends")
    
    with st.spinner("Loading 28-day rolling trends..."):
        trends_df = get_rolling_28day_trends(effective_start, effective_end)
        
        # Trend Insights
        if not trends_df.empty and len(trends_df) > 1:
            latest_avg = trends_df['rolling_28day_avg_signups'].iloc[0]
            previous_avg = trends_df['rolling_28day_avg_signups'].iloc[1] if len(trends_df) > 1 else latest_avg
            trend_change = ((latest_avg - previous_avg) / previous_avg * 100) if previous_avg > 0 else 0.0
            
            insights = []
            if trend_change > 10:
                insights.append(f"📈 **Strong Upward Trend:** 28-day average increased by {trend_change:.1f}% - positive momentum in user acquisition")
            elif trend_change < -10:
                insights.append(f"📉 **Declining Trend:** 28-day average decreased by {abs(trend_change):.1f}% - investigate acquisition challenges")
            
            if insights:
                st.info("💡 **Insights:** " + " | ".join(insights))
        
        if not trends_df.empty:
            # Line chart showing rolling average
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=trends_df['metric_date'],
                y=trends_df['daily_signups'],
                mode='lines+markers',
                name='Daily Signups',
                line=dict(color='#1f77b4', width=2)
            ))
            fig.add_trace(go.Scatter(
                x=trends_df['metric_date'],
                y=trends_df['rolling_28day_avg_signups'],
                mode='lines',
                name='28-Day Rolling Average',
                line=dict(color='#ff7f0e', width=3, dash='dash')
            ))
            fig.update_layout(
                title="28-Day Rolling Trends: Signups",
                xaxis_title="Date",
                yaxis_title="Number of Signups",
                height=400,
                hovermode='x unified'
            )
            st.plotly_chart(fig, use_container_width=True, key="trends_28day_rolling")
            
        else:
            st.info("No rolling trend data available.")
    
    st.markdown("### 5.2 Week-over-Week Comparison")
    st.info("📊 **Note:** Week-over-week comparison is a diagnostic signal for spotting short-term momentum, not a success metric. WoW percentages can be misleading at low scale and should always be read alongside absolute numbers and retention metrics (like DAU/MAU), otherwise growth can look healthy even when underlying engagement is weak.")

    with st.spinner("Loading week-over-week comparison..."):
        wow = get_week_over_week_comparison(effective_start, effective_end)
        
        # Week-over-Week Insights
        if wow.get('current_week'):
            signup_change = wow['change_pct'].get('signups', 0.0)
            insights = []
            
            if signup_change > 20:
                insights.append(f"🚀 **Exceptional Growth:** Signups increased {signup_change:+.1f}% week-over-week - excellent performance")
            elif signup_change < -20:
                insights.append(f"🔴 **Significant Decline:** Signups decreased {signup_change:+.1f}% week-over-week - investigate immediately")
            elif signup_change > 0:
                insights.append(f"✅ **Positive Growth:** Signups up {signup_change:+.1f}% - healthy week-over-week growth")
            elif signup_change < 0:
                insights.append(f"⚠️ **Declining Signups:** Signups down {abs(signup_change):.1f}% - review acquisition channels and campaigns")
            
            if insights:
                st.info("💡 **Insights:** " + " | ".join(insights))
        
        if wow.get('current_week'):
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Current Week Signups", f"{wow['current_week'].get('signups', 0):,}",
                        help="Number of signups in the current week (Monday-Sunday)")
            with col2:
                st.metric("Previous Week Signups", f"{wow['previous_week'].get('signups', 0):,}",
                        help="Number of signups in the previous week")
            with col3:
                signup_change = wow['change_pct'].get('signups', 0.0)
                st.metric("Signups Change", f"{signup_change:+.1f}%",
                        help="**DIAGNOSTIC SIGNAL (not success metric):** Week-over-week change in signups. WoW percentages can be misleading at low scale and should always be read alongside absolute numbers and retention metrics (like DAU/MAU), otherwise growth can look healthy even when underlying engagement is weak. Formula: ((Current week - Previous week) / Previous week) × 100")
            
            # Comparison chart
            comparison_df = pd.DataFrame({
                'Week': ['Previous Week', 'Current Week'],
                'Signups': [wow['previous_week'].get('signups', 0), wow['current_week'].get('signups', 0)],
                'Active Users': [wow['previous_week'].get('active_users', 0), wow['current_week'].get('active_users', 0)]
            })
            
            fig = go.Figure()
            fig.add_trace(go.Bar(
                name='Signups',
                x=comparison_df['Week'],
                y=comparison_df['Signups'],
                marker_color='#1f77b4'
            ))
            fig.add_trace(go.Bar(
                name='Active Users',
                x=comparison_df['Week'],
                y=comparison_df['Active Users'],
                marker_color='#2ca02c'
            ))
            fig.update_layout(
                title="Week-over-Week Comparison",
                xaxis_title="Week",
                yaxis_title="Count",
                barmode='group',
                height=400
            )
            st.plotly_chart(fig, use_container_width=True, key="trends_wow_comparison")
        else:
            st.info("No week-over-week comparison data available.")
    

