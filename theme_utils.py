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
        # Apple HIG Dark Mode Colors
        # Reference: developer.apple.com/design/human-interface-guidelines/dark-mode
        return {
            # Backgrounds - Apple's Elevated Base System
            'bg_primary': '#1C1C1E',       # System Background (avoid pure black)
            'bg_secondary': '#2C2C2E',     # Secondary System Background (elevated)
            'bg_tertiary': '#3A3A3C',      # Tertiary System Background (grouped)
            'bg_input': '#2C2C2E',         # Input fields (elevated)
            'bg_elevated': '#48484A',      # Elevated content (popovers, modals)
            
            # Text - Apple's Label Colors with proper opacity
            'text_primary': '#FFFFFF',                    # Primary Label
            'text_secondary': 'rgba(235, 235, 245, 0.6)', # Secondary Label
            'text_muted': 'rgba(235, 235, 245, 0.3)',     # Tertiary/Quaternary Label
            'text_placeholder': 'rgba(235, 235, 245, 0.3)', # Placeholder text
            
            # Accents - Slightly desaturated for dark mode
            'accent': '#0A84FF',           # iOS Blue (dark mode variant)
            'accent_secondary': '#5E5CE6', # iOS Indigo (dark mode variant)
            'success': '#30D158',          # iOS Green (dark mode variant)
            'warning': '#FFD60A',          # iOS Yellow (dark mode variant)
            'error': '#FF453A',            # iOS Red (dark mode variant)
            
            # Borders & Separators - Apple system separator
            'border': 'rgba(84, 84, 88, 0.65)',   # System separator (opaque)
            'divider': 'rgba(84, 84, 88, 0.35)',  # System separator (non-opaque)
            
            # Shadows
            'shadow': 'rgba(0, 0, 0, 0.5)',
            
            # Chart specific
            'chart_grid': 'rgba(84, 84, 88, 0.35)',
            'chart_text': 'rgba(235, 235, 245, 0.85)',
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
        /* ================================================
           APPLE HIG DARK MODE - Streamlit Overrides
           Follows elevated base pattern for visual hierarchy
        ================================================ */
        
        /* Base App Background */
        .stApp {{
            background-color: {colors['bg_primary']} !important;
        }}
        
        /* All text defaults */
        .stMarkdown, .stText, p, span, label {{
            color: {colors['text_primary']} !important;
        }}
        
        /* Sidebar - Elevated layer */
        [data-testid="stSidebar"] {{
            background-color: {colors['bg_secondary']} !important;
            border-right: 1px solid {colors['border']} !important;
        }}
        
        /* ================================================
           INPUT FIELDS - NUCLEAR FIX for Dark Mode
           Maximum specificity to override Streamlit defaults
        ================================================ */
        
        /* Force ALL text inputs to have proper styling - NUCLEAR OPTION */
        input {{
            background-color: {colors['bg_secondary']} !important;
            color: {colors['text_primary']} !important;
            border: 1px solid {colors['border']} !important;
            border-radius: 8px !important;
        }}
        
        /* Streamlit-specific input overrides */
        .stTextInput input,
        .stTextInput > div > div > input,
        [data-testid="stTextInput"] input,
        [data-baseweb="input"] input,
        input[type="text"],
        input[type="search"],
        input[type="email"],
        input[type="url"] {{
            background-color: {colors['bg_secondary']} !important;
            color: {colors['text_primary']} !important;
            border: 1px solid {colors['border']} !important;
            border-radius: 8px !important;
            -webkit-text-fill-color: {colors['text_primary']} !important;
        }}
        
        /* Placeholder styling */
        input::placeh older,
        .stTextInput input::placeholder {{
            color: {colors['text_muted']} !important;
            opacity: 0.6 !important;
            -webkit-text-fill-color: {colors['text_muted']} !important;
        }}
        
        /* Focus state */
        input:focus,
        .stTextInput input:focus {{
            border-color: {colors['accent']} !important;
            box-shadow: 0 0 0 1px {colors['accent']} !important;
            outline: none !important;
            background-color: {colors['bg_secondary']} !important;
            color: {colors['text_primary']} !important;
        }}
        
        /* Input labels - Must be visible */
        .stTextInput label, .stSelectbox label, .stMultiSelect label {{
            color: {colors['text_secondary']} !important;
            font-weight: 500 !important;
        }}
        
        /* Selectbox / Dropdowns */
        .stSelectbox > div > div {{
            background-color: {colors['bg_secondary']} !important;
            border: 1px solid {colors['border']} !important;
            border-radius: 8px !important;
        }}
        
        .stSelectbox > div > div > div {{
            color: {colors['text_primary']} !important;
        }}
        
        [data-baseweb="select"] > div {{
            background-color: {colors['bg_secondary']} !important;
            border-color: {colors['border']} !important;
        }}
        
        [data-baseweb="popover"] {{
            background-color: {colors['bg_tertiary']} !important;
        }}
        
        /* MultiSelect */
        .stMultiSelect > div > div {{
            background-color: {colors['bg_secondary']} !important;
            border: 1px solid {colors['border']} !important;
        }}
        
        /* Date inputs */
        .stDateInput > div > div > input {{
            background-color: {colors['bg_secondary']} !important;
            border: 1px solid {colors['border']} !important;
            color: {colors['text_primary']} !important;
        }}
        
        /* ================================================
           DATA TABLES - Proper elevation & separation
        ================================================ */
        
        .stDataFrame {{
            background-color: {colors['bg_secondary']} !important;
            border-radius: 10px !important;
            overflow: hidden !important;
        }}
        
        /* Table headers - most elevated */
        .stDataFrame [data-testid="stDataFrameResizable"] {{
            background-color: {colors['bg_secondary']} !important;
        }}
        
        /* Streamlit dataframe headers */
        .stDataFrame th, [data-testid="stDataFrame"] th {{
            background-color: {colors['bg_tertiary']} !important;
            color: {colors['text_primary']} !important;
            border-bottom: 1px solid {colors['border']} !important;
            font-weight: 600 !important;
        }}
        
        /* Table cells */
        .stDataFrame td, [data-testid="stDataFrame"] td {{
            background-color: {colors['bg_secondary']} !important;
            color: rgba(235, 235, 245, 0.85) !important;
            border-bottom: 1px solid {colors['divider']} !important;
        }}
        
        /* Alternating rows for better readability */
        .stDataFrame tr:nth-child(even) td {{
            background-color: rgba(58, 58, 60, 0.3) !important;
        }}
        
        /* Glide data grid (used by st.dataframe) */
        [data-testid="glideDataEditor"] {{
            background-color: {colors['bg_secondary']} !important;
        }}
        
        /* ================================================
           METRICS - Elevated cards
        ================================================ */
        
        [data-testid="stMetric"] {{
            background-color: {colors['bg_secondary']} !important;
            padding: 16px !important;
            border-radius: 10px !important;
            border: 1px solid {colors['divider']} !important;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }}
        
        [data-testid="stMetricValue"] {{
            color: {colors['text_primary']} !important;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        
        [data-testid="stMetricLabel"] {{
            color: {colors['text_secondary']} !important;
            text-align: center;
        }}
        
        [data-testid="stMetricDelta"] {{
            color: {colors['success']} !important;
            text-align: center;
        }}
        
        /* ================================================
           EXPANDERS - Proper elevation hierarchy
        ================================================ */
        
        .streamlit-expanderHeader {{
            background-color: {colors['bg_secondary']} !important;
            color: {colors['text_primary']} !important;
            border: 1px solid {colors['divider']} !important;
            border-radius: 10px !important;
        }}
        
        .streamlit-expanderContent {{
            background-color: {colors['bg_primary']} !important;
            border: 1px solid {colors['divider']} !important;
            border-top: none !important;
            border-radius: 0 0 10px 10px !important;
        }}
        
        details {{
            background-color: {colors['bg_secondary']} !important;
            border: 1px solid {colors['divider']} !important;
            border-radius: 10px !important;
        }}
        
        details summary {{
            color: {colors['text_primary']} !important;
        }}
        
        /* ================================================
           TABS - Consistent with elevation
        ================================================ */
        
        .stTabs [data-baseweb="tab-list"] {{
            background-color: {colors['bg_secondary']} !important;
            border-radius: 10px !important;
            padding: 4px !important;
        }}
        
        .stTabs [data-baseweb="tab"] {{
            color: {colors['text_secondary']} !important;
            background-color: transparent !important;
        }}
        
        .stTabs [aria-selected="true"] {{
            color: {colors['text_primary']} !important;
            background-color: {colors['bg_tertiary']} !important;
            border-radius: 8px !important;
        }}
        
        /* ================================================
           BUTTONS - Proper contrast
        ================================================ */
        
        .stButton > button {{
            background-color: {colors['bg_secondary']} !important;
            color: {colors['text_primary']} !important;
            border: 1px solid {colors['border']} !important;
        }}
        
        .stButton > button:hover {{
            background-color: {colors['bg_tertiary']} !important;
            border-color: {colors['accent']} !important;
        }}
        
        /* Primary buttons */
        .stButton > button[kind="primary"] {{
            background-color: {colors['accent']} !important;
            color: #FFFFFF !important;
            border: none !important;
        }}
        
        /* ================================================
           RADIO & CHECKBOX - Soften pure white
        ================================================ */
        
        .stRadio label, .stCheckbox label {{
            color: {colors['text_primary']} !important;
        }}
        
        .stRadio > div {{
            background-color: transparent !important;
        }}
        
        /* ================================================
           SUCCESS/WARNING/ERROR BOXES
        ================================================ */
        
        .stSuccess {{
            background-color: rgba(48, 209, 88, 0.15) !important;
            color: {colors['success']} !important;
            border: 1px solid {colors['success']} !important;
        }}
        
        .stWarning {{
            background-color: rgba(255, 214, 10, 0.15) !important;
            color: {colors['warning']} !important;
        }}
        
        .stError {{
            background-color: rgba(255, 69, 58, 0.15) !important;
            color: {colors['error']} !important;
        }}
        
        .stInfo {{
            background-color: rgba(10, 132, 255, 0.15) !important;
            color: {colors['accent']} !important;
        }}
        
        /* ================================================
           SCROLLBARS - Subtle dark styling
        ================================================ */
        
        ::-webkit-scrollbar {{
            width: 8px;
            height: 8px;
        }}
        
        ::-webkit-scrollbar-track {{
            background: {colors['bg_primary']};
        }}
        
        ::-webkit-scrollbar-thumb {{
            background: {colors['bg_tertiary']};
            border-radius: 4px;
        }}
        
        ::-webkit-scrollbar-thumb:hover {{
            background: {colors['bg_elevated']};
        }}
        
        /* ================================================
           HAMBURGER MENU / DROPDOWN - Fix white popup
        ================================================ */
        
        /* Main dropdown container */
        [data-testid="stMainMenu"] {{
            background-color: {colors['bg_secondary']} !important;
        }}
        
        [data-testid="stMainMenuList"] {{
            background-color: {colors['bg_secondary']} !important;
        }}
        
        /* Menu popover/dropdown */
        [data-baseweb="menu"], 
        [data-baseweb="popover"],
        [role="listbox"] {{
            background-color: {colors['bg_secondary']} !important;
            border: 1px solid {colors['border']} !important;
            border-radius: 10px !important;
        }}
        
        /* Menu items */
        [data-baseweb="menu"] li,
        [role="option"] {{
            background-color: {colors['bg_secondary']} !important;
            color: {colors['text_primary']} !important;
        }}
        
        [data-baseweb="menu"] li:hover,
        [role="option"]:hover {{
            background-color: {colors['bg_tertiary']} !important;
        }}
        
        /* The three-dot menu icon */
        [data-testid="stMainMenu"] button {{
            color: {colors['text_primary']} !important;
        }}
        
        /* Dropdown/select options */
        [data-baseweb="list-item"] {{
            background-color: {colors['bg_secondary']} !important;
            color: {colors['text_primary']} !important;
        }}
        
        /* ================================================
           RUNNING/RERUNNING STATUS BAR
        ================================================ */
        
        /* The "Running..." status bar at top */
        [data-testid="stStatusWidget"] {{
            background-color: {colors['bg_tertiary']} !important;
            color: {colors['text_primary']} !important;
            border: 1px solid {colors['border']} !important;
        }}
        
        /* Spinner/loading animation container */
        .stSpinner {{
            background-color: transparent !important;
        }}
        
        .stSpinner > div {{
            background-color: {colors['bg_secondary']} !important;
            border-radius: 10px !important;
            padding: 1rem !important;
        }}
        
        /* Status elements text */
        [data-testid="stStatusWidget"] span,
        [data-testid="stStatusWidget"] p {{
            color: {colors['text_primary']} !important;
        }}
        
        /* Stop button in running state */
        [data-testid="stStatusWidget"] button {{
            background-color: {colors['bg_tertiary']} !important;
            color: {colors['text_primary']} !important;
            border: 1px solid {colors['border']} !important;
        }}
        
        /* Header toolbar area */
        [data-testid="stToolbar"] {{
            background-color: transparent !important;
        }}
        
        /* Deploy button and menu in header */
        [data-testid="stToolbar"] button {{
            color: {colors['text_secondary']} !important;
        }}
        
        /* Streamlit's built-in dialogs/modals */
        [data-baseweb="modal"] {{
            background-color: {colors['bg_secondary']} !important;
        }}
        
        [data-baseweb="modal"] > div {{
            background-color: {colors['bg_secondary']} !important;
            border: 1px solid {colors['border']} !important;
        }}
        """
    
    css = f"""
    <style>
    /* ============================================
       THEME: {'Dark' if is_dark_mode() else 'Light'} Mode
       Generated dynamically by theme_utils.py
    ============================================ */
    
    /* SF Pro Font - Apple's System Font */
    @import url('https://fonts.cdnfonts.com/css/sf-pro-display');
    
    /* Global Font Reset - Selective Application to Avoid Breaking Icons */
    /* DO NOT use * selector - it breaks Material Icons in Streamlit expanders */
    html, body, [data-testid="stAppViewContainer"] {{
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }}
    
    /* Apply to text elements only - NOT to icons or buttons */
    p, span:not([class*="icon"]):not([data-icon]), label, div.stMarkdown {{
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif !important;
        letter-spacing: -0.01em;
    }}
    
    /* CRITICAL: Hide keyboard_arrow text in expanders */
    .streamlit-expanderHeader span {{
        font-family: 'Material Icons' !important;
        letter-spacing: normal !important;
    }}
    
    /* NUCLEAR: Hide Material Icon text - target the specific element */
    [data-testid="stIconMaterial"] {{
        display: none !important;
    }}
    
    summary [data-testid="stIconMaterial"],
    .streamlit-expanderHeader [data-testid="stIconMaterial"] {{
        visibility: hidden !important;
        font-size: 0 !important;
        width: 0 !important;
        height: 0 !important;
        position: absolute !important;
        left: -9999px !important;
    }}
    
    /* Nuclear option: Hide any text containing keyboard_arrow */
    .streamlit-expanderHeader *:not(svg):not(path) {{
        font-size: 0 !important;
    }}
    
    .streamlit-expanderHeader svg {{
        font-size: initial !important;
    }}
    
    /* Ensure section headers are still visible */
    .streamlit-expanderHeader {{
        font-size: 1rem !important;
    }}
    
    .streamlit-expanderHeader > div:first-child {{
        font-size: 1rem !important;
    }}
    
    /* Typography Scale */
    h1, h2, h3, h4, h5, h6 {{
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif !important;
        font-weight: 600 !important;
        letter-spacing: -0.02em;
    }}
    
    p, span, label, div {{
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif !important;
        letter-spacing: -0.01em;
    }}
    
    /* Streamlit Specific Font Overrides */
    .stMarkdown, .stText, [data-testid="stMarkdownContainer"] {{
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif !important;
    }}
    
    [data-testid="stMetricValue"] {{
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif !important;
        font-weight: 600 !important;
        font-feature-settings: 'tnum' on, 'lnum' on;
    }}
    
    {streamlit_overrides}
    
    /* Custom Dashboard Classes */
    .main-header {{
        font-size: 2.2rem;
        color: {colors['accent']};
        text-align: center;
        margin-bottom: 1.5rem;
        font-weight: 600;
        letter-spacing: -0.03em;
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
    
    /* Mode indicator badges - Apple-style pills */
    .mode-badge {{
        padding: 6px 14px;
        border-radius: 100px;
        font-size: 0.85em;
        font-weight: 500;
        letter-spacing: -0.01em;
    }}
    
    .mode-badge-developer {{
        background-color: {'rgba(48, 209, 88, 0.2)' if is_dark_mode() else '#E8F5E9'};
        color: {colors['success']};
        border: 1px solid {'rgba(48, 209, 88, 0.3)' if is_dark_mode() else '#C8E6C9'};
    }}
    
    .mode-badge-business {{
        background-color: {'rgba(10, 132, 255, 0.2)' if is_dark_mode() else '#E3F2FD'};
        color: {colors['accent']};
        border: 1px solid {'rgba(10, 132, 255, 0.3)' if is_dark_mode() else '#BBDEFB'};
    }}
    
    /* Info boxes and alerts - Improved spacing for sidebar */
    .info-box {{
        background-color: {colors['bg_secondary']};
        border-left: 4px solid {colors['accent']};
        padding: 1.5rem;
        margin: 1rem 0;
        border-radius: 0 0.5rem 0.5rem 0;
        color: {colors['text_primary']};
        line-height: 1.6;
    }}
    
    /* Sidebar info boxes - Extra spacing for Business dashboard */
    [data-testid="stSidebar"] .stAlert,
    [data-testid="stSidebar"] .element-container {{
        margin-bottom: 1.5rem !important;
    }}
    
    [data-testid="stSidebar"] p {{
        line-height: 1.7 !important;
        margin: 0.5rem 0 !important;
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
    
    # NUCLEAR OPTION: JavaScript injection to force fix stubborn issues
    # This runs after page load and on every Streamlit rerun
    js_fix = """
    <script>
    (function() {
        'use strict';
        
        // Force fix all input text visibility
        function fixInputs() {
            const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input, [data-baseweb="input"] input');
            inputs.forEach(function(input) {
                input.style.setProperty('background-color', 'rgba(28, 28, 30, 1)', 'important');
                input.style.setProperty('color', 'rgba(255, 255, 255, 0.85)', 'important');
                input.style.setProperty('border', '1px solid rgba(255, 255, 255, 0.15)', 'important');
                input.style.setProperty('-webkit-text-fill-color', 'rgba(255, 255, 255, 0.85)', 'important');
                input.style.setProperty('caret-color', 'rgba(255, 255, 255, 0.85)', 'important');
            });
        }
        
        // Remove keyboard_arrow text from expanders
        function fixExpanders() {
            const headers = document.querySelectorAll('.streamlit-expanderHeader, [data-testid^="stExpander"]');
            headers.forEach(function(header) {
                const spans = header.querySelectorAll('span');
                spans.forEach(function(span) {
                    const text = span.innerText || span.textContent || '';
                    if (text.includes('keyboard_arrow') || text === 'keyboard_arrow_down' || text === 'keyboard_arrow_right') {
                        span.style.fontSize = '0';
                        span.style.width = '0';
                        span.style.height = '0';
                        span.style.overflow = 'hidden';
                        span.style.display = 'inline-block';
                        span.textContent = '';
                    }
                });
            });
        }
        
        // Run fixes immediately
        function runFixes() {
            fixInputs();
            fixExpanders();
        }
        
        // Initial run after DOM loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runFixes);
        } else {
            runFixes();
        }
        
        // Re-run on Streamlit reruns (watch for DOM changes)
        const observer = new MutationObserver(function(mutations) {
            runFixes();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also run every 500ms for stubborn cases
        setInterval(runFixes, 500);
    })();
    </script>
    """
    
    st.markdown(css + js_fix, unsafe_allow_html=True)


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
