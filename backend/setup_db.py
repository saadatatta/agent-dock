#!/usr/bin/env python
"""
Setup database script - resets the database and populates it with necessary data.
This script:
1. Drops all existing tables
2. Creates all tables based on models
3. Populates tables with initial required data
4. Can be run safely multiple times
"""

import os
import sys
import logging
import subprocess
from sqlalchemy.exc import IntegrityError
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the current directory to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import required components
from app.core.database import SessionLocal
from app.models.tool import Tool, ToolLog
from app.models.agent import Agent
from app.models.settings import Settings
from app.models.chat import ChatMessage  # Import the ChatMessage model

def reset_database():
    """Reset the database using the existing reset_db.py script"""
    logger.info("Resetting database...")
    try:
        # Call the reset_db.py script
        subprocess.run([sys.executable, "reset_db.py"], check=True)
        logger.info("Database reset completed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to reset database: {e}")
        return False

def setup_tools(db):
    """Set up the initial tools in the database"""
    logger.info("Setting up tools...")
    
    # Define tools to be created
    tools = [
        Tool(
            name="GitHub API",
            description="GitHub API tool for repository operations, pull requests, and more",
            type="github",
            config={
                "api_url": "https://api.github.com",
                "require_auth": True
            },
            is_active=True
        ),
        Tool(
            name="Slack API",
            description="Slack API tool for sending messages and more",
            type="slack",
            config={
                "api_url": "https://api.slack.com",
                "require_auth": True
            },
            is_active=True
        ),
        Tool(
            name="Jira API",
            description="Jira API tool for ticket management",
            type="jira",
            config={
                "api_url": "https://your-domain.atlassian.net",
                "require_auth": True
            },
            is_active=True
        ),
        Tool(
            name="HTTP",
            description="General HTTP requests tool",
            type="http",
            config={
                "allow_all_domains": False,
                "allowed_domains": ["api.example.com"]
            },
            is_active=True
        )
    ]
    
    # Add each tool to the database
    for tool in tools:
        try:
            db.add(tool)
            db.flush()
            logger.info(f"Created tool: {tool.name} (ID: {tool.id})")
        except IntegrityError:
            db.rollback()
            logger.warning(f"Tool {tool.name} already exists, skipping.")
            # If we want to update existing tools instead:
            existing_tool = db.query(Tool).filter(Tool.name == tool.name).first()
            if existing_tool:
                existing_tool.description = tool.description
                existing_tool.config = tool.config
                existing_tool.is_active = tool.is_active
                logger.info(f"Updated existing tool: {existing_tool.name}")
    
    db.commit()
    logger.info("Tool setup completed.")

