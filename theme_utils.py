"""
Theme Management Utilities for Dashboard
Provides centralized theme control for light/dark mode switching.
"""

import streamlit as st


def init_theme():
    """Initialize theme state in session. Call this at app startup."""
    if 'dark_mode' not in st.session_state:
        st.session_state.dark_mode = False


def toggle_theme():
    """Toggle between light and dark mode."""
    st.session_state.dark_mode = not st.session_state.dark_mode


def is_dark_mode() -> bool:
    """Check if dark mode is currently active."""
    return st.session_state.get('dark_mode', False)


def get_theme_colors() -> dict:
    """
    Return color palette based on current theme.
    All UI components should use these colors for consistency.
    """
    if is_dark_mode():
        return {
            # Backgrounds
            'bg_primary': '#0e1117',       # Main app background
            'bg_secondary': '#1e2130',     # Cards, containers
            'bg_tertiary': '#262b3d',      # Highlights, hover states
            'bg_input': '#1a1d29',         # Input fields
            
            # Text
            'text_primary': '#fafafa',     # Main text
            'text_secondary': '#a0aec0',   # Muted/secondary text
            'text_muted': '#718096',       # Very muted text
            
            # Accents
            'accent': '#4facfe',           # Primary accent (links, highlights)
            'accent_secondary': '#667eea', # Secondary accent
            'success': '#38f9d7',          # Success states
            'warning': '#fee140',          # Warning states
            'error': '#f5576c',            # Error states
            
            # Borders & Dividers
            'border': '#2d3748',           # Borders
            'divider': '#374151',          # Dividers
            
            # Shadows
            'shadow': 'rgba(0, 0, 0, 0.3)',
            
            # Chart specific
            'chart_grid': '#374151',
            'chart_text': '#a0aec0',
        }
    else:
        return {
            # Backgrounds
            'bg_primary': '#ffffff',
            'bg_secondary': '#f0f2f6',
            'bg_tertiary': '#f8f9fa',
            'bg_input': '#ffffff',
            
            # Text
            'text_primary': '#1a1a2e',
            'text_secondary': '#2c3e50',
            'text_muted': '#6c757d',
            
            # Accents
            'accent': '#1f77b4',
            'accent_secondary': '#667eea',
            'success': '#28a745',
            'warning': '#ffc107',
            'error': '#dc3545',
            
            # Borders & Dividers
            'border': '#e2e8f0',
            'divider': '#dee2e6',
            
            # Shadows
            'shadow': 'rgba(0, 0, 0, 0.1)',
            
            # Chart specific
            'chart_grid': '#e2e8f0',
            'chart_text': '#2c3e50',
        }


def get_plotly_template() -> str:
    """Return Plotly template name based on current theme."""
    return 'plotly_dark' if is_dark_mode() else 'plotly_white'


def get_plotly_layout_overrides() -> dict:
    """
    Return Plotly layout overrides for consistent theming.
    Apply to all charts: fig.update_layout(**get_plotly_layout_overrides())
    """
    colors = get_theme_colors()
    return {
        'paper_bgcolor': 'rgba(0,0,0,0)',  # Transparent to inherit Streamlit bg
        'plot_bgcolor': 'rgba(0,0,0,0)',
        'font': {'color': colors['chart_text']},
        'xaxis': {
            'gridcolor': colors['chart_grid'],
            'linecolor': colors['border'],
            'tickfont': {'color': colors['chart_text']},
        },
        'yaxis': {
            'gridcolor': colors['chart_grid'],
            'linecolor': colors['border'],
            'tickfont': {'color': colors['chart_text']},
        },
        'legend': {
            'font': {'color': colors['chart_text']},
            'bgcolor': 'rgba(0,0,0,0)',
        },
    }


def apply_theme_to_figure(fig):
    """
    Apply theme styling to an existing Plotly figure.
    This is a convenience function for updating existing charts.
    
    Usage:
        fig = px.line(df, x='date', y='value')
        apply_theme_to_figure(fig)
        st.plotly_chart(fig)
    """
    fig.update_layout(**get_plotly_layout_overrides())


