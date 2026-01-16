""" Overview Dashboard - Premium analytics interface for prompt enhancement data. """
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
from typing import Optional, Tuple
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

# Import query function
try:
    from dashboard_queries import get_overview_prompt_data
except ImportError as e:
    logger.error(f"Failed to import query function: {e}")
    DATABASE_AVAILABLE = False

# Test users to exclude from analytics
TEST_USERS = [
    'aniket gupta', 'arjun gujar', 'aakash puri', 'minal hussain', 
    'vaishnavi parab', 'rahul thokal', 'rana basant', 'shoeb', 
    'aniket', 'arjun', 'abhishek', 'test'
]

def get_date_range_from_filter(filter_option: str) -> Tuple[Optional[datetime], Optional[datetime]]:
    """Convert filter option to date range."""
    now = datetime.now()
    if filter_option == "Today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    elif filter_option == "Yesterday":
        yesterday = now - timedelta(days=1)
        return yesterday.replace(hour=0, minute=0, second=0, microsecond=0), yesterday.replace(hour=23, minute=59, second=59)
    elif filter_option == "Last 7 Days":
        return now - timedelta(days=7), now
    elif filter_option == "Last 14 Days":
        return now - timedelta(days=14), now
    elif filter_option == "Last 30 Days":
        return now - timedelta(days=30), now
    elif filter_option == "Last 90 Days":
        return now - timedelta(days=90), now
    elif filter_option == "All Time":
        return None, None
    else:
        return now - timedelta(days=7), now

