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

        # Delete associated logs first to avoid foreign key constraint violations
        db.query(ToolLog).filter(ToolLog.tool_id == tool_id).delete(synchronize_session=False)
        
        # Now delete the tool
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

    def get_all_logs(self, db: Session, skip: int = 0, limit: int = 10) -> List[ToolLog]:
        """Get all tool logs"""
        return db.query(ToolLog).offset(skip).limit(limit).all()

    def count_logs(self, db: Session) -> int:
        """Count total number of logs"""
        return db.query(ToolLog).count()

    def delete_log(self, db: Session, log_id: int) -> Optional[ToolLog]:
        """Delete a log"""
        db_log = db.query(ToolLog).filter(ToolLog.id == log_id).first()
        if not db_log:
            return None

        db.delete(db_log)
        db.commit()
        return db_log

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
                # Extract optional parameters
                per_page = params.get("per_page", 10)
                sort_by = params.get("sort_by", "updated")  # Options: created, updated, pushed, full_name
                sort_direction = params.get("sort_direction", "desc")  # Options: asc, desc
                limit = params.get("limit")  # Limit the number of results after fetching

                # Build query parameters
                query_params = {
                    "per_page": per_page,
                    "sort": sort_by,
                    "direction": sort_direction
                }
                
                response = requests.get(
                    "https://api.github.com/user/repos", 
                    headers=headers,
                    params=query_params
                )
                response.raise_for_status()
                repos = response.json()
                
                # Process and transform the data
                processed_repos = [
                    {
                        "name": repo["name"],
                        "description": repo["description"] or "",
                        "url": repo["html_url"],
                        "stars": repo["stargazers_count"],
                        "forks": repo["forks_count"],
                        "language": repo["language"] or "",
                        "created_at": repo["created_at"],
                        "updated_at": repo["updated_at"],
                        "pushed_at": repo["pushed_at"],
                        "is_private": repo["private"],
                        "is_fork": repo["fork"],
                        "size": repo["size"]
                    }
                    for repo in repos
                ]
                
                # Apply additional filters if provided in params
                if params.get("language"):
                    language_filter = params["language"].lower()
                    processed_repos = [
                        repo for repo in processed_repos 
                        if repo["language"] and repo["language"].lower() == language_filter
                    ]
                
                if "is_fork" in params:
                    fork_filter = params["is_fork"]
                    processed_repos = [
                        repo for repo in processed_repos 
                        if repo["is_fork"] == fork_filter
                    ]
                
                if "is_private" in params:
                    private_filter = params["is_private"]
                    processed_repos = [
                        repo for repo in processed_repos 
                        if repo["is_private"] == private_filter
                    ]
                
                # Apply final limit if specified
                if limit and isinstance(limit, int) and limit > 0:
                    processed_repos = processed_repos[:limit]
                
                result = processed_repos
                
            elif action == "get_repo_details":
                repo_name = params.get("repo")
                if not repo_name:
                    raise ValueError("Repository name required")
                
                # Ensure repo is properly formatted with owner/repo format
                if "/" not in repo_name:
                    # If only repo name is provided without owner, try to get user's login
                    user_response = requests.get("https://api.github.com/user", headers=headers)
                    user_response.raise_for_status()
                    owner = user_response.json().get("login")
                    if owner:
                        repo_name = f"{owner}/{repo_name}"
                    else:
                        raise ValueError("Repository must be in the format 'owner/repo' or user authentication failed")
                
                response = requests.get(
                    f"https://api.github.com/repos/{repo_name}", 
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                
            elif action == "list_pull_requests":
                repo = params.get("repo")
                if not repo:
                    raise ValueError("Repository name required")
                
                # Ensure repo is properly formatted with owner/repo format
                if "/" not in repo:
                    # If only repo name is provided without owner, try to get user's login
                    user_response = requests.get("https://api.github.com/user", headers=headers)
                    user_response.raise_for_status()
                    owner = user_response.json().get("login")
                    if owner:
                        repo = f"{owner}/{repo}"
                    else:
                        raise ValueError("Repository must be in the format 'owner/repo' or user authentication failed")
                
                state = params.get("state", "open")  # open, closed, all
                sort_by = params.get("sort_by", "created")  # created, updated, popularity, long-running
                direction = params.get("direction", "desc")  # asc, desc
                per_page = params.get("per_page", 10)
                limit = params.get("limit")
                
                query_params = {
                    "state": state,
                    "sort": sort_by,
                    "direction": direction,
                    "per_page": per_page
                }
                
                response = requests.get(
                    f"https://api.github.com/repos/{repo}/pulls", 
                    headers=headers,
                    params=query_params
                )
                response.raise_for_status()
                
                prs = response.json()
                
                # Process and transform the data
                processed_prs = [
                    {
                        "number": pr["number"],
                        "title": pr["title"],
                        "url": pr["html_url"],
                        "state": pr["state"],
                        "user": {
                            "login": pr["user"]["login"],
                            "avatar_url": pr["user"]["avatar_url"],
                            "profile_url": pr["user"]["html_url"]
                        },
                        "created_at": pr["created_at"],
                        "updated_at": pr["updated_at"],
                        "closed_at": pr["closed_at"],
                        "merged_at": pr["merged_at"],
                        "draft": pr.get("draft", False),
                        "labels": [
                            {
                                "name": label["name"],
                                "color": label["color"]
                            }
                            for label in pr.get("labels", [])
                        ]
                    }
                    for pr in prs
                ]
                
                # Apply filters based on parameters
                if params.get("author"):
                    author_filter = params["author"].lower()
                    processed_prs = [
                        pr for pr in processed_prs 
                        if pr["user"]["login"].lower() == author_filter
                    ]
                
                if "is_draft" in params:
                    draft_filter = params["is_draft"]
                    processed_prs = [
                        pr for pr in processed_prs 
                        if pr["draft"] == draft_filter
                    ]
                
                # Apply final limit if specified
                if limit and isinstance(limit, int) and limit > 0:
                    processed_prs = processed_prs[:limit]
                
                result = processed_prs
                
            elif action == "get_pr_details":
                repo = params.get("repo")
                pr_number = params.get("number")
                
                if not repo or not pr_number:
                    raise ValueError("Repository name and PR number required")
                
                # Ensure repo is properly formatted with owner/repo format
                if "/" not in repo:
                    # If only repo name is provided without owner, try to get user's login
                    user_response = requests.get("https://api.github.com/user", headers=headers)
                    user_response.raise_for_status()
                    owner = user_response.json().get("login")
                    if owner:
                        repo = f"{owner}/{repo}"
                    else:
                        raise ValueError("Repository must be in the format 'owner/repo' or user authentication failed")
                
                response = requests.get(
                    f"https://api.github.com/repos/{repo}/pulls/{pr_number}", 
                    headers=headers
                )
                response.raise_for_status()
                pr = response.json()
                
                # Also get PR comments
                comments_response = requests.get(
                    f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments",
                    headers=headers
                )
                comments_response.raise_for_status()
                comments = comments_response.json()
                
                # Process and transform the data
                result = {
                    "number": pr["number"],
                    "title": pr["title"],
                    "body": pr["body"],
                    "url": pr["html_url"],
                    "state": pr["state"],
                    "user": {
                        "login": pr["user"]["login"],
                        "avatar_url": pr["user"]["avatar_url"],
                        "profile_url": pr["user"]["html_url"]
                    },
                    "created_at": pr["created_at"],
                    "updated_at": pr["updated_at"],
                    "closed_at": pr["closed_at"],
                    "merged_at": pr["merged_at"],
                    "draft": pr.get("draft", False),
                    "labels": [
                        {
                            "name": label["name"],
                            "color": label["color"]
                        }
                        for label in pr.get("labels", [])
                    ],
                    "comments": [
                        {
                            "id": comment["id"],
                            "body": comment["body"],
                            "user": {
                                "login": comment["user"]["login"],
                                "avatar_url": comment["user"]["avatar_url"],
                                "profile_url": comment["user"]["html_url"]
                            },
                            "created_at": comment["created_at"],
                            "updated_at": comment["updated_at"]
                        }
                        for comment in comments
                    ]
                }
            else:
                raise ValueError(f"Unsupported GitHub action: {action}")

            self.log_tool_action(
                db,
                tool_id,
                action,
                "success",
                {"params": params, "result_count": len(result) if isinstance(result, list) else 1}
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