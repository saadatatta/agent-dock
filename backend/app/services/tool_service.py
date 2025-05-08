from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from ..models.tool import Tool, ToolLog
from ..schemas.tool import ToolCreate, ToolUpdate
import logging
import requests
import os
from datetime import datetime

logger = logging.getLogger(__name__)

class ToolService:
    def create_tool(self, db: Session, tool: ToolCreate) -> Tool:
        """Create a new tool"""
        db_tool = Tool(
            name=tool.name,
            description=tool.description,
            type=tool.type,
            config=tool.config,
            is_active=tool.is_active
        )
        db.add(db_tool)
        db.commit()
        db.refresh(db_tool)
        return db_tool

    def get_tools(self, db: Session, skip: int = 0, limit: int = 10) -> List[Tool]:
        """Get all tools with pagination"""
        return db.query(Tool).offset(skip).limit(limit).all()

    def count_tools(self, db: Session) -> int:
        """Count total number of tools"""
        return db.query(Tool).count()

    def get_tool(self, db: Session, tool_id: int) -> Optional[Tool]:
        """Get a specific tool by ID"""
        return db.query(Tool).filter(Tool.id == tool_id).first()

    def update_tool(self, db: Session, tool_id: int, tool: ToolUpdate) -> Optional[Tool]:
        """Update an existing tool"""
        db_tool = self.get_tool(db, tool_id)
        if not db_tool:
            return None

        update_data = tool.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_tool, field, value)

        db.commit()
        db.refresh(db_tool)
        return db_tool

    def delete_tool(self, db: Session, tool_id: int) -> Optional[Tool]:
        """Delete a tool"""
        db_tool = self.get_tool(db, tool_id)
        if not db_tool:
            return None

        db.delete(db_tool)
        db.commit()
        return db_tool

    def log_tool_action(self, db: Session, tool_id: int, action: str, status: str, details: Optional[Dict[str, Any]] = None, error_message: Optional[str] = None) -> ToolLog:
        """Log a tool action"""
        tool_log = ToolLog(
            tool_id=tool_id,
            action=action,
            status=status,
            details=details,
            error_message=error_message
        )
        db.add(tool_log)
        db.commit()
        db.refresh(tool_log)
        return tool_log

    def get_tool_logs(self, db: Session, tool_id: int, skip: int = 0, limit: int = 10) -> List[ToolLog]:
        """Get logs for a specific tool"""
        return db.query(ToolLog).filter(ToolLog.tool_id == tool_id).offset(skip).limit(limit).all()

    def execute_github_action(self, db: Session, tool_id: int, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a GitHub action"""
        db_tool = self.get_tool(db, tool_id)
        if not db_tool or db_tool.type != "github":
            raise ValueError("Invalid tool or tool type")

        github_token = os.getenv("GITHUB_TOKEN")
        if not github_token:
            raise ValueError("GitHub token not configured")

        try:
            headers = {
                "Authorization": f"token {github_token}",
                "Accept": "application/vnd.github.v3+json"
            }

            if action == "get_repos":
                response = requests.get("https://api.github.com/user/repos", headers=headers)
                response.raise_for_status()
                result = response.json()
            elif action == "list_pull_requests":
                repo = params.get("repo")
                if not repo:
                    raise ValueError("Repository name required")
                response = requests.get(f"https://api.github.com/repos/{repo}/pulls", headers=headers)
                response.raise_for_status()
                result = response.json()
                print("GITHUB RESULT", result)
            else:
                raise ValueError(f"Unsupported GitHub action: {action}")

            self.log_tool_action(
                db,
                tool_id,
                action,
                "success",
                {"params": params, "result": result}
            )

            return result
        except Exception as e:
            self.log_tool_action(
                db,
                tool_id,
                action,
                "error",
                {"params": params},
                str(e)
            )
            raise

    def execute_slack_action(self, db: Session, tool_id: int, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Slack action"""
        db_tool = self.get_tool(db, tool_id)
        if not db_tool or db_tool.type != "slack":
            raise ValueError("Invalid tool or tool type")

        slack_token = os.getenv("SLACK_TOKEN")
        if not slack_token:
            raise ValueError("Slack token not configured")

        try:
            headers = {
                "Authorization": f"Bearer {slack_token}",
                "Content-Type": "application/json"
            }

            if action == "send_message":
                channel = params.get("channel")
                message = params.get("message")
                if not channel or not message:
                    raise ValueError("Channel and message required")

                data = {
                    "channel": channel,
                    "text": message
                }
                response = requests.post("https://slack.com/api/chat.postMessage", headers=headers, json=data)
                response.raise_for_status()
                result = response.json()
            else:
                raise ValueError(f"Unsupported Slack action: {action}")

            self.log_tool_action(
                db,
                tool_id,
                action,
                "success",
                {"params": params, "result": result}
            )

            return result
        except Exception as e:
            self.log_tool_action(
                db,
                tool_id,
                action,
                "error",
                {"params": params},
                str(e)
            )
            raise

    def execute_jira_action(self, db: Session, tool_id: int, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Jira action"""
        db_tool = self.get_tool(db, tool_id)
        if not db_tool or db_tool.type != "jira":
            raise ValueError("Invalid tool or tool type")

        jira_token = os.getenv("JIRA_TOKEN")
        if not jira_token:
            raise ValueError("Jira token not configured")

        try:
            headers = {
                "Authorization": f"Basic {jira_token}",
                "Content-Type": "application/json"
            }

            if action == "get_issues":
                jql = params.get("jql", "")
                response = requests.get(
                    f"https://your-domain.atlassian.net/rest/api/2/search",
                    headers=headers,
                    params={"jql": jql}
                )
                response.raise_for_status()
                result = response.json()
            else:
                raise ValueError(f"Unsupported Jira action: {action}")

            self.log_tool_action(
                db,
                tool_id,
                action,
                "success",
                {"params": params, "result": result}
            )

            return result
        except Exception as e:
            self.log_tool_action(
                db,
                tool_id,
                action,
                "error",
                {"params": params},
                str(e)
            )
            raise 