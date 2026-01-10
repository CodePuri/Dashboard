"""
Dashboard query functions for acquisition, impression, retention, engagement, and technical metrics.
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

# Try to import streamlit for caching (may not be available in all contexts)
try:
    import streamlit as st
    HAS_STREAMLIT = True
except ImportError:
    HAS_STREAMLIT = False
    # Create a dummy decorator if streamlit is not available
    def cache_data(ttl=None):
        def decorator(func):
            return func
        return decorator
    st = type('obj', (object,), {'cache_data': cache_data})()

logger = logging.getLogger(__name__)

# Import database manager
try:
    from database import db_manager
    DATABASE_AVAILABLE = db_manager is not None and (hasattr(db_manager, 'is_configured') and db_manager.is_configured)
except Exception as e:
    logger.error(f"Database import failed: {e}")
    db_manager = None
    DATABASE_AVAILABLE = False


def build_date_where_clause(column_expression: str, start_date: Optional[datetime], end_date: Optional[datetime]) -> str:
    """
    Build SQL WHERE clause for date filtering.
    
    Args:
        column_expression: Column name or expression to filter
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        
    Returns:
        SQL WHERE clause string (without WHERE keyword)
    """
    if start_date is None and end_date is None:
        return ""
    
    conditions = []
    if start_date:
        conditions.append(f"{column_expression} >= '{start_date.isoformat()}'")
    if end_date:
        # Add one day to end_date to include the entire day
        end_date_inclusive = end_date + timedelta(days=1)
        conditions.append(f"{column_expression} < '{end_date_inclusive.isoformat()}'")
    
    return " AND ".join(conditions)


# ============================================================================
# ACQUISITION QUERIES
# ============================================================================

@st.cache_data(ttl=300)  # Cache for 5 minutes
def get_daily_signups(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get daily signups with authentication method breakdown.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with columns: signup_date, total_signups, oauth_signups, email_signups, cumulative_signups
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    query = """
    SELECT 
        DATE(created_at) AS signup_date,
        COUNT(*) AS total_signups,
        COUNT(CASE WHEN google_id IS NOT NULL THEN 1 END) AS oauth_signups,
        COUNT(CASE WHEN password IS NOT NULL AND google_id IS NULL THEN 1 END) AS email_signups,
        SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) AS cumulative_signups
    FROM public.usertable
    {where_clause}
    GROUP BY DATE(created_at)
    ORDER BY signup_date DESC
    """
    
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.error(f"Daily signups query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_signup_sources(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get signup breakdown by source from onboarding_data.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with columns: source, signup_count, conversion_rate
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("u.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    query = """
    WITH signups AS (
        SELECT 
            u.user_id,
            u.created_at,
            COALESCE(ob.source, 'unknown') AS source
        FROM public.usertable u
        LEFT JOIN public.onboarding_data ob ON u.user_id = ob.user_id
        {where_clause}
    )
    SELECT 
        source,
        COUNT(*) AS signup_count,
        ROUND(COUNT(*)::decimal / NULLIF((SELECT COUNT(*) FROM signups), 0) * 100, 2) AS conversion_rate
    FROM signups
    GROUP BY source
    ORDER BY signup_count DESC
    """
    
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.error(f"Signup sources query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_onboarding_completion(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Get onboarding completion metrics.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        Dictionary with completion metrics
    """
    if not DATABASE_AVAILABLE:
        return {
            "total_signups": 0,
            "completed_onboarding": 0,
            "incomplete_onboarding": 0,
            "completion_rate": 0.0
        }
    
    date_condition = build_date_where_clause("u.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    query = """
    SELECT 
        COUNT(DISTINCT u.user_id) AS total_signups,
        COUNT(DISTINCT ob.user_id) AS completed_onboarding,
        COUNT(DISTINCT u.user_id) - COUNT(DISTINCT ob.user_id) AS incomplete_onboarding
    FROM public.usertable u
    LEFT JOIN public.onboarding_data ob ON u.user_id = ob.user_id
    {where_clause}
    """
    
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        if not df.empty:
            total = int(df.iloc[0]['total_signups'] or 0)
            completed = int(df.iloc[0]['completed_onboarding'] or 0)
            incomplete = int(df.iloc[0]['incomplete_onboarding'] or 0)
            completion_rate = (completed / total * 100) if total > 0 else 0.0
            
            return {
                "total_signups": total,
                "completed_onboarding": completed,
                "incomplete_onboarding": incomplete,
                "completion_rate": round(completion_rate, 2)
            }
        return {"total_signups": 0, "completed_onboarding": 0, "incomplete_onboarding": 0, "completion_rate": 0.0}
    except Exception as e:
        logger.error(f"Onboarding completion query failed: {e}")
        return {"total_signups": 0, "completed_onboarding": 0, "incomplete_onboarding": 0, "completion_rate": 0.0}


@st.cache_data(ttl=300)
def get_waitlist_metrics() -> Dict[str, Any]:
    """
    Get waitlist performance metrics.
    
    Returns:
        Dictionary with waitlist metrics
    """
    if not DATABASE_AVAILABLE:
        return {
            "waitlist_size": 0,
            "waitlist_to_signup": 0,
            "conversion_rate": 0.0
        }
    
    # Check if waitlistUsers table exists
    try:
        query = """
        WITH waitlist_users AS (
            SELECT COUNT(*) AS waitlist_count
            FROM public.waitlistUsers
        ),
        converted_users AS (
            SELECT COUNT(DISTINCT w.email) AS converted_count
            FROM public.waitlistUsers w
            INNER JOIN public.usertable u ON LOWER(w.email) = LOWER(u.email)
        )
        SELECT 
            w.waitlist_count AS waitlist_size,
            c.converted_count AS waitlist_to_signup,
            ROUND(c.converted_count::decimal / NULLIF(w.waitlist_count, 0) * 100, 2) AS conversion_rate
        FROM waitlist_users w
        CROSS JOIN converted_users c
        """
        df = db_manager.execute_query(query)
        if not df.empty:
            return {
                "waitlist_size": int(df.iloc[0]['waitlist_size'] or 0),
                "waitlist_to_signup": int(df.iloc[0]['waitlist_to_signup'] or 0),
                "conversion_rate": float(df.iloc[0]['conversion_rate'] or 0.0)
            }
    except Exception as e:
        logger.warning(f"Waitlist metrics query failed (table may not exist): {e}")
    
    return {"waitlist_size": 0, "waitlist_to_signup": 0, "conversion_rate": 0.0}


@st.cache_data(ttl=300)
def get_referral_performance(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get referral performance metrics including top referrers.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with referral metrics
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("r.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    # Try referrals table first
    try:
        query = """
        SELECT 
            r.referrer_id,
            u.name AS referrer_name,
            u.email AS referrer_email,
            COUNT(DISTINCT r.referred_user_id) AS total_referrals,
            SUM(r.tokens_earned) AS total_tokens_earned
        FROM public.referrals r
        LEFT JOIN public.usertable u ON r.referrer_id = u.user_id
        {where_clause}
        GROUP BY r.referrer_id, u.name, u.email
        ORDER BY total_referrals DESC
        LIMIT 50
        """
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.warning(f"Referrals table query failed (table may not exist): {e}")
        # Fallback: check if usertable has referred_by column
        try:
            query_fallback = """
            SELECT 
                u.referred_by AS referrer_id,
                ref.name AS referrer_name,
                ref.email AS referrer_email,
                COUNT(*) AS total_referrals
            FROM public.usertable u
            LEFT JOIN public.usertable ref ON u.referred_by = ref.user_id
            WHERE u.referred_by IS NOT NULL
            GROUP BY u.referred_by, ref.name, ref.email
            ORDER BY total_referrals DESC
            LIMIT 50
            """
            df = db_manager.execute_query(query_fallback)
            return df
        except Exception as e2:
            logger.error(f"Referral fallback query failed: {e2}")
            return pd.DataFrame()


@st.cache_data(ttl=300)
def get_invite_link_metrics(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get invite link usage and redemption metrics.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with invite link metrics
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("il.created_at", start_date, end_date)
    where_clause = "WHERE " + date_condition if date_condition else ""
    
    try:
        query = f"""
        SELECT 
            il.user_id,
            u.name AS creator_name,
            u.email AS creator_email,
            COUNT(DISTINCT il.id) AS invite_links_created,
            COUNT(DISTINCT ir.id) AS redemptions,
            COUNT(DISTINCT CASE WHEN ir.reward_granted = true THEN ir.id END) AS rewards_granted
        FROM public.invite_links il
        LEFT JOIN public.usertable u ON il.user_id = u.user_id
        LEFT JOIN public.invite_redemptions ir ON il.id = ir.invite_link_id
        {where_clause}
        GROUP BY il.user_id, u.name, u.email
        ORDER BY invite_links_created DESC
        LIMIT 50
        """
        df = db_manager.execute_query(query)
        return df
    except Exception as e:
        logger.warning(f"Invite link metrics query failed (table may not exist): {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_trial_starts(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get daily trial activations.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with daily trial starts
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("trial_started_at", start_date, end_date)
    
    # Build WHERE clause properly
    where_conditions = ["trial_started_at IS NOT NULL"]
    if date_condition:
        where_conditions.append(date_condition)
    where_clause = "WHERE " + " AND ".join(where_conditions)
    
    try:
        query = f"""
        SELECT 
            DATE(trial_started_at) AS trial_date,
            COUNT(*) AS trial_starts,
            COUNT(DISTINCT user_id) AS unique_trial_users
        FROM public.userstatus
        {where_clause}
        GROUP BY DATE(trial_started_at)
        ORDER BY trial_date DESC
        """
        df = db_manager.execute_query(query)
        return df
    except Exception as e:
        logger.error(f"Trial starts query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_user_status_transitions(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get user status distribution and transitions over time.
    Shows the current status of each user on each date they had activity.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with status distribution by date
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    try:
        # Primary approach: Get status distribution by user signup date
        # This creates a time series showing how many users with each status signed up over time
        date_condition = build_date_where_clause("u.created_at", start_date, end_date)
        where_clause = f"WHERE us.status IS NOT NULL {('AND ' + date_condition) if date_condition else ''}"
        
        query = """
        WITH user_status_by_signup AS (
            SELECT 
                u.user_id,
                DATE(u.created_at) AS signup_date,
                us.status
            FROM public.usertable u
            INNER JOIN public.userstatus us ON u.user_id = us.user_id
            {where_clause}
        )
        SELECT 
            signup_date AS status_date,
            status,
            COUNT(DISTINCT user_id) AS user_count
        FROM user_status_by_signup
        GROUP BY signup_date, status
        ORDER BY signup_date ASC, status
        """.format(where_clause=where_clause)
        
        df = db_manager.execute_query(query)
        logger.info(f"User status transitions query (by signup date) returned {len(df)} rows")
        
        if not df.empty:
            # Convert status_date to datetime for Plotly
            df['status_date'] = pd.to_datetime(df['status_date'], errors='coerce')
            # Remove any rows with invalid dates
            df = df.dropna(subset=['status_date'])
            # Ensure user_count is numeric
            df['user_count'] = pd.to_numeric(df['user_count'], errors='coerce').fillna(0).astype(int)
            
            # Sort by date
            df = df.sort_values('status_date')
            
            unique_dates = df['status_date'].nunique()
            logger.info(f"After processing: {len(df)} rows, {unique_dates} unique dates")
            
            if len(df) > 0:
                logger.info(f"Date range: {df['status_date'].min()} to {df['status_date'].max()}")
                logger.info(f"Status values: {df['status'].unique().tolist()}")
                logger.info(f"Sample data:\n{df.head(10).to_string()}")
            
            return df
        else:
            # Fallback: Try grouping by status record creation date
            logger.info("Signup date query returned empty. Trying status record creation date...")
            fallback_query = """
            SELECT 
                DATE(COALESCE(updated_at, created_at)) AS status_date,
                status,
                COUNT(DISTINCT user_id) AS user_count
            FROM public.userstatus
            WHERE status IS NOT NULL
            GROUP BY DATE(COALESCE(updated_at, created_at)), status
            ORDER BY status_date ASC, status
            """
            
            fallback_df = db_manager.execute_query(fallback_query)
            if not fallback_df.empty:
                fallback_df['status_date'] = pd.to_datetime(fallback_df['status_date'], errors='coerce')
                fallback_df = fallback_df.dropna(subset=['status_date'])
                fallback_df['user_count'] = pd.to_numeric(fallback_df['user_count'], errors='coerce').fillna(0).astype(int)
                fallback_df = fallback_df.sort_values('status_date')
                
                # Apply date filtering
                if start_date is not None:
                    fallback_df = fallback_df[fallback_df['status_date'] >= pd.to_datetime(start_date)]
                if end_date is not None:
                    fallback_df = fallback_df[fallback_df['status_date'] <= pd.to_datetime(end_date)]
                
                logger.info(f"Fallback query returned {len(fallback_df)} rows with {fallback_df['status_date'].nunique()} unique dates")
                return fallback_df
            
            logger.warning("Both queries returned empty. Checking if tables have data...")
            # Check if tables have any data at all
            check_query = """
            SELECT 
                (SELECT COUNT(*) FROM public.userstatus WHERE status IS NOT NULL) as status_count,
                (SELECT COUNT(*) FROM public.usertable) as user_count
            """
            check_df = db_manager.execute_query(check_query)
            if not check_df.empty:
                status_count = check_df.iloc[0]['status_count']
                user_count = check_df.iloc[0]['user_count']
                logger.info(f"userstatus table has {status_count} status records, usertable has {user_count} users")
            
            return pd.DataFrame()
    except Exception as e:
        logger.error(f"User status transitions query failed: {e}", exc_info=True)
        return pd.DataFrame()


# ============================================================================
# IMPRESSION QUERIES
# ============================================================================

@st.cache_data(ttl=300)
def get_dau_wau_mau(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Get Daily, Weekly, and Monthly Active Users, segregated by Extension and Chat.

    Args:
        start_date: Start date for filtering
        end_date: End date for filtering

    Returns:
        Dictionary with DAU, WAU, MAU metrics segregated by product type
    """
    if not DATABASE_AVAILABLE:
        return {
            "extension": {"dau": 0, "wau": 0, "mau": 0, "stickiness": 0.0},
            "chat": {"dau": 0, "wau": 0, "mau": 0, "stickiness": 0.0},
            "total": {"dau": 0, "wau": 0, "mau": 0, "stickiness": 0.0}
        }

    # First, let's check if product_type column exists, if not we'll assume all are extension for backward compatibility
    try:
        # Check schema
        schema_query = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'save_enhance_prompt'
        AND column_name = 'product_type'
        """
        schema_df = db_manager.execute_query(schema_query)
        has_product_type = not schema_df.empty
    except:
        has_product_type = False

    product_column = "COALESCE(sep.product_type, 'extension')" if has_product_type else "'extension'"

    query = f"""
    WITH user_activity AS (
        SELECT
            COALESCE(sep.user_id, up.user_id) AS user_id,
            DATE(sep.created_at) AS activity_date,
            {product_column} AS product_type,
            COUNT(*) AS daily_uses
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
        WHERE DATE(sep.created_at) = CURRENT_DATE
        GROUP BY COALESCE(sep.user_id, up.user_id), DATE(sep.created_at), {product_column}
    ),
    daily_active AS (
        SELECT
            product_type,
            COUNT(DISTINCT user_id) AS dau
        FROM user_activity
        WHERE daily_uses >= 1
        GROUP BY product_type
    ),
    weekly_active AS (
        SELECT
            COALESCE(sep.user_id, up.user_id) AS user_id,
            {product_column} AS product_type,
            COUNT(*) AS weekly_uses
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
        WHERE sep.created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY COALESCE(sep.user_id, up.user_id), {product_column}
        HAVING COUNT(*) >= 3
    ),
    monthly_active AS (
        SELECT
            COALESCE(sep.user_id, up.user_id) AS user_id,
            {product_column} AS product_type,
            COUNT(*) AS monthly_uses
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
        WHERE sep.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY COALESCE(sep.user_id, up.user_id), {product_column}
        HAVING COUNT(*) >= 3
    ),
    weekly_agg AS (
        SELECT product_type, COUNT(DISTINCT user_id) AS wau
        FROM weekly_active
        GROUP BY product_type
    ),
    monthly_agg AS (
        SELECT product_type, COUNT(DISTINCT user_id) AS mau
        FROM monthly_active
        GROUP BY product_type
    )
    SELECT
        COALESCE(d.product_type, w.product_type, m.product_type) AS product_type,
        COALESCE(d.dau, 0) AS dau,
        COALESCE(w.wau, 0) AS wau,
        COALESCE(m.mau, 0) AS mau
    FROM daily_active d
    FULL OUTER JOIN weekly_agg w ON d.product_type = w.product_type
    FULL OUTER JOIN monthly_agg m ON COALESCE(d.product_type, w.product_type) = m.product_type
    """

    try:
        df = db_manager.execute_query(query)

        # Initialize results
        results = {
            "extension": {"dau": 0, "wau": 0, "mau": 0, "stickiness": 0.0},
            "chat": {"dau": 0, "wau": 0, "mau": 0, "stickiness": 0.0},
            "total": {"dau": 0, "wau": 0, "mau": 0, "stickiness": 0.0}
        }

        if not df.empty:
            for _, row in df.iterrows():
                product_type = row['product_type'] or 'extension'
                if product_type not in results:
                    continue

                dau = int(row['dau'] or 0)
                wau = int(row['wau'] or 0)
                mau = int(row['mau'] or 0)
                stickiness = (dau / mau * 100) if mau > 0 else 0.0

                results[product_type] = {
                    "dau": dau,
                    "wau": wau,
                    "mau": mau,
                    "stickiness": round(stickiness, 2)
                }

                # Add to totals
                results["total"]["dau"] += dau
                results["total"]["wau"] += wau
                results["total"]["mau"] += mau

            # Calculate total stickiness
            total_dau = results["total"]["dau"]
            total_mau = results["total"]["mau"]
            results["total"]["stickiness"] = round((total_dau / total_mau * 100) if total_mau > 0 else 0.0, 2)

        return results
    except Exception as e:
        logger.error(f"DAU/WAU/MAU query failed: {e}")
        return {
            "extension": {"dau": 0, "wau": 0, "mau": 0, "stickiness": 0.0},
            "chat": {"dau": 0, "wau": 0, "mau": 0, "stickiness": 0.0},
            "total": {"dau": 0, "wau": 0, "mau": 0, "stickiness": 0.0}
        }


@st.cache_data(ttl=300)
def get_user_activity_patterns(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get user activity patterns by hour and day of week.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with activity patterns
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("sep.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    query = """
    SELECT 
        EXTRACT(HOUR FROM sep.created_at) AS hour_of_day,
        EXTRACT(DOW FROM sep.created_at) AS day_of_week,
        TO_CHAR(sep.created_at, 'Day') AS day_name,
        COUNT(DISTINCT COALESCE(sep.user_id, up.user_id)) AS active_users,
        COUNT(*) AS total_actions
    FROM public.save_enhance_prompt sep
    LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    {where_clause}
    GROUP BY EXTRACT(HOUR FROM sep.created_at), EXTRACT(DOW FROM sep.created_at), TO_CHAR(sep.created_at, 'Day')
    ORDER BY day_of_week, hour_of_day
    """
    
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.error(f"User activity patterns query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_feature_usage_counts(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get feature usage counts by feature type.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with feature usage metrics
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("sep.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    query = """
    WITH enhance_usage AS (
        SELECT COUNT(*) AS enhance_count, COUNT(DISTINCT COALESCE(sep.user_id, up.user_id)) AS enhance_users
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
        {where_clause}
    ),
    refine_usage AS (
        SELECT COUNT(*) AS refine_count, COUNT(DISTINCT rp.user_id) AS refine_users
        FROM public.refine_prompt rp
        WHERE rp.created_at >= (SELECT MIN(sep.created_at) FROM public.save_enhance_prompt sep {where_clause})
    )
    SELECT 
        'Enhance' AS feature_name,
        e.enhance_count AS usage_count,
        e.enhance_users AS unique_users
    FROM enhance_usage e
    UNION ALL
    SELECT 
        'Refine' AS feature_name,
        r.refine_count AS usage_count,
        r.refine_users AS unique_users
    FROM refine_usage r
    """
    
    try:
        # Simplified query - separate queries for each feature
        enhance_where = f"WHERE {date_condition}" if date_condition else ""
        refine_where = f"WHERE {date_condition}" if date_condition else ""
        
        # Query for Enhance feature
        enhance_query = f"""
        SELECT 
            'Enhance' AS feature_name,
            COUNT(*) AS usage_count,
            COUNT(DISTINCT COALESCE(sep.user_id, up.user_id)) AS unique_users
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
        {enhance_where}
        """
        
        # Query for Refine feature
        refine_query = f"""
        SELECT 
            'Refine' AS feature_name,
            COUNT(*) AS usage_count,
            COUNT(DISTINCT rp.user_id) AS unique_users
        FROM public.refine_prompt rp
        {refine_where}
        """
        
        # Execute both queries and combine
        enhance_df = db_manager.execute_query(enhance_query)
        refine_df = db_manager.execute_query(refine_query)
        
        # Combine results
        if not enhance_df.empty and not refine_df.empty:
            return pd.concat([enhance_df, refine_df], ignore_index=True)
        elif not enhance_df.empty:
            return enhance_df
        elif not refine_df.empty:
            return refine_df
        else:
            return pd.DataFrame()
    except Exception as e:
        logger.error(f"Feature usage counts query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_feature_adoption_rate(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, float]:
    """
    Get feature adoption rates.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        Dictionary with adoption rates
    """
    if not DATABASE_AVAILABLE:
        return {"enhance_adoption": 0.0, "refine_adoption": 0.0}
    
    query = """
    WITH total_users AS (
        SELECT COUNT(DISTINCT user_id) AS total
        FROM public.usertable
    ),
    enhance_users AS (
        SELECT COUNT(DISTINCT COALESCE(sep.user_id, up.user_id)) AS count
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    ),
    refine_users AS (
        SELECT COUNT(DISTINCT user_id) AS count
        FROM public.refine_prompt
    )
    SELECT 
        ROUND(e.count::decimal / NULLIF(t.total, 0) * 100, 2) AS enhance_adoption,
        ROUND(r.count::decimal / NULLIF(t.total, 0) * 100, 2) AS refine_adoption
    FROM total_users t
    CROSS JOIN enhance_users e
    CROSS JOIN refine_users r
    """
    
    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            return {
                "enhance_adoption": float(df.iloc[0]['enhance_adoption'] or 0.0),
                "refine_adoption": float(df.iloc[0]['refine_adoption'] or 0.0)
            }
        return {"enhance_adoption": 0.0, "refine_adoption": 0.0}
    except Exception as e:
        logger.error(f"Feature adoption rate query failed: {e}")
        return {"enhance_adoption": 0.0, "refine_adoption": 0.0}


@st.cache_data(ttl=300)
def get_processing_metrics(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get processing time metrics.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with processing metrics
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    # Build WHERE clauses separately for each table
    enhance_condition = build_date_where_clause("sep.created_at", start_date, end_date)
    enhance_conditions = ["sep.processing_time IS NOT NULL"]
    if enhance_condition:
        enhance_conditions.append(enhance_condition)
    enhance_where = "WHERE " + " AND ".join(enhance_conditions)
    
    refine_condition = build_date_where_clause("rp.created_at", start_date, end_date)
    refine_conditions = ["rp.processing_time IS NOT NULL"]
    if refine_condition:
        refine_conditions.append(refine_condition)
    refine_where = "WHERE " + " AND ".join(refine_conditions)
    
    try:
        # Query for Enhance feature
        enhance_query = f"""
        SELECT 
            'Enhance' AS feature_name,
            COUNT(*) AS total_requests,
            ROUND(AVG(sep.processing_time), 2) AS avg_processing_time,
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY sep.processing_time), 2) AS p95_processing_time,
            ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY sep.processing_time), 2) AS p99_processing_time,
            ROUND(MIN(sep.processing_time), 2) AS min_processing_time,
            ROUND(MAX(sep.processing_time), 2) AS max_processing_time
        FROM public.save_enhance_prompt sep
        {enhance_where}
        """
        
        # Query for Refine feature
        refine_query = f"""
        SELECT 
            'Refine' AS feature_name,
            COUNT(*) AS total_requests,
            ROUND(AVG(rp.processing_time), 2) AS avg_processing_time,
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY rp.processing_time), 2) AS p95_processing_time,
            ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY rp.processing_time), 2) AS p99_processing_time,
            ROUND(MIN(rp.processing_time), 2) AS min_processing_time,
            ROUND(MAX(rp.processing_time), 2) AS max_processing_time
        FROM public.refine_prompt rp
        {refine_where}
        """
        
        # Execute both queries
        enhance_df = db_manager.execute_query(enhance_query)
        refine_df = db_manager.execute_query(refine_query)
        
        # Combine results
        if not enhance_df.empty and not refine_df.empty:
            return pd.concat([enhance_df, refine_df], ignore_index=True)
        elif not enhance_df.empty:
            return enhance_df
        elif not refine_df.empty:
            return refine_df
        else:
            return pd.DataFrame()
    except Exception as e:
        logger.error(f"Processing metrics query failed: {e}")
        return pd.DataFrame()


# ============================================================================
# RETENTION QUERIES
# ============================================================================

@st.cache_data(ttl=600)  # Cache for 10 minutes (retention is slower changing)
def get_retention_by_cohort(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get retention metrics by signup cohort.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with cohort retention data
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("u.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    query = """
    WITH signups AS (
        SELECT user_id, DATE_TRUNC('week', created_at) AS cohort_week
        FROM public.usertable
        {where_clause}
    ),
    activity AS (
        SELECT 
            COALESCE(sep.user_id, up.user_id) AS user_id,
            DATE(sep.created_at) AS activity_date
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    )
    SELECT 
        s.cohort_week,
        COUNT(DISTINCT s.user_id) AS cohort_size,
        COUNT(DISTINCT CASE WHEN a.activity_date >= s.cohort_week AND a.activity_date < s.cohort_week + INTERVAL '7 days' THEN a.user_id END) AS week_0_retention,
        COUNT(DISTINCT CASE WHEN a.activity_date >= s.cohort_week + INTERVAL '7 days' AND a.activity_date < s.cohort_week + INTERVAL '14 days' THEN a.user_id END) AS week_1_retention,
        COUNT(DISTINCT CASE WHEN a.activity_date >= s.cohort_week + INTERVAL '14 days' AND a.activity_date < s.cohort_week + INTERVAL '21 days' THEN a.user_id END) AS week_2_retention,
        COUNT(DISTINCT CASE WHEN a.activity_date >= s.cohort_week + INTERVAL '21 days' AND a.activity_date < s.cohort_week + INTERVAL '28 days' THEN a.user_id END) AS week_3_retention
    FROM signups s
    LEFT JOIN activity a ON s.user_id = a.user_id
    GROUP BY s.cohort_week
    ORDER BY s.cohort_week DESC
    LIMIT 20
    """
    
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.error(f"Retention by cohort query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=600)
def get_churn_analysis_detailed(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Get detailed churn analysis.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        Dictionary with churn metrics
    """
    if not DATABASE_AVAILABLE:
        return {"churn_rate": 0.0, "churned_users": 0, "active_users": 0}
    
    query = """
    WITH last_activity AS (
        SELECT 
            COALESCE(sep.user_id, up.user_id) AS user_id,
            MAX(sep.created_at) AS last_activity_date
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
        GROUP BY COALESCE(sep.user_id, up.user_id)
    ),
    user_status AS (
        SELECT 
            u.user_id,
            CASE 
                WHEN la.last_activity_date IS NULL THEN 'churned'
                WHEN la.last_activity_date < CURRENT_DATE - INTERVAL '30 days' THEN 'churned'
                ELSE 'active'
            END AS status
        FROM public.usertable u
        LEFT JOIN last_activity la ON u.user_id = la.user_id
    )
    SELECT 
        COUNT(CASE WHEN status = 'churned' THEN 1 END) AS churned_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_users,
        COUNT(*) AS total_users,
        ROUND(COUNT(CASE WHEN status = 'churned' THEN 1 END)::decimal / COUNT(*)::decimal * 100, 2) AS churn_rate
    FROM user_status
    """
    
    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            return {
                "churn_rate": float(df.iloc[0]['churn_rate'] or 0.0),
                "churned_users": int(df.iloc[0]['churned_users'] or 0),
                "active_users": int(df.iloc[0]['active_users'] or 0),
                "total_users": int(df.iloc[0]['total_users'] or 0)
            }
        return {"churn_rate": 0.0, "churned_users": 0, "active_users": 0, "total_users": 0}
    except Exception as e:
        logger.error(f"Churn analysis query failed: {e}")
        return {"churn_rate": 0.0, "churned_users": 0, "active_users": 0, "total_users": 0}


