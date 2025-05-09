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
from ..models.tool import Tool
from .agent_service import AgentService
from .tool_service import ToolService
from .settings_service import SettingsService

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
                # Find content between curly braces (including nested ones)
                json_match = re.search(r'({.*})', text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(1))
                # If no curly braces, try square brackets for arrays
                json_match = re.search(r'(\[.*\])', text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(1))
                raise ValueError("Could not extract valid JSON from response")
            except Exception as e:
                logger.error(f"Failed to extract JSON from response: {e}")
                logger.debug(f"Response text: {text}")
                # Return a default response as fallback
                return {"agent_id": None, "action": "default", "parameters": {}}

    def _get_llm_response(self, db: Session, messages: List[Dict[str, str]]) -> str:
        """Get a response from the active LLM model"""
        # Get the active model from settings
        model_key, model_config = self.settings_service.get_active_llm_model(db)
        provider = model_config.get("provider", "groq")
        model_name = model_config.get("model_name", "llama-3.3-70b-versatile")
        parameters = model_config.get("parameters", {})
        
        logger.info(f"Using LLM model: {provider}/{model_name}")
        
        try:
            if provider == "groq":
                client = self._initialize_llm_client(provider)
                response = client.chat.completions.create(
                    messages=messages,
                    model=model_name,
                    temperature=parameters.get("temperature", 0.1),
                    max_tokens=parameters.get("max_tokens", 1000)
                )
                return response.choices[0].message.content
                
            elif provider == "openai":
                client = self._initialize_llm_client(provider)
                response = client.chat.completions.create(
                    messages=messages,
                    model=model_name,
                    temperature=parameters.get("temperature", 0.1),
                    max_tokens=parameters.get("max_tokens", 1000)
                )
                return response.choices[0].message.content
                
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
                return response.content[0].text
                
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

            # Create prompt for the LLM
            prompt = f"""
            Context:
            Available Agents: {context['available_agents']}
            Available Tools: {context['available_tools']}

            User Query: {query}

            Please analyze the query and determine:
            1. Which agent should handle this query
            2. What action should be taken
            3. What parameters are needed

            Respond in JSON format:
            {{
                "agent_id": <agent_id>,
                "action": <action_name>,
                "parameters": {{
                    <parameter_name>: <parameter_value>
                }}
            }}
            """

            # Get response from the active LLM
            try:
                result = self._get_llm_response(
                    db,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that processes natural language queries and converts them into structured actions."},
                        {"role": "user", "content": prompt}
                    ]
                )

                # Parse the response safely
                action_plan = self._extract_json_from_response(result)
                logger.info(f"Parsed action plan: {action_plan}")
            except Exception as e:
                logger.error(f"Error calling language model: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Error calling language model: {str(e)}"
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

                return {
                    "status": "success",
                    "result": result,
                    "action_plan": action_plan
                }
            else:
                return {
                    "status": "error",
                    "message": "No suitable agent found for the query"
                }

        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
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
            Respond in JSON format:
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
                        {"role": "system", "content": "You are a helpful assistant that suggests suitable agents for user queries."},
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