def clean_and_process_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and process the data."""
    if df.empty:
        return df
    
    df = df.copy()
    df = df.drop_duplicates(subset=['prompt_id'], keep='first')
    
    # Convert dates
    for col in ['prompt_created_at', 'enhanced_prompt_created_at']:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
    
    # Convert numeric
    if 'processing_time' in df.columns:
        df['processing_time'] = pd.to_numeric(df['processing_time'], errors='coerce')
    
    # Time-based features
    if 'prompt_created_at' in df.columns:
        df['hour'] = df['prompt_created_at'].dt.hour
        df['day_of_week'] = df['prompt_created_at'].dt.day_name()
        df['day_number'] = df['prompt_created_at'].dt.dayofweek
        df['date'] = df['prompt_created_at'].dt.date
        df['is_weekend'] = df['day_number'].isin([5, 6])
        df['time_period'] = pd.cut(
            df['hour'],
            bins=[0, 6, 12, 18, 24],
            labels=['Night', 'Morning', 'Afternoon', 'Evening'],
            include_lowest=True
        )
    
    # Text-based features
    if 'user_prompt' in df.columns:
        df['user_prompt_length'] = df['user_prompt'].fillna('').str.len()
        df['user_prompt_word_count'] = df['user_prompt'].fillna('').str.split().str.len()
    
    if 'enhanced_prompt' in df.columns:
        df['enhanced_prompt_length'] = df['enhanced_prompt'].fillna('').str.len()
        df['enhanced_prompt_word_count'] = df['enhanced_prompt'].fillna('').str.split().str.len()
        df['has_enhancement'] = df['enhanced_prompt'].notna() & (df['enhanced_prompt'] != '')
        
        df['enhancement_ratio'] = df.apply(
            lambda x: x['enhanced_prompt_length'] / x['user_prompt_length'] 
            if x['user_prompt_length'] > 0 else 0,
            axis=1
        )
    
    # Fill missing
    for col in ['intent', 'llm_used', 'complexity', 'domain', 'mode']:
        if col in df.columns:
            df[col] = df[col].fillna('Unknown')
    
    return df

def calculate_failed_prompts(df: pd.DataFrame) -> Tuple[int, float]:
    """Calculate failed prompts."""
    total = len(df)
    enhanced = df['has_enhancement'].sum() if 'has_enhancement' in df.columns else 0
    failed = total - enhanced
    failure_rate = (failed / total * 100) if total > 0 else 0
    return failed, failure_rate

def calculate_time_saved(df: pd.DataFrame) -> Tuple[float, float]:
    """Calculate total time saved and average per user."""
    if 'enhanced_prompt_word_count' not in df.columns or 'user_prompt_word_count' not in df.columns:
        return 0.0, 0.0
    
    df_enhanced = df[df['has_enhancement'] == True].copy()
    extra_words = df_enhanced['enhanced_prompt_word_count'] - df_enhanced['user_prompt_word_count']
    extra_words = extra_words.clip(lower=0)
    time_per_prompt = extra_words / 40
    total_time_minutes = time_per_prompt.sum()
    total_hours = total_time_minutes / 60
    
    # Calculate per user
    unique_users = df_enhanced['user_id'].nunique()
    avg_per_user = total_hours / unique_users if unique_users > 0 else 0
    
    return total_hours, avg_per_user

def calculate_growth_metrics():
    """Calculate growth metrics for the last 7 days."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    raw_df = get_overview_prompt_data(start_date, end_date)
    if raw_df.empty:
        return 0, 0, 0.0, 0.0
    
    df = clean_and_process_data(raw_df)
    
    wau = df['user_id'].nunique()
    
    daily_habit_users = 0
    if 'date' in df.columns:
        daily_counts = df.groupby('user_id')['date'].nunique()
        daily_habit_users = daily_counts[daily_counts >= 5].count()
    
    power_user_count = 0
    if DATABASE_AVAILABLE and wau > 0:
        try:
            active_ids = tuple(df['user_id'].unique())
            if active_ids:
                ids_sql = str(active_ids) if len(active_ids) > 1 else f"('{active_ids[0]}')"
                query = f"SELECT user_id, COUNT(*) as total FROM user_prompts WHERE user_id IN {ids_sql} GROUP BY user_id"
                lifetime_df = db_manager.execute_query(query)
                if not lifetime_df.empty:
                    power_users = lifetime_df[lifetime_df['total'] > 20]
                    power_user_count = len(power_users)
        except Exception as e:
            logger.error(f"Failed to calculate power user conversion: {e}")
    
    power_user_rate = (power_user_count / wau * 100) if wau > 0 else 0.0
    total_enhancements = df['has_enhancement'].sum() if 'has_enhancement' in df.columns else 0
    enhancements_per_wau = total_enhancements / wau if wau > 0 else 0.0
    
    # Calculate Day 7 Retention (Users active 7 days ago who are also active today/yesterday)
    retention_rate = 0.0
    if DATABASE_AVAILABLE:
        try:
             # Get users active 7-8 days ago
             d7_start = (datetime.now() - timedelta(days=8)).strftime('%Y-%m-%d')
             d7_end = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
             
             # Get users active in last 24h
             recent_start = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
             
             query_cohort = f"SELECT DISTINCT user_id FROM user_prompts WHERE created_at >= '{d7_start}' AND created_at < '{d7_end}'"
             query_recent = f"SELECT DISTINCT user_id FROM user_prompts WHERE created_at >= '{recent_start}'"
             
             cohort_df = db_manager.execute_query(query_cohort)
             recent_df = db_manager.execute_query(query_recent)
             
             if not cohort_df.empty and not recent_df.empty:
                 cohort_users = set(cohort_df['user_id'])
                 recent_users = set(recent_df['user_id'])
                 retained_count = len(cohort_users.intersection(recent_users))
                 retention_rate = (retained_count / len(cohort_users)) * 100
        except Exception as e:
            logger.error(f"Retention query failed: {e}")

    return wau, daily_habit_users, power_user_rate, enhancements_per_wau, retention_rate


def calculate_growth_metrics_from_df(tab_df: pd.DataFrame):
    """Calculate growth metrics from a provided dataframe (for filtered tabs)."""
    if tab_df.empty:
        return 0, 0, 0.0, 0.0, 0.0
    
    # Unique active users in this segment
    active_users = tab_df['user_id'].nunique()
    
    # Daily habit users (5+ days active)
    daily_habit_users = 0
    if 'date' in tab_df.columns:
        daily_counts = tab_df.groupby('user_id')['date'].nunique()
        daily_habit_users = daily_counts[daily_counts >= 5].count()
    
    # Power user rate (users with 20+ prompts in this segment)
    user_counts = tab_df.groupby('user_id').size()
    power_user_count = (user_counts > 20).sum()
    power_user_rate = (power_user_count / active_users * 100) if active_users > 0 else 0.0
    
    # Intensity (enhancements per active user)
    total_enhancements = tab_df['has_enhancement'].sum() if 'has_enhancement' in tab_df.columns else 0
    intensity = total_enhancements / active_users if active_users > 0 else 0.0
    
    # Retention - simplified: % of users active in both first and last half of date range
    retention_rate = 0.0
    if 'date' in tab_df.columns and len(tab_df) > 0:
        dates = pd.to_datetime(tab_df['date'])
        if len(dates.unique()) > 1:
            mid_date = dates.min() + (dates.max() - dates.min()) / 2
            first_half_users = set(tab_df[pd.to_datetime(tab_df['date']) <= mid_date]['user_id'])
            second_half_users = set(tab_df[pd.to_datetime(tab_df['date']) > mid_date]['user_id'])
            if len(first_half_users) > 0:
                retained = len(first_half_users.intersection(second_half_users))
                retention_rate = (retained / len(first_half_users)) * 100
    
    return active_users, daily_habit_users, power_user_rate, intensity, retention_rate