@st.cache_data(ttl=600)
def get_subscription_metrics(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Get subscription metrics.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        Dictionary with subscription metrics
    """
    if not DATABASE_AVAILABLE:
        return {"active_subscriptions": 0, "trial_conversion_rate": 0.0}
    
    try:
        # Check if subscriptions table exists
        query = """
        SELECT 
            COUNT(*) AS active_subscriptions
        FROM public.subscriptions
        WHERE status = 'active'
        """
        df = db_manager.execute_query(query)
        active_subs = int(df.iloc[0]['active_subscriptions'] or 0) if not df.empty else 0
        
        # Trial conversion
        trial_query = """
        WITH trial_users AS (
            SELECT COUNT(DISTINCT user_id) AS trial_count
            FROM public.userstatus
            WHERE has_used_trial = true
        ),
        paid_users AS (
            SELECT COUNT(DISTINCT user_id) AS paid_count
            FROM public.userstatus
            WHERE status = 'pro'
        )
        SELECT 
            ROUND(p.paid_count::decimal / NULLIF(t.trial_count, 0) * 100, 2) AS conversion_rate
        FROM trial_users t
        CROSS JOIN paid_users p
        """
        df_conv = db_manager.execute_query(trial_query)
        conversion_rate = float(df_conv.iloc[0]['conversion_rate'] or 0.0) if not df_conv.empty else 0.0
        
        return {
            "active_subscriptions": active_subs,
            "trial_conversion_rate": conversion_rate
        }
    except Exception as e:
        logger.warning(f"Subscription metrics query failed (table may not exist): {e}")
        return {"active_subscriptions": 0, "trial_conversion_rate": 0.0}


@st.cache_data(ttl=600)
def get_lifecycle_distribution() -> Dict[str, int]:
    """
    Get user lifecycle stage distribution.
    
    Returns:
        Dictionary with lifecycle metrics
    """
    if not DATABASE_AVAILABLE:
        return {"new_users": 0, "active_users": 0, "at_risk_users": 0, "churned_users": 0}
    
    query = """
    WITH last_activity AS (
        SELECT 
            COALESCE(sep.user_id, up.user_id) AS user_id,
            MAX(sep.created_at) AS last_activity_date,
            u.created_at AS signup_date
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
        RIGHT JOIN public.usertable u ON COALESCE(sep.user_id, up.user_id) = u.user_id
        GROUP BY COALESCE(sep.user_id, up.user_id), u.created_at
    ),
    user_lifecycle AS (
        SELECT 
            u.user_id,
            CASE 
                WHEN u.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'new'
                WHEN la.last_activity_date IS NULL OR la.last_activity_date < CURRENT_DATE - INTERVAL '30 days' THEN 'churned'
                WHEN la.last_activity_date < CURRENT_DATE - INTERVAL '7 days' THEN 'at_risk'
                ELSE 'active'
            END AS lifecycle_stage
        FROM public.usertable u
        LEFT JOIN last_activity la ON u.user_id = la.user_id
    )
    SELECT 
        COUNT(CASE WHEN lifecycle_stage = 'new' THEN 1 END) AS new_users,
        COUNT(CASE WHEN lifecycle_stage = 'active' THEN 1 END) AS active_users,
        COUNT(CASE WHEN lifecycle_stage = 'at_risk' THEN 1 END) AS at_risk_users,
        COUNT(CASE WHEN lifecycle_stage = 'churned' THEN 1 END) AS churned_users
    FROM user_lifecycle
    """
    
    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            return {
                "new_users": int(df.iloc[0]['new_users'] or 0),
                "active_users": int(df.iloc[0]['active_users'] or 0),
                "at_risk_users": int(df.iloc[0]['at_risk_users'] or 0),
                "churned_users": int(df.iloc[0]['churned_users'] or 0)
            }
        return {"new_users": 0, "active_users": 0, "at_risk_users": 0, "churned_users": 0}
    except Exception as e:
        logger.error(f"Lifecycle distribution query failed: {e}")
        return {"new_users": 0, "active_users": 0, "at_risk_users": 0, "churned_users": 0}


# ============================================================================
# ENGAGEMENT QUERIES
# ============================================================================

@st.cache_data(ttl=300)
def get_daily_usage_intensity(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get daily usage intensity per user.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with usage intensity metrics
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("sep.created_at", start_date, end_date)
    where_clause = "WHERE " + date_condition if date_condition else ""
    
    query = f"""
    SELECT 
        DATE(sep.created_at) AS usage_date,
        COUNT(DISTINCT COALESCE(sep.user_id, up.user_id)) AS active_users,
        COUNT(*) AS total_actions,
        ROUND(COUNT(*)::decimal / NULLIF(COUNT(DISTINCT COALESCE(sep.user_id, up.user_id)), 0), 2) AS avg_actions_per_user
    FROM public.save_enhance_prompt sep
    LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    {where_clause}
    GROUP BY DATE(sep.created_at)
    ORDER BY usage_date DESC
    """
    
    try:
        df = db_manager.execute_query(query)
        logger.info(f"Daily usage intensity query returned {len(df)} rows")
        return df
    except Exception as e:
        logger.error(f"Daily usage intensity query failed: {e}", exc_info=True)
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_token_consumption(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get token consumption metrics.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with token consumption
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("tt.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    try:
        query = """
        SELECT 
            DATE(tt.created_at) AS transaction_date,
            COUNT(*) AS transactions,
            SUM(ABS(tt.amount)) AS tokens_consumed,
            COUNT(DISTINCT tt.user_id) AS active_users,
            ROUND(AVG(ABS(tt.amount)), 2) AS avg_tokens_per_transaction
        FROM public.token_transactions tt
        WHERE tt.transaction_type = 'debit'
        {where_clause}
        GROUP BY DATE(tt.created_at)
        ORDER BY transaction_date DESC
        """
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.warning(f"Token consumption query failed (table may not exist): {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_prompt_generation_metrics(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None,
                                  ai_filter: Optional[str] = None, product_filter: Optional[str] = None,
                                  domain_filter: Optional[str] = None, intent_filter: Optional[str] = None) -> Dict[str, Any]:
    """
    Get prompt generation metrics with advanced filtering.

    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        ai_filter: Filter by AI model used
        product_filter: Filter by product type ('extension' or 'lander')
        domain_filter: Filter by content domain
        intent_filter: Filter by user intent/purpose

    Returns:
        Dictionary with filtered prompt metrics
    """
    if not DATABASE_AVAILABLE:
        return {"total_prompts": 0, "prompts_per_user": 0.0}

    # Build WHERE conditions
    conditions = []

    # Date condition
    date_condition = build_date_where_clause("up.created_at", start_date, end_date)
    if date_condition:
        conditions.append(date_condition)

    # AI filter (assuming llm_used column exists)
    if ai_filter:
        conditions.append(f"sep.llm_used = '{ai_filter}'")

    # Product filter
    if product_filter:
        conditions.append(f"COALESCE(sep.product_type, 'extension') = '{product_filter}'")

    # Domain filter
    if domain_filter:
        conditions.append(f"sep.domain = '{domain_filter}'")

    # Intent filter
    if intent_filter:
        conditions.append(f"sep.intent = '{intent_filter}'")

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    # Get total prompts and total users in the filtered period
    query = f"""
    WITH filtered_data AS (
        SELECT
            up.user_id,
            COUNT(*) AS user_prompts
        FROM public.user_prompts up
        LEFT JOIN public.save_enhance_prompt sep ON up.prompt_id = sep.prompt_id
        {where_clause}
        GROUP BY up.user_id
    ),
    totals AS (
        SELECT
            SUM(user_prompts) AS total_prompts,
            COUNT(*) AS total_users
        FROM filtered_data
    )
    SELECT
        total_prompts,
        ROUND(total_prompts::decimal / NULLIF(total_users, 0), 2) AS prompts_per_user
    FROM totals
    """

    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            return {
                "total_prompts": int(df.iloc[0]['total_prompts'] or 0),
                "prompts_per_user": float(df.iloc[0]['prompts_per_user'] or 0.0)
            }
        return {"total_prompts": 0, "prompts_per_user": 0.0}
    except Exception as e:
        logger.error(f"Prompt generation metrics query failed: {e}")
        return {"total_prompts": 0, "prompts_per_user": 0.0}


@st.cache_data(ttl=300)
def get_prompt_reviews(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get detailed prompt reviews with user info, original prompts, enhanced prompts, and refined prompts.
    Joins user_prompts, save_enhance_prompt, and refine_prompt tables.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with prompt review data
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("sep.created_at", start_date, end_date)
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
        logger.info(f"Prompt reviews query returned {len(df)} rows")
        
        if not df.empty and 'created_at' in df.columns:
            df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
        
        return df
    except Exception as e:
        logger.error(f"Prompt reviews query failed: {e}", exc_info=True)
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_context_creation_metrics(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get context creation metrics by platform.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with context metrics
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("cc.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    try:
        query = """
        SELECT 
            cc.platform,
            COUNT(*) AS context_count,
            COUNT(DISTINCT cc.user_id) AS unique_users,
            ROUND(AVG(cc.message_count), 2) AS avg_messages_per_context
        FROM public.conversation_contexts cc
        {where_clause}
        GROUP BY cc.platform
        ORDER BY context_count DESC
        """
        df = db_manager.execute_query(query.format(where_clause=where_clause))
        return df
    except Exception as e:
        logger.warning(f"Context creation metrics query failed (table may not exist): {e}")
        return pd.DataFrame()


# ============================================================================
# TECHNICAL QUERIES
# ============================================================================

@st.cache_data(ttl=600)
def get_table_sizes() -> pd.DataFrame:
    """
    Get table sizes and row counts.
    
    Returns:
        DataFrame with table size metrics
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    query = """
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
        (SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_schema = schemaname AND t.table_name = tablename) AS exists
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    """
    
    try:
        df = db_manager.execute_query(query)
        return df
    except Exception as e:
        logger.error(f"Table sizes query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_user_table_data(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, limit: int = 0) -> pd.DataFrame:
    """
    Get user table data with key information.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        limit: Maximum number of rows to return
        
    Returns:
        DataFrame with user data
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    limit_clause = f"LIMIT {limit}" if limit > 0 else ""
    
    query = """
    SELECT 
        user_id,
        name,
        email,
        created_at,
        CASE 
            WHEN google_id IS NOT NULL THEN 'OAuth'
            WHEN password IS NOT NULL THEN 'Email'
            ELSE 'Unknown'
        END AS auth_method
    FROM public.usertable
    {where_clause}
    ORDER BY created_at DESC
    {limit_clause}
    """
    
    try:
        df = db_manager.execute_query(query.format(where_clause=where_clause, limit_clause=limit_clause))
        if not df.empty and 'created_at' in df.columns:
            df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
        return df
    except Exception as e:
        logger.error(f"User table query failed: {e}")
        # Try without date filter if date filter fails
        if where_clause:
            try:
                simple_query = """
                SELECT 
                    user_id,
                    name,
                    email,
                    created_at,
                    CASE 
                        WHEN google_id IS NOT NULL THEN 'OAuth'
                        WHEN password IS NOT NULL THEN 'Email'
                        ELSE 'Unknown'
                    END AS auth_method
                FROM public.usertable
                ORDER BY created_at DESC
                LIMIT 1000
                """
                df = db_manager.execute_query(simple_query)
                if not df.empty and 'created_at' in df.columns:
                    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
                return df
            except Exception as e2:
                logger.error(f"User table simple query also failed: {e2}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_user_prompts_data(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, limit: int = 0) -> pd.DataFrame:
    """
    Get original user prompts data.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        limit: Maximum number of rows to return
        
    Returns:
        DataFrame with user prompts data
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    limit_clause = f"LIMIT {limit}" if limit > 0 else ""
    
    # Try with date filter first
    try:
        date_condition = build_date_where_clause("created_at", start_date, end_date)
        where_clause = f"WHERE {date_condition}" if date_condition else ""
        
        query = """
        SELECT 
            prompt_id,
            user_id,
            LEFT(user_prompt, 200) AS prompt_preview,
            LENGTH(user_prompt) AS prompt_length,
            created_at
        FROM public.user_prompts
        {where_clause}
        ORDER BY created_at DESC
        {limit_clause}
        """
        
        df = db_manager.execute_query(query.format(where_clause=where_clause, limit_clause=limit_clause))
        if not df.empty:
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
            logger.info(f"User prompts query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.warning(f"User prompts query with date filter failed: {e}, trying without filter...")
    
    # Fallback: Try without date filter
    try:
        query_no_filter = """
        SELECT 
            prompt_id,
            user_id,
            LEFT(user_prompt, 200) AS prompt_preview,
            LENGTH(user_prompt) AS prompt_length,
            created_at
        FROM public.user_prompts
        ORDER BY created_at DESC
        LIMIT 1000
        """
        df = db_manager.execute_query(query_no_filter)
        if not df.empty:
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
            logger.info(f"User prompts no-filter query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.error(f"User prompts no-filter query failed: {e}")
    
    return pd.DataFrame()


@st.cache_data(ttl=300)
def get_enhanced_prompts_data(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, limit: int = 0) -> pd.DataFrame:
    """
    Get enhanced prompts data with AI details.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        limit: Maximum number of rows to return
        
    Returns:
        DataFrame with enhanced prompts data
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    limit_clause = f"LIMIT {limit}" if limit > 0 else ""
    
    # Try with date filter first
    try:
        date_condition = build_date_where_clause("sep.created_at", start_date, end_date)
        where_clause = f"WHERE {date_condition}" if date_condition else ""
        
        query = """
        SELECT 
            sep.enhanced_prompt_id,
            sep.prompt_id,
            sep.user_id,
            LEFT(sep.enhanced_prompt, 200) AS enhanced_prompt_preview,
            sep.domain,
            sep.intent,
            sep.llm_used,
            sep.mode,
            sep.user_status,
            sep.processing_time,
            sep.created_at
        FROM public.save_enhance_prompt sep
        {where_clause}
        ORDER BY sep.created_at DESC
        {limit_clause}
        """
        
        df = db_manager.execute_query(query.format(where_clause=where_clause, limit_clause=limit_clause))
        if not df.empty:
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
            logger.info(f"Enhanced prompts query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.warning(f"Enhanced prompts query with date filter failed: {e}, trying without filter...")
    
    # Fallback: Try without date filter
    try:
        query_no_filter = """
        SELECT *
        FROM public.save_enhance_prompt
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1000
        """
        df = db_manager.execute_query(query_no_filter)
        if not df.empty:
            # Add preview column if enhanced_prompt exists
            if 'enhanced_prompt' in df.columns:
                df['enhanced_prompt_preview'] = df['enhanced_prompt'].astype(str).str[:200]
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
            logger.info(f"Enhanced prompts no-filter query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.error(f"Enhanced prompts no-filter query failed: {e}")
    
    return pd.DataFrame()


@st.cache_data(ttl=300)
def get_refined_prompts_data(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, limit: int = 0) -> pd.DataFrame:
    """
    Get refined prompts data.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        limit: Maximum number of rows to return
        
    Returns:
        DataFrame with refined prompts data
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    limit_clause = f"LIMIT {limit}" if limit > 0 else ""
    
    # Try with date filter first
    try:
        date_condition = build_date_where_clause("created_at", start_date, end_date)
        where_clause = f"WHERE {date_condition}" if date_condition else ""
        
        query = """
        SELECT 
            refine_id,
            prompt_id,
            enhanced_prompt_id,
            LEFT(refined_prompt, 200) AS refined_prompt_preview,
            processing_time,
            created_at
        FROM public.refine_prompt
        {where_clause}
        ORDER BY created_at DESC
        {limit_clause}
        """
        
        df = db_manager.execute_query(query.format(where_clause=where_clause, limit_clause=limit_clause))
        if not df.empty:
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
            logger.info(f"Refined prompts query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.warning(f"Refined prompts query with date filter failed: {e}, trying without filter...")
    
    # Fallback: Try without date filter
    try:
        query_no_filter = """
        SELECT *
        FROM public.refine_prompt
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1000
        """
        df = db_manager.execute_query(query_no_filter)
        if not df.empty:
            # Add preview column if refined_prompt exists
            if 'refined_prompt' in df.columns:
                df['refined_prompt_preview'] = df['refined_prompt'].astype(str).str[:200]
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
            logger.info(f"Refined prompts no-filter query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.error(f"Refined prompts no-filter query failed: {e}")
    
    return pd.DataFrame()


@st.cache_data(ttl=300)
def get_user_status_data(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, limit: int = 0) -> pd.DataFrame:
    """
    Get user status data.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        limit: Maximum number of rows to return
        
    Returns:
        DataFrame with user status data
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    limit_clause = f"LIMIT {limit}" if limit > 0 else ""
    
    # Try with date filter first
    try:
        date_condition = build_date_where_clause("created_at", start_date, end_date)
        where_clause = f"WHERE {date_condition}" if date_condition else ""
        
        query = """
        SELECT 
            user_id,
            status,
            created_at,
            updated_at
        FROM public.userstatus
        {where_clause}
        ORDER BY created_at DESC
        {limit_clause}
        """
        
        df = db_manager.execute_query(query.format(where_clause=where_clause, limit_clause=limit_clause))
        if not df.empty:
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
            if 'updated_at' in df.columns:
                df['updated_at'] = pd.to_datetime(df['updated_at'], errors='coerce')
            logger.info(f"User status query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.warning(f"User status query with date filter failed: {e}, trying without filter...")
    
    # Fallback: Try without date filter
    try:
        query_no_filter = """
        SELECT *
        FROM public.userstatus
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1000
        """
        df = db_manager.execute_query(query_no_filter)
        if not df.empty:
            for col in ['created_at', 'updated_at']:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
            logger.info(f"User status no-filter query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.error(f"User status no-filter query failed: {e}")
    
    return pd.DataFrame()


@st.cache_data(ttl=300)
def get_onboarding_data(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, limit: int = 0) -> pd.DataFrame:
    """
    Get onboarding data with user information.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        limit: Maximum number of rows to return
        
    Returns:
        DataFrame with onboarding data
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    limit_clause = f"LIMIT {limit}" if limit > 0 else ""
    
    # Try joined query first (preferred)
    try:
        date_condition = build_date_where_clause("ob.created_at", start_date, end_date)
        where_clause = f"WHERE {date_condition}" if date_condition else ""
        
        query_joined = """
        SELECT 
            ob.id,
            ob.user_id,
            u.name AS user_name,
            u.email,
            ob.source,
            ob.llm_platform,
            ob.occupation,
            ob.problems_faced,
            ob.use_case,
            ob.ai_familiarity,
            ob.created_at,
            ob.updated_at,
            u.created_at AS user_signup_date
        FROM public.onboarding_data ob
        LEFT JOIN public.usertable u ON ob.user_id = u.user_id
        {where_clause}
        ORDER BY ob.id DESC
        {limit_clause}
        """
        
        df = db_manager.execute_query(query_joined.format(where_clause=where_clause, limit_clause=limit_clause))
        if not df.empty:
            # Convert date columns
            for col in ['created_at', 'updated_at', 'user_signup_date']:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
            logger.info(f"Onboarding data query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.warning(f"Onboarding data joined query failed: {e}, trying simple query...")
    
    # Fallback: Simple query without join
    try:
        date_condition = build_date_where_clause("ob.created_at", start_date, end_date)
        where_clause = f"WHERE {date_condition}" if date_condition else ""
        
        query_simple = """
        SELECT *
        FROM public.onboarding_data ob
        {where_clause}
        ORDER BY ob.id DESC
        {limit_clause}
        """
        
        df = db_manager.execute_query(query_simple.format(where_clause=where_clause, limit_clause=limit_clause))
        if not df.empty:
            # Convert date columns
            for col in ['created_at', 'updated_at']:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
            logger.info(f"Onboarding data simple query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.error(f"Onboarding data simple query also failed: {e}")
    
    # Last resort: Try without date filter
    try:
        query_no_filter = """
        SELECT *
        FROM public.onboarding_data
        ORDER BY id DESC
        LIMIT 1000
        """
        df = db_manager.execute_query(query_no_filter)
        if not df.empty:
            logger.info(f"Onboarding data no-filter query returned {len(df)} rows")
            return df
    except Exception as e:
        logger.error(f"Onboarding data no-filter query failed: {e}")
    
    return pd.DataFrame()


@st.cache_data(ttl=600)
def get_data_quality_metrics() -> pd.DataFrame:
    """
    Get data quality metrics for key tables.
    
    Returns:
        DataFrame with data quality metrics
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    # Check key tables for null rates
    tables_to_check = ['usertable', 'user_prompts', 'save_enhance_prompt', 'userstatus']
    results = []
    
    for table in tables_to_check:
        try:
            query = f"""
            SELECT 
                '{table}' AS table_name,
                COUNT(*) AS total_rows,
                COUNT(*) - COUNT(user_id) AS null_user_id_count
            FROM public.{table}
            """
            df = db_manager.execute_query(query)
            if not df.empty:
                results.append({
                    'table_name': table,
                    'total_rows': int(df.iloc[0]['total_rows'] or 0),
                    'null_user_id_count': int(df.iloc[0]['null_user_id_count'] or 0)
                })
        except Exception as e:
            logger.warning(f"Data quality check failed for {table}: {e}")
    
    return pd.DataFrame(results) if results else pd.DataFrame()


# ============================================================================
# BUSINESS QUERIES (Aggregated)
# ============================================================================

@st.cache_data(ttl=600)  # Cache for 10 minutes (business metrics change slower)
def get_acquisition_kpis(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, comparison_period: str = "previous_period") -> Dict[str, Any]:
    """
    Get high-level acquisition KPIs for business dashboard.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        Dictionary with acquisition KPIs
    """
    if not DATABASE_AVAILABLE:
        return {
            "total_users": 0,
            "new_users": 0,
            "growth_rate": 0.0,
            "signup_conversion_rate": 0.0,
            "trial_activation_rate": 0.0
        }
    
    # Get total users
    total_query = "SELECT COUNT(*) AS total FROM public.usertable"
    total_df = db_manager.execute_query(total_query)
    total_users = int(total_df.iloc[0]['total'] or 0) if not total_df.empty else 0
    
    # Get new users in period
    date_condition = build_date_where_clause("created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    new_users_query = f"SELECT COUNT(*) AS new FROM public.usertable {where_clause}"
    new_df = db_manager.execute_query(new_users_query)
    new_users = int(new_df.iloc[0]['new'] or 0) if not new_df.empty else 0
    
    # Calculate growth rate based on comparison period
    if comparison_period == "last_month":
        # Compare to last month
        current_month_start = start_date.replace(day=1) if start_date else datetime.now().replace(day=1)
        prev_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        prev_month_end = current_month_start - timedelta(days=1)

        prev_condition = build_date_where_clause("created_at", prev_month_start, prev_month_end)
        prev_where = f"WHERE {prev_condition}" if prev_condition else ""
        prev_query = f"SELECT COUNT(*) AS prev FROM public.usertable {prev_where}"
        prev_df = db_manager.execute_query(prev_query)
        prev_installs = int(prev_df.iloc[0]['prev'] or 0) if not prev_df.empty else 0

    elif comparison_period == "last_week":
        # Compare to last week
        current_week_start = start_date - timedelta(days=start_date.weekday()) if start_date else datetime.now() - timedelta(days=datetime.now().weekday())
        prev_week_start = current_week_start - timedelta(days=7)
        prev_week_end = current_week_start - timedelta(days=1)

        prev_condition = build_date_where_clause("created_at", prev_week_start, prev_week_end)
        prev_where = f"WHERE {prev_condition}" if prev_condition else ""
        prev_query = f"SELECT COUNT(*) AS prev FROM public.usertable {prev_where}"
        prev_df = db_manager.execute_query(prev_query)
        prev_installs = int(prev_df.iloc[0]['prev'] or 0) if not prev_df.empty else 0

    elif comparison_period == "yesterday":
        # Compare to yesterday
        yesterday = (datetime.now() - timedelta(days=1)).date()
        prev_query = f"SELECT COUNT(*) AS prev FROM public.usertable WHERE DATE(created_at) = '{yesterday}'"
        prev_df = db_manager.execute_query(prev_query)
        prev_installs = int(prev_df.iloc[0]['prev'] or 0) if not prev_df.empty else 0

    else:  # default: previous_period (same as before)
        if start_date and end_date:
            period_days = (end_date - start_date).days
            prev_start = start_date - timedelta(days=period_days)
            prev_end = start_date
            prev_condition = build_date_where_clause("created_at", prev_start, prev_end)
            prev_where = f"WHERE {prev_condition}" if prev_condition else ""
            prev_query = f"SELECT COUNT(*) AS prev FROM public.usertable {prev_where}"
            prev_df = db_manager.execute_query(prev_query)
            prev_installs = int(prev_df.iloc[0]['prev'] or 0) if not prev_df.empty else 0
        else:
            prev_installs = 0

    growth_rate = ((new_users - prev_installs) / prev_installs * 100) if prev_installs > 0 else 0.0
    
    return {
        "total_users": total_users,
        "total_installs": new_users,
        "growth_rate": round(growth_rate, 2),
        "signup_conversion_rate": 0.0,  # Would need waitlist data
        "trial_activation_rate": 0.0  # Would need trial data
    }


@st.cache_data(ttl=600)
def get_active_user_summary() -> Dict[str, Any]:
    """
    Get active user summary for business dashboard.

    Returns:
        Dictionary with active user metrics (total across all product types)
    """
    dau_wau_mau = get_dau_wau_mau()
    total_data = dau_wau_mau.get("total", {})
    return {
        "dau": total_data.get("dau", 0),
        "wau": total_data.get("wau", 0),
        "mau": total_data.get("mau", 0),
        "stickiness": total_data.get("stickiness", 0.0)
    }


@st.cache_data(ttl=600)
def get_retention_summary() -> Dict[str, float]:
    """
    Get retention summary for business dashboard.
    
    Returns:
        Dictionary with retention rates
    """
    if not DATABASE_AVAILABLE:
        return {"day_7_retention": 0.0, "day_30_retention": 0.0, "churn_rate": 0.0}
    
    # Use existing retention query pattern
    query = """
    WITH signups AS (
        SELECT user_id, DATE(created_at) AS signup_date
        FROM public.usertable
        WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
    ),
    activity AS (
        SELECT COALESCE(sep.user_id, up.user_id) AS user_id, DATE(sep.created_at) AS activity_date
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    ),
    retention_calc AS (
        SELECT 
            COUNT(DISTINCT s.user_id) AS total_signed_up,
            COUNT(DISTINCT CASE WHEN a.activity_date >= s.signup_date AND a.activity_date <= s.signup_date + INTERVAL '7 days' THEN a.user_id END) AS day_7_retention,
            COUNT(DISTINCT CASE WHEN a.activity_date >= s.signup_date AND a.activity_date <= s.signup_date + INTERVAL '30 days' THEN a.user_id END) AS day_30_retention
        FROM signups s
        LEFT JOIN activity a ON s.user_id = a.user_id
    )
    SELECT 
        ROUND((day_7_retention::decimal / NULLIF(total_signed_up, 0)) * 100, 1) AS day_7_percent,
        ROUND((day_30_retention::decimal / NULLIF(total_signed_up, 0)) * 100, 1) AS day_30_percent
    FROM retention_calc
    """
    
    try:
        df = db_manager.execute_query(query)
        churn_data = get_churn_analysis_detailed()
        if not df.empty:
            return {
                "day_7_retention": float(df.iloc[0]['day_7_percent'] or 0.0),
                "day_30_retention": float(df.iloc[0]['day_30_percent'] or 0.0),
                "churn_rate": churn_data.get("churn_rate", 0.0)
            }
        return {"day_7_retention": 0.0, "day_30_retention": 0.0, "churn_rate": 0.0}
    except Exception as e:
        logger.error(f"Retention summary query failed: {e}")
        return {"day_7_retention": 0.0, "day_30_retention": 0.0, "churn_rate": 0.0}


@st.cache_data(ttl=600)
def get_usage_summary(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Get usage summary for business dashboard.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        Dictionary with usage metrics
    """
    usage_df = get_daily_usage_intensity(start_date, end_date)
    if not usage_df.empty:
        total_usage = int(usage_df['total_actions'].sum())
        avg_daily = float(usage_df['avg_actions_per_user'].mean()) if len(usage_df) > 0 else 0.0
        return {
            "total_usage": total_usage,
            "avg_daily_usage": round(avg_daily, 2),
            "heavy_users_percent": 0.0  # Would need user segmentation
        }
    return {"total_usage": 0, "avg_daily_usage": 0.0, "heavy_users_percent": 0.0}




# ============================================================================
# GOOGLE ANALYTICS-STYLE METRICS
# ============================================================================

@st.cache_data(ttl=300)
def get_user_activation_funnel(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Get user activation funnel breakdown.

    Args:
        start_date: Start date for filtering
        end_date: End date for filtering

    Returns:
        Dictionary with activation funnel metrics
    """
    if not DATABASE_AVAILABLE:
        return {
            "never_activated": 0, "day_0_only": 0, "returned_later": 0,
            "never_activated_pct": 0.0, "day_0_only_pct": 0.0, "returned_later_pct": 0.0,
            "total_users": 0
        }

    date_condition = build_date_where_clause("u.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""

    query = f"""
    WITH user_activity AS (
        SELECT
            u.user_id,
            u.created_at AS signup_date,
            MIN(sep.created_at) AS first_activity_date,
            COUNT(sep.prompt_id) AS total_activities,
            COUNT(CASE WHEN DATE(sep.created_at) = DATE(u.created_at) THEN 1 END) AS day_0_activities,
            COUNT(CASE WHEN DATE(sep.created_at) > DATE(u.created_at) THEN 1 END) AS post_day_0_activities
        FROM public.usertable u
        LEFT JOIN public.save_enhance_prompt sep ON u.user_id = sep.user_id
        {where_clause}
        GROUP BY u.user_id, u.created_at
    )
    SELECT
        COUNT(CASE WHEN first_activity_date IS NULL THEN 1 END) AS never_activated,
        COUNT(CASE WHEN first_activity_date = signup_date AND post_day_0_activities = 0 THEN 1 END) AS day_0_only,
        COUNT(CASE WHEN first_activity_date > signup_date OR post_day_0_activities > 0 THEN 1 END) AS returned_later,
        COUNT(*) AS total_users
    FROM user_activity
    """

    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            never_activated = int(df.iloc[0]['never_activated'] or 0)
            day_0_only = int(df.iloc[0]['day_0_only'] or 0)
            returned_later = int(df.iloc[0]['returned_later'] or 0)
            total = int(df.iloc[0]['total_users'] or 0)

            never_pct = (never_activated / total * 100) if total > 0 else 0.0
            day_0_pct = (day_0_only / total * 100) if total > 0 else 0.0
            returned_pct = (returned_later / total * 100) if total > 0 else 0.0

            return {
                "never_activated": never_activated,
                "day_0_only": day_0_only,
                "returned_later": returned_later,
                "never_activated_pct": round(never_pct, 2),
                "day_0_only_pct": round(day_0_pct, 2),
                "returned_later_pct": round(returned_pct, 2),
                "total_users": total
            }
        return {
            "never_activated": 0, "day_0_only": 0, "returned_later": 0,
            "never_activated_pct": 0.0, "day_0_only_pct": 0.0, "returned_later_pct": 0.0,
            "total_users": 0
        }
    except Exception as e:
        logger.error(f"User activation funnel query failed: {e}")
        return {
            "never_activated": 0, "day_0_only": 0, "returned_later": 0,
            "never_activated_pct": 0.0, "day_0_only_pct": 0.0, "returned_later_pct": 0.0,
            "total_users": 0
        }


@st.cache_data(ttl=300)
def get_traffic_sources(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get traffic sources breakdown (GA-style).
    Uses onboarding_data.source or auth_method as proxy for traffic source.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with source, user_count, percentage
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    date_condition = build_date_where_clause("u.created_at", start_date, end_date)
    where_clause = f"WHERE {date_condition}" if date_condition else ""
    
    query = f"""
    SELECT 
        COALESCE(ob.source, 
            CASE 
                WHEN u.google_id IS NOT NULL THEN 'OAuth'
                WHEN u.password IS NOT NULL THEN 'Email'
                ELSE 'Direct'
            END
        ) AS source,
        COUNT(DISTINCT u.user_id) AS user_count
    FROM public.usertable u
    LEFT JOIN public.onboarding_data ob ON u.user_id = ob.user_id
    {where_clause}
    GROUP BY COALESCE(ob.source, 
        CASE 
            WHEN u.google_id IS NOT NULL THEN 'OAuth'
            WHEN u.password IS NOT NULL THEN 'Email'
            ELSE 'Direct'
        END
    )
    ORDER BY user_count DESC
    """
    
    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            total = df['user_count'].sum()
            df['percentage'] = (df['user_count'] / total * 100).round(2)
        return df
    except Exception as e:
        logger.error(f"Traffic sources query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_geographic_distribution(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get geographic distribution of users.
    Note: This assumes location data exists in usertable or onboarding_data.
    If not available, returns empty DataFrame.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with location, user_count
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    # Check if location columns exist (this is a placeholder - adjust based on actual schema)
    # For now, return empty as location data may not be available
    try:
        # Try to get schema info
        schema_query = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usertable'
        AND column_name IN ('city', 'country', 'location', 'region')
        """
        schema_df = db_manager.execute_query(schema_query)
        
        if schema_df.empty:
            # No location columns available
            return pd.DataFrame(columns=['location', 'user_count'])
        
        # If location columns exist, query them
        date_condition = build_date_where_clause("created_at", start_date, end_date)
        where_clause = f"WHERE {date_condition}" if date_condition else ""
        
        # This is a template - adjust based on actual column names
        query = f"""
        SELECT 
            COALESCE(city, country, 'Unknown') AS location,
            COUNT(*) AS user_count
        FROM public.usertable
        {where_clause}
        GROUP BY COALESCE(city, country, 'Unknown')
        ORDER BY user_count DESC
        LIMIT 50
        """
        
        df = db_manager.execute_query(query)
        return df
    except Exception as e:
        logger.warning(f"Geographic distribution query failed (location data may not be available): {e}")
        return pd.DataFrame(columns=['location', 'user_count'])


@st.cache_data(ttl=300)
def get_weekly_cohort_retention(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get weekly cohort retention rates (GA-style).
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with cohort_week, week_0, week_1, week_2, etc. retention rates
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    query = """
    WITH signups AS (
        SELECT 
            user_id,
            DATE_TRUNC('week', created_at) AS cohort_week
        FROM public.usertable
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 weeks'
    ),
    activity AS (
        SELECT 
            COALESCE(sep.user_id, up.user_id) AS user_id,
            DATE(sep.created_at) AS activity_date
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
    ),
    cohort_activity AS (
        SELECT 
            s.user_id,
            s.cohort_week,
            a.activity_date,
            DATE_PART('week', a.activity_date) - DATE_PART('week', s.cohort_week) AS weeks_since_signup
        FROM signups s
        LEFT JOIN activity a ON s.user_id = a.user_id
    )
    SELECT 
        cohort_week,
        COUNT(DISTINCT user_id) AS week_0_users,
        COUNT(DISTINCT CASE WHEN weeks_since_signup = 0 THEN user_id END) AS week_0_active,
        COUNT(DISTINCT CASE WHEN weeks_since_signup = 1 THEN user_id END) AS week_1_active,
        COUNT(DISTINCT CASE WHEN weeks_since_signup = 2 THEN user_id END) AS week_2_active,
        COUNT(DISTINCT CASE WHEN weeks_since_signup = 3 THEN user_id END) AS week_3_active,
        COUNT(DISTINCT CASE WHEN weeks_since_signup = 4 THEN user_id END) AS week_4_active
    FROM cohort_activity
    GROUP BY cohort_week
    ORDER BY cohort_week DESC
    """
    
    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            # Calculate retention percentages
            df['week_0_retention'] = 100.0  # All users active in signup week
            for week in [1, 2, 3, 4]:
                col_name = f'week_{week}_active'
                if col_name in df.columns:
                    df[f'week_{week}_retention'] = (df[col_name] / df['week_0_users'] * 100).round(2)
        return df
    except Exception as e:
        logger.error(f"Weekly cohort retention query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_rolling_28day_trends(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Get 28-day rolling trends for key metrics.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        DataFrame with date, metric_name, value, rolling_28day_avg
    """
    if not DATABASE_AVAILABLE:
        return pd.DataFrame()
    
    # Get daily signups for rolling average
    query = """
    WITH daily_metrics AS (
        SELECT 
            DATE(created_at) AS metric_date,
            COUNT(DISTINCT user_id) AS daily_signups,
            COUNT(DISTINCT CASE WHEN DATE(created_at) = DATE(created_at) THEN user_id END) AS daily_active
        FROM public.usertable
        WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
        GROUP BY DATE(created_at)
    )
    SELECT 
        metric_date,
        daily_signups,
        SUM(daily_signups) OVER (
            ORDER BY metric_date 
            ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
        ) AS rolling_28day_signups,
        AVG(daily_signups) OVER (
            ORDER BY metric_date 
            ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
        ) AS rolling_28day_avg_signups
    FROM daily_metrics
    ORDER BY metric_date DESC
    """
    
    try:
        df = db_manager.execute_query(query)
        return df
    except Exception as e:
        logger.error(f"Rolling 28-day trends query failed: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=300)
def get_week_over_week_comparison(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Get week-over-week comparison metrics.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        Dictionary with current_week and previous_week metrics
    """
    if not DATABASE_AVAILABLE:
        return {"current_week": {}, "previous_week": {}, "change_pct": {}}
    
    query = """
    WITH activity_current AS (
        SELECT DISTINCT COALESCE(sep.user_id, up.user_id) AS user_id
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
        WHERE DATE_TRUNC('week', sep.created_at) = DATE_TRUNC('week', CURRENT_DATE)
    ),
    activity_previous AS (
        SELECT DISTINCT COALESCE(sep.user_id, up.user_id) AS user_id
        FROM public.save_enhance_prompt sep
        LEFT JOIN public.user_prompts up ON sep.prompt_id = up.prompt_id
        WHERE DATE_TRUNC('week', sep.created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
    ),
    current_week AS (
        SELECT 
            COUNT(DISTINCT u.user_id) AS signups,
            COUNT(DISTINCT ac.user_id) AS active_users
        FROM public.usertable u
        LEFT JOIN activity_current ac ON u.user_id = ac.user_id
        WHERE DATE_TRUNC('week', u.created_at) = DATE_TRUNC('week', CURRENT_DATE)
    ),
    previous_week AS (
        SELECT 
            COUNT(DISTINCT u.user_id) AS signups,
            COUNT(DISTINCT ap.user_id) AS active_users
        FROM public.usertable u
        LEFT JOIN activity_previous ap ON u.user_id = ap.user_id
        WHERE DATE_TRUNC('week', u.created_at) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
    )
    SELECT 
        cw.signups AS current_signups,
        cw.active_users AS current_active,
        pw.signups AS previous_signups,
        pw.active_users AS previous_active
    FROM current_week cw
    CROSS JOIN previous_week pw
    """
    
    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            current_signups = int(df.iloc[0]['current_signups'] or 0)
            current_active = int(df.iloc[0]['current_active'] or 0)
            previous_signups = int(df.iloc[0]['previous_signups'] or 0)
            previous_active = int(df.iloc[0]['previous_active'] or 0)
            
            signup_change = ((current_signups - previous_signups) / previous_signups * 100) if previous_signups > 0 else 0.0
            active_change = ((current_active - previous_active) / previous_active * 100) if previous_active > 0 else 0.0
            
            return {
                "current_week": {
                    "signups": current_signups,
                    "active_users": current_active
                },
                "previous_week": {
                    "signups": previous_signups,
                    "active_users": previous_active
                },
                "change_pct": {
                    "signups": round(signup_change, 2),
                    "active_users": round(active_change, 2)
                }
            }
        return {"current_week": {}, "previous_week": {}, "change_pct": {}}
    except Exception as e:
        logger.error(f"Week-over-week comparison query failed: {e}")
        return {"current_week": {}, "previous_week": {}, "change_pct": {}}


@st.cache_data(ttl=300)
def get_qualified_leads(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Get qualified leads metrics.
    Qualified leads = users who completed onboarding and have activity.
    
    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        Dictionary with qualified_leads, converted_leads, conversion_rate
    """
    if not DATABASE_AVAILABLE:
        return {"qualified_leads": 0, "converted_leads": 0, "conversion_rate": 0.0}
    
    date_condition = build_date_where_clause("u.created_at", start_date, end_date)
    date_filter = f"AND {date_condition}" if date_condition else ""
    
    query = f"""
    WITH qualified_users AS (
        SELECT DISTINCT u.user_id
        FROM public.usertable u
        INNER JOIN public.onboarding_data ob ON u.user_id = ob.user_id
        WHERE ob.completed_at IS NOT NULL
        {date_filter}
    ),
    converted_users AS (
        SELECT DISTINCT u.user_id
        FROM public.usertable u
        INNER JOIN public.onboarding_data ob ON u.user_id = ob.user_id
        INNER JOIN public.save_enhance_prompt sep ON u.user_id = sep.user_id
        WHERE ob.completed_at IS NOT NULL
        {date_filter}
    )
    SELECT 
        (SELECT COUNT(*) FROM qualified_users) AS qualified_leads,
        (SELECT COUNT(*) FROM converted_users) AS converted_leads
    """
    
    try:
        df = db_manager.execute_query(query)
        if not df.empty:
            qualified = int(df.iloc[0]['qualified_leads'] or 0)
            converted = int(df.iloc[0]['converted_leads'] or 0)
            conversion_rate = (converted / qualified * 100) if qualified > 0 else 0.0
            
            return {
                "qualified_leads": qualified,
                "converted_leads": converted,
                "conversion_rate": round(conversion_rate, 2)
            }
        return {"qualified_leads": 0, "converted_leads": 0, "conversion_rate": 0.0}
    except Exception as e:
        logger.error(f"Qualified leads query failed: {e}")
        return {"qualified_leads": 0, "converted_leads": 0, "conversion_rate": 0.0}

