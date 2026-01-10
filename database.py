"""
Database connection and management module for PostgreSQL.
"""

import os
import logging
from typing import Optional, Dict, Any, List
import sqlalchemy as sa
from sqlalchemy import create_engine, text, MetaData, inspect
import psycopg2
import pandas as pd
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_db_config():
    """Get database configuration from environment variables or Streamlit secrets."""
    # Check environment variables first (to avoid secrets warnings)
    config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'database': os.getenv('DB_NAME'),
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'sslmode': os.getenv('DB_SSL_MODE', 'prefer')
    }
    
    # Only check Streamlit secrets if environment variables are not set
    if not config.get('database') or not config.get('user') or not config.get('password'):
        try:
            # Try to import streamlit to check if running in Streamlit Cloud
            import streamlit as st
            import warnings
            
            # Suppress warnings when accessing secrets
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                # If running in Streamlit Cloud, use secrets
                if hasattr(st, 'secrets') and hasattr(st.secrets, 'get'):
                    secrets_config = {
                        'host': st.secrets.get('DB_HOST', config['host']),
                        'port': int(st.secrets.get('DB_PORT', config['port'])),
                        'database': st.secrets.get('DB_NAME', config['database']),
                        'user': st.secrets.get('DB_USER', config['user']),
                        'password': st.secrets.get('DB_PASSWORD', config['password']),
                        'sslmode': st.secrets.get('DB_SSL_MODE', config['sslmode'])
                    }
                    # Use secrets values if they exist
                    if secrets_config.get('database') and secrets_config.get('user'):
                        config = secrets_config
        except ImportError:
            pass
        except Exception as e:
            logger.debug(f"Could not access Streamlit secrets: {e}")
    
    return config


class DatabaseManager:
    """Manages PostgreSQL database connections and operations."""
    
    def __init__(self):
        """Initialize database manager with connection parameters from environment or Streamlit secrets."""
        self.db_config = get_db_config()
        self.engine = None
        self.connection_string = None
        self.is_configured = False
        
        # Validate required configuration
        required_fields = ['database', 'user', 'password']
        missing_fields = [field for field in required_fields if not self.db_config.get(field)]
        
        if missing_fields:
            logger.warning(f"Missing required database configuration: {missing_fields}")
            self.missing_fields = missing_fields
            # Don't raise error immediately - let the app start and show a configuration message
        else:
            self.missing_fields = []
            self.is_configured = True
            self.connection_string = self._build_connection_string()
    
    def _build_connection_string(self) -> str:
        """Build PostgreSQL connection string."""
        return (
            f"postgresql://{self.db_config['user']}:{self.db_config['password']}@"
            f"{self.db_config['host']}:{self.db_config['port']}/{self.db_config['database']}"
            f"?sslmode={self.db_config['sslmode']}"
        )
    
    def get_configuration_status(self) -> Dict[str, Any]:
        """Get configuration status for display in the app."""
        return {
            'is_configured': self.is_configured,
            'missing_fields': self.missing_fields,
            'available_config': {k: bool(v) for k, v in self.db_config.items() if k != 'password'},
            'password_configured': bool(self.db_config.get('password'))
        }
    
    def get_engine(self):
        """Get or create SQLAlchemy engine."""
        if not self.is_configured:
            raise ValueError("Database not configured. Please check your environment variables or Streamlit secrets.")
        
        if self.engine is None:
            try:
                self.engine = create_engine(
                    self.connection_string,
                    pool_size=5,
                    max_overflow=10,
                    pool_pre_ping=True,
                    echo=False
                )
                logger.info("Database engine created successfully")
            except Exception as e:
                logger.error(f"Failed to create database engine: {e}")
                raise
        return self.engine
    
    def test_connection(self) -> bool:
        """Test database connection."""
        if not self.is_configured:
            return False
            
        try:
            engine = self.get_engine()
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        """
        Execute a read-only query and return results as DataFrame.
        
        Args:
            query: SQL query string (must be read-only)
            params: Optional query parameters
            
        Returns:
            pandas.DataFrame with query results
        """
        if not self.is_configured:
            raise ValueError("Database not configured. Please check your environment variables or Streamlit secrets.")
        
        # Security check: ensure query is read-only
        query_upper = query.strip().upper()
        
        # Use word boundaries to match complete keywords only
        forbidden_patterns = [
            r'\bINSERT\b', r'\bUPDATE\b', r'\bDELETE\b', r'\bDROP\b', 
            r'\bCREATE\b', r'\bALTER\b', r'\bTRUNCATE\b', r'\bGRANT\b', 
            r'\bREVOKE\b', r'\bEXEC\b', r'\bEXECUTE\b'
        ]
        
        for pattern in forbidden_patterns:
            if re.search(pattern, query_upper):
                keyword = pattern.replace(r'\b', '').replace('\\', '')
                raise ValueError(f"Query contains forbidden keyword: {keyword}. Only read-only operations allowed.")
        
        try:
            engine = self.get_engine()
            with engine.connect() as conn:
                if params:
                    result = pd.read_sql_query(text(query), conn, params=params)
                else:
                    result = pd.read_sql_query(query, conn)
            logger.info(f"Query executed successfully, returned {len(result)} rows")
            return result
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    def get_schema_info(self) -> Dict[str, List[Dict[str, str]]]:
        """
        Get database schema information for LangChain agent.
        
        Returns:
            Dictionary with table names and their column info
        """
        if not self.is_configured:
            return {}
            
        try:
            engine = self.get_engine()
            inspector = inspect(engine)
            schema_info = {}
            
            # Get all table names
            table_names = inspector.get_table_names()
            
            for table_name in table_names:
                columns = inspector.get_columns(table_name)
                schema_info[table_name] = [
                    {
                        'name': col['name'],
                        'type': str(col['type']),
                        'nullable': col['nullable'],
                        'default': col.get('default')
                    }
                    for col in columns
                ]
            
            logger.info(f"Retrieved schema for {len(schema_info)} tables")
            return schema_info
        except Exception as e:
            logger.error(f"Failed to retrieve schema info: {e}")
            return {}
    
    def get_schema_string(self) -> str:
        """
        Get formatted schema string for LangChain prompts.
        
        Returns:
            Formatted string describing database schema
        """
        schema_info = self.get_schema_info()
        if not schema_info:
            return "No schema information available. Please check database configuration."
        
        schema_parts = []
        
        for table_name, columns in schema_info.items():
            table_part = f"\nTable: {table_name}\n" + "="*40
            column_parts = []
            
            for col in columns:
                nullable_str = "NULL" if col['nullable'] else "NOT NULL"
                default_str = f" DEFAULT {col['default']}" if col['default'] else ""
                column_parts.append(f"  {col['name']}: {col['type']} {nullable_str}{default_str}")
            
            table_part += "\n" + "\n".join(column_parts)
            schema_parts.append(table_part)
        
        return "\n".join(schema_parts)
    
    def get_sample_data(self, table_name: str, limit: int = 5) -> pd.DataFrame:
        """
        Get sample data from a table for schema understanding.
        
        Args:
            table_name: Name of the table
            limit: Number of sample rows to retrieve
            
        Returns:
            DataFrame with sample data
        """
        query = f"SELECT * FROM {table_name} LIMIT {limit}"
        return self.execute_query(query)


# Global database manager instance
try:
    db_manager = DatabaseManager()
except Exception as e:
    logger.error(f"Failed to initialize database manager: {e}")
    # Create a minimal db_manager for graceful error handling
    db_manager = None 