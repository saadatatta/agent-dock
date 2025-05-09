import os
import sys
import logging
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import SQLAlchemy components
from app.core.database import engine, Base, init_models, SessionLocal

# Explicitly import all models
from app.models.base import Base
from app.models.agent import Agent, agent_tools
from app.models.tool import Tool, ToolLog

def init_db(drop_all=False):
    """Initialize the database by creating all tables.
    
    Args:
        drop_all (bool): If True, drop all existing tables before creating new ones.
    """
    try:
        logger.info("Starting database initialization...")
        
        # Initialize models
        init_models()
        
        # Print the tables that will be created
        tables = Base.metadata.tables
        logger.info(f"Tables to be created or verified: {', '.join(tables.keys())}")
        
        # Check if tables exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if drop_all:
            # Drop all tables if requested
            logger.info("Dropping all existing tables...")
            Base.metadata.drop_all(bind=engine)
        elif existing_tables:
            # Tables exist, just log that we're not recreating them
            logger.info(f"Found existing tables: {', '.join(existing_tables)}")
            logger.info("Database already initialized. Will only create missing tables.")
        
        # Create the tables (SQLAlchemy will only create tables that don't exist)
        logger.info("Creating missing tables...")
        Base.metadata.create_all(bind=engine)
        
        # Verify tables were created
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
                    tool_id INTEGER REFERENCES tools(id) NULL,
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
        
        # Create initial data
        try:
            # Get a database session
            db = SessionLocal()
            
            # Create tools
            github_tool = Tool(
                name="GitHub API",
                description="GitHub API tool for repository operations, pull requests, and more",
                type="github",
                config={
                    "api_url": "https://api.github.com",
                    "require_auth": True
                },
                is_active=True
            )
            db.add(github_tool)
            
            slack_tool = Tool(
                name="Slack API",
                description="Slack API tool for sending messages and more",
                type="slack",
                config={
                    "api_url": "https://api.slack.com",
                    "require_auth": True
                },
                is_active=True
            )
            db.add(slack_tool)
            
            # Create agents
            github_agent = Agent(
                name="GitHub Agent",
                description="An agent that handles GitHub operations using the GitHub API tool",
                code="""
# GitHub Agent for handling GitHub operations
# This agent will use the GitHub API tool to perform various GitHub operations

# Check what action was requested
if action == "get_repositories":
    # Find the GitHub tool
    github_tool = next((t for t in tools if t.type == "github"), None)
    if not github_tool:
        result = {"error": "GitHub tool not found or not enabled"}
    else:
        # Get parameters from the request or use defaults
        params = parameters.copy() or {}
        # Execute the GitHub API tool
        repos = execute_tool(github_tool.id, "get_repos", params)
        result = {
            "repos": repos,
            "count": len(repos)
        }

elif action == "list_pull_requests":
    # Find the GitHub tool
    github_tool = next((t for t in tools if t.type == "github"), None)
    if not github_tool:
        result = {"error": "GitHub tool not found or not enabled"}
    else:
        # Check if repository is provided
        if "repo" not in parameters:
            result = {"error": "Repository parameter is required"}
        else:
            # Get parameters from the request or use defaults
            params = parameters.copy()
            # Execute the GitHub API tool
            prs = execute_tool(github_tool.id, "list_pull_requests", params)
            result = {
                "pull_requests": prs,
                "count": len(prs),
                "repository": parameters["repo"]
            }

elif action == "get_pull_request_details":
    # Find the GitHub tool
    github_tool = next((t for t in tools if t.type == "github"), None)
    if not github_tool:
        result = {"error": "GitHub tool not found or not enabled"}
    else:
        # Check if required parameters are provided
        if "repo" not in parameters or "number" not in parameters:
            result = {"error": "Repository and PR number parameters are required"}
        else:
            # Get parameters from the request or use defaults
            params = parameters.copy()
            # Execute the GitHub API tool
            pr_details = execute_tool(github_tool.id, "get_pr_details", params)
            result = {
                "pull_request": pr_details,
                "repository": parameters["repo"]
            }

else:
    result = {
        "error": f"Unsupported action: {action}",
        "supported_actions": ["get_repositories", "list_pull_requests", "get_pull_request_details"]
    }
""",
                config={
                    "default_repo": "",
                    "default_limit": 10
                },
                is_active=True
            )
            db.add(github_agent)
            db.flush()  # Flush to get the ID
            
            # Add tools to agents
            github_agent.tools.append(github_tool)
            
            example_agent = Agent(
                name="Example Agent",
                description="An example agent for testing",
                code="""
# Example Agent for testing
# This agent is used for testing purposes

# Check what action was requested
if action == "example_action":
    result = {"message": "This is an example action"}
else:
    result = {
        "error": f"Unsupported action: {action}",
        "supported_actions": ["example_action"]
    }
""",
                config={},
                is_active=True
            )
            db.add(example_agent)
            db.flush()  # Flush to get the ID
            
            # Add tools to agents
            example_agent.tools.append(slack_tool)
            
            # Commit the changes
            db.commit()
            
            logger.info("Agents and tools created successfully.")
        except Exception as e:
            logger.error(f"Error creating agents and tools: {str(e)}")
            if 'db' in locals():
                db.rollback()
        finally:
            if 'db' in locals():
                db.close()
        
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

if __name__ == "__main__":
    # Check if --drop-all flag is provided
    drop_all = "--drop-all" in sys.argv
    init_db(drop_all=drop_all) 