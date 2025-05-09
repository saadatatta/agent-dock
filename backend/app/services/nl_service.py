import os
import groq
import openai  # Add OpenAI import
from anthropic import Anthropic  # Add Anthropic import
import json
import re
from typing import Dict, Any, List, Tuple
import logging
from sqlalchemy.orm import Session
from ..models.agent import Agent
from ..models.tool import Tool, ToolLog
from .agent_service import AgentService
from .tool_service import ToolService
from .settings_service import SettingsService
import html

logger = logging.getLogger(__name__)

class NaturalLanguageService:
    def __init__(self):
        # Initialize clients as None, we'll create them on-demand
        self.groq_client = None
        self.openai_client = None
        self.anthropic_client = None
        
        self.agent_service = AgentService()
        self.tool_service = ToolService()
        self.settings_service = SettingsService()
        
    def _initialize_llm_client(self, provider: str, api_key: str = None):
        """Initialize the LLM client based on the provider"""
        if provider == "groq":
            if self.groq_client is None:
                api_key = api_key or os.getenv("GROQ_API_KEY", "")
                if not api_key:
                    logger.warning("GROQ_API_KEY environment variable is not set or empty!")
                else:
                    logger.info(f"Initializing Groq client with API key: {api_key[:5]}...")
                    self.groq_client = groq.Client(api_key=api_key)
            return self.groq_client
            
        elif provider == "openai":
            if self.openai_client is None:
                api_key = api_key or os.getenv("OPENAI_API_KEY", "")
                if not api_key:
                    logger.warning("OPENAI_API_KEY environment variable is not set or empty!")
                else:
                    logger.info(f"Initializing OpenAI client with API key: {api_key[:5]}...")
                    self.openai_client = openai.OpenAI(api_key=api_key)
            return self.openai_client
            
        elif provider == "anthropic":
            if self.anthropic_client is None:
                api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
                if not api_key:
                    logger.warning("ANTHROPIC_API_KEY environment variable is not set or empty!")
                else:
                    logger.info(f"Initializing Anthropic client with API key: {api_key[:5]}...")
                    self.anthropic_client = Anthropic(api_key=api_key)
            return self.anthropic_client
            
        else:
            logger.error(f"Unsupported LLM provider: {provider}")
            raise ValueError(f"Unsupported LLM provider: {provider}")
        
    def _extract_json_from_response(self, text: str) -> Dict[str, Any]:
        """Safely extract JSON from the response text"""
        try:
            # First try direct JSON parsing
            return json.loads(text)
        except json.JSONDecodeError:
            # If that fails, try to extract JSON using regex
            try:
                # Try to find JSON content within triple backticks (common in markdown)
                json_match = re.search(r'```(?:json)?\s*({.*?}|[\[\{][\s\S]*?[\]\}])\s*```', text, re.DOTALL)
                if json_match:
                    json_content = json_match.group(1).strip()
                    return json.loads(json_content)
                
                # Find content between curly braces (including nested ones)
                json_match = re.search(r'({[\s\S]*?})(?:\s|$)', text, re.DOTALL)
                if json_match:
                    json_content = json_match.group(1).strip()
                    logger.debug(f"Extracted JSON with curly braces: {json_content}")
                    return json.loads(json_content)
                
                # If no curly braces, try square brackets for arrays
                json_match = re.search(r'(\[[\s\S]*?\])(?:\s|$)', text, re.DOTALL)
                if json_match:
                    json_content = json_match.group(1).strip()
                    logger.debug(f"Extracted JSON with square brackets: {json_content}")
                    return json.loads(json_content)
                
                # Last attempt - find anything that looks like JSON
                json_match = re.search(r'([\{\[][\s\S]*?[\}\]])(?:\s|$)', text, re.DOTALL)
                if json_match:
                    json_content = json_match.group(1).strip()
                    logger.debug(f"Extracted potential JSON content: {json_content}")
                    return json.loads(json_content)
                
                logger.error(f"Could not extract valid JSON from response: {text[:200]}...")
                raise ValueError("Could not extract valid JSON from response")
            except Exception as e:
                logger.error(f"Failed to extract JSON from response: {e}")
                logger.debug(f"Response text: {text[:200]}...")
                # Return a default response as fallback
                return {"agent_id": None, "action": "default", "parameters": {}}

    def _format_response_for_humans(self, response_data: Dict[str, Any]) -> str:
        """Format JSON response data into human-readable text"""
        try:
            # If this is an error, just return the error message
            if response_data.get("error"):
                return f"Error: {response_data['error']}"
                
            # If this is a GitHub repository response
            if "repos" in response_data or "repositories" in response_data:
                repos = response_data.get("repos") or response_data.get("repositories") or []
                if not repos:
                    return "No repositories found."
                    
                result = "Here are your GitHub repositories:\n\n"
                for repo in repos:
                    name = repo.get("name", "Unnamed repository")
                    desc = repo.get("description", "No description available")
                    url = repo.get("html_url") or repo.get("url", "#")
                    stars = repo.get("stargazers_count") or repo.get("stars", 0)
                    
                    result += f"- **{name}**: {desc}\n"
                    result += f"  Stars: {stars} | URL: {url}\n\n"
                    
                return result
                
            # If this is a pull request response
            if "pull_requests" in response_data:
                prs = response_data.get("pull_requests", [])
                if not prs:
                    return "No pull requests found."
                    
                result = "Here are the pull requests:\n\n"
                for pr in prs:
                    title = pr.get("title", "Untitled PR")
                    number = pr.get("number", "?")
                    state = pr.get("state", "unknown")
                    creator = pr.get("user", {}).get("login", "unknown")
                    
                    result += f"- **#{number}: {title}**\n"
                    result += f"  State: {state} | Created by: {creator}\n\n"
                    
                return result
                
            # If this is a Slack response
            if "channel" in response_data:
                channel = response_data.get("channel", "")
                ok = response_data.get("ok", False)
                
                if ok:
                    return f"Message successfully sent to {channel} channel."
                else:
                    error = response_data.get("error", "unknown error")
                    return f"Failed to send message to {channel} channel: {error}"
            
            # Generic response formatter for other data types
            if isinstance(response_data, dict):
                # Try to find commonly useful fields to display
                result = ""
                
                # Display message field if present
                if "message" in response_data:
                    result += f"{response_data['message']}\n\n"
                
                # Display name/title fields if present
                for key in ["name", "title", "subject"]:
                    if key in response_data:
                        result += f"{key.capitalize()}: {response_data[key]}\n"
                
                # Display status if present
                if "status" in response_data:
                    result += f"Status: {response_data['status']}\n"
                
                # If there's a count field, display it
                if "count" in response_data:
                    result += f"Count: {response_data['count']}\n"
                
                # If nothing useful was found or result is still empty, return a simplified JSON version
                if not result:
                    # Clean up the dictionary by removing any huge nested objects
                    clean_dict = {}
                    for k, v in response_data.items():
                        if isinstance(v, (dict, list)) and len(str(v)) > 100:
                            clean_dict[k] = f"[Complex {type(v).__name__}]"
                        else:
                            clean_dict[k] = v
                    
                    result = "Here's what I found:\n\n"
                    for k, v in clean_dict.items():
                        if k != "raw_response" and k != "details":
                            result += f"- **{k}**: {v}\n"
                
                return result
            
            # For list responses
            if isinstance(response_data, list):
                if not response_data:
                    return "No items found."
                
                result = "Here's what I found:\n\n"
                for i, item in enumerate(response_data[:10], 1):  # Limit to first 10
                    if isinstance(item, dict):
                        # Try to get a name or title for each item
                        name = None
                        for key in ["name", "title", "id"]:
                            if key in item:
                                name = item[key]
                                break
                        
                        if name:
                            result += f"{i}. **{name}**\n"
                        else:
                            result += f"{i}. Item {i}\n"
                    else:
                        result += f"{i}. {str(item)}\n"
                
                if len(response_data) > 10:
                    result += f"\n... and {len(response_data) - 10} more items."
                
                return result
            
            # Fallback for other types
            return str(response_data)
            
        except Exception as e:
            logger.error(f"Error formatting response: {e}")
            return "I received information but couldn't format it properly. Here's what I know: " + str(response_data)

    def _get_llm_response(self, db: Session, messages: List[Dict[str, str]]) -> Tuple[str, Dict[str, Any]]:
        """Get a response from the active LLM model and return token usage information"""
        # Get the active model from settings
        model_key, model_config = self.settings_service.get_active_llm_model(db)
        provider = model_config.get("provider", "groq")
        model_name = model_config.get("model_name", "llama-3.3-70b-versatile")
        parameters = model_config.get("parameters", {})
        
        logger.info(f"Using LLM model: {provider}/{model_name}")
        
        usage_data = {
            "provider": provider,
            "model": model_name,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0
        }
        
        try:
            if provider == "groq":
                client = self._initialize_llm_client(provider)
                response = client.chat.completions.create(
                    messages=messages,
                    model=model_name,
                    temperature=parameters.get("temperature", 0.1),
                    max_tokens=parameters.get("max_tokens", 1000)
                )
                content = response.choices[0].message.content
                logger.debug(f"Raw response from {provider}/{model_name}: {content[:100]}...")
                
                # Get usage if available
                if hasattr(response, 'usage'):
                    usage_data["input_tokens"] = getattr(response.usage, "prompt_tokens", 0)
                    usage_data["output_tokens"] = getattr(response.usage, "completion_tokens", 0)
                    usage_data["total_tokens"] = getattr(response.usage, "total_tokens", 0)
                
                return content, usage_data
                
            elif provider == "openai":
                client = self._initialize_llm_client(provider)
                response = client.chat.completions.create(
                    messages=messages,
                    model=model_name,
                    temperature=parameters.get("temperature", 0.1),
                    max_tokens=parameters.get("max_tokens", 1000)
                )
                content = response.choices[0].message.content
                logger.debug(f"Raw response from {provider}/{model_name}: {content[:100]}...")
                
                # Get usage if available
                if hasattr(response, 'usage'):
                    usage_data["input_tokens"] = getattr(response.usage, "prompt_tokens", 0)
                    usage_data["output_tokens"] = getattr(response.usage, "completion_tokens", 0)
                    usage_data["total_tokens"] = getattr(response.usage, "total_tokens", 0)
                
                return content, usage_data
                
            elif provider == "anthropic":
                client = self._initialize_llm_client(provider)
                system_message = next((m["content"] for m in messages if m["role"] == "system"), None)
                user_messages = [m["content"] for m in messages if m["role"] == "user"]
                
                response = client.messages.create(
                    model=model_name,
                    system=system_message,
                    messages=[{"role": "user", "content": content} for content in user_messages],
                    temperature=parameters.get("temperature", 0.1),
                    max_tokens=parameters.get("max_tokens", 1000)
                )
                content = response.content[0].text
                logger.debug(f"Raw response from {provider}/{model_name}: {content[:100]}...")
                
                # Get usage if available
                if hasattr(response, 'usage'):
                    usage_data["input_tokens"] = getattr(response.usage, "input_tokens", 0)
                    usage_data["output_tokens"] = getattr(response.usage, "output_tokens", 0)
                    usage_data["total_tokens"] = getattr(response.usage, "input_tokens", 0) + getattr(response.usage, "output_tokens", 0)
                
                return content, usage_data
                
            else:
                raise ValueError(f"Unsupported LLM provider: {provider}")
                
        except Exception as e:
            logger.error(f"Error calling {provider} API: {str(e)}")
            raise

    def process_query(self, db: Session, query: str) -> Dict[str, Any]:
        """Process a natural language query"""
        try:
            # Get available agents and tools
            agents = self.agent_service.get_agents(db)
            tools = self.tool_service.get_tools(db)

            # Find the GitHub agent if it exists
            github_agent = next((agent for agent in agents if "github" in agent.name.lower()), None)
            github_agent_id = github_agent.id if github_agent else None
            
            # Find the Slack agent if it exists
            slack_agent = next((agent for agent in agents if "slack" in agent.name.lower()), None)
            slack_agent_id = slack_agent.id if slack_agent else None

            # Check if this is a GitHub repository-related query
            is_github_related = any(keyword in query.lower() for keyword in ["github", "repo", "repository", "pull request", "pr", "issue", "commit"])
            
            # Check if this is a Slack message-related query
            is_slack_related = any(keyword in query.lower() for keyword in ["slack", "message", "send", "post", "channel", "dm", "direct message"])
            
            # Create context for the LLM
            context = {
                "available_agents": [
                    {
                        "id": agent.id,
                        "name": agent.name,
                        "description": agent.description,
                        "tools": [tool.name for tool in agent.tools]
                    }
                    for agent in agents
                ],
                "available_tools": [
                    {
                        "id": tool.id,
                        "name": tool.name,
                        "type": tool.type,
                        "description": tool.description
                    }
                    for tool in tools
                ]
            }

            # GitHub action mapping - maps common/intuitive names to actual supported actions
            github_action_mapping = {
                "list_repositories": "get_repositories",
                "get_repos": "get_repositories",
                "list_repos": "get_repositories",
                "show_repositories": "get_repositories",
                "show_repos": "get_repositories",
                "my_repositories": "get_repositories",
                "my_repos": "get_repositories",
                "list_prs": "list_pull_requests",
                "get_prs": "list_pull_requests",
                "show_prs": "list_pull_requests",
                "list_issues": "list_issues",
                "get_issues": "list_issues",
                "show_issues": "list_issues",
            }
            
            # Slack action mapping - maps common/intuitive names to actual supported actions
            slack_action_mapping = {
                "send_message": "send_message",
                "post_message": "send_message",
                "send": "send_message",
                "post": "send_message",
                "message": "send_message",
                "slack_message": "send_message",
                "dm": "send_message"
            }

            # Create a more detailed prompt for GitHub-related queries
            if is_github_related and github_agent_id:
                # Extract repository name - look for patterns like "in repo X" or "in X repo" or just "X repo"
                prompt = f"""
                Context:
                Available Agents: {context['available_agents']}
                Available Tools: {context['available_tools']}

                User Query: {query}

                This appears to be a GitHub-related query. You MUST extract the repository name correctly.

                Here are some examples of how to parse GitHub queries:
                1. "list pull requests in agent-dock repo" → agent_id: {github_agent_id}, action: "list_pull_requests", parameters: {{"repo": "agent-dock"}}
                2. "show PRs in microsoft/vscode" → agent_id: {github_agent_id}, action: "list_pull_requests", parameters: {{"repo": "microsoft/vscode"}}
                3. "get repository details for user/some-repo" → agent_id: {github_agent_id}, action: "get_repo_details", parameters: {{"repo": "user/some-repo"}}
                4. "get PR #123 from agent-dock repository" → agent_id: {github_agent_id}, action: "get_pull_request_details", parameters: {{"repo": "agent-dock", "number": 123}}
                5. "show my github repositories" → agent_id: {github_agent_id}, action: "get_repositories", parameters: {{}}
                6. "list my repos" → agent_id: {github_agent_id}, action: "get_repositories", parameters: {{}}
                7. "show github repos" → agent_id: {github_agent_id}, action: "get_repositories", parameters: {{}}

                Important: If you see a repository name without owner (like just "agent-dock"), assume it's a valid repository name.
                The GitHub agent requires the "repo" parameter for all repository-related operations EXCEPT for "get_repositories" which lists all repositories.
                
                Supported GitHub actions are: "get_repositories", "list_pull_requests", "get_pull_request_details", "list_issues"

                Please analyze the query and determine:
                1. Which agent should handle this query (likely GitHub agent)
                2. What action should be taken
                3. What parameters are needed

                IMPORTANT: You must respond with ONLY a valid JSON object, nothing else. No explanations, no code blocks, no other text.
                JSON RESPONSE FORMAT:
                {{
                    "agent_id": <agent_id or null if no suitable agent>,
                    "action": <action_name or "default" if no specific action>,
                    "parameters": {{
                        <parameter_name>: <parameter_value>
                    }}
                }}
                """
            # Create a detailed prompt for Slack-related queries
            elif is_slack_related and slack_agent_id:
                prompt = f"""
                Context:
                Available Agents: {context['available_agents']}
                Available Tools: {context['available_tools']}

                User Query: {query}

                This appears to be a Slack-related query. You need to extract:
                1. The channel name to send the message to
                2. The message content to send

                Here are some examples of how to parse Slack queries:
                1. "send message to #general saying hello world" → agent_id: {slack_agent_id}, action: "send_message", parameters: {{"channel": "#general", "message": "hello world"}}
                2. "post 'meeting at 3pm' in the team-updates channel" → agent_id: {slack_agent_id}, action: "send_message", parameters: {{"channel": "team-updates", "message": "meeting at 3pm"}}
                3. "send 'project completed' to hackathon-channel" → agent_id: {slack_agent_id}, action: "send_message", parameters: {{"channel": "hackathon-channel", "message": "project completed"}}

                Important: For channel names, don't include the # symbol unless it's explicitly in the query.
                The Slack agent requires both "channel" and "message" parameters for all message operations.

                Supported Slack actions are: "send_message"

                Please analyze the query and determine:
                1. Which agent should handle this query (the Slack agent)
                2. What action should be taken (send_message)
                3. What parameters are needed (channel and message)

                IMPORTANT: You must respond with ONLY a valid JSON object, nothing else. No explanations, no code blocks, no other text.
                JSON RESPONSE FORMAT:
                {{
                    "agent_id": <agent_id or null if no suitable agent>,
                    "action": <action_name or "default" if no specific action>,
                    "parameters": {{
                        <parameter_name>: <parameter_value>
                    }}
                }}
                """
            else:
                # Standard prompt for non-GitHub, non-Slack queries
                prompt = f"""
                Context:
                Available Agents: {context['available_agents']}
                Available Tools: {context['available_tools']}

                User Query: {query}

                Please analyze the query and determine:
                1. Which agent should handle this query
                2. What action should be taken
                3. What parameters are needed

                IMPORTANT: You must respond with ONLY a valid JSON object, nothing else. No explanations, no code blocks, no other text.
                JSON RESPONSE FORMAT:
                {{
                    "agent_id": <agent_id or null if no suitable agent>,
                    "action": <action_name or "default" if no specific action>,
                    "parameters": {{
                        <parameter_name>: <parameter_value>
                    }}
                }}
                """

            # Get response from the active LLM
            try:
                model_key, model_config = self.settings_service.get_active_llm_model(db)
                provider = model_config.get("provider", "groq")
                model_name = model_config.get("model_name", "llama-3.3-70b-versatile")
                
                result, usage_data = self._get_llm_response(
                    db,
                    messages=[
                        {"role": "system", "content": "You are a helpful API response generator that ONLY outputs valid JSON. Never explain your reasoning or add any text outside the JSON. Even if you're uncertain, make a best guess and include it in the JSON structure."},
                        {"role": "user", "content": prompt}
                    ]
                )

                # Parse the response safely
                action_plan = self._extract_json_from_response(result)
                logger.info(f"Parsed action plan: {action_plan}")
                
                # Map GitHub actions if needed
                if action_plan.get("agent_id") == github_agent_id and action_plan.get("action") in github_action_mapping:
                    action_plan["action"] = github_action_mapping[action_plan["action"]]
                    logger.info(f"Mapped GitHub action to: {action_plan['action']}")
                
                # Map Slack actions if needed
                if action_plan.get("agent_id") == slack_agent_id and action_plan.get("action") in slack_action_mapping:
                    action_plan["action"] = slack_action_mapping[action_plan["action"]]
                    logger.info(f"Mapped Slack action to: {action_plan['action']}")
                
            except Exception as e:
                logger.error(f"Error calling language model: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Error calling language model: {str(e)}",
                    "model_info": {
                        "provider": provider,
                        "model": model_name
                    }
                }

            # Execute the action
            if action_plan.get("agent_id"):
                agent = self.agent_service.get_agent(db, action_plan["agent_id"])
                if not agent:
                    raise ValueError(f"Agent {action_plan['agent_id']} not found")

                # Execute the agent with the action plan
                result = self.agent_service.execute_agent(
                    db,
                    action_plan["agent_id"],
                    {
                        "action": action_plan.get("action", "default"),
                        "parameters": action_plan.get("parameters", {})
                    }
                )

                # Get a human-readable version of the response
                human_readable = self._format_response_for_humans(result.get("result", {}))

                # Create a tool log with all the details including LLM usage
                # Check if there's a specific tool_id in the action plan
                tool_id = action_plan.get("tool_id")
                if not tool_id:
                    # Try to find an appropriate tool to associate the log with
                    if agent and agent.tools:
                        # Use the first tool associated with the agent
                        tool_id = agent.tools[0].id
                    else:
                        # Get any available tool
                        all_tools = self.tool_service.get_tools(db)
                        tool_id = all_tools[0].id if all_tools else None
                
                # Only log if we have a valid tool_id
                if tool_id:
                    self.tool_service.log_tool_action(
                        db,
                        tool_id,
                        "nl_query",
                        "success",
                        {
                            "query": query,
                            "action_plan": action_plan,
                            "raw_result": result,
                            "llm": usage_data
                        }
                    )

                return {
                    "status": "success",
                    "result": result,
                    "action_plan": action_plan,
                    "human_readable": human_readable,
                    "model_info": {
                        "provider": provider,
                        "model": model_name
                    },
                    "token_usage": usage_data
                }
            else:
                return {
                    "status": "error",
                    "message": "No suitable agent found for the query",
                    "model_info": {
                        "provider": provider,
                        "model": model_name
                    },
                    "token_usage": usage_data
                }

        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            # Try to get the active model info even in case of error
            try:
                model_key, model_config = self.settings_service.get_active_llm_model(db)
                provider = model_config.get("provider", "groq")
                model_name = model_config.get("model_name", "llama-3.3-70b-versatile")
                model_info = {
                    "provider": provider,
                    "model": model_name
                }
            except:
                model_info = {"provider": "unknown", "model": "unknown"}
                
            return {
                "status": "error",
                "message": str(e),
                "model_info": model_info
            }

    def get_agent_suggestions(self, db: Session, query: str) -> List[Dict[str, Any]]:
        """Get agent suggestions based on the query"""
        try:
            agents = self.agent_service.get_agents(db)
            
            prompt = f"""
            Available Agents:
            {[{'id': agent.id, 'name': agent.name, 'description': agent.description} for agent in agents]}

            User Query: {query}

            Please suggest the most suitable agents for this query.
            
            IMPORTANT: You must respond with ONLY a valid JSON array, nothing else. No explanations, no code blocks, no other text.
            JSON RESPONSE FORMAT:
            [
                {{
                    "agent_id": <agent_id>,
                    "relevance_score": <score between 0 and 1>,
                    "reason": <explanation>
                }}
            ]
            """

            try:
                result = self._get_llm_response(
                    db,
                    messages=[
                        {"role": "system", "content": "You are a helpful API response generator that ONLY outputs valid JSON. Never explain your reasoning or add any text outside the JSON. Even if you're uncertain, make a best guess and include it in the JSON structure."},
                        {"role": "user", "content": prompt}
                    ]
                )

                suggestions = self._extract_json_from_response(result)
                if not isinstance(suggestions, list):
                    logger.warning(f"Expected list of suggestions but got: {type(suggestions)}")
                    suggestions = []
                return suggestions
            except Exception as e:
                logger.error(f"Error calling language model for suggestions: {str(e)}")
                return []

        except Exception as e:
            logger.error(f"Error getting agent suggestions: {str(e)}")
            return [] 