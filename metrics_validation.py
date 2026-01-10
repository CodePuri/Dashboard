"""
Metrics validation module for ensuring data quality and accuracy.
Provides validation for all dashboard metrics with proper checks.
"""

import streamlit as st
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Try to import database manager
try:
    from database import db_manager
    DATABASE_AVAILABLE = db_manager is not None and (hasattr(db_manager, 'is_configured') and db_manager.is_configured)
except Exception as e:
    logger.error(f"Database import failed: {e}")
    db_manager = None
    DATABASE_AVAILABLE = False


class MetricValidator:
    """Validates metrics for accuracy and data quality."""
    
    def __init__(self):
        self.validation_results = []
        self.warnings = []
        self.errors = []
    
    def validate_metric(
        self,
        metric_name: str,
        value: Any,
        expected_range: Optional[Tuple[float, float]] = None,
        data_source: str = "",
        calculation_method: str = "",
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
        allow_zero: bool = True
    ) -> Dict[str, Any]:
        """
        Validate a single metric.
        
        Args:
            metric_name: Name of the metric
            value: Metric value to validate
            expected_range: Tuple of (min, max) expected values
            data_source: Source table/query for the metric
            calculation_method: How the metric is calculated
            min_value: Minimum acceptable value
            max_value: Maximum acceptable value
            allow_zero: Whether zero is an acceptable value
        
        Returns:
            Dictionary with validation results
        """
        result = {
            "metric_name": metric_name,
            "value": value,
            "status": "valid",
            "warnings": [],
            "errors": [],
            "data_source": data_source,
            "calculation_method": calculation_method
        }
        
        # Type validation
        if value is None:
            result["status"] = "error"
            result["errors"].append("Metric value is None")
            self.errors.append(f"{metric_name}: Value is None")
            return result
        
        # Convert to float if possible
        try:
            numeric_value = float(value)
        except (ValueError, TypeError):
            result["status"] = "error"
            result["errors"].append(f"Metric value '{value}' cannot be converted to numeric")
            self.errors.append(f"{metric_name}: Non-numeric value")
            return result
        
        # Range validation
        if expected_range:
            min_val, max_val = expected_range
            if numeric_value < min_val or numeric_value > max_val:
                result["status"] = "warning"
                result["warnings"].append(f"Value {numeric_value} outside expected range [{min_val}, {max_val}]")
                self.warnings.append(f"{metric_name}: Value {numeric_value} outside expected range")
        
        # Min/Max validation
        if min_value is not None and numeric_value < min_value:
            result["status"] = "warning"
            result["warnings"].append(f"Value {numeric_value} below minimum {min_value}")
            self.warnings.append(f"{metric_name}: Value below minimum")
        
        if max_value is not None and numeric_value > max_value:
            result["status"] = "warning"
            result["warnings"].append(f"Value {numeric_value} above maximum {max_value}")
            self.warnings.append(f"{metric_name}: Value above maximum")
        
        # Zero validation
        if not allow_zero and numeric_value == 0:
            result["status"] = "warning"
            result["warnings"].append("Value is zero, which may indicate data issues")
            self.warnings.append(f"{metric_name}: Zero value detected")
        
        self.validation_results.append(result)
        return result
    
    def cross_validate_metrics(self, metrics: Dict[str, Any]) -> List[str]:
        """
        Cross-validate related metrics for logical consistency.
        
        Args:
            metrics: Dictionary of metric names and values
        
        Returns:
            List of warning messages
        """
        warnings = []
        
        # Validate DAU <= WAU <= MAU
        if all(k in metrics for k in ['dau', 'wau', 'mau']):
            dau, wau, mau = metrics['dau'], metrics['wau'], metrics['mau']
            if dau > wau:
                warnings.append(f"DAU ({dau}) > WAU ({wau}) - logically inconsistent")
            if wau > mau:
                warnings.append(f"WAU ({wau}) > MAU ({mau}) - logically inconsistent")
            if dau > mau:
                warnings.append(f"DAU ({dau}) > MAU ({mau}) - logically inconsistent")
        
        # Validate active users <= total users
        if 'total_users' in metrics and 'mau' in metrics:
            if metrics['mau'] > metrics['total_users']:
                warnings.append(f"MAU ({metrics['mau']}) > Total Users ({metrics['total_users']}) - logically inconsistent")
        
        # Validate churn rate <= 100%
        if 'churn_rate' in metrics:
            if metrics['churn_rate'] > 100:
                warnings.append(f"Churn rate ({metrics['churn_rate']}%) exceeds 100% - data error")
        
        # Validate retention rates <= 100%
        for key in ['day_7_retention', 'day_30_retention']:
            if key in metrics and metrics[key] > 100:
                warnings.append(f"{key} ({metrics[key]}%) exceeds 100% - data error")
        
        # Validate stickiness <= 100%
        if 'stickiness' in metrics:
            if metrics['stickiness'] > 100:
                warnings.append(f"Stickiness ({metrics['stickiness']}%) exceeds 100% - data error")
        
        # Validate conversion rates <= 100%
        for key in ['trial_conversion_rate', 'onboarding_completion_rate']:
            if key in metrics:
                if metrics[key] > 100:
                    warnings.append(f"{key} ({metrics[key]}%) exceeds 100% - data error")
        
        self.warnings.extend(warnings)
        return warnings
    
    def validate_data_freshness(self, last_update_time: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Validate that data is fresh (not stale).
        
        Args:
            last_update_time: Last time data was updated
        
        Returns:
            Validation result dictionary
        """
        result = {
            "status": "valid",
            "warnings": [],
            "errors": []
        }
        
        if last_update_time is None:
            # Try to get last update from database
            if DATABASE_AVAILABLE:
                try:
                    query = """
                    SELECT MAX(created_at) AS last_update
                    FROM public.save_enhance_prompt
                    UNION ALL
                    SELECT MAX(created_at) AS last_update
                    FROM public.usertable
                    """
                    df = db_manager.execute_query(query)
                    if not df.empty:
                        last_update_time = df['last_update'].max()
                except Exception as e:
                    logger.error(f"Failed to get last update time: {e}")
        
        if last_update_time:
            # Handle timezone-aware and timezone-naive datetimes
            from datetime import timezone
            
            # Convert pandas Timestamp to datetime if needed
            if hasattr(last_update_time, 'to_pydatetime'):
                last_update_time = last_update_time.to_pydatetime()
            
            # Check if timezone-aware
            is_tz_aware = hasattr(last_update_time, 'tzinfo') and last_update_time.tzinfo is not None
            
            if is_tz_aware:
                # Both need to be timezone-aware
                now = datetime.now(timezone.utc)
                # Convert last_update_time to UTC if needed
                if last_update_time.tzinfo != timezone.utc:
                    last_update_time = last_update_time.astimezone(timezone.utc)
            else:
                # Both timezone-naive
                now = datetime.now()
            
            try:
                hours_old = (now - last_update_time).total_seconds() / 3600
            except TypeError as e:
                # Fallback: convert to naive if still having issues
                logger.warning(f"Timezone conversion issue: {e}, using naive datetime")
                if is_tz_aware:
                    last_update_time = last_update_time.replace(tzinfo=None)
                    now = datetime.now()
                hours_old = (now - last_update_time).total_seconds() / 3600
            if hours_old > 24:
                result["status"] = "warning"
                result["warnings"].append(f"Data is {hours_old:.1f} hours old - may be stale")
            elif hours_old > 48:
                result["status"] = "error"
                result["errors"].append(f"Data is {hours_old:.1f} hours old - likely stale")
        
        return result
    
    def get_validation_summary(self) -> Dict[str, Any]:
        """Get summary of all validations."""
        total = len(self.validation_results)
        valid = sum(1 for r in self.validation_results if r["status"] == "valid")
        warnings_count = len(self.warnings)
        errors_count = len(self.errors)
        
        return {
            "total_metrics": total,
            "valid_metrics": valid,
            "warnings": warnings_count,
            "errors": errors_count,
            "validation_results": self.validation_results
        }


def display_validation_badge(validator: MetricValidator, metric_name: str) -> None:
    """
    Display a validation badge for a metric.
    
    Args:
        validator: MetricValidator instance
        metric_name: Name of the metric to check
    """
    # Find validation result for this metric
    result = next((r for r in validator.validation_results if r["metric_name"] == metric_name), None)
    
    if result:
        if result["status"] == "error":
            st.error("⚠️ Data Quality Issue")
        elif result["status"] == "warning":
            st.warning("⚠️ Validation Warning")
        elif result["status"] == "valid":
            st.success("✅ Valid")


def display_data_quality_summary() -> None:
    """Display overall data quality summary."""
    if not DATABASE_AVAILABLE:
        st.warning("⚠️ Database not available for validation")
        return
    
    validator = MetricValidator()
    
    # Check data freshness
    freshness = validator.validate_data_freshness()
    if freshness["status"] == "error":
        st.error("🔴 **Data Quality: CRITICAL** - Data appears stale")
    elif freshness["status"] == "warning":
        st.warning("🟡 **Data Quality: WARNING** - Data may be stale")
    else:
        st.success("🟢 **Data Quality: GOOD** - Data appears fresh")
    
    # Check table row counts
    try:
        query = """
        SELECT 
            'usertable' AS table_name, COUNT(*) AS row_count
        FROM public.usertable
        UNION ALL
        SELECT 
            'save_enhance_prompt' AS table_name, COUNT(*) AS row_count
        FROM public.save_enhance_prompt
        UNION ALL
        SELECT 
            'user_prompts' AS table_name, COUNT(*) AS row_count
        FROM public.user_prompts
        """
        df = db_manager.execute_query(query)
        
        if not df.empty:
            st.markdown("### Table Row Counts")
            st.dataframe(df, use_container_width=True, hide_index=True)
            
            # Check for empty tables
            empty_tables = df[df['row_count'] == 0]['table_name'].tolist()
            if empty_tables:
                st.warning(f"⚠️ Empty tables detected: {', '.join(empty_tables)}")
    except Exception as e:
        logger.error(f"Failed to check table counts: {e}")
        st.warning("Could not validate table row counts")


def validate_business_metrics(
    acquisition: Dict[str, Any],
    active_users: Dict[str, Any],
    retention: Dict[str, Any],
    prompt_metrics: Dict[str, Any],
    onboarding_metrics: Dict[str, Any]
) -> MetricValidator:
    """
    Validate all business dashboard metrics.

    Args:
        acquisition: Acquisition metrics dictionary
        active_users: Active user metrics dictionary
        retention: Retention metrics dictionary
        prompt_metrics: Prompt generation metrics
        onboarding_metrics: Onboarding metrics

    Returns:
        MetricValidator instance with validation results
    """
    validator = MetricValidator()
    
    # Validate acquisition metrics
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
    
    # Validate active user metrics
    validator.validate_metric(
        "DAU",
        active_users.get('dau', 0),
        expected_range=(0, 1000000),
        data_source="save_enhance_prompt",
        calculation_method="COUNT(DISTINCT user_id) WHERE DATE(created_at) = CURRENT_DATE",
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
        data_source="save_enhance_prompt",
        calculation_method="(DAU / MAU) × 100",
        allow_zero=True
    )
    
    # Validate retention metrics
    validator.validate_metric(
        "7-Day Retention",
        retention.get('day_7_retention', 0.0),
        expected_range=(0, 100),
        data_source="usertable + save_enhance_prompt",
        calculation_method="(Users active on day 7 / Total signups) × 100",
        allow_zero=True
    )
    
    validator.validate_metric(
        "30-Day Retention",
        retention.get('day_30_retention', 0.0),
        expected_range=(0, 100),
        data_source="usertable + save_enhance_prompt",
        calculation_method="(Users active on day 30 / Total signups) × 100",
        allow_zero=True
    )
    
    validator.validate_metric(
        "Churn Rate",
        retention.get('churn_rate', 0.0),
        expected_range=(0, 100),
        data_source="usertable + save_enhance_prompt",
        calculation_method="(Churned users / Total users) × 100",
        allow_zero=True
    )

    # Validate prompt metrics
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

    # Validate onboarding metrics
    validator.validate_metric(
        "Onboarding Rate",
        onboarding_metrics.get('completion_rate', 0.0),
        expected_range=(0, 100),
        data_source="onboarding_data + usertable",
        calculation_method="(Completed onboarding / Total signups) × 100",
        allow_zero=True
    )
    
    # Cross-validate metrics
    cross_warnings = validator.cross_validate_metrics({
        'total_users': acquisition.get('total_users', 0),
        'dau': active_users.get('dau', 0),
        'wau': active_users.get('wau', 0),
        'mau': active_users.get('mau', 0),
        'churn_rate': retention.get('churn_rate', 0.0),
        'day_7_retention': retention.get('day_7_retention', 0.0),
        'day_30_retention': retention.get('day_30_retention', 0.0),
        'stickiness': active_users.get('stickiness', 0.0),
        'trial_conversion_rate': 0.0,  # Would need subscription data
        'onboarding_completion_rate': onboarding_metrics.get('completion_rate', 0.0)
    })
    
    return validator

