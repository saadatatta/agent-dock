import os
import sys
import logging
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import SQLAlchemy components
from app.core.database import engine, Base, init_models

# Explicitly import all models
from app.models.base import Base
from app.models.agent import Agent, agent_tools
from app.models.tool import Tool, ToolLog

def init_db():
    """Initialize the database by creating all tables."""
    try:
        logger.info("Starting database initialization...")
        
        # Initialize models
        init_models()
        
        # Print the tables that will be created
        tables = Base.metadata.tables
        logger.info(f"Tables to be created: {', '.join(tables.keys())}")
        
        # Drop all tables
        logger.info("Dropping all existing tables...")
        Base.metadata.drop_all(bind=engine)
        
        # Create the tables
        logger.info("Creating all tables...")
        Base.metadata.create_all(bind=engine)
        
        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        db_tables = inspector.get_table_names()
        logger.info(f"Tables in database: {', '.join(db_tables)}")
        
        # If no tables were created, try to create them using raw SQL
        if not db_tables:
            logger.info("Creating tables using raw SQL...")
            try:
                # Get database connection parameters from the DATABASE_URL
                db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/agentdock")
                
                # Parse the URL to get connection details
                parts = db_url.split("//")[1].split("@")
                user_pass = parts[0].split(":")
                host_db = parts[1].split("/")
                
                username = user_pass[0]
                password = user_pass[1]
                host = host_db[0]
                dbname = host_db[1]
                
                # Connect to PostgreSQL
                conn = psycopg2.connect(
                    dbname=dbname,
                    user=username,
                    password=password,
                    host=host
                )
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cursor = conn.cursor()
                
                # Create tables
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS agents (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    description TEXT,
                    code TEXT NOT NULL,
                    config JSONB,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """)
                
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS tools (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    description TEXT,
                    type VARCHAR(255) NOT NULL,
                    config JSONB,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """)
                
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS agent_tools (
                    agent_id INTEGER REFERENCES agents(id),
                    tool_id INTEGER REFERENCES tools(id),
                    PRIMARY KEY (agent_id, tool_id)
                )
                """)
                
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS tool_logs (
                    id SERIAL PRIMARY KEY,
                    tool_id INTEGER REFERENCES tools(id),
                    action VARCHAR(255) NOT NULL,
                    status VARCHAR(255) NOT NULL,
                    details JSONB,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """)
                
                cursor.close()
                conn.close()
                
                logger.info("Tables created using raw SQL.")
            except Exception as e:
                logger.error(f"Error creating tables using raw SQL: {str(e)}")
        
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

if __name__ == "__main__":
    init_db() 