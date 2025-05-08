import os
import groq
import json
import re
from typing import Dict, Any, List
import logging
from sqlalchemy.orm import Session
from ..models.agent import Agent
from ..models.tool import Tool
from .agent_service import AgentService
from .tool_service import ToolService

logger = logging.getLogger(__name__)

class NaturalLanguageService:
    def __init__(self):
        groq_api_key = os.getenv("GROQ_API_KEY", "")
        if not groq_api_key:
            logger.warning("GROQ_API_KEY environment variable is not set or empty!")
        else:
            logger.info(f"Initializing NL service with GROQ API key: {groq_api_key[:5]}...")
        self.groq_client = groq.Client(api_key=groq_api_key)
        self.agent_service = AgentService()
        self.tool_service = ToolService()
        
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

            # Get response from Groq
            try:
                response = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that processes natural language queries and converts them into structured actions."},
                        {"role": "user", "content": prompt}
                    ],
                    model="llama-3.3-70b-versatile",
                    temperature=0.1,
                    max_tokens=1000
                )

                # Parse the response safely
                result = response.choices[0].message.content
                action_plan = self._extract_json_from_response(result)
                logger.info(f"Parsed action plan: {action_plan}")
            except Exception as e:
                logger.error(f"Error calling Groq API: {str(e)}")
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
                response = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that suggests suitable agents for user queries."},
                        {"role": "user", "content": prompt}
                    ],
                    model="llama-3.3-70b-versatile",
                    temperature=0.1,
                    max_tokens=1000
                )

                result = response.choices[0].message.content
                suggestions = self._extract_json_from_response(result)
                if not isinstance(suggestions, list):
                    logger.warning(f"Expected list of suggestions but got: {type(suggestions)}")
                    suggestions = []
                return suggestions
            except Exception as e:
                logger.error(f"Error calling Groq API for suggestions: {str(e)}")
                return []

        except Exception as e:
            logger.error(f"Error getting agent suggestions: {str(e)}")
            return [] 