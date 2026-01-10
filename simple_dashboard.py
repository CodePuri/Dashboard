"""
Prompt Review Dashboard - Simple Dashboard showing prompt reviews with user information
Run this file with: streamlit run simple_dashboard.py
"""

import streamlit as st
import pandas as pd
from datetime import datetime
import logging
import plotly.express as px
from typing import List, Dict
import os

# Theme management
from theme_utils import (
    init_theme, 
    toggle_theme, 
    is_dark_mode, 
    get_theme_colors,
    get_plotly_template,
    get_plotly_layout_overrides,
    inject_theme_css,
    render_theme_toggle
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page configuration - MUST be first
st.set_page_config(
    page_title="PostgreSQL Analytics Dashboard",
    page_icon="📊",
    
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Try to import database manager
try:
    from database import db_manager
    DATABASE_AVAILABLE = db_manager is not None and (hasattr(db_manager, 'is_configured') and db_manager.is_configured)
except Exception as e:
    logger.error(f"Database import failed: {e}")
    db_manager = None
    DATABASE_AVAILABLE = False

def show_configuration_help():
    """Show database configuration help."""
    st.markdown('<div class="main-header">🔧 Database Configuration Required</div>', unsafe_allow_html=True)
    
    st.warning("⚠️ Database configuration is missing or incomplete!")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 📋 Configuration Status")
        if db_manager:
            config_status = db_manager.get_configuration_status()
            if config_status['missing_fields']:
                st.error(f"❌ Missing: {', '.join(config_status['missing_fields'])}")
            
            st.markdown("### ✅ Available Configuration")
            for key, available in config_status['available_config'].items():
                status = "✅" if available else "❌"
                st.write(f"{status} {key.upper()}: {'Configured' if available else 'Missing'}")
            
            password_status = "✅" if config_status['password_configured'] else "❌"
            st.write(f"{password_status} PASSWORD: {'Configured' if config_status['password_configured'] else 'Missing'}")
        else:
            st.error("❌ Database manager could not be initialized")
    
    with col2:
        st.markdown("### 🔧 How to Configure")
        
        tab1, tab2 = st.tabs(["Streamlit Cloud", "Local Development"])
        
        with tab1:
            st.markdown("""
            **For Streamlit Cloud deployment:**
            
            1. Go to your app dashboard
            2. Click **"⚙️ Settings"** (or "Manage app")
            3. Click **"Secrets"** in the sidebar
            4. Add your database configuration:
            
            ```toml
            DB_HOST = "your_database_host"
            DB_PORT = "5432"
            DB_NAME = "your_database_name"
            DB_USER = "your_username"
            DB_PASSWORD = "your_password"
            DB_SSL_MODE = "prefer"
            ```
            
            5. Click **"Save"**
            6. **Reboot** the app
            """)
            
            st.info("💡 **Tip**: Make sure your database allows connections from Streamlit Cloud's IP ranges.")
        
        with tab2:
            st.markdown("""
            **For local development:**
            
            1. Create a `.env` file in your project directory
            2. Add your database configuration:
            
            ```env
            DB_HOST=your_database_host
            DB_PORT=5432
            DB_NAME=your_database_name
            DB_USER=your_username
            DB_PASSWORD=your_password
            DB_SSL_MODE=prefer
            ```
            
            3. Restart the application
            """)
            
            st.info("💡 **Tip**: Use the `start_dashboard.bat` or `start_dashboard.sh` scripts for easier setup.")
    
    st.markdown("### 🔍 Testing Connection")
    if st.button("🔄 Test Database Connection"):
        if db_manager and db_manager.is_configured:
            if db_manager.test_connection():
                st.success("✅ Database connection successful!")
                st.rerun()
            else:
                st.error("❌ Database connection failed. Check your configuration and network connectivity.")
        else:
            st.error("❌ Database not configured. Please add your database secrets first.")
    
    st.markdown("---")
    st.markdown("### 📚 Need Help?")
    st.markdown("""
    - **Documentation**: Check the `DEPLOYMENT.md` file
    - **Troubleshooting**: See `DEPENDENCY_TROUBLESHOOTING.md`
    - **Local Setup**: Use the provided startup scripts
    """)

# Initialize theme and inject dynamic CSS
init_theme()
inject_theme_css()

DATE_FILTER_OPTIONS = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "All Time"]


def build_date_filter_condition(column_expression: str, preset: str) -> str:
    """Return SQL snippet for the selected date preset."""
    if not preset or preset == "All Time":
        return ""
    
    mapping = {
        "Today": lambda col: f"DATE({col} AT TIME ZONE 'UTC') = CURRENT_DATE",
        "Yesterday": lambda col: f"DATE({col} AT TIME ZONE 'UTC') = CURRENT_DATE - INTERVAL '1 day'",
        "Last 7 Days": lambda col: f"{col} >= (CURRENT_TIMESTAMP - INTERVAL '7 days')",
        "Last 30 Days": lambda col: f"{col} >= (CURRENT_TIMESTAMP - INTERVAL '30 days')",
    }
    
    builder = mapping.get(preset)
    return builder(column_expression) if builder else ""


def render_date_filter_control(
    section_key: str,
    label: str = "📆 Date Range",
    default: str = "Last 7 Days"
) -> str:
    """Render a reusable radio control for date presets."""
    default_index = DATE_FILTER_OPTIONS.index(default) if default in DATE_FILTER_OPTIONS else 0
    return st.radio(
        label,
        DATE_FILTER_OPTIONS,
        horizontal=True,
        index=default_index,
        key=f"{section_key}_date_filter"
    )


def filter_dataframe_by_search(df: pd.DataFrame, query: str, columns: List[str]) -> pd.DataFrame:
    """Filter dataframe rows where any specified column contains the query."""
    if not query:
        return df
    
    mask = pd.Series(False, index=df.index)
    for col in columns:
        if col in df.columns:
            mask = mask | df[col].astype(str).str.contains(query, case=False, na=False)
    return df[mask]


def perform_global_search(search_text: str) -> Dict[str, pd.DataFrame]:
    """Run a targeted global search across joined prompt/user tables."""
    if not DATABASE_AVAILABLE or not search_text:
        return {}
    
    like_pattern = f"%{search_text}%"
    
    query = """
    SELECT 
        u.user_id,
        u.name,
        u.email,
        up.user_prompt,
        sep.enhanced_prompt,
        sep.created_at AS prompt_created_at,
        sep.llm_used,
        sep.intent,
        sep.domain,
        sep.complexity,
        sep.mode,
        COUNT(sep.enhanced_prompt_id) OVER (
            PARTITION BY COALESCE(sep.user_id, up.user_id)
        ) AS total_prompts
    FROM public.save_enhance_prompt sep
    LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    LEFT JOIN public.usertable u ON COALESCE(sep.user_id, up.user_id) = u.user_id
    WHERE 
        (u.name ILIKE :pattern OR u.email ILIKE :pattern)
        OR (up.user_prompt ILIKE :pattern)
        OR (sep.enhanced_prompt ILIKE :pattern)
        OR (sep.intent ILIKE :pattern)
        OR (sep.domain ILIKE :pattern)
        OR (sep.llm_used ILIKE :pattern)
        OR (sep.mode ILIKE :pattern)
    ORDER BY sep.created_at DESC
    LIMIT 50
    """
    
    results = {}
    try:
        df = db_manager.execute_query(query, params={"pattern": like_pattern})
        if not df.empty:
            results["Global Matches"] = df
    except Exception as e:
        logger.error(f"Global search query failed: {e}")
    
    return results


def get_prompt_reviews(date_filter: str = "Last 7 Days"):
    """Get prompts with enhanced data and user info (user_prompts ↔ save_enhance_prompt)."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_filter_condition("sep.created_at", date_filter)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    query = """
    SELECT 
        u.name AS user_name,
        u.email,
        up.user_prompt AS prompt,
        sep.enhanced_prompt,
        sep.created_at,
        sep.domain,
        sep.intent,
        sep.llm_used,
        sep.mode,
        sep.user_status,
        sep.processing_time AS processing_time_ms,
        sep.metadata,
        up.prompt_id,
        sep.enhanced_prompt_id,
        rp.refine_question_1,
        rp.refine_question_2,
        rp.refine_answer_1,
        rp.refine_answer_2,
        rp.refined_prompt,
        rp.processing_time AS refine_processing_time,
        rp.refine_id,
        (up.prompt_id IS NOT NULL) AS has_user_prompt,
        (rp.refine_id IS NOT NULL) AS has_refinement
    FROM public.save_enhance_prompt sep
    LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    LEFT JOIN public.refine_prompt rp 
      ON (
           rp.prompt_id = up.prompt_id
        OR (rp.prompt_id IS NULL AND rp.enhanced_prompt_id = sep.enhanced_prompt_id)
      )
    LEFT JOIN public.usertable u ON COALESCE(sep.user_id, up.user_id) = u.user_id
    {where_clause}
    ORDER BY sep.created_at DESC
    """
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        logger.info(f"Prompt+enhanced query executed successfully, returned {len(df)} rows")
        return df
    except Exception as e:
        logger.error(f"Prompt+enhanced query failed: {e}")
        return pd.DataFrame()

def get_table_row_counts():
    """Return row counts for key tables to help diagnose empty results."""
    if not DATABASE_AVAILABLE:
        return {}
    counts = {}
    tables = [
        'usertable',
        'user_prompts',
        'save_enhance_prompt',
        'refine_prompt',
        'userstatus',
        'onboarding_data'
    ]
    for t in tables:
        try:
            df = db_manager.execute_query(f"SELECT COUNT(*) AS c FROM public.{t}")
            counts[t] = int(df.iloc[0]['c']) if not df.empty else 0
        except Exception as e:
            logger.error(f"Count failed for {t}: {e}")
            counts[t] = None
    return counts

def get_total_enhanced_prompts():
    """Get total count of enhanced prompts (save_enhance_prompt)."""
    if not DATABASE_AVAILABLE:
        return 0
        
    query = """
    SELECT COUNT(enhanced_prompt_id) AS total_prompts FROM save_enhance_prompt
    """
    try:
        df = db_manager.execute_query(query)
        return df.iloc[0]['total_prompts'] if not df.empty else 0
    except Exception as e:
        logger.error(f"Total enhanced prompts query failed: {e}")
        return 0

def get_avg_daily_users():
    """Get average daily users."""
    if not DATABASE_AVAILABLE:
        return 0
        
    query = """
    WITH daily_users AS (
        SELECT DATE_TRUNC('day', created_at) AS day, 
               COUNT(DISTINCT user_id) AS daily_count 
        FROM usertable 
        GROUP BY DATE_TRUNC('day', created_at)
    )
    SELECT AVG(daily_count) AS average_daily_users 
    FROM daily_users
    """
    try:
        df = db_manager.execute_query(query)
        return round(df.iloc[0]['average_daily_users'], 1) if not df.empty else 0
    except Exception as e:
        logger.error(f"Average daily users query failed: {e}")
        return 0

def get_avg_weekly_users():
    """Get average weekly users."""
    if not DATABASE_AVAILABLE:
        return 0
        
    query = """
    WITH daily_users AS (
        SELECT DATE_TRUNC('day', created_at) AS day, 
               COUNT(DISTINCT user_id) as daily_count 
        FROM usertable 
        GROUP BY DATE_TRUNC('day', created_at)
    ),
    weekly_users AS (
        SELECT DATE_TRUNC('week', day) AS week, 
               AVG(daily_count) as weekly_avg 
        FROM daily_users 
        GROUP BY DATE_TRUNC('week', day)
    )
    SELECT AVG(weekly_avg) AS average_weekly_users 
    FROM weekly_users
    """
    try:
        df = db_manager.execute_query(query)
        return round(df.iloc[0]['average_weekly_users'], 1) if not df.empty else 0
    except Exception as e:
        logger.error(f"Average weekly users query failed: {e}")
        return 0

def get_ai_usage_distribution(date_filter: str = "Last 30 Days"):
    """Get AI usage distribution for pie chart (save_enhance_prompt.llm_used)."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
        
    date_condition = build_date_filter_condition("sep.created_at", date_filter)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    query = """
    SELECT llm_used, COUNT(*) as count 
    FROM save_enhance_prompt sep
    {where_clause}
    GROUP BY llm_used 
    ORDER BY count DESC
    """
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.error(f"AI usage distribution query failed: {e}")
        return pd.DataFrame()

def get_retention_data(date_filter: str = "Last 30 Days"):
    """Get Day 1/7/30 retention data using save_enhance_prompt as activity."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    signup_condition = build_date_filter_condition("created_at", date_filter)
    signup_where = f"WHERE {signup_condition}" if signup_condition else ""
    query = """
    WITH signups AS (
      SELECT user_id, DATE(created_at) AS signup_date
      FROM public.usertable
      {signup_where}
    ),
    activity AS (
      SELECT COALESCE(sep.user_id, up.user_id) AS user_id, DATE(sep.created_at) AS activity_date
      FROM public.save_enhance_prompt sep
      LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    )
    SELECT 
      s.signup_date,
      COUNT(DISTINCT s.user_id) AS total_signed_up,
      COUNT(DISTINCT CASE WHEN a.activity_date = s.signup_date + INTERVAL '1 day' THEN a.user_id END) AS day_1_retention,
      COUNT(DISTINCT CASE WHEN a.activity_date = s.signup_date + INTERVAL '7 day' THEN a.user_id END) AS day_7_retention,
      COUNT(DISTINCT CASE WHEN a.activity_date = s.signup_date + INTERVAL '30 day' THEN a.user_id END) AS day_30_retention
    FROM signups s
    LEFT JOIN activity a ON s.user_id = a.user_id
    GROUP BY s.signup_date
    ORDER BY s.signup_date DESC
    LIMIT 30
    """
    try:
        df = db_manager.execute_query(query.format(signup_where=signup_where))
        return df
    except Exception as e:
        logger.error(f"Retention data query failed: {e}")
        return pd.DataFrame()

def get_cohort_analysis(date_filter: str = "Last 30 Days"):
    """Get cohort analysis data using save_enhance_prompt activity."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    signup_condition = build_date_filter_condition("created_at", date_filter)
    signup_where = f"WHERE {signup_condition}" if signup_condition else ""
    activity_condition = build_date_filter_condition("sep.created_at", date_filter)
    activity_where = f"WHERE {activity_condition}" if activity_condition else ""
    query = """
    WITH user_cohorts AS (
      SELECT user_id, DATE_TRUNC('week', created_at) AS cohort_week
      FROM public.usertable
      {signup_where}
    ),
    user_activity AS (
      SELECT DATE_TRUNC('week', sep.created_at) AS activity_week,
             COALESCE(sep.user_id, up.user_id) AS user_id
      FROM public.save_enhance_prompt sep
      LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
      {activity_where}
    )
    SELECT 
      uc.cohort_week,
      ua.activity_week,
      COUNT(DISTINCT ua.user_id) AS active_users
    FROM user_cohorts uc
    JOIN user_activity ua ON uc.user_id = ua.user_id
    GROUP BY uc.cohort_week, ua.activity_week
    ORDER BY uc.cohort_week, ua.activity_week
    """
    try:
        df = db_manager.execute_query(query.format(signup_where=signup_where, activity_where=activity_where))
        return df
    except Exception as e:
        logger.error(f"Cohort analysis query failed: {e}")
        return pd.DataFrame()

def get_churn_data(date_filter: str = "Last 30 Days"):
    """Get churn rate data using last activity from save_enhance_prompt."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    activity_condition = build_date_filter_condition("sep.created_at", date_filter)
    where_clause = f"AND {activity_condition}" if activity_condition else ""
    query = """
    SELECT 
      u.user_id,
      u.name,
      u.email,
      MAX(sep.created_at) AS last_active_date,
      CURRENT_DATE - MAX(sep.created_at::date) AS days_inactive
    FROM public.usertable u
    LEFT JOIN public.save_enhance_prompt sep 
      ON sep.user_id = u.user_id
    LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    WHERE 1=1 {where_clause}
    GROUP BY u.user_id, u.name, u.email
    HAVING MAX(sep.created_at) < CURRENT_DATE - INTERVAL '15 days' OR MAX(sep.created_at) IS NULL
    ORDER BY days_inactive DESC NULLS LAST
    LIMIT 100
    """
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.error(f"Churn data query failed: {e}")
        return pd.DataFrame()

def get_prompt_reuse_data(date_filter: str = "Last 30 Days"):
    """Get prompt reuse rate data based on save_enhance_prompt grouped by user."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame(), 0
    
    activity_condition = build_date_filter_condition("sep.created_at", date_filter)
    where_clause = f"WHERE {activity_condition}" if activity_condition else ""
    # Get user-wise prompt counts
    query1 = """
    SELECT 
      u.user_id,
      u.name,
      u.email,
      COUNT(*) AS total_prompts
    FROM public.save_enhance_prompt sep
    LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    JOIN public.usertable u ON COALESCE(sep.user_id, up.user_id) = u.user_id
    {where_clause}
    GROUP BY u.user_id, u.name, u.email
    HAVING COUNT(*) > 1
    ORDER BY total_prompts DESC
    LIMIT 50
    """
    
    # Get overall reuse rate
    query2 = """
    WITH prompt_counts AS (
      SELECT COALESCE(sep.user_id, up.user_id) AS user_id, COUNT(*) AS total_prompts
      FROM public.save_enhance_prompt sep
      LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
      {where_clause}
      GROUP BY COALESCE(sep.user_id, up.user_id)
    ),
    reusers AS (
      SELECT * FROM prompt_counts WHERE total_prompts > 1
    )
    SELECT 
      ROUND((SELECT COUNT(*) FROM reusers)::decimal / 
            (SELECT COUNT(*) FROM prompt_counts)::decimal * 100, 2) 
      AS reuse_rate_percent
    """
    
    try:
        df_users = db_manager.execute_query(query1.format(where_clause=where_clause))
        df_rate = db_manager.execute_query(query2.format(where_clause=where_clause))
        reuse_rate = df_rate.iloc[0]['reuse_rate_percent'] if not df_rate.empty else 0
        return df_users, reuse_rate
    except Exception as e:
        logger.error(f"Prompt reuse data query failed: {e}")
        return pd.DataFrame(), 0

def get_overall_retention_summary(date_filter: str = "Last 30 Days"):
    """Get overall retention summary metrics."""
    if not DATABASE_AVAILABLE:
        return {"day_1": 0, "day_7": 0, "day_30": 0}
    
    signup_condition = build_date_filter_condition("created_at", date_filter)
    signup_where = f"WHERE {signup_condition}" if signup_condition else ""
    query = """
    WITH signups AS (
      SELECT user_id, DATE(created_at) AS signup_date
      FROM public.usertable
      {signup_where}
    ),
    activity AS (
      SELECT COALESCE(sep.user_id, up.user_id) AS user_id, DATE(sep.created_at) AS activity_date
      FROM public.save_enhance_prompt sep
      LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    ),
    retention_calc AS (
      SELECT 
        COUNT(DISTINCT s.user_id) AS total_signed_up,
        COUNT(DISTINCT CASE WHEN a.activity_date = s.signup_date + INTERVAL '1 day' THEN a.user_id END) AS day_1_retention,
        COUNT(DISTINCT CASE WHEN a.activity_date = s.signup_date + INTERVAL '7 day' THEN a.user_id END) AS day_7_retention,
        COUNT(DISTINCT CASE WHEN a.activity_date = s.signup_date + INTERVAL '30 day' THEN a.user_id END) AS day_30_retention
      FROM signups s
      LEFT JOIN activity a ON s.user_id = a.user_id
    )
    SELECT 
      ROUND((day_1_retention::decimal / NULLIF(total_signed_up, 0)) * 100, 1) AS day_1_percent,
      ROUND((day_7_retention::decimal / NULLIF(total_signed_up, 0)) * 100, 1) AS day_7_percent,
      ROUND((day_30_retention::decimal / NULLIF(total_signed_up, 0)) * 100, 1) AS day_30_percent
    FROM retention_calc
    """
    
    try:
        df = db_manager.execute_query(query.format(signup_where=signup_where))
        if not df.empty:
            return {
                "day_1": df.iloc[0]['day_1_percent'] or 0,
                "day_7": df.iloc[0]['day_7_percent'] or 0,
                "day_30": df.iloc[0]['day_30_percent'] or 0
            }
        return {"day_1": 0, "day_7": 0, "day_30": 0}
    except Exception as e:
        logger.error(f"Overall retention summary query failed: {e}")
        return {"day_1": 0, "day_7": 0, "day_30": 0}

def get_total_users():
    """Get total count of users."""
    if not DATABASE_AVAILABLE:
        return 0
        
    query = """
    SELECT COUNT(DISTINCT user_id) AS total_users 
    FROM usertable 
    LIMIT 100
    """
    try:
        df = db_manager.execute_query(query)
        return df.iloc[0]['total_users'] if not df.empty else 0
    except Exception as e:
        logger.error(f"Total users query failed: {e}")
        return 0

def get_user_table_data(date_filter: str = "Last 7 Days"):
    """Get user table data with signup and installation info."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()

    date_condition = build_date_filter_condition("created_at", date_filter)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
        
    query = """
    SELECT 
        name, 
        email, 
        created_at AS signup_at, 
        installed
    FROM public.usertable
    {where_clause}
    ORDER BY created_at DESC
    LIMIT 100
    """
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.error(f"User table query failed: {e}")
        return pd.DataFrame()

def get_user_table_full(date_filter: str = "Last 7 Days"):
    """Get full usertable with the requested columns."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()

    date_condition = build_date_filter_condition("created_at", date_filter)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    query = """
    SELECT 
        user_id,
        name,
        email,
        password,
        google_id,
        profile_img_url,
        tutorial,
        email_verified,
        installed,
        created_at,
        updated_at
    FROM public.usertable
    {where_clause}
    ORDER BY created_at DESC
    LIMIT 1000
    """
    try:
        formatted_query = query.format(where_clause=where_clause)
        return db_manager.execute_query(formatted_query)
    except Exception as e:
        logger.error(f"Full usertable query failed: {e}")
        logger.error(f"Query was: {query.format(where_clause=where_clause)}")
        # Store error for UI display
        st.session_state['user_table_error'] = str(e)
        st.session_state['user_table_query'] = query.format(where_clause=where_clause)
        return pd.DataFrame()

def get_onboarding_data(date_filter: str = "Last 7 Days"):
    """Get onboarding_data (joined with user info when possible)."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()

    date_condition = build_date_filter_condition("ob.created_at", date_filter)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    # Preferred joined query
    query_joined = """
    SELECT 
        ob.id,
        ob.user_id,
        u.name,
        u.email,
        ob.llm_platform,
        ob.occupation,
        ob.source,
        ob.problems_faced,
        ob.use_case,
        ob.ai_familiarity
    FROM public.onboarding_data ob
    LEFT JOIN public.usertable u ON ob.user_id = u.user_id
    {where_clause}
    ORDER BY ob.id DESC
    LIMIT 1000
    """
    # Fallback simple select if the joined query fails (schema drift safety)
    query_simple = """
    SELECT *
    FROM public.onboarding_data ob
    {where_clause}
    ORDER BY ob.id DESC
    LIMIT 1000
    """
    try:
        return db_manager.execute_query(query_joined.format(where_clause=where_clause))
    except Exception as e:
        logger.error(f"Onboarding data joined query failed: {e}")
        try:
            return db_manager.execute_query(query_simple.format(where_clause=where_clause))
        except Exception as e2:
            logger.error(f"Onboarding data simple query failed: {e2}")
            return pd.DataFrame()

def get_signup_trends(date_filter: str = "Last 30 Days"):
    """Get daily signup trends."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    signup_condition = build_date_filter_condition("created_at", date_filter)
    signup_where = f"WHERE {signup_condition}" if signup_condition else ""
    query = """
    SELECT 
        DATE(created_at) AS signup_date,
        COUNT(*) AS daily_signups,
        COUNT(CASE WHEN installed = true THEN 1 END) AS daily_installations,
        ROUND(COUNT(CASE WHEN installed = true THEN 1 END)::decimal / COUNT(*)::decimal * 100, 1) AS installation_rate
    FROM public.usertable
    {signup_where}
    GROUP BY DATE(created_at)
    ORDER BY signup_date DESC
    LIMIT 30
    """
    try:
        df = db_manager.execute_query(query.format(signup_where=signup_where))
        return df
    except Exception as e:
        logger.error(f"Signup trends query failed: {e}")
        return pd.DataFrame()

def get_user_summary_stats():
    """Get overall user statistics."""
    if not DATABASE_AVAILABLE:
        return {"total_users": 0, "installed_users": 0, "installation_rate": 0, "recent_signups": 0}
        
    query = """
    SELECT 
        COUNT(*) AS total_users,
        COUNT(CASE WHEN installed = true THEN 1 END) AS installed_users,
        ROUND(COUNT(CASE WHEN installed = true THEN 1 END)::decimal / COUNT(*)::decimal * 100, 1) AS installation_rate,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) AS recent_signups
    FROM public.usertable
    """
    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            return {
                "total_users": df.iloc[0]['total_users'] or 0,
                "installed_users": df.iloc[0]['installed_users'] or 0,
                "installation_rate": df.iloc[0]['installation_rate'] or 0,
                "recent_signups": df.iloc[0]['recent_signups'] or 0
            }
        return {"total_users": 0, "installed_users": 0, "installation_rate": 0, "recent_signups": 0}
    except Exception as e:
        logger.error(f"User summary stats query failed: {e}")
        return {"total_users": 0, "installed_users": 0, "installation_rate": 0, "recent_signups": 0}

def get_weekly_signup_trends(date_filter: str = "Last 30 Days"):
    """Get weekly signup trends for chart."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    signup_condition = build_date_filter_condition("created_at", date_filter)
    signup_where = f"WHERE {signup_condition}" if signup_condition else ""
    query = """
    SELECT 
        DATE_TRUNC('week', created_at) AS week_start,
        COUNT(*) AS weekly_signups,
        COUNT(CASE WHEN installed = true THEN 1 END) AS weekly_installations
    FROM public.usertable
    {signup_where}
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week_start DESC
    LIMIT 12
    """
    try:
        df = db_manager.execute_query(query.format(signup_where=signup_where))
        return df
    except Exception as e:
        logger.error(f"Weekly signup trends query failed: {e}")
        return pd.DataFrame()

def get_installation_distribution(date_filter: str = "Last 30 Days"):
    """Get installation status distribution."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    signup_condition = build_date_filter_condition("created_at", date_filter)
    signup_where = f"WHERE {signup_condition}" if signup_condition else ""
    query = """
    SELECT 
        CASE WHEN installed = true THEN 'Installed' ELSE 'Not Installed' END AS status,
        COUNT(*) AS count
    FROM public.usertable
    {signup_where}
    GROUP BY installed
    """
    try:
        df = db_manager.execute_query(query.format(signup_where=signup_where))
        return df
    except Exception as e:
        logger.error(f"Installation distribution query failed: {e}")
        return pd.DataFrame()

def get_user_status_data(date_filter: str = "Last 7 Days"):
    """Get userstatus table data with key columns."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()

    date_condition = build_date_filter_condition("COALESCE(updated_at, created_at)", date_filter)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    query = """
    SELECT 
        status_id,
        user_id,
        status,
        count,
        trial_started_at,
        trial_ended_at,
        has_used_trial,
        created_at,
        updated_at
    FROM public.userstatus
    {where_clause}
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 500
    """
    try:
        formatted_query = query.format(where_clause=where_clause)
        return db_manager.execute_query(formatted_query)
    except Exception as e:
        logger.error(f"User status query failed: {e}")
        logger.error(f"Query was: {query.format(where_clause=where_clause)}")
        # Store error for UI display
        st.session_state['user_status_error'] = str(e)
        st.session_state['user_status_query'] = query.format(where_clause=where_clause)
        return pd.DataFrame()

def show_prompt_reviews_table():
    """Display joined user_prompts ↔ save_enhance_prompt ↔ refine_prompt table."""
    st.markdown('<div class="section-header">📝 Joined Prompts (user_prompts ↔ save_enhance_prompt ↔ refine_prompt)</div>', unsafe_allow_html=True)
    st.info("Relationship: user_prompts.prompt_id → save_enhance_prompt.prompt_id; refine_prompt links by prompt_id (primary) or enhanced_prompt_id (fallback).")
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Please configure your database connection to view data.")
        return
    
    filter_col, search_col = st.columns([3, 2])
    with filter_col:
        date_filter = render_date_filter_control("prompt_reviews", label="📆 Date Range")
    with search_col:
        search_query = st.text_input(
            "🔎 Search",
            "",
            placeholder="Name, email, prompt text..."
        )
    reviews_data = get_prompt_reviews(date_filter)
    if not reviews_data.empty and search_query:
        reviews_data = filter_dataframe_by_search(
            reviews_data,
            search_query,
            [
                'user_name',
                'email',
                'prompt',
                'enhanced_prompt',
                'refined_prompt',
                'intent',
                'domain'
            ]
        )
        if reviews_data.empty:
            st.info("No records match the current search.")
            return
    if reviews_data.empty:
        st.warning("No prompt detail data available")
        # Diagnostics: show table counts and small previews
        counts = get_table_row_counts()
        if counts:
            st.info(
                " | ".join([
                    f"usertable: {counts.get('usertable', 'n/a')}",
                    f"user_prompts: {counts.get('user_prompts', 'n/a')}",
                    f"save_enhance_prompt: {counts.get('save_enhance_prompt', 'n/a')}",
                    f"refine_prompt: {counts.get('refine_prompt', 'n/a')}",
                    f"userstatus: {counts.get('userstatus', 'n/a')}",
                    f"onboarding_data: {counts.get('onboarding_data', 'n/a')}"
                ])
            )
        try:
            tab1, tab2 = st.tabs(["user_prompts (first 10)", "save_enhance_prompt (first 10)"])
            with tab1:
                up_df = db_manager.execute_query("""
                    SELECT prompt_id, user_id, user_prompt, created_at 
                    FROM public.user_prompts ORDER BY created_at DESC LIMIT 10
                """)
                st.dataframe(up_df, use_container_width=True, hide_index=True)
            with tab2:
                sep_df = db_manager.execute_query("""
                    SELECT enhanced_prompt_id, prompt_id, user_id, enhanced_prompt, processing_time, intent, llm_used, mode, created_at 
                    FROM public.save_enhance_prompt ORDER BY created_at DESC LIMIT 10
                """)
                st.dataframe(sep_df, use_container_width=True, hide_index=True)
        except Exception:
            pass
        return
    
    # Format the data for display
    display_df = reviews_data.copy()
    
    # Handle datetime conversion properly - format to show only up to hour
    try:
        display_df['created_at'] = pd.to_datetime(display_df['created_at'], utc=True).dt.strftime('%Y-%m-%d %H:00')
    except Exception as e:
        logger.error(f"Date conversion failed: {e}")
        display_df['created_at'] = display_df['created_at'].astype(str)
    
    # Truncate long prompts for better display
    display_df['prompt_preview'] = display_df['prompt'].astype(str).apply(
        lambda x: x[:100] + "..." if len(str(x)) > 100 else str(x)
    )
    display_df['enhanced_preview'] = display_df['enhanced_prompt'].astype(str).apply(
        lambda x: x[:100] + "..." if len(str(x)) > 100 else str(x)
    )
    if 'refined_prompt' in display_df.columns:
        display_df['refined_preview'] = display_df['refined_prompt'].astype(str).apply(
            lambda x: x[:100] + "..." if len(str(x)) > 100 else str(x)
        )
    
    # Create final display dataframe with key fields from both tables
    cols_available = [c for c in [
        'user_name','email','prompt_id','enhanced_prompt_id','llm_used','mode','user_status','metadata',
        'prompt_preview','enhanced_preview','refined_preview','domain','intent','created_at','processing_time_ms',
        'refine_question_1','refine_question_2','refine_answer_1','refine_answer_2','refine_processing_time',
        'has_user_prompt','has_refinement'
    ] if c in display_df.columns]
    display_df_final = display_df[cols_available].copy()
    # Rename for readability when present
    rename_map = {
        'user_name': 'User Name',
        'email': 'Email',
        'prompt_id': 'Prompt ID',
        'enhanced_prompt_id': 'Enhanced Prompt ID',
        'llm_used': 'LLM Used',
        'mode': 'Mode',
        'user_status': 'User Status',
        'metadata': 'Metadata',
        'prompt_preview': 'Original Prompt',
        'enhanced_preview': 'Enhanced Prompt',
        'refined_preview': 'Refined Prompt',
        'domain': 'Domain',
        'intent': 'Intent',
        'created_at': 'Created At',
        'processing_time_ms': 'Processing Time (ms)',
        'refine_question_1': 'Refine Q1',
        'refine_question_2': 'Refine Q2',
        'refine_answer_1': 'Refine A1',
        'refine_answer_2': 'Refine A2',
        'refine_processing_time': 'Refine Processing (ms)',
        'has_user_prompt': 'Has User Prompt',
        'has_refinement': 'Has Refinement'
    }
    display_df_final = display_df_final.rename(columns={k:v for k,v in rename_map.items() if k in display_df_final.columns})
    
    # Show summary stats
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_reviews = len(reviews_data)
        st.metric("Total Entries", f"{total_reviews:,}")
    
    with col2:
        unique_users = reviews_data['user_name'].nunique()
        st.metric("Unique Users", f"{unique_users}")
    
    with col3:
        avg_processing_time = reviews_data['processing_time_ms'].mean() if 'processing_time_ms' in reviews_data.columns else 0
        st.metric("Avg Processing Time", f"{avg_processing_time:.1f}ms")
    
    with col4:
        if len(reviews_data) > 0:
            latest_date = reviews_data['created_at'].max()
            st.metric("Latest Entry", f"{pd.to_datetime(latest_date).strftime('%Y-%m-%d')}")
        else:
            st.metric("Latest Entry", "N/A")
    
    st.markdown("---")
    
    # Show the main table
    st.dataframe(
        display_df_final,
        use_container_width=True,
        hide_index=True,
        column_config={
            'User Name': st.column_config.TextColumn(
                'User Name',
                help='Name of the user who submitted the prompt',
                width='medium'
            ),
            'Prompt ID': st.column_config.NumberColumn('Prompt ID', format='%d') if 'Prompt ID' in display_df_final.columns else None,
            'Enhanced Prompt ID': st.column_config.NumberColumn('Enhanced Prompt ID', format='%d') if 'Enhanced Prompt ID' in display_df_final.columns else None,
            'Email': st.column_config.TextColumn(
                'Email',
                help='User email address',
                width='medium'
            ),
            'LLM Used': st.column_config.TextColumn('LLM Used', width='small') if 'LLM Used' in display_df_final.columns else None,
            'Mode': st.column_config.TextColumn('Mode', width='small') if 'Mode' in display_df_final.columns else None,
            'User Status': st.column_config.TextColumn('User Status', width='small') if 'User Status' in display_df_final.columns else None,
            'Metadata': st.column_config.TextColumn('Metadata', width='medium') if 'Metadata' in display_df_final.columns else None,
            'Original Prompt': st.column_config.TextColumn(
                'Original Prompt',
                help='Original prompt submitted by user (truncated)',
                width='large'
            ),
            'Enhanced Prompt': st.column_config.TextColumn(
                'Enhanced Prompt',
                help='AI-enhanced version of the prompt (truncated)',
                width='large'
            ),
            'Refined Prompt': st.column_config.TextColumn(
                'Refined Prompt',
                help='Final refined prompt (truncated)',
                width='large'
            ) if 'Refined Prompt' in display_df_final.columns else None,
            'Domain': st.column_config.TextColumn(
                'Domain',
                help='Domain of the prompt',
                width='medium'
            ),
            'Intent': st.column_config.TextColumn(
                'Intent',
                help='Intent of the prompt',
                width='medium'
            ),
            'Created At': st.column_config.TextColumn(
                'Created At',
                help='When the prompt was reviewed',
                width='medium'
            ),
            'Processing Time (ms)': st.column_config.NumberColumn(
                'Processing Time (ms)',
                help='Time taken to process the prompt',
                format='%.1f'
            )
        }
    )
    
    # Show expandable section with full prompt details for recent entries
    with st.expander("🔍 View Full Details of Recent Entries (Latest 10)"):
        recent_reviews = reviews_data.head(10)
        for idx, row in recent_reviews.iterrows():
            st.markdown(f"### Entry #{idx+1}")
            st.markdown(f"**User:** {row['user_name']} ({row['email']})")
            st.markdown(f"**Domain:** {row['domain']}")
            st.markdown(f"**Intent:** {row['intent']}")
            st.markdown(f"**Created:** {row['created_at']}")
            st.markdown(f"**Processing Time:** {row['processing_time_ms']}ms")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("**Original Prompt:**")
                st.text_area(f"Original {idx+1}", value=str(row['prompt']), height=150, disabled=True, key=f"original_{idx}")
            
            with col2:
                st.markdown("**Enhanced Prompt:**")
                st.text_area(f"Enhanced {idx+1}", value=str(row['enhanced_prompt']), height=150, disabled=True, key=f"enhanced_{idx}")
            
            if 'refined_prompt' in row and pd.notna(row['refined_prompt']):
                st.markdown("**Refined Prompt:**")
                st.text_area(f"Refined {idx+1}", value=str(row['refined_prompt']), height=150, disabled=True, key=f"refined_{idx}")
            
            st.markdown("---")

def show_user_prompts_table():
    """Display user_prompts raw table (first 50)."""
    st.markdown('<div class="section-header">🗒️ user_prompts (first 50)</div>', unsafe_allow_html=True)
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    try:
        up_df = db_manager.execute_query(
            """
            SELECT prompt_id, user_id, user_prompt, conversation_id, created_at, updated_at
            FROM public.user_prompts
            ORDER BY created_at DESC
            LIMIT 50
            """
        )
        st.dataframe(up_df, use_container_width=True, hide_index=True)
    except Exception as e:
        st.warning(f"Failed to load user_prompts: {e}")

def show_save_enhance_prompt_table():
    """Display save_enhance_prompt raw table (first 50)."""
    st.markdown('<div class="section-header">✨ save_enhance_prompt (first 50)</div>', unsafe_allow_html=True)
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    try:
        sep_df = db_manager.execute_query(
            """
            SELECT enhanced_prompt_id, prompt_id, user_id, enhanced_prompt, processing_time, intent,
                   llm_used, complexity, domain, mode, user_status, metadata, conversation_id, created_at, updated_at
            FROM public.save_enhance_prompt
            ORDER BY created_at DESC
            LIMIT 50
            """
        )
        st.dataframe(sep_df, use_container_width=True, hide_index=True)
    except Exception as e:
        st.warning(f"Failed to load save_enhance_prompt: {e}")

def show_refine_prompt_table():
    """Display refine_prompt raw table (first 50)."""
    st.markdown('<div class="section-header">🧪 refine_prompt (first 50)</div>', unsafe_allow_html=True)
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured.")
        return
    try:
        rp_df = db_manager.execute_query(
            """
            SELECT refine_id, prompt_id, enhanced_prompt_id, refine_question_1, refine_question_2,
                   refine_answer_1, refine_answer_2, refined_prompt, processing_time, created_at, updated_at
            FROM public.refine_prompt
            ORDER BY created_at DESC
            LIMIT 50
            """
        )
        st.dataframe(rp_df, use_container_width=True, hide_index=True)
    except Exception as e:
        st.warning(f"Failed to load refine_prompt: {e}")

def show_all_tables_section():
    """Display a list of all database tables and their columns."""
    st.markdown('<div class="section-header">📚 All Tables</div>', unsafe_allow_html=True)
    if not DATABASE_AVAILABLE:
        st.info("Database not configured.")
        return
    try:
        schema_info = db_manager.get_schema_info()
        if not schema_info:
            st.info("No tables found.")
            return
        import pandas as pd
        # Restrict to the requested tables and list all their columns
        whitelist_tables = {
            'usertable',
            'onboarding_data',
            'userstatus',
            'save_enhance_prompt',
            'user_prompts',
            'refine_prompt'
        }
        # Row counts for nicer display
        counts = get_table_row_counts()
        rows = []
        for table_name, columns in schema_info.items():
            if table_name in whitelist_tables:
                col_names = [c.get('name', '') for c in columns]
                rows.append({
                    "Table": table_name,
                    "Columns": ", ".join(col_names),
                    "Rows": counts.get(table_name)
                })

        if not rows:
            st.info("No matching tables found.")
            return

        df = pd.DataFrame(rows).sort_values("Table")
        st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
            column_config={
                'Table': st.column_config.TextColumn('Table', width='small'),
                'Rows': st.column_config.NumberColumn('Rows', format='%d'),
                'Columns': st.column_config.TextColumn('Columns', width='large')
            }
        )
    except Exception as e:
        st.warning(f"Unable to load tables: {e}")

def show_ai_usage_chart():
    """Display AI usage distribution as pie chart."""
    st.markdown('<div class="section-header">🤖 AI Usage Distribution</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display AI usage data.")
        return
    
    date_filter = render_date_filter_control("ai_usage", label="📆 Date Range", default="Last 30 Days")
    ai_data = get_ai_usage_distribution(date_filter)
    if ai_data.empty:
        st.warning("No AI usage data available")
        return
    
    # Create pie chart
    import plotly.express as px
    
    fig = px.pie(ai_data, 
                 values='count', 
                 names='llm_used',
                 title='AI Models Usage Distribution',
                 color_discrete_sequence=px.colors.qualitative.Set3,
                 template=get_plotly_template())
    
    fig.update_traces(textposition='inside', textinfo='percent+label')
    fig.update_layout(
        showlegend=True,
        height=400,
        title_x=0.5,
        font=dict(size=12),
        **get_plotly_layout_overrides()
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Show summary table
    st.markdown("### 📊 AI Usage Summary")
    ai_summary = ai_data.copy()
    ai_summary['percentage'] = (ai_summary['count'] / ai_summary['count'].sum() * 100).round(1)
    ai_summary.columns = ['AI Model', 'Usage Count', 'Percentage (%)']
    st.dataframe(ai_summary, use_container_width=True, hide_index=True)

def show_retention_analysis():
    """Display retention analysis with metrics and detailed data."""
    st.markdown('<div class="section-header">🔁 User Retention Analysis</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display retention data.")
        return
    
    date_filter = render_date_filter_control("retention", label="📆 Date Range", default="Last 30 Days")
    # Get retention summary for metrics
    retention_summary = get_overall_retention_summary(date_filter)
    
    # Show summary metrics
    st.markdown("### 📈 Overall Retention Rates")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            label="Day 1 Retention",
            value=f"{retention_summary['day_1']}%",
            help="Percentage of users who return within 1 day of signup"
        )
    
    with col2:
        st.metric(
            label="Day 7 Retention", 
            value=f"{retention_summary['day_7']}%",
            help="Percentage of users who return within 7 days of signup"
        )
    
    with col3:
        st.metric(
            label="Day 30 Retention",
            value=f"{retention_summary['day_30']}%", 
            help="Percentage of users who return within 30 days of signup"
        )
    
    # Get detailed retention data
    retention_data = get_retention_data(date_filter)
    if not retention_data.empty:
        st.markdown("### 📅 Daily Retention Breakdown (Last 30 Days)")
        
        # Add calculated percentage columns
        retention_display = retention_data.copy()
        retention_display['day_1_percent'] = (retention_display['day_1_retention'] / retention_display['total_signed_up'] * 100).round(1)
        retention_display['day_7_percent'] = (retention_display['day_7_retention'] / retention_display['total_signed_up'] * 100).round(1)
        retention_display['day_30_percent'] = (retention_display['day_30_retention'] / retention_display['total_signed_up'] * 100).round(1)
        
        # Format for display
        retention_display.columns = ['Signup Date', 'Total Signups', 'Day 1 Users', 'Day 7 Users', 'Day 30 Users', 'Day 1 %', 'Day 7 %', 'Day 30 %']
        
        st.dataframe(
            retention_display,
            use_container_width=True,
            hide_index=True,
            column_config={
                'Signup Date': st.column_config.DateColumn(
                    'Signup Date',
                    help='Date when users signed up'
                ),
                'Total Signups': st.column_config.NumberColumn(
                    'Total Signups',
                    help='Number of users who signed up on this date',
                    format='%d'
                ),
                'Day 1 Users': st.column_config.NumberColumn(
                    'Day 1 Users',
                    help='Users who returned on day 1',
                    format='%d'
                ),
                'Day 7 Users': st.column_config.NumberColumn(
                    'Day 7 Users', 
                    help='Users who returned on day 7',
                    format='%d'
                ),
                'Day 30 Users': st.column_config.NumberColumn(
                    'Day 30 Users',
                    help='Users who returned on day 30',
                    format='%d'
                ),
                'Day 1 %': st.column_config.NumberColumn(
                    'Day 1 %',
                    help='Day 1 retention percentage',
                    format='%.1f%%'
                ),
                'Day 7 %': st.column_config.NumberColumn(
                    'Day 7 %',
                    help='Day 7 retention percentage', 
                    format='%.1f%%'
                ),
                'Day 30 %': st.column_config.NumberColumn(
                    'Day 30 %',
                    help='Day 30 retention percentage',
                    format='%.1f%%'
                )
            }
        )

def show_cohort_analysis():
    """Display cohort analysis."""
    st.markdown('<div class="section-header">📆 Cohort Analysis</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display cohort data.")
        return
    
    date_filter = render_date_filter_control("cohort", label="📆 Date Range", default="Last 30 Days")
    cohort_data = get_cohort_analysis(date_filter)
    if cohort_data.empty:
        st.warning("No cohort data available")
        return
    
    st.markdown("### 📊 Weekly Cohort Activity")
    st.info("📘 This shows how many users from each signup week remain active in subsequent weeks.")
    
    # Create pivot table for better visualization
    if len(cohort_data) > 0:
        try:
            # Convert to datetime for proper sorting
            cohort_data['cohort_week'] = pd.to_datetime(cohort_data['cohort_week'])
            cohort_data['activity_week'] = pd.to_datetime(cohort_data['activity_week'])
            
            # Create pivot table
            pivot_data = cohort_data.pivot_table(
                index='cohort_week',
                columns='activity_week', 
                values='active_users',
                fill_value=0
            )
            
            # Display as heatmap if we have plotly
            try:
                import plotly.graph_objects as go
                
                colors = get_theme_colors()
                
                fig = go.Figure(data=go.Heatmap(
                    z=pivot_data.values,
                    x=[col.strftime('%Y-%m-%d') for col in pivot_data.columns],
                    y=[idx.strftime('%Y-%m-%d') for idx in pivot_data.index],
                    colorscale='Blues' if not is_dark_mode() else 'Viridis',
                    text=pivot_data.values,
                    texttemplate="%{text}",
                    textfont={"size": 10, "color": colors['text_primary']},
                    hoverongaps=False
                ))
                
                fig.update_layout(
                    title='Cohort Activity Heatmap',
                    xaxis_title='Activity Week',
                    yaxis_title='Cohort Week',
                    height=500,
                    **get_plotly_layout_overrides()
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
            except Exception as e:
                logger.error(f"Heatmap creation failed: {e}")
                # Fallback to regular dataframe
                st.dataframe(pivot_data, use_container_width=True)
                
        except Exception as e:
            logger.error(f"Cohort pivot failed: {e}")
            # Show raw data
            cohort_display = cohort_data.copy()
            cohort_display.columns = ['Cohort Week', 'Activity Week', 'Active Users']
            st.dataframe(cohort_display, use_container_width=True, hide_index=True)

def show_churn_analysis():
    """Display churn analysis."""
    st.markdown('<div class="section-header">🚫 Churn Analysis</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display churn data.")
        return
    
    date_filter = render_date_filter_control("churn", label="📆 Date Range", default="Last 30 Days")
    churn_data = get_churn_data(date_filter)
    
    # Show churn summary
    col1, col2 = st.columns(2)
    
    with col1:
        if not churn_data.empty:
            st.metric(
                label="Churned Users (15+ days inactive)",
                value=f"{len(churn_data):,}",
                help="Users who haven't used the platform in 15+ days"
            )
        else:
            st.metric("Churned Users (15+ days inactive)", "0")
    
    with col2:
        if not churn_data.empty:
            avg_inactive_days = churn_data['days_inactive'].mean()
            st.metric(
                label="Average Days Inactive",
                value=f"{avg_inactive_days:.1f}",
                help="Average number of days since last activity for churned users"
            )
        else:
            st.metric("Average Days Inactive", "0")
    
    if not churn_data.empty:
        st.markdown("### 👥 Churned Users Details (Last 100)")
        
        # Format the data for display
        churn_display = churn_data.copy()
        churn_display['last_active_date'] = pd.to_datetime(churn_display['last_active_date']).dt.strftime('%Y-%m-%d %H:%M:%S')
        churn_display.columns = ['User ID', 'Name', 'Email', 'Last Active Date', 'Days Inactive']
        
        st.dataframe(
            churn_display,
            use_container_width=True,
            hide_index=True,
            column_config={
                'User ID': st.column_config.NumberColumn('User ID', format='%d'),
                'Name': st.column_config.TextColumn('Name', width='medium'),
                'Email': st.column_config.TextColumn('Email', width='medium'),
                'Last Active Date': st.column_config.TextColumn('Last Active Date', width='medium'),
                'Days Inactive': st.column_config.NumberColumn(
                    'Days Inactive',
                    help='Number of days since last activity',
                    format='%d'
                )
            }
        )
    else:
        st.success("🎉 No churned users found! All users are active within the last 15 days.")

def show_prompt_reuse_analysis():
    """Display prompt reuse analysis."""
    st.markdown('<div class="section-header">🔄 Prompt Reuse & Returning User Behavior</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display reuse data.")
        return
    
    date_filter = render_date_filter_control("prompt_reuse", label="📆 Date Range", default="Last 30 Days")
    reuse_users, reuse_rate = get_prompt_reuse_data(date_filter)
    
    # Show reuse rate metric
    col1, col2 = st.columns(2)
    
    with col1:
        st.metric(
            label="Prompt Reuse Rate",
            value=f"{reuse_rate}%",
            help="Percentage of users who submit more than one prompt"
        )
    
    with col2:
        if not reuse_users.empty:
            st.metric(
                label="Returning Users Count",
                value=f"{len(reuse_users):,}",
                help="Number of users who submitted multiple prompts"
            )
        else:
            st.metric("Returning Users Count", "0")
    
    if not reuse_users.empty:
        st.markdown("### 👥 Top Returning Users (Most Active)")
        
        # Format for display
        reuse_display = reuse_users.copy()
        reuse_display.columns = ['User ID', 'Name', 'Email', 'Total Prompts']
        
        st.dataframe(
            reuse_display,
            use_container_width=True,
            hide_index=True,
            column_config={
                'User ID': st.column_config.NumberColumn('User ID', format='%d'),
                'Name': st.column_config.TextColumn('Name', width='medium'),
                'Email': st.column_config.TextColumn('Email', width='medium'),
                'Total Prompts': st.column_config.NumberColumn(
                    'Total Prompts',
                    help='Number of prompts submitted by this user',
                    format='%d'
                )
            }
        )
        
        # Show distribution chart
        st.markdown("### 📊 Prompt Distribution")
        
        try:
            # Create histogram of prompt counts
            fig = px.histogram(
                reuse_users,
                x='total_prompts',
                title='Distribution of Prompt Counts (Returning Users Only)',
                labels={'total_prompts': 'Number of Prompts', 'count': 'Number of Users'},
                nbins=min(20, len(reuse_users)),
                template=get_plotly_template()
            )
            
            fig.update_layout(
                showlegend=False,
                height=400,
                xaxis_title='Number of Prompts per User',
                yaxis_title='Number of Users',
                **get_plotly_layout_overrides()
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
        except Exception as e:
            logger.error(f"Prompt distribution chart failed: {e}")
            st.info("Chart visualization temporarily unavailable")
    else:
        st.info("📊 No returning users found yet. All users have submitted only one prompt so far.")

def show_user_analysis():
    """Display comprehensive user table analysis."""
    st.markdown('<div class="section-header">👥 User Analysis</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display user data.")
        return
    
    # Get summary statistics
    user_stats = get_user_summary_stats()
    
    # Show key user metrics
    st.markdown("### 📊 User Overview")
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="Total Users",
            value=f"{user_stats['total_users']:,}",
            help="Total number of registered users"
        )
    
    with col2:
        st.metric(
            label="Users with Installation",
            value=f"{user_stats['installed_users']:,}",
            help="Number of users who have installed the product"
        )
    
    with col3:
        st.metric(
            label="Installation Rate",
            value=f"{user_stats['installation_rate']}%",
            help="Percentage of users who completed installation"
        )
    
    with col4:
        st.metric(
            label="Recent Signups (7 days)",
            value=f"{user_stats['recent_signups']:,}",
            help="Number of users who signed up in the last 7 days"
        )

def show_signup_trends():
    """Display signup trends analysis."""
    st.markdown('<div class="section-header">📈 Signup Trends</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display signup trends.")
        return
    
    date_filter = render_date_filter_control("signup_trends", label="📆 Date Range", default="Last 30 Days")
    # Get daily signup trends
    daily_trends = get_signup_trends(date_filter)
    
    if not daily_trends.empty:
        st.markdown("### 📅 Daily Signup Trends (Last 30 Days)")
        
        # Format for display
        trends_display = daily_trends.copy()
        trends_display['signup_date'] = pd.to_datetime(trends_display['signup_date']).dt.strftime('%Y-%m-%d')
        trends_display.columns = ['Signup Date', 'Daily Signups', 'Daily Installations', 'Installation Rate (%)']
        
        st.dataframe(
            trends_display,
            use_container_width=True,
            hide_index=True,
            column_config={
                'Signup Date': st.column_config.TextColumn('Signup Date', width='medium'),
                'Daily Signups': st.column_config.NumberColumn('Daily Signups', format='%d'),
                'Daily Installations': st.column_config.NumberColumn('Daily Installations', format='%d'),
                'Installation Rate (%)': st.column_config.NumberColumn('Installation Rate (%)', format='%.1f%%')
            }
        )
    
    # Get weekly trends for chart
    weekly_trends = get_weekly_signup_trends(date_filter)
    
    if not weekly_trends.empty:
        st.markdown("### 📊 Weekly Signup Trends")
        
        try:
            # Create line chart for weekly signups
            weekly_trends['week_start'] = pd.to_datetime(weekly_trends['week_start'])
            weekly_trends = weekly_trends.sort_values('week_start')
            
            fig = px.line(
                weekly_trends,
                x='week_start',
                y=['weekly_signups', 'weekly_installations'],
                title='Weekly Signups vs Installations Trend',
                labels={
                    'week_start': 'Week Starting',
                    'value': 'Count',
                    'variable': 'Metric'
                },
                template=get_plotly_template()
            )
            
            fig.update_layout(
                height=400,
                xaxis_title='Week Starting',
                yaxis_title='Number of Users',
                legend_title='Metrics',
                **get_plotly_layout_overrides()
            )
            
            # Rename legend labels
            fig.for_each_trace(lambda t: t.update(name={
                'weekly_signups': 'Weekly Signups',
                'weekly_installations': 'Weekly Installations'
            }[t.name]))
            
            st.plotly_chart(fig, use_container_width=True)
            
        except Exception as e:
            logger.error(f"Weekly trends chart failed: {e}")
            st.info("Chart visualization temporarily unavailable")

def show_installation_analysis():
    """Display installation analysis."""
    st.markdown('<div class="section-header">💻 Installation Analysis</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display installation data.")
        return
    
    date_filter = render_date_filter_control("install_analysis", label="📆 Date Range", default="Last 30 Days")
    # Get installation distribution
    install_data = get_installation_distribution(date_filter)
    
    if not install_data.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Create pie chart for installation distribution
            fig = px.pie(
                install_data,
                values='count',
                names='status',
                title='Installation Status Distribution',
                color_discrete_map={
                    'Installed': '#2E8B57',
                    'Not Installed': '#CD853F'
                },
                template=get_plotly_template()
            )
            
            fig.update_traces(textposition='inside', textinfo='percent+label')
            fig.update_layout(height=400, **get_plotly_layout_overrides())
            
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            st.markdown("### 📊 Installation Summary")
            
            # Calculate installation metrics
            total_users = install_data['count'].sum()
            installed_users = install_data[install_data['status'] == 'Installed']['count'].sum() if 'Installed' in install_data['status'].values else 0
            not_installed = install_data[install_data['status'] == 'Not Installed']['count'].sum() if 'Not Installed' in install_data['status'].values else 0
            
            install_summary = pd.DataFrame({
                'Status': ['Installed', 'Not Installed', 'Total'],
                'Count': [installed_users, not_installed, total_users],
                'Percentage': [
                    f"{(installed_users/total_users*100):.1f}%" if total_users > 0 else "0%",
                    f"{(not_installed/total_users*100):.1f}%" if total_users > 0 else "0%",
                    "100.0%"
                ]
            })
            
            st.dataframe(
                install_summary,
                use_container_width=True,
                hide_index=True,
                column_config={
                    'Status': st.column_config.TextColumn('Status', width='medium'),
                    'Count': st.column_config.NumberColumn('Count', format='%d'),
                    'Percentage': st.column_config.TextColumn('Percentage', width='small')
                }
            )

def show_recent_users():
    """Display recent user signups table."""
    st.markdown('<div class="section-header">🆕 Recent User Signups</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display user data.")
        return
    
    filter_col, search_col = st.columns([3, 2])
    with filter_col:
        date_filter = render_date_filter_control("recent_users", label="📆 Date Range")
    with search_col:
        search_query = st.text_input(
            "🔎 Search by name or email",
            "",
            placeholder="Start typing to filter..."
        )
    user_data = get_user_table_data(date_filter)
    
    if user_data.empty:
        st.warning("No user data available")
        return
    
    st.markdown("### 👥 Latest User Registrations (Last 100)")
    
    # Format the data for display
    display_df = user_data.copy()
    
    if search_query:
        mask = (
            display_df['name'].str.contains(search_query, case=False, na=False) |
            display_df['email'].str.contains(search_query, case=False, na=False)
        )
        display_df = display_df[mask]
        if display_df.empty:
            st.info("No users match the current search.")
    
    # Handle datetime conversion properly - format to show only up to hour
    try:
        display_df['signup_at'] = pd.to_datetime(display_df['signup_at'], utc=True).dt.strftime('%Y-%m-%d %H:00')
    except Exception as e:
        logger.error(f"Date conversion failed: {e}")
        display_df['signup_at'] = display_df['signup_at'].astype(str)
    
    # Format installation status
    display_df['installed'] = display_df['installed'].map({True: '✅ Yes', False: '❌ No'})
    
    # Create final display dataframe
    display_df.columns = ['Name', 'Email', 'Signup Date', 'Installed']
    
    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True,
        column_config={
            'Name': st.column_config.TextColumn('Name', width='medium'),
            'Email': st.column_config.TextColumn('Email', width='medium'),
            'Signup Date': st.column_config.TextColumn('Signup Date', width='medium'),
            'Installed': st.column_config.TextColumn('Installed', width='small')
        }
    )
    
    # Removed summary metrics to declutter the section per user request.

def show_user_table_full_section():
    """Display full usertable with all key columns."""
    st.markdown('<div class="section-header">👤 User Table (Full)</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display user table.")
        return
    
    filter_col, search_col = st.columns([3, 2])
    with filter_col:
        date_filter = render_date_filter_control("user_table_full", label="📆 Date Range", default="Last 30 Days")
    with search_col:
        search_query = st.text_input(
            "🔎 Search by name or email",
            "",
            placeholder="Filter users..."
        )
    df = get_user_table_full(date_filter)
    
    # Show error if query failed
    if 'user_table_error' in st.session_state:
        st.error(f"❌ **Query Error:** {st.session_state['user_table_error']}")
        with st.expander("🔍 View SQL Query", expanded=False):
            st.code(st.session_state.get('user_table_query', 'N/A'), language='sql')
        # Clear error after showing
        del st.session_state['user_table_error']
        del st.session_state['user_table_query']
    
    if df.empty:
        # Show diagnostic information
        st.info("No user data available for the selected date range.")
        with st.expander("🔍 Diagnostic Information", expanded=True):
            try:
                # Check total count without date filter
                total_count = db_manager.execute_query("SELECT COUNT(*) AS total FROM public.usertable")
                if not total_count.empty:
                    st.write(f"**Total users in database:** {total_count.iloc[0]['total']}")
                
                # Check date range
                date_range = db_manager.execute_query("""
                    SELECT 
                        MIN(created_at) AS earliest,
                        MAX(created_at) AS latest
                    FROM public.usertable
                """)
                if not date_range.empty:
                    st.write(f"**Earliest user:** {date_range.iloc[0]['earliest']}")
                    st.write(f"**Latest user:** {date_range.iloc[0]['latest']}")
                
                # Check selected filter
                st.write(f"**Selected date filter:** {date_filter}")
                
                # Show what the filter condition evaluates to
                date_condition = build_date_filter_condition("created_at", date_filter)
                if date_condition:
                    st.write(f"**Filter condition:** `{date_condition}`")
                    
                    # Test the filter condition
                    test_query = f"""
                    SELECT COUNT(*) AS matching_count
                    FROM public.usertable
                    WHERE {date_condition}
                    """
                    try:
                        test_result = db_manager.execute_query(test_query)
                        if not test_result.empty:
                            st.write(f"**Records matching filter:** {test_result.iloc[0]['matching_count']}")
                    except Exception as test_e:
                        st.error(f"**Filter test failed:** {str(test_e)}")
                        st.code(test_query, language='sql')
                else:
                    st.write("**Filter condition:** None (showing all records)")
                
                # Show current database time
                try:
                    db_time = db_manager.execute_query("SELECT CURRENT_TIMESTAMP AS db_time, CURRENT_DATE AS db_date")
                    if not db_time.empty:
                        st.write(f"**Database current time:** {db_time.iloc[0]['db_time']}")
                        st.write(f"**Database current date:** {db_time.iloc[0]['db_date']}")
                except Exception as time_e:
                    st.warning(f"Could not get database time: {time_e}")
                    
            except Exception as e:
                st.error(f"Diagnostic query failed: {e}")
                import traceback
                st.code(traceback.format_exc(), language='text')
        return
    
    # Light formatting of datetime/bool columns
    for col in ['created_at', 'updated_at']:
        if col in df.columns:
            try:
                df[col] = pd.to_datetime(df[col]).dt.strftime('%Y-%m-%d %H:%M')
            except Exception:
                df[col] = df[col].astype(str)
    
    if 'installed' in df.columns:
        df['installed'] = df['installed'].map({True: '✅ Yes', False: '❌ No'})
    if 'email_verified' in df.columns:
        df['email_verified'] = df['email_verified'].map({True: '✅ Yes', False: '❌ No'})
    if 'tutorial' in df.columns:
        df['tutorial'] = df['tutorial'].map({True: '✅ Yes', False: '❌ No'})
    
    if search_query:
        mask = (
            df['name'].astype(str).str.contains(search_query, case=False, na=False) |
            df['email'].astype(str).str.contains(search_query, case=False, na=False)
        )
        df = df[mask]
        if df.empty:
            st.info("No users match the current search.")
            return
    
    # Split sensitive fields to an optional expander
    sensitive_cols = [
        'password'
    ]
    safe_df = df.copy()
    for c in sensitive_cols:
        if c in safe_df.columns:
            safe_df[c] = safe_df[c].astype(str).str.slice(0, 12) + '…'
    
    st.dataframe(
        safe_df,
        use_container_width=True,
        hide_index=True,
        column_config={
            'user_id': st.column_config.NumberColumn('User ID', format='%d') if 'user_id' in safe_df.columns else None,
            'name': st.column_config.TextColumn('Name', width='medium') if 'name' in safe_df.columns else None,
            'email': st.column_config.TextColumn('Email', width='medium') if 'email' in safe_df.columns else None,
            'phone': st.column_config.TextColumn('Phone', width='small') if 'phone' in safe_df.columns else None,
            'referral_code': st.column_config.TextColumn('Referral Code', width='small') if 'referral_code' in safe_df.columns else None,
        }
    )

def show_onboarding_data_section():
    """Display onboarding_data joined with user info."""
    st.markdown('<div class="section-header">🧭 Onboarding Data</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display onboarding data.")
        return
    
    filter_col, search_col = st.columns([3, 2])
    with filter_col:
        date_filter = render_date_filter_control("onboarding_data", label="📆 Date Range", default="Last 30 Days")
    with search_col:
        search_query = st.text_input(
            "🔎 Search",
            "",
            placeholder="Name, email, use case..."
        )
    df = get_onboarding_data(date_filter)
    if df.empty:
        # Diagnostics: fallback direct simple select preview
        try:
            count_df = db_manager.execute_query("SELECT COUNT(*) AS c FROM public.onboarding_data")
            total = int(count_df.iloc[0]['c']) if not count_df.empty else 0
            st.info(f"Detected onboarding_data rows: {total}. Showing a direct preview of the first 50 rows.")
            if total > 0:
                simple_df = db_manager.execute_query(
                    """
                    SELECT *
                    FROM public.onboarding_data
                    ORDER BY id DESC
                    LIMIT 50
                    """
                )
                if not simple_df.empty:
                    # Format timestamps if present
                    for col in ['created_at', 'updated_at']:
                        if col in simple_df.columns:
                            try:
                                simple_df[col] = pd.to_datetime(simple_df[col]).dt.strftime('%Y-%m-%d %H:%M')
                            except Exception:
                                simple_df[col] = simple_df[col].astype(str)
                    st.dataframe(simple_df, use_container_width=True, hide_index=True)
                    return
        except Exception as e:
            st.warning(f"Onboarding diagnostics failed: {e}")
        st.info("No onboarding data available")
        return
    
    if search_query:
        df = filter_dataframe_by_search(
            df,
            search_query,
            ['name', 'email', 'llm_platform', 'occupation', 'source', 'problems_faced', 'use_case', 'ai_familiarity']
        )
        if df.empty:
            st.info("No onboarding records match the current search.")
            return
    
    # Format datetime if present (not all schemas include these columns)
    for col in ['created_at', 'updated_at']:
        if col in df.columns:
            try:
                df[col] = pd.to_datetime(df[col]).dt.strftime('%Y-%m-%d %H:%M')
            except Exception:
                df[col] = df[col].astype(str)
    
    st.dataframe(
        df,
        use_container_width=True,
        hide_index=True,
        column_config={
            'id': st.column_config.NumberColumn('ID', format='%d') if 'id' in df.columns else None,
            'user_id': st.column_config.NumberColumn('User ID', format='%d') if 'user_id' in df.columns else None,
            'name': st.column_config.TextColumn('Name', width='medium') if 'name' in df.columns else None,
            'email': st.column_config.TextColumn('Email', width='medium') if 'email' in df.columns else None,
            'llm_platform': st.column_config.TextColumn('LLM Platform', width='small') if 'llm_platform' in df.columns else None,
            'occupation': st.column_config.TextColumn('Occupation', width='medium') if 'occupation' in df.columns else None,
            'source': st.column_config.TextColumn('Source', width='small') if 'source' in df.columns else None,
            'problems_faced': st.column_config.TextColumn('Problems Faced', width='large') if 'problems_faced' in df.columns else None,
            'use_case': st.column_config.TextColumn('Use Case', width='large') if 'use_case' in df.columns else None,
            'ai_familiarity': st.column_config.TextColumn('AI Familiarity', width='small') if 'ai_familiarity' in df.columns else None,
            'created_at': st.column_config.TextColumn('Created At', width='medium') if 'created_at' in df.columns else None,
            'updated_at': st.column_config.TextColumn('Updated At', width='medium') if 'updated_at' in df.columns else None,
        }
    )

def show_user_status_table():
    """Display userstatus table with filters and formatting."""
    st.markdown('<div class="section-header">🧾 User Status</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot display user status.")
        return
    
    filter_col, search_col = st.columns([3, 2])
    with filter_col:
        date_filter = render_date_filter_control("user_status", label="📆 Date Range")
    with search_col:
        search_query = st.text_input(
            "🔎 Search",
            "",
            placeholder="Name, email, status..."
        )
    df = get_user_status_data(date_filter)
    
    # Show error if query failed
    if 'user_status_error' in st.session_state:
        st.error(f"❌ **Query Error:** {st.session_state['user_status_error']}")
        with st.expander("🔍 View SQL Query", expanded=False):
            st.code(st.session_state.get('user_status_query', 'N/A'), language='sql')
        # Clear error after showing
        del st.session_state['user_status_error']
        del st.session_state['user_status_query']
    
    if df.empty:
        # Show diagnostic information
        st.info("No user status data available for the selected date range.")
        with st.expander("🔍 Diagnostic Information", expanded=True):
            try:
                # Check total count without date filter
                total_count = db_manager.execute_query("SELECT COUNT(*) AS total FROM public.userstatus")
                if not total_count.empty:
                    st.write(f"**Total user status records:** {total_count.iloc[0]['total']}")
                
                # Check date range
                date_range = db_manager.execute_query("""
                    SELECT 
                        MIN(COALESCE(updated_at, created_at)) AS earliest,
                        MAX(COALESCE(updated_at, created_at)) AS latest
                    FROM public.userstatus
                """)
                if not date_range.empty:
                    st.write(f"**Earliest record:** {date_range.iloc[0]['earliest']}")
                    st.write(f"**Latest record:** {date_range.iloc[0]['latest']}")
                
                # Check selected filter
                st.write(f"**Selected date filter:** {date_filter}")
                
                # Show what the filter condition evaluates to
                date_condition = build_date_filter_condition("COALESCE(updated_at, created_at)", date_filter)
                if date_condition:
                    st.write(f"**Filter condition:** `{date_condition}`")
                    
                    # Test the filter condition
                    test_query = f"""
                    SELECT COUNT(*) AS matching_count
                    FROM public.userstatus
                    WHERE {date_condition}
                    """
                    try:
                        test_result = db_manager.execute_query(test_query)
                        if not test_result.empty:
                            st.write(f"**Records matching filter:** {test_result.iloc[0]['matching_count']}")
                    except Exception as test_e:
                        st.error(f"**Filter test failed:** {str(test_e)}")
                        st.code(test_query, language='sql')
                else:
                    st.write("**Filter condition:** None (showing all records)")
                
                # Show current database time
                try:
                    db_time = db_manager.execute_query("SELECT CURRENT_TIMESTAMP AS db_time, CURRENT_DATE AS db_date")
                    if not db_time.empty:
                        st.write(f"**Database current time:** {db_time.iloc[0]['db_time']}")
                        st.write(f"**Database current date:** {db_time.iloc[0]['db_date']}")
                except Exception as time_e:
                    st.warning(f"Could not get database time: {time_e}")
                    
            except Exception as e:
                st.error(f"Diagnostic query failed: {e}")
                import traceback
                st.code(traceback.format_exc(), language='text')
        return
    
    if search_query:
        df = filter_dataframe_by_search(
            df,
            search_query,
            ['user_id', 'status']
        )
        if df.empty:
            st.info("No user status records match the current search.")
            return
    
    # Optional filters
    with st.expander("🔍 Filter Options", expanded=False):
        col1, col2, col3 = st.columns(3)
        with col1:
            status_options = ['All'] + sorted(df['status'].dropna().unique().tolist()) if 'status' in df.columns else ['All']
            selected_status = st.selectbox("Filter by Status", status_options)
        with col2:
            used_trial_options = ['All', 'True', 'False'] if 'has_used_trial' in df.columns else ['All']
            selected_used_trial = st.selectbox("Has Used Trial", used_trial_options)
        with col3:
            min_count = st.number_input("Min Count", min_value=0, value=0)
    
    display_df = df.copy()
    if 'status' in display_df.columns and selected_status != 'All':
        display_df = display_df[display_df['status'] == selected_status]
    if 'has_used_trial' in display_df.columns and selected_used_trial != 'All':
        display_df = display_df[display_df['has_used_trial'] == (selected_used_trial == 'True')]
    if 'count' in display_df.columns:
        display_df = display_df[display_df['count'] >= min_count]
    
    # Format datetime columns
    for col in ['trial_started_at', 'trial_ended_at', 'created_at', 'updated_at']:
        if col in display_df.columns:
            try:
                display_df[col] = pd.to_datetime(display_df[col]).dt.strftime('%Y-%m-%d %H:%M')
            except Exception:
                display_df[col] = display_df[col].astype(str)
    
    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True,
        column_config={
            'status_id': st.column_config.NumberColumn('Status ID', format='%d') if 'status_id' in display_df.columns else None,
            'user_id': st.column_config.NumberColumn('User ID', format='%d') if 'user_id' in display_df.columns else None,
            'status': st.column_config.TextColumn('Status', width='medium') if 'status' in display_df.columns else None,
            'count': st.column_config.NumberColumn('Count', format='%d') if 'count' in display_df.columns else None,
            'has_used_trial': st.column_config.TextColumn('Has Used Trial', width='small') if 'has_used_trial' in display_df.columns else None,
            'trial_started_at': st.column_config.TextColumn('Trial Started', width='medium') if 'trial_started_at' in display_df.columns else None,
            'trial_ended_at': st.column_config.TextColumn('Trial Ended', width='medium') if 'trial_ended_at' in display_df.columns else None,
            'created_at': st.column_config.TextColumn('Created At', width='medium') if 'created_at' in display_df.columns else None,
            'updated_at': st.column_config.TextColumn('Updated At', width='medium') if 'updated_at' in display_df.columns else None,
        }
    )

def show_top_metrics():
    """Display top 5 metrics in circular format."""
    st.markdown('<div class="section-header">📊 Key Metrics Overview</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Showing demo data.")
        # Show demo metrics
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            st.markdown("""
            <div class="circular-metric">
                <div class="circle circle-1">
                    <div class="circle-number">0</div>
                    <div class="circle-label">Enhanced</div>
                </div>
                <div class="metric-title">Total Enhanced Prompts</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            st.markdown("""
            <div class="circular-metric">
                <div class="circle circle-2">
                    <div class="circle-number">0</div>
                    <div class="circle-label">Daily Avg</div>
                </div>
                <div class="metric-title">Average Daily Users</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            st.markdown("""
            <div class="circular-metric">
                <div class="circle circle-3">
                    <div class="circle-number">0</div>
                    <div class="circle-label">Weekly Avg</div>
                </div>
                <div class="metric-title">Average Weekly Users</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col4:
            st.markdown("""
            <div class="circular-metric">
                <div class="circle circle-4">
                    <div class="circle-number">0</div>
                    <div class="circle-label">Total</div>
                </div>
                <div class="metric-title">Total Users</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col5:
            st.markdown("""
            <div class="circular-metric">
                <div class="circle circle-5">
                    <div class="circle-number">0%</div>
                    <div class="circle-label">Reuse</div>
                </div>
                <div class="metric-title">Prompt Reuse Rate</div>
            </div>
            """, unsafe_allow_html=True)
        return
    
    # Get all metrics
    total_prompts = get_total_enhanced_prompts()
    avg_daily = get_avg_daily_users()
    avg_weekly = get_avg_weekly_users()
    total_users = get_total_users()
    _, reuse_rate = get_prompt_reuse_data()
    
    # Create 5 columns for the metrics
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.markdown(f"""
        <div class="circular-metric">
            <div class="circle circle-1">
                <div class="circle-number">{total_prompts}</div>
                <div class="circle-label">Enhanced</div>
            </div>
            <div class="metric-title">Total Enhanced Prompts</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="circular-metric">
            <div class="circle circle-2">
                <div class="circle-number">{avg_daily}</div>
                <div class="circle-label">Daily Avg</div>
            </div>
            <div class="metric-title">Average Daily Users</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown(f"""
        <div class="circular-metric">
            <div class="circle circle-3">
                <div class="circle-number">{avg_weekly}</div>
                <div class="circle-label">Weekly Avg</div>
            </div>
            <div class="metric-title">Average Weekly Users</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        st.markdown(f"""
        <div class="circular-metric">
            <div class="circle circle-4">
                <div class="circle-number">{total_users}</div>
                <div class="circle-label">Total</div>
            </div>
            <div class="metric-title">Total Users</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col5:
        st.markdown(f"""
        <div class="circular-metric">
            <div class="circle circle-5">
                <div class="circle-number">{reuse_rate}%</div>
                <div class="circle-label">Reuse</div>
            </div>
            <div class="metric-title">Prompt Reuse Rate</div>
        </div>
        """, unsafe_allow_html=True)

def get_database_schema_summary() -> str:
    """Get a summary of database schema for Groq to understand table structure."""
    if not DATABASE_AVAILABLE:
        return ""
    
    try:
        schema_info = db_manager.get_schema_info()
        if not schema_info:
            return ""
        
        schema_summary = "Database Schema:\n"
        schema_summary += "=" * 50 + "\n\n"
        
        for table_name, columns in schema_info.items():
            schema_summary += f"Table: {table_name}\n"
            schema_summary += "Columns:\n"
            for col in columns[:20]:  # Limit to first 20 columns per table
                col_type = col.get('type', 'unknown')
                nullable = "NULL" if col.get('nullable') else "NOT NULL"
                schema_summary += f"  - {col['name']}: {col_type} ({nullable})\n"
            schema_summary += "\n"
        
        return schema_summary
    except Exception as e:
        logger.error(f"Failed to get schema info: {e}")
        return ""

def convert_natural_language_to_sql(user_query: str, schema_info: str) -> str:
    """Convert natural language query to SQL using Groq API."""
    try:
        from groq import Groq
        
        # Get Groq API key from environment or Streamlit secrets
        groq_api_key = None
        try:
            import streamlit as st
            if hasattr(st, 'secrets') and hasattr(st.secrets, 'get'):
                groq_api_key = st.secrets.get('GROQ_API_KEY')
        except:
            pass
        
        if not groq_api_key:
            groq_api_key = os.getenv('GROQ_API_KEY')
        
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY not found. Please set it in environment variables or Streamlit secrets.")
        
        client = Groq(api_key=groq_api_key)
        
        # Create prompt for Groq
        system_prompt = """You are a SQL query expert. Convert natural language questions into PostgreSQL SQL queries.
        
Rules:
1. Only generate SELECT queries (read-only operations)
2. Use proper PostgreSQL syntax
3. Use table and column names exactly as provided in the schema
4. Always use public schema prefix (e.g., public.usertable)
5. Return ONLY the SQL query, no explanations or markdown formatting
6. If the query is ambiguous, make reasonable assumptions
7. Use proper JOINs when querying multiple tables
8. Include appropriate WHERE clauses for filtering
9. Use LIMIT when appropriate to avoid returning too many rows
10. Format dates properly using PostgreSQL date functions

Important: Return ONLY the SQL query text, nothing else."""
        
        user_prompt = f"""Schema Information:
{schema_info}

User Question: {user_query}

Generate a PostgreSQL SELECT query to answer this question. Return ONLY the SQL query, no explanations."""
        
        # Use the latest available Groq model
        # Available models: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
        model_name = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
        # Only check Streamlit secrets if not found in environment
        if not os.getenv('GROQ_MODEL'):
            try:
                import streamlit as st
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    if hasattr(st, 'secrets') and hasattr(st.secrets, 'get'):
                        model_name = st.secrets.get('GROQ_MODEL', model_name)
            except:
                pass
        
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=model_name,
            temperature=0.1,
            max_tokens=1000
        )
        
        sql_query = chat_completion.choices[0].message.content.strip()
        
        # Clean up the SQL query (remove markdown code blocks if present)
        if sql_query.startswith("```sql"):
            sql_query = sql_query[6:]
        elif sql_query.startswith("```"):
            sql_query = sql_query[3:]
        if sql_query.endswith("```"):
            sql_query = sql_query[:-3]
        sql_query = sql_query.strip()
        
        return sql_query
        
    except ImportError:
        raise ValueError("Groq library not installed. Please install it with: pip install groq")
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        raise

def show_natural_language_search():
    """Display natural language search powered by Groq API."""
    st.markdown('<div class="section-header">🤖 Natural Language Query</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot run queries.")
        return
    
    # Check if Groq API key is configured (check environment first to avoid secrets warnings)
    groq_api_key = os.getenv('GROQ_API_KEY')
    
    # Only check Streamlit secrets if not found in environment
    if not groq_api_key:
        try:
            # Suppress warnings by checking if secrets is available without triggering warnings
            if hasattr(st, 'secrets'):
                # Try to access secrets without triggering warnings
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    if hasattr(st.secrets, 'get'):
                        groq_api_key = st.secrets.get('GROQ_API_KEY', None)
        except:
            pass
    
    if not groq_api_key:
        st.warning("⚠️ Groq API key not configured. Please set GROQ_API_KEY in environment variables or Streamlit secrets.")
        with st.expander("ℹ️ How to configure Groq API key"):
            st.markdown("""
            **For Local Development (Recommended):**
            1. Create a `.env` file in your project directory (if it doesn't exist)
            2. Add: `GROQ_API_KEY=your_groq_api_key_here`
            3. Restart the Streamlit app
            
            **For Streamlit Cloud:**
            1. Go to your app settings
            2. Click "Secrets" in the sidebar
            3. Add: `GROQ_API_KEY = "your_groq_api_key_here"`
            
            **Get your API key from:** https://console.groq.com/
            
            **Note:** The secrets.toml warnings are harmless if you're using a `.env` file.
            """)
        return
    
    # Show example queries as clickable buttons (before input field)
    with st.expander("💡 Example Queries", expanded=False):
        st.markdown("**Click any query below to use it:**")
        
        example_queries = [
            "Show me all users who signed up in the last 30 days",
            "List the top 10 users by number of enhanced prompts",
            "How many users have status 'pro'?",
            "Show me all prompts with intent 'content_creation'",
            "What is the average processing time for enhanced prompts?",
            "List users who have used the trial",
            "Show me all onboarding data for users with occupation 'developer'"
        ]
        
        # Create buttons in a grid layout
        cols = st.columns(2)
        for idx, query in enumerate(example_queries):
            col = cols[idx % 2]
            if col.button(
                query,
                key=f"example_query_{idx}",
                use_container_width=True,
                help=f"Click to use: {query}"
            ):
                # Store the selected query in session state
                st.session_state['nl_query_input'] = query
                st.rerun()
    
    # Search input
    col1, col2 = st.columns([4, 1])
    with col1:
        # Get query from session state if set by example button, otherwise use empty string
        default_query = st.session_state.get('nl_query_input', '')
        user_query = st.text_input(
            "💬 Ask a question about your data",
            value=default_query,
            placeholder="e.g., Show me all users who signed up in the last 7 days, or List top 10 users by number of prompts...",
            key="nl_query_input"
        )
    with col2:
        st.write("")  # Spacing
        st.write("")  # Spacing
        execute_button = st.button("🔍 Execute", type="primary", use_container_width=True)
    
    if user_query and execute_button:
        with st.spinner("🤖 Converting to SQL query..."):
            try:
                # Get schema information
                schema_info = get_database_schema_summary()
                
                if not schema_info:
                    st.error("❌ Could not retrieve database schema information.")
                    return
                
                # Convert natural language to SQL
                sql_query = convert_natural_language_to_sql(user_query, schema_info)
                
                # Store in session state for display
                st.session_state['nl_sql_query'] = sql_query
                st.session_state['nl_user_query'] = user_query
                
            except Exception as e:
                st.error(f"❌ Error converting query: {str(e)}")
                logger.error(f"Natural language conversion error: {e}")
                return
        
        # Execute the query
        if 'nl_sql_query' in st.session_state:
            sql_query = st.session_state['nl_sql_query']
            
            with st.spinner("📊 Executing query..."):
                try:
                    # Display the generated SQL
                    with st.expander("📝 Generated SQL Query", expanded=False):
                        st.code(sql_query, language='sql')
                    
                    # Execute query
                    result_df = db_manager.execute_query(sql_query)
                    
                    if result_df.empty:
                        st.info("ℹ️ Query executed successfully but returned no results.")
                    else:
                        st.success(f"✅ Query executed successfully! Returned {len(result_df)} rows.")
                        
                        # Display results
                        st.dataframe(
                            result_df,
                            use_container_width=True,
                            hide_index=True
                        )
                        
                        # Option to download results
                        csv = result_df.to_csv(index=False)
                        st.download_button(
                            label="📥 Download Results as CSV",
                            data=csv,
                            file_name=f"query_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                            mime="text/csv"
                        )
                        
                except Exception as e:
                    st.error(f"❌ Query execution failed: {str(e)}")
                    logger.error(f"Query execution error: {e}")
                    if 'nl_sql_query' in st.session_state:
                        with st.expander("🔍 View SQL Query"):
                            st.code(st.session_state['nl_sql_query'], language='sql')

def show_global_search_block():
    """Display a Global Search block beneath the key metrics."""
    st.markdown('<div class="section-header">🌐 Global Search</div>', unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not configured. Cannot run global search.")
        return
    
    col1, col2 = st.columns([3, 1])
    with col1:
        search_term = st.text_input(
            "Search users, prompts, onboarding notes",
            "",
            placeholder="Type at least 3 characters...",
            key="global_search_input"
        )
    with col2:
        st.caption("Enter a keyword to scan users, prompts, and onboarding data. Limited to the 25 newest matches per section.")
    
    if not search_term or len(search_term.strip()) < 3:
        st.info("Start typing at least 3 characters to see global search results.")
        return
    
    with st.spinner("Searching across users, prompts, and onboarding data..."):
        results = perform_global_search(search_term.strip())
    
    if not results:
        st.warning("No matches found across users, prompts, or onboarding data.")
        return
    
    tabs = st.tabs(list(results.keys()))
    for tab, label in zip(tabs, results.keys()):
        with tab:
            st.dataframe(results[label], use_container_width=True, hide_index=True)


def render_dashboard_by_mode():
    """Route to appropriate dashboard based on mode."""
    mode = st.session_state.get('dashboard_mode', 'Developer')
    
    if mode == 'Developer':
        from developer_dashboard import render_developer_dashboard
        render_developer_dashboard()
    else:
        from business_dashboard import render_business_dashboard
        render_business_dashboard()


def main():
    """Main dashboard function."""
    # Initialize session state for dashboard mode
    if 'dashboard_mode' not in st.session_state:
        st.session_state['dashboard_mode'] = 'Developer'
    
    # Check if database is configured
    if not DATABASE_AVAILABLE:
        show_configuration_help()
        return
    
    # Header with toggle
    col1, col2, col3, col4, col5 = st.columns([3, 1, 1, 0.5, 0.5])
    
    with col1:
        st.markdown('<h1 class="main-header">📊 Analytics Dashboard</h1>', unsafe_allow_html=True)
    
    with col2:
        # Dashboard mode toggle - widget automatically updates session state via key
        dashboard_mode = st.radio(
            "",
            ["Developer", "Business"],
            horizontal=True,
            key="dashboard_mode",
            label_visibility="collapsed",
            index=0 if st.session_state.get('dashboard_mode', 'Developer') != 'Business' else 1
        )
        # dashboard_mode is automatically stored in st.session_state['dashboard_mode'] via key parameter
    
    with col3:
        # Mode badge
        from dashboard_components import mode_badge
        mode_badge(dashboard_mode)
    
    with col4:
        # Refresh button
        if st.button("🔄", help="Refresh data"):
            st.cache_data.clear()
            st.rerun()
    
    with col5:
        # Theme toggle button
        theme_icon = "☀️" if is_dark_mode() else "🌙"
        theme_tooltip = "Switch to Light Mode" if is_dark_mode() else "Switch to Dark Mode"
        if st.button(theme_icon, help=theme_tooltip, key="theme_toggle_main"):
            toggle_theme()
            st.rerun()
    
    # Connection status
    try:
        if db_manager.test_connection():
            st.success("✅ Database connected successfully")
        else:
            st.error("❌ Database connection failed")
            show_configuration_help()
            return
    except Exception as e:
        st.error(f"❌ Database connection error: {e}")
        show_configuration_help()
        return
    
    # Last update timestamp
    last_update = datetime.now().strftime("%H:%M:%S")
    st.caption(f"🕒 Last updated: {last_update}")
    
    st.markdown("---")
    
    # Route to appropriate dashboard
    render_dashboard_by_mode()
    
    # Sidebar settings
    st.sidebar.markdown("## ⚙️ Settings")
    auto_refresh = st.sidebar.checkbox("🔄 Auto-refresh every 30 seconds")
    
    if auto_refresh:
        import time
        time.sleep(30)
        st.rerun()
    
    # Dashboard info
    st.sidebar.markdown("## 📊 Dashboard Info")
    mode = st.session_state.get('dashboard_mode', 'Developer')
    if mode == 'Developer':
        st.sidebar.info(f"""
        **Dashboard:** Developer Analytics
        **Mode:** Detailed Technical Metrics
        **Sections:**
        - 📈 Acquisition Metrics (Detailed)
        - 👁️ Impression Metrics (Detailed)
        - 🔄 Retention Metrics (Detailed)
        - ⚡ Engagement Metrics (Detailed)
        
        **Query Type:** Read-Only Analytics
        **Refresh:** Real-time (5-15 min)
        """)
    else:
        st.sidebar.info(f"""
        **Dashboard:** Business Analytics
        **Mode:** High-Level Business KPIs
        **Sections:**
        - 📈 Acquisition Overview
        - 👁️ Impression Overview
        - 🔄 Retention Overview
        - ⚡ Engagement Overview
        
        **Query Type:** Read-Only Analytics
        **Refresh:** Daily
        """)

if __name__ == "__main__":
    main() 