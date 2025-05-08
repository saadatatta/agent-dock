import os
from dotenv import load_dotenv
from pydantic import BaseSettings

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # API Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    SLACK_TOKEN: str = os.getenv("SLACK_TOKEN", "")
    JIRA_TOKEN: str = os.getenv("JIRA_TOKEN", "")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/agentdock")
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AgentDock API"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings() 