def setup_agents(db):
    """Set up the initial agents in the database"""
    logger.info("Setting up agents...")
    
    # We need tools to link to agents
    github_tool = db.query(Tool).filter(Tool.type == "github").first()
    slack_tool = db.query(Tool).filter(Tool.type == "slack").first()
    
    # Define agents to be created
    agents = [
        Agent(
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
""",
            config={
                "default_repo": "",
                "default_limit": 10
            },
            is_active=True
        ),
        Agent(
            name="Slack Agent",
            description="An agent that handles sending messages via Slack",
            code="""
# Slack Agent for sending messages
# This agent will use the Slack API tool to send messages

# Check what action was requested
if action == "send_message":
    # Find the Slack tool
    slack_tool = next((t for t in tools if t.type == "slack"), None)
    if not slack_tool:
        result = {"error": "Slack tool not found or not enabled"}
    else:
        # Check if required parameters are provided
        if "message" not in parameters:
            result = {"error": "Message parameter is required"}
        else:
            # Get parameters from the request or use defaults
            params = parameters.copy()
            if "channel" not in params:
                params["channel"] = "#general"  # Default channel
            
            # Execute the Slack API tool
            sent = execute_tool(slack_tool.id, "send_message", params)
            result = {
                "success": sent,
                "channel": params["channel"]
            }
""",
            config={
                "default_channel": "#general"
            },
            is_active=True
        )
    ]
    
    # Add each agent to the database
    for agent in agents:
        try:
            db.add(agent)
            db.flush()
            logger.info(f"Created agent: {agent.name} (ID: {agent.id})")
            
            # Link agent with appropriate tools
            if agent.name == "GitHub Agent" and github_tool:
                agent.tools.append(github_tool)
                logger.info(f"Linked GitHub tool to {agent.name}")
            
            if agent.name == "Slack Agent" and slack_tool:
                agent.tools.append(slack_tool)
                logger.info(f"Linked Slack tool to {agent.name}")
                
        except IntegrityError:
            db.rollback()
            logger.warning(f"Agent {agent.name} already exists, skipping.")
            # If we want to update existing agents instead:
            existing_agent = db.query(Agent).filter(Agent.name == agent.name).first()
            if existing_agent:
                existing_agent.description = agent.description
                existing_agent.code = agent.code
                existing_agent.config = agent.config
                existing_agent.is_active = agent.is_active
                logger.info(f"Updated existing agent: {existing_agent.name}")
    
    db.commit()
    logger.info("Agent setup completed.")

def setup_settings(db):
    """Set up the initial settings in the database"""
    logger.info("Setting up settings...")
    
    # Define settings to be created
    settings = [
        Settings(
            key="GITHUB_TOKEN",
            value={"token": ""},
            description="GitHub API token for authentication",
            is_secret=True
        ),
        Settings(
            key="SLACK_TOKEN",
            value={"token": ""},
            description="Slack API token for authentication",
            is_secret=True
        ),
        Settings(
            key="JIRA_CREDENTIALS",
            value={
                "username": "",
                "api_token": ""
            },
            description="JIRA API credentials",
            is_secret=True
        ),
        Settings(
            key="APP_SETTINGS",
            value={
                "debug_mode": False,
                "log_level": "INFO",
                "max_tool_execution_time": 30
            },
            description="General application settings",
            is_secret=False
        )
    ]
    
    # Add each setting to the database
    for setting in settings:
        try:
            db.add(setting)
            db.flush()
            logger.info(f"Created setting: {setting.key} (ID: {setting.id})")
        except IntegrityError:
            db.rollback()
            logger.warning(f"Setting {setting.key} already exists, skipping.")
            # If we want to update existing settings instead:
            existing_setting = db.query(Settings).filter(Settings.key == setting.key).first()
            if existing_setting and not existing_setting.is_secret:
                existing_setting.value = setting.value
                existing_setting.description = setting.description
                logger.info(f"Updated existing setting: {existing_setting.key}")
    
    db.commit()
    logger.info("Settings setup completed.")

def setup_chat_messages(db):
    """Set up a sample chat conversation in the database"""
    logger.info("Setting up sample chat messages...")
    
    # Create a session ID for the sample conversation
    session_id = str(uuid.uuid4())
    
    # Define messages to be created
    messages = [
        ChatMessage(
            session_id=session_id,
            content="Welcome to Agent Chat! This is a sample conversation to demonstrate the chat history feature.",
            sender="system",
            message_type="text",
            message_metadata=None
        ),
        ChatMessage(
            session_id=session_id,
            content="Hello! Can you show me how to use this application?",
            sender="user",
            message_type="text",
            message_metadata=None
        ),
        ChatMessage(
            session_id=session_id,
            content="Of course! You can ask me questions about GitHub repositories, use tools, and I'll help you with your tasks. Your chat history is now saved between sessions.",
            sender="agent",
            message_type="text",
            message_metadata={
                "agent_name": "Assistant",
                "model_info": {
                    "provider": "OpenAI",
                    "model": "gpt-4"
                }
            }
        )
    ]
    
    # Add each message to the database
    for message in messages:
        try:
            db.add(message)
            db.flush()
            logger.info(f"Created chat message: ID {message.id} in session {message.session_id}")
        except IntegrityError:
            db.rollback()
            logger.warning(f"Error creating chat message, skipping.")
    
    db.commit()
    logger.info("Sample chat messages setup completed.")

def main():
    """Main function to run the database setup process"""
    logger.info("Starting database setup process...")
    
    # Reset the database first
    if not reset_database():
        logger.error("Failed to reset database, aborting setup.")
        sys.exit(1)
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Setup data in specific order due to dependencies
        setup_tools(db)
        setup_agents(db)
        setup_settings(db)
        setup_chat_messages(db)
        
        logger.info("Database setup completed successfully.")
    except Exception as e:
        logger.error(f"Error during database setup: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main() 