def inject_theme_css():
    """
    Inject dynamic CSS based on current theme.
    Call this after init_theme() and before rendering any content.
    """
    colors = get_theme_colors()
    
    # Streamlit-specific overrides for dark mode
    streamlit_overrides = ""
    if is_dark_mode():
        streamlit_overrides = f"""
        /* Streamlit dark mode overrides */
        .stApp {{
            background-color: {colors['bg_primary']};
        }}
        
        .stMarkdown, .stText {{
            color: {colors['text_primary']};
        }}
        
        /* Sidebar styling */
        [data-testid="stSidebar"] {{
            background-color: {colors['bg_secondary']};
        }}
        
        /* Expander styling */
        .streamlit-expanderHeader {{
            background-color: {colors['bg_secondary']};
            color: {colors['text_primary']};
        }}
        
        /* DataFrames */
        .stDataFrame {{
            background-color: {colors['bg_secondary']};
        }}
        
        /* Metrics */
        [data-testid="stMetricValue"] {{
            color: {colors['text_primary']};
        }}
        
        [data-testid="stMetricLabel"] {{
            color: {colors['text_secondary']};
        }}
        
        /* Tabs */
        .stTabs [data-baseweb="tab-list"] {{
            background-color: {colors['bg_secondary']};
        }}
        
        .stTabs [data-baseweb="tab"] {{
            color: {colors['text_secondary']};
        }}
        
        .stTabs [aria-selected="true"] {{
            color: {colors['accent']};
        }}
        """
    
    css = f"""
    <style>
    /* ============================================
       THEME: {'Dark' if is_dark_mode() else 'Light'} Mode
       Generated dynamically by theme_utils.py
    ============================================ */
    
    {streamlit_overrides}
    
    /* Custom Dashboard Classes */
    .main-header {{
        font-size: 2.5rem;
        color: {colors['accent']};
        text-align: center;
        margin-bottom: 2rem;
        font-weight: 700;
    }}
    
    .section-header {{
        font-size: 1.5rem;
        color: {colors['text_secondary']};
        margin: 1rem 0;
        font-weight: bold;
    }}
    
    .metric-container {{
        background-color: {colors['bg_secondary']};
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
        border: 1px solid {colors['border']};
    }}
    
    .circular-metric {{
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        margin: 1rem auto;
        width: 100%;
    }}
    
    .circle {{
        width: 100px;
        height: 100px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        margin-bottom: 0.5rem;
        box-shadow: 0 4px 8px {colors['shadow']};
        margin: 0 auto 0.5rem auto;
    }}
    
    /* Gradient circles - these work in both themes */
    .circle-1 {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }}
    .circle-2 {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }}
    .circle-3 {{ background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }}
    .circle-4 {{ background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }}
    .circle-5 {{ background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }}
    
    .circle-number {{
        font-size: 1.5rem;
        font-weight: bold;
        line-height: 1;
    }}
    
    .circle-label {{
        font-size: 0.7rem;
        margin-top: 0.2rem;
        line-height: 1;
    }}
    
    .metric-title {{
        font-size: 0.8rem;
        color: {colors['text_secondary']};
        font-weight: bold;
        margin-top: 0.5rem;
        text-align: center;
    }}
    
    .metrics-container {{
        display: flex;
        justify-content: space-around;
        align-items: center;
        flex-wrap: wrap;
        margin: 2rem 0;
        padding: 1rem;
        background-color: {colors['bg_tertiary']};
        border-radius: 10px;
        border: 1px solid {colors['border']};
    }}
    
    /* Theme Toggle Button Styling */
    .theme-toggle {{
        position: fixed;
        top: 0.75rem;
        right: 1rem;
        z-index: 999999;
        background: {colors['bg_secondary']};
        border: 1px solid {colors['border']};
        border-radius: 50%;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.3rem;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px {colors['shadow']};
    }}
    
    .theme-toggle:hover {{
        transform: scale(1.1);
        box-shadow: 0 4px 12px {colors['shadow']};
    }}
    
    /* Mode indicator badges */
    .mode-badge {{
        padding: 5px 15px;
        border-radius: 20px;
        font-size: 0.9em;
        font-weight: 500;
    }}
    
    .mode-badge-developer {{
        background-color: #4CAF50;
        color: white;
    }}
    
    .mode-badge-business {{
        background-color: #2196F3;
        color: white;
    }}
    
    /* Info boxes and alerts */
    .info-box {{
        background-color: {colors['bg_secondary']};
        border-left: 4px solid {colors['accent']};
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 0 0.5rem 0.5rem 0;
        color: {colors['text_primary']};
    }}
    
    /* Table styling for dark mode */
    .dataframe {{
        color: {colors['text_primary']} !important;
    }}
    
    .dataframe th {{
        background-color: {colors['bg_tertiary']} !important;
        color: {colors['text_primary']} !important;
    }}
    
    .dataframe td {{
        background-color: {colors['bg_secondary']} !important;
        color: {colors['text_primary']} !important;
    }}
    
    </style>
    """
    
    st.markdown(css, unsafe_allow_html=True)


def render_theme_toggle():
    """
    Render a theme toggle button.
    Returns True if theme was changed (requires rerun).
    """
    # Use columns to position the toggle
    cols = st.columns([10, 1])
    
    with cols[1]:
        icon = "☀️" if is_dark_mode() else "🌙"
        tooltip = "Switch to Light Mode" if is_dark_mode() else "Switch to Dark Mode"
        
        if st.button(icon, key="theme_toggle_btn", help=tooltip):
            toggle_theme()
            return True
    
    return False
