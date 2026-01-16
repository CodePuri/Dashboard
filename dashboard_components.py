"""
Reusable UI components for the dashboard.
"""

import streamlit as st
from typing import Optional, Tuple
from datetime import datetime, timedelta

def kpi_card(title: str, value: str, change: Optional[str] = None, trend: Optional[str] = None, icon: str = "📊", help_text: Optional[str] = None):
    """
    Create a KPI card with optional trend indicator and tooltip.
    
    Args:
        title: KPI title
        value: KPI value (formatted string)
        change: Optional change value (e.g., "+5.2%")
        trend: Optional trend indicator ("up", "down", "flat")
        icon: Optional icon emoji
        help_text: Optional tooltip text explaining the metric calculation
    """
    col1, col2 = st.columns([1, 4])
    with col1:
        st.markdown(f"### {icon}")
    with col2:
        if change:
            st.metric(
                label=title,
                value=value,
                delta=change,
                help=help_text
            )
        else:
            st.metric(
                label=title,
                value=value,
                help=help_text
            )
        if trend:
            trend_icon = "⬆️" if trend == "up" else "⬇️" if trend == "down" else "➡️"
            st.caption(f"Trend: {trend_icon} {trend}")


def trend_indicator(value: float, previous_value: float) -> Tuple[str, str]:
    """
    Calculate trend indicator from current and previous values.
    
    Args:
        value: Current value
        previous_value: Previous value
        
    Returns:
        Tuple of (change_string, trend)
    """
    if previous_value == 0:
        return ("N/A", "flat")
    
    change = ((value - previous_value) / previous_value) * 100
    change_str = f"{change:+.1f}%"
    
    if change > 0:
        trend = "up"
    elif change < 0:
        trend = "down"
    else:
        trend = "flat"
    
    return (change_str, trend)


def date_filter(mode: str = "Developer") -> Tuple[str, Optional[datetime], Optional[datetime]]:
    """
    Get date filter based on dashboard mode.
    
    Args:
        mode: Dashboard mode ("Developer" or "Business")
        
    Returns:
        Tuple of (preset, start_date, end_date)
    """
    if mode == "Business":
        preset = st.selectbox(
            "Time Period",
            ["Today", "This Week", "This Month", "This Quarter", "Custom"],
            key="business_date_preset"
        )
        
        if preset == "Today":
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = datetime.now()
        elif preset == "This Week":
            start_date = datetime.now() - timedelta(days=datetime.now().weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = datetime.now()
        elif preset == "This Month":
            start_date = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = datetime.now()
        elif preset == "This Quarter":
            quarter = (datetime.now().month - 1) // 3
            start_date = datetime.now().replace(month=quarter*3+1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = datetime.now()
        else:  # Custom
            col1, col2 = st.columns(2)
            with col1:
                start_date = st.date_input("Start Date", value=datetime.now() - timedelta(days=30))
            with col2:
                end_date = st.date_input("End Date", value=datetime.now())
            start_date = datetime.combine(start_date, datetime.min.time())
            end_date = datetime.combine(end_date, datetime.max.time())
    else:  # Developer mode
        preset = st.selectbox(
            "Date Range",
            ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Last 90 Days", "All Time", "Custom"],
            key="developer_date_preset"
        )
        
        if preset == "Today":
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = datetime.now()
        elif preset == "Yesterday":
            start_date = (datetime.now() - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = (datetime.now() - timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=999999)
        elif preset == "Last 7 Days":
            start_date = datetime.now() - timedelta(days=7)
            end_date = datetime.now()
        elif preset == "Last 30 Days":
            start_date = datetime.now() - timedelta(days=30)
            end_date = datetime.now()
        elif preset == "Last 90 Days":
            start_date = datetime.now() - timedelta(days=90)
            end_date = datetime.now()
        elif preset == "All Time":
            start_date = None
            end_date = None
        else:  # Custom
            col1, col2 = st.columns(2)
            with col1:
                start_date = st.date_input("Start Date", value=datetime.now() - timedelta(days=30), key="dev_start_date")
            with col2:
                end_date = st.date_input("End Date", value=datetime.now(), key="dev_end_date")
            start_date = datetime.combine(start_date, datetime.min.time())
            end_date = datetime.combine(end_date, datetime.max.time())
    
    return (preset, start_date, end_date)


def export_button(data, filename: str, file_format: str = "csv"):
    """
    Create an export button for data.
    
    Args:
        data: DataFrame or data to export
        filename: Base filename (without extension)
        file_format: Export format ("csv" or "excel")
    """
    import pandas as pd
    
    if data is None or (isinstance(data, pd.DataFrame) and data.empty):
        st.warning("No data to export")
        return
    
    if file_format == "csv":
        csv = data.to_csv(index=False) if isinstance(data, pd.DataFrame) else str(data)
        st.download_button(
            label=f"📥 Download {filename}.csv",
            data=csv,
            file_name=f"{filename}.csv",
            mime="text/csv"
        )
    elif file_format == "excel":
        if isinstance(data, pd.DataFrame):
            import io
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                data.to_excel(writer, index=False)
            excel_data = output.getvalue()
            st.download_button(
                label=f"📥 Download {filename}.xlsx",
                data=excel_data,
                file_name=f"{filename}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )


def mode_badge(mode: str):
    """
    Display a badge indicating the current dashboard mode.
    
    Args:
        mode: Dashboard mode ("Developer" or "Business")
    """
    if mode == "Developer":
        st.markdown(
            '<span style="background-color: #4CAF50; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9em;">👨‍💻 Developer Mode</span>',
            unsafe_allow_html=True
        )
    else:
        st.markdown(
            '<span style="background-color: #2196F3; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9em;">💼 Business Mode</span>',
            unsafe_allow_html=True
        )