def get_top_power_users(df: pd.DataFrame, n: int = 5) -> pd.DataFrame:
    """Get top N power users with their best prompts"""
    if df.empty or 'user_id' not in df.columns:
        return pd.DataFrame()
        
    # Agggregate user stats
    user_stats = df.groupby('user_id').agg({
        'prompt_id': 'count',
        'enhancement_ratio': 'max' if 'enhancement_ratio' in df.columns else 'count',
        'enhanced_prompt_length': 'max' if 'enhanced_prompt_length' in df.columns else 'count'
    }).reset_index()

    user_stats.columns = ['user_id', 'total_prompts', 'best_ratio', 'max_length']
    top_users = user_stats.nlargest(n, 'total_prompts')

    # Get best prompt for each user
    result = []
    for _, user in top_users.iterrows():
        user_prompts = df[df['user_id'] == user['user_id']]
        
        # Determine best prompt by ratio, or length if ratio missing
        sort_col = 'enhancement_ratio' if 'enhancement_ratio' in df.columns else 'enhanced_prompt_length'
        if sort_col in user_prompts.columns:
            best_prompt_row = user_prompts.nlargest(1, sort_col).iloc[0]
            
            prompt_text = best_prompt_row.get('user_prompt', '')
            if pd.isna(prompt_text): prompt_text = ""
            
            # Truncate prompt
            display_prompt = (prompt_text[:50] + '...') if len(prompt_text) > 50 else prompt_text
            
            quality_score = best_prompt_row.get('enhancement_ratio', 0)
            
            result.append({
                'User ID': user['user_id'],
                'Total Prompts': user['total_prompts'],
                'Best Prompt': display_prompt,
                'Quality Score': f"{quality_score:.2f}x"
            })
            
    return pd.DataFrame(result)


def get_slowest_prompts(df: pd.DataFrame, n: int = 5) -> pd.DataFrame:
    """Get N slowest processing prompts"""
    if df.empty or 'processing_time' not in df.columns:
        return pd.DataFrame()
        
    cols_to_keep = ['processing_time', 'user_prompt', 'domain', 'complexity', 'prompt_created_at']
    available_cols = [c for c in cols_to_keep if c in df.columns]
    
    slowest = df.nlargest(n, 'processing_time')[available_cols].copy()
    
    if 'user_prompt' in slowest.columns:
        slowest['user_prompt'] = slowest['user_prompt'].fillna('').str.slice(0, 50) + '...'
        
    return slowest


def calculate_user_segments(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate user behavior segments based on activity."""
    if df.empty or 'user_id' not in df.columns:
        return pd.DataFrame()
    
    user_activity = df.groupby('user_id').agg({
        'prompt_id': 'count',
        'prompt_created_at': ['min', 'max']
    }).reset_index()
    
    user_activity.columns = ['user_id', 'prompt_count', 'first_prompt', 'last_prompt']
    
    # Calculate days active
    user_activity['days_active'] = (
        user_activity['last_prompt'] - user_activity['first_prompt']
    ).dt.days + 1
    
    # Segment users
    def segment_user(row):
        if row['prompt_count'] == 1:
            return 'One-time'
        elif row['prompt_count'] <= 5:
            return 'Casual'
        elif row['prompt_count'] <= 20:
            return 'Regular'
        else:
            return 'Power'
    
    user_activity['segment'] = user_activity.apply(segment_user, axis=1)
    
    return user_activity


def get_wau_trend_data(days: int = 90) -> pd.DataFrame:
    """Get weekly active user trend."""
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    query = f"""
        SELECT DATE_TRUNC('week', created_at) as week_start,
               COUNT(DISTINCT user_id) as wau
        FROM user_prompts
        WHERE created_at >= '{start_date}'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week_start ASC
    """
    
    try:
        return db_manager.execute_query(query)
    except Exception as e:
        logger.error(f"WAU trend query failed: {e}")
        return pd.DataFrame()

def style_chart(fig, remove_legend=False):
    """Apply premium styling to charts."""
    fig.update_layout(
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        font_family="Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        font_color='#1f2937',
        title_font_size=14,
        title_font_weight=600,
        title_font_color='#111827',
        margin=dict(l=20, r=20, t=40, b=20),
        showlegend=not remove_legend,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1,
            font=dict(size=11)
        ),
        hovermode='x unified'
    )
    
    fig.update_xaxes(
        showgrid=False, 
        zeroline=False,
        showline=True,
        linewidth=1,
        linecolor='#e5e7eb'
    )
    
    fig.update_yaxes(
        showgrid=True, 
        gridwidth=1, 
        gridcolor='#f3f4f6',
        zeroline=False,
        showline=False
    )
    
    return fig

def render_overview_dashboard():
    """Render the premium overview dashboard."""
    
    # Premium CSS styling
    st.markdown("""
        <style>
        /* Global styles */
        .main {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        
        /* Header */
        .dashboard-header {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            margin-bottom: 2rem;
        }
        
        .dashboard-title {
            font-size: 2rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.02em;
        }
        
        .dashboard-subtitle {
            font-size: 0.95rem;
            color: #64748b;
            margin-top: 0.5rem;
        }
        
        /* Metric cards */
        .metric-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border: 1px solid #f1f5f9;
            height: 100%;
            transition: all 0.2s ease;
        }
        
        .metric-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            transform: translateY(-2px);
        }
        
        .metric-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.75rem;
        }
        
        .metric-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #0f172a;
            line-height: 1;
            margin-bottom: 0.5rem;
        }
        
        .metric-subtitle {
            font-size: 0.875rem;
            color: #94a3b8;
            font-weight: 400;
        }
        
        /* Scale down headings slightly but keep bold */
        .section-header {
            font-size: 2rem !important;
            font-weight: 700 !important;
            color: #1e293b;
            margin: 4rem 0 1.5rem 0; /* Increased top margin for spacing between sections
             */
            padding-bottom: 0.75rem;
            border-bottom: 3px solid #e2e8f0;
            letter-spacing: -0.02em;
        }
        
        /* Chart containers - apply directly to Streamlit plotly elements */
        .stPlotlyChart {
            background: white;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border: 1px solid #f1f5f9;
        }

        /* Filter section */
        .filter-section {
            background: white;
            padding: 1.25rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            margin-bottom: 2rem;
            border: 1px solid #f1f5f9;
        }
        
        /* Streamlit overrides */
        .stSelectbox > div > div {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
        }
        
        .stButton > button {
            background: #0f172a;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 0.5rem 1.5rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .stButton > button:hover {
            background: #1e293b;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        /* Data tables */
        .dataframe {
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px;
        }
        
        /* Success/warning messages */
        .element-container .stSuccess {
            background: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 8px;
            padding: 1rem;
        }
        
        .element-container .stWarning {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 1rem;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Header
    st.markdown("""
        <div class="dashboard-header">
            <h1 class="dashboard-title">Analytics Overview</h1>
            <p class="dashboard-subtitle">Comprehensive insights into prompt enhancement performance</p>
        </div>
    """, unsafe_allow_html=True)
    
    if not DATABASE_AVAILABLE:
        st.warning("Database not configured. Cannot display overview data.")
        return
    
    # Filters
    st.markdown('<div class="filter-section">', unsafe_allow_html=True)
    col1, col2, col3 = st.columns([2, 2, 1])
    
    with col1:
        date_filter = st.selectbox(
            "Date Range",
            ["Last 7 Days", "Today", "Yesterday", "Last 14 Days", "Last 30 Days", "Last 90 Days", "All Time"],
            index=0,
            key="overview_date_filter"
        )
    
    with col3:
        if st.button("Refresh", key="overview_refresh"):
            st.cache_data.clear()
            st.rerun()
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Get data
    start_date, end_date = get_date_range_from_filter(date_filter)
    
    with st.spinner("Loading data..."):
        raw_df = get_overview_prompt_data(start_date, end_date)
        
        if raw_df.empty:
            st.warning(f"No data found for the selected date range: {date_filter}")
            return
        
        df = clean_and_process_data(raw_df)
        
        if df.empty:
            st.warning("No data remaining after processing.")
            return
    
    st.success(f"Loaded {len(df):,} prompts")
    

    # Key Metrics (Segregated by Chat vs Extension)
    st.markdown('<div class="section-header">Value & Key Metrics</div>', unsafe_allow_html=True)
    
    # Split data (case-insensitive matching)
    df_chat = df[df['llm_used'].str.lower() == 'velocity'].copy()
    df_extension = df[df['llm_used'].str.lower() != 'velocity'].copy()
    
    tab_overall, tab_chat, tab_ext = st.tabs(["📊 Overall", "💬 Chat (Velocity)", "🧩 Extension"])
    
    def render_metrics_tab(tab_df, label):
        """Render metrics for a specific tab"""
        if tab_df.empty:
            st.info(f"No data available for {label}")
            return

        total_time_saved, avg_time_per_user = calculate_time_saved(tab_df)
        failed_count, failure_rate = calculate_failed_prompts(tab_df)
        enhanced_count = tab_df['has_enhancement'].sum() if 'has_enhancement' in tab_df.columns else 0
        total_count = len(tab_df)
        unique_users = tab_df['user_id'].nunique()
        enhancement_rate = (enhanced_count / total_count * 100) if total_count > 0 else 0
        avg_processing = tab_df['processing_time'].mean() if 'processing_time' in tab_df.columns else 0
        
        # Row 1: High Level Stats
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            val_total = f"{total_count:,}"
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #8b5cf6;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                             <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Total Prompts</span>
                                <span title="Total number of prompts processed." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{val_total}</div>
                            <div class="metric-subtitle">Volume</div>
                        </div>
                        <div style="font-size: 2rem; color: #8b5cf6; opacity: 0.7;">📝</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)

        with col2:
             val_enhanced = f"{enhanced_count:,}"
             val_rate = f"{enhancement_rate:.1f}%"
             st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #10b981;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Enhanced</span>
                                <span title="Number of prompts successfully enhanced." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{val_enhanced}</div>
                            <div class="metric-subtitle">{val_rate} rate</div>
                        </div>
                        <div style="font-size: 2rem; color: #10b981; opacity: 0.7;">✨</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
            
        with col3:
            val_failed = f"{failed_count:,}"
            val_fail_rate = f"{failure_rate:.1f}%"
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #ef4444;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Failed</span>
                                <span title="Enhancements that failed." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{val_failed}</div>
                            <div class="metric-subtitle">{val_fail_rate} failure rate</div>
                        </div>
                        <div style="font-size: 2rem; color: #ef4444; opacity: 0.7;">⚠️</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
            
        with col4:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #14b8a6;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Unique Users</span>
                                <span title="Distinct users in this segment." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{unique_users:,}</div>
                        </div>
                        <div style="font-size: 2rem; color: #14b8a6; opacity: 0.7;">👤</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
            
        # Row 2: Performance & Sub-metrics
        st.markdown("##### Performance & Sub-metrics")
        
        # Calculate refine rate from has_refinement column
        refine_count = tab_df['has_refinement'].sum() if 'has_refinement' in tab_df.columns else 0
        refine_rate = (refine_count / total_count * 100) if total_count > 0 else 0
        
        # Performance Cards - 4 columns
        sub_col1, sub_col2, sub_col3, sub_col4 = st.columns(4)
        with sub_col1:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #f59e0b;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Avg Processing</span>
                                <span title="Average time to process a prompt." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{avg_processing:.2f}s</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #f59e0b; opacity: 0.7;">⏱️</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        with sub_col2:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #6366f1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Time Saved</span>
                                <span title="Estimated hours saved by enhancements." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{total_time_saved:.1f}h</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #6366f1; opacity: 0.7;">💾</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        with sub_col3:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #10b981;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Enhancement</span>
                                <span title="% of prompts successfully enhanced." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{enhancement_rate:.1f}%</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #10b981; opacity: 0.7;">✨</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        with sub_col4:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #a855f7;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Refine Rate</span>
                                <span title="% of prompts refined by users after enhancement." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{refine_rate:.1f}%</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #a855f7; opacity: 0.7;">🔄</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        
        # Sub-metric Tables
        st.markdown("---")
        m_col1, m_col2 = st.columns(2)
        
        with m_col1:
            st.markdown("**🏆 Top 5 Power Users** <span title='Quality Score = Enhancement Ratio (enhanced length / original length). Higher means more expansion.' style='cursor: help; opacity: 0.6; font-size: 0.8rem;'>ℹ️</span>", unsafe_allow_html=True)
            power_users = get_top_power_users(tab_df)
            if not power_users.empty:
                st.dataframe(power_users[['User ID', 'Total Prompts', 'Quality Score']], use_container_width=True, hide_index=True)
            else:
                st.info("No power user data")
                
        with m_col2:
            st.markdown("**🐢 Top 5 Slowest Prompts**")
            slowest = get_slowest_prompts(tab_df)
            if not slowest.empty:
                display_cols = [c for c in ['processing_time', 'user_prompt', 'complexity', 'prompt_created_at'] if c in slowest.columns]
                st.dataframe(slowest[display_cols] if display_cols else slowest, use_container_width=True, hide_index=True)
            else:
                 st.info("No slow prompt data")
        
        # Growth & Retention Section
        st.markdown('<div class="section-header">Growth & Retention</div>', unsafe_allow_html=True)
        
        active_users, daily_habit, power_rate, intensity, retention = calculate_growth_metrics_from_df(tab_df)
        
        g_col1, g_col2, g_col3, g_col4, g_col5 = st.columns(5)
        
        with g_col1:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #06b6d4;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Active Users</span>
                                <span title="Unique users in this segment." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{active_users}</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #06b6d4; opacity: 0.7;">👥</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        
        with g_col2:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #f59e0b;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Daily Habit</span>
                                <span title="Users active 5+ days." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{daily_habit}</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #f59e0b; opacity: 0.7;">🔥</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        
        with g_col3:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #ec4899;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Power Rate</span>
                                <span title="% users with 20+ prompts." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{power_rate:.1f}%</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #ec4899; opacity: 0.7;">⚡</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        
        with g_col4:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #6366f1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Intensity</span>
                                <span title="Prompts per user." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{intensity:.1f}</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #6366f1; opacity: 0.7;">📊</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        
        with g_col5:
            st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #84cc16;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 0.75rem;">
                                <span class="metric-label" style="margin-bottom: 0;">Retention</span>
                                <span title="Users returning." style="cursor: help; opacity: 0.6; font-size: 0.8rem;">ℹ️</span>
                            </div>
                            <div class="metric-value">{retention:.1f}%</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #84cc16; opacity: 0.7;">🔄</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        
        # Distribution Analysis
        st.markdown('<div class="section-header">Distribution Analysis</div>', unsafe_allow_html=True)
        
        d_col1, d_col2 = st.columns(2)
        
        with d_col1:
            if 'intent' in tab_df.columns:
                intent_counts = tab_df['intent'].value_counts().head(10).reset_index()
                intent_counts.columns = ['Intent', 'Count']
                fig = px.bar(intent_counts, x='Count', y='Intent', orientation='h', title='Top Intents')
                fig.update_layout(height=300)
                fig.update_traces(marker_color='#3b82f6')
                st.plotly_chart(style_chart(fig, remove_legend=True), use_container_width=True)
        
        with d_col2:
            if 'domain' in tab_df.columns:
                domain_counts = tab_df['domain'].value_counts().head(10).reset_index()
                domain_counts.columns = ['Domain', 'Count']
                fig = px.bar(domain_counts, x='Count', y='Domain', orientation='h', title='Top Domains')
                fig.update_layout(height=300)
                fig.update_traces(marker_color='#8b5cf6')
                st.plotly_chart(style_chart(fig, remove_legend=True), use_container_width=True)
        
        d_col3, d_col4 = st.columns(2)
        
        with d_col3:
            if 'complexity' in tab_df.columns:
                comp_counts = tab_df['complexity'].value_counts().reset_index()
                comp_counts.columns = ['Complexity', 'Count']
                fig = px.pie(comp_counts, values='Count', names='Complexity', title='Complexity', hole=0.4, color_discrete_sequence=px.colors.qualitative.Plotly)
                fig.update_traces(textposition='inside', textinfo='percent+label')
                fig.update_layout(height=280)
                st.plotly_chart(style_chart(fig), use_container_width=True)
        
        with d_col4:
            if 'mode' in tab_df.columns:
                mode_counts = tab_df['mode'].value_counts().reset_index()
                mode_counts.columns = ['Mode', 'Count']
                fig = px.bar(mode_counts, x='Count', y='Mode', orientation='h', title='Mode Distribution', color='Mode', color_discrete_sequence=['#8b5cf6', '#3b82f6'])
                fig.update_layout(height=280, showlegend=False)
                st.plotly_chart(style_chart(fig), use_container_width=True)
        
        # Time Analysis
        st.markdown('<div class="section-header">Time Analysis</div>', unsafe_allow_html=True)
        
        t_col1, t_col2 = st.columns(2)
        
        with t_col1:
            if 'date' in tab_df.columns:
                daily_activity = tab_df.groupby('date').size().reset_index(name='count')
                daily_activity['date'] = pd.to_datetime(daily_activity['date'])
                fig = go.Figure()
                fig.add_trace(go.Scatter(x=daily_activity['date'], y=daily_activity['count'], mode='lines+markers', fill='tozeroy', line=dict(color='#3b82f6', width=3, shape='spline'), fillcolor='rgba(59, 130, 246, 0.15)', marker=dict(size=8, color='#3b82f6')))
                fig.update_layout(title='Daily Activity', height=300)
                st.plotly_chart(style_chart(fig, remove_legend=True), use_container_width=True)
        
        with t_col2:
            if 'day_of_week' in tab_df.columns:
                day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                dow_activity = tab_df.groupby('day_of_week').size().reindex(day_order).reset_index(name='count')
                dow_activity.columns = ['Day', 'Count']
                fig = px.bar(dow_activity, x='Day', y='Count', title='By Day of Week')
                fig.update_layout(height=300)
                fig.update_traces(marker_color='#8b5cf6')
                st.plotly_chart(style_chart(fig, remove_legend=True), use_container_width=True)
        
        # Time Analysis Row 2: Time Period & Weekend
        t_col3, t_col4 = st.columns(2)
        
        with t_col3:
            if 'time_period' in tab_df.columns:
                st.markdown("**⏰ Activity by Time of Day** <span title='Distribution of prompts across different time periods of the day.' style='cursor: help; opacity: 0.6; font-size: 0.8rem;'>ℹ️</span>", unsafe_allow_html=True)
                time_counts = tab_df['time_period'].value_counts().reset_index()
                time_counts.columns = ['Period', 'Count']
                fig = px.bar(time_counts, x='Period', y='Count', title='', color_discrete_sequence=['#f97316'])
                fig.update_layout(
                    height=260,
                    xaxis_title="Time Period",
                    yaxis_title="Number of Prompts"
                )
                st.plotly_chart(style_chart(fig, remove_legend=True), use_container_width=True)
        
        with t_col4:
            if 'is_weekend' in tab_df.columns:
                st.markdown("**📅 Weekday vs Weekend** <span title='Comparison of prompt activity on weekdays vs weekends.' style='cursor: help; opacity: 0.6; font-size: 0.8rem;'>ℹ️</span>", unsafe_allow_html=True)
                weekend_counts = tab_df['is_weekend'].value_counts().reset_index()
                weekend_counts.columns = ['Is Weekend', 'Count']
                weekend_counts['Label'] = weekend_counts['Is Weekend'].map({True: 'Weekend', False: 'Weekday'})
                fig = go.Figure(data=[go.Pie(labels=weekend_counts['Label'], values=weekend_counts['Count'], hole=0.6, marker_colors=['#3b82f6', '#ef4444'], textinfo='label+percent')])
                fig.update_layout(title='', height=260, showlegend=False)
                st.plotly_chart(style_chart(fig), use_container_width=True)
        
        # Deep Insights
        st.markdown('<div class="section-header">Deep Insights</div>', unsafe_allow_html=True)
        
        # Row 1: Prompt Length Stats & Processing Time Histogram
        i_col1, i_col2 = st.columns(2)
        
        with i_col1:
            # Prompt Length Statistics - Mean/Min/Max
            if 'user_prompt_length' in tab_df.columns:
                user_mean = tab_df['user_prompt_length'].mean()
                user_min = tab_df['user_prompt_length'].min()
                user_max = tab_df['user_prompt_length'].max()
                enh_mean = tab_df['enhanced_prompt_length'].mean() if 'enhanced_prompt_length' in tab_df.columns else 0
                enh_min = tab_df['enhanced_prompt_length'].min() if 'enhanced_prompt_length' in tab_df.columns else 0
                enh_max = tab_df['enhanced_prompt_length'].max() if 'enhanced_prompt_length' in tab_df.columns else 0
                
                st.markdown("**📏 Prompt Length Statistics** <span title='Character count statistics for user input vs enhanced output.' style='cursor: help; opacity: 0.6; font-size: 0.8rem;'>ℹ️</span>", unsafe_allow_html=True)
                stats_col1, stats_col2 = st.columns(2)
                with stats_col1:
                    st.metric("User Prompt (Avg)", f"{user_mean:.0f} chars")
                    st.caption(f"Min: {user_min:.0f} | Max: {user_max:.0f}")
                with stats_col2:
                    st.metric("Enhanced (Avg)", f"{enh_mean:.0f} chars")
                    st.caption(f"Min: {enh_min:.0f} | Max: {enh_max:.0f}")
        
        with i_col2:
            # Processing Time Histogram
            if 'processing_time' in tab_df.columns:
                st.markdown("**⏱️ Processing Time Distribution** <span title='Histogram showing how long prompts take to process.' style='cursor: help; opacity: 0.6; font-size: 0.8rem;'>ℹ️</span>", unsafe_allow_html=True)
                fig = px.histogram(tab_df, x='processing_time', nbins=30, title='', color_discrete_sequence=['#f43f5e'])
                fig.update_layout(
                    height=220,
                    xaxis_title="Processing Time (seconds)",
                    yaxis_title="Number of Prompts"
                )
                st.plotly_chart(style_chart(fig, remove_legend=True), use_container_width=True)
        
        # Row 2: User Segments & Word Count Comparison
        i_col3, i_col4 = st.columns(2)
        
        with i_col3:
            st.markdown("**👥 User Segments** <span title='One-time: 1 prompt | Casual: 2-5 | Regular: 6-20 | Power: 21+' style='cursor: help; opacity: 0.6; font-size: 0.8rem;'>ℹ️</span>", unsafe_allow_html=True)
            user_segments = calculate_user_segments(tab_df)
            if not user_segments.empty:
                segment_counts = user_segments['segment'].value_counts().reset_index()
                segment_counts.columns = ['Segment', 'Count']
                segment_order = ['One-time', 'Casual', 'Regular', 'Power']
                segment_counts['Segment'] = pd.Categorical(segment_counts['Segment'], categories=segment_order, ordered=True)
                segment_counts = segment_counts.sort_values('Segment')
                fig = px.bar(segment_counts, x='Segment', y='Count', title='', color='Segment', color_discrete_map={'One-time': '#ef4444', 'Casual': '#f97316', 'Regular': '#10b981', 'Power': '#3b82f6'})
                fig.update_layout(
                    height=220, 
                    showlegend=False,
                    xaxis_title="User Segment",
                    yaxis_title="Number of Users"
                )
                st.plotly_chart(style_chart(fig), use_container_width=True)
        
        with i_col4:
            # Word Count Comparison
            if 'user_prompt_word_count' in tab_df.columns and 'enhanced_prompt_word_count' in tab_df.columns:
                st.markdown("**📊 Word Count Expansion** <span title='Average word count comparison between user input and enhanced output.' style='cursor: help; opacity: 0.6; font-size: 0.8rem;'>ℹ️</span>", unsafe_allow_html=True)
                avg_user = tab_df['user_prompt_word_count'].mean()
                avg_enh = tab_df['enhanced_prompt_word_count'].mean()
                expansion = (avg_enh / avg_user) if avg_user > 0 else 0
                fig = go.Figure(go.Bar(x=[avg_user, avg_enh], y=['User Input', 'Enhanced Output'], orientation='h', marker_color=['#94a3b8', '#10b981'], text=[f'{avg_user:.0f} words', f'{avg_enh:.0f} words'], textposition='auto'))
                fig.update_layout(
                    title='',
                    height=220,
                    xaxis_title="Average Word Count",
                    yaxis_title=""
                )
                st.plotly_chart(style_chart(fig, remove_legend=True), use_container_width=True)
                st.caption(f"📈 {expansion:.1f}x expansion ratio")
        
        # LLM Distribution (Extension only)
        if label != "Chat":
            if 'llm_used' in tab_df.columns:
                st.markdown("**🤖 LLM Distribution** <span title='Breakdown of which LLM models are being used for enhancements.' style='cursor: help; opacity: 0.6; font-size: 0.8rem;'>ℹ️</span>", unsafe_allow_html=True)
                llm_counts = tab_df['llm_used'].value_counts().reset_index()
                llm_counts.columns = ['LLM', 'Count']
                fig = go.Figure(data=[go.Pie(labels=llm_counts['LLM'], values=llm_counts['Count'], hole=0.4, marker_colors=['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'], textinfo='label+percent')])
                fig.update_layout(title='', height=280, showlegend=True)
                st.plotly_chart(style_chart(fig), use_container_width=True)

    with tab_overall:
        render_metrics_tab(df, "Overall")

    with tab_chat:
        render_metrics_tab(df_chat, "Chat")
        
    with tab_ext:
        render_metrics_tab(df_extension, "Extension")

    
    # Footer
    st.markdown("---")
    st.caption(f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
