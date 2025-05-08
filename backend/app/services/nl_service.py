import os
import groq
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
        logger.info(f"Initializing NL service with GROQ API key: {groq_api_key[:5]}...")
        self.groq_client = groq.Client(api_key=groq_api_key)
        self.agent_service = AgentService()
        self.tool_service = ToolService()

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
            response = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that processes natural language queries and converts them into structured actions."},
                    {"role": "user", "content": prompt}
                ],
                model="mixtral-8x7b-32768",
                temperature=0.1,
                max_tokens=1000
            )

            # Parse the response
            result = response.choices[0].message.content
            action_plan = eval(result)  # Convert string to dict

            # Execute the action
            if action_plan["agent_id"]:
                agent = self.agent_service.get_agent(db, action_plan["agent_id"])
                if not agent:
                    raise ValueError(f"Agent {action_plan['agent_id']} not found")

                # Execute the agent with the action plan
                result = self.agent_service.execute_agent(
                    db,
                    action_plan["agent_id"],
                    {
                        "action": action_plan["action"],
                        "parameters": action_plan["parameters"]
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

            response = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that suggests suitable agents for user queries."},
                    {"role": "user", "content": prompt}
                ],
                model="mixtral-8x7b-32768",
                temperature=0.1,
                max_tokens=1000
            )

            suggestions = eval(response.choices[0].message.content)
            return suggestions

        except Exception as e:
            logger.error(f"Error getting agent suggestions: {str(e)}")
            return [] 