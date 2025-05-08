from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from ..models.agent import Agent
from ..schemas.agent import AgentCreate, AgentUpdate
import logging

logger = logging.getLogger(__name__)

class AgentService:
    def create_agent(self, db: Session, agent: AgentCreate) -> Agent:
        """Create a new agent"""
        db_agent = Agent(
            name=agent.name,
            description=agent.description,
            code=agent.code,
            config=agent.config,
            is_active=agent.is_active
        )
        db.add(db_agent)
        db.commit()
        db.refresh(db_agent)
        return db_agent

    def get_agents(self, db: Session, skip: int = 0, limit: int = 10) -> List[Agent]:
        """Get all agents with pagination"""
        return db.query(Agent).options(
            joinedload(Agent.tools)
        ).offset(skip).limit(limit).all()

    def count_agents(self, db: Session) -> int:
        """Count total number of agents"""
        return db.query(Agent).count()

    def get_agent(self, db: Session, agent_id: int) -> Optional[Agent]:
        """Get a specific agent by ID"""
        return db.query(Agent).options(
            joinedload(Agent.tools)
        ).filter(Agent.id == agent_id).first()

    def update_agent(self, db: Session, agent_id: int, agent: AgentUpdate) -> Optional[Agent]:
        """Update an existing agent"""
        db_agent = self.get_agent(db, agent_id)
        if not db_agent:
            return None

        update_data = agent.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_agent, field, value)

        db.commit()
        db.refresh(db_agent)
        return db_agent

    def delete_agent(self, db: Session, agent_id: int) -> Optional[Agent]:
        """Delete an agent"""
        db_agent = self.get_agent(db, agent_id)
        if not db_agent:
            return None

        db.delete(db_agent)
        db.commit()
        return db_agent

    def add_tool_to_agent(self, db: Session, agent_id: int, tool_id: int) -> Optional[Agent]:
        """Add a tool to an agent"""
        from ..models.tool import Tool
        
        db_agent = self.get_agent(db, agent_id)
        db_tool = db.query(Tool).filter(Tool.id == tool_id).first()
        
        if not db_agent or not db_tool:
            return None
            
        db_agent.tools.append(db_tool)
        db.commit()
        db.refresh(db_agent)
        return db_agent

    def remove_tool_from_agent(self, db: Session, agent_id: int, tool_id: int) -> Optional[Agent]:
        """Remove a tool from an agent"""
        from ..models.tool import Tool
        
        db_agent = self.get_agent(db, agent_id)
        db_tool = db.query(Tool).filter(Tool.id == tool_id).first()
        
        if not db_agent or not db_tool:
            return None
            
        db_agent.tools.remove(db_tool)
        db.commit()
        db.refresh(db_agent)
        return db_agent
        
    def execute_agent(self, db: Session, agent_id: int, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an agent with the given action data
        
        Agent code should be written to use the following variables which are provided in the execution context:
        - agent_id: The ID of the agent being executed
        - agent_name: The name of the agent
        - action: The action requested (from action_data)
        - parameters: A dictionary of parameters (from action_data)
        - tools: List of tools associated with this agent
        - config: Agent configuration dictionary
        - db: Database session object for querying data
        - execute_tool(tool_id, action, params): Function to execute a tool
        
        The agent code should set the 'result' variable to return data.
        
        Example agent code:
        ```python
        # Process the incoming action and parameters
        if action == "get_github_repos":
            # Find the GitHub tool ID
            github_tool = next((t for t in tools if t.type == "github"), None)
            if github_tool:
                # Execute the tool
                repos = execute_tool(github_tool.id, "get_repos", {})
                # Set the result
                result = {
                    "repos": repos,
                    "count": len(repos)
                }
            else:
                result = {"error": "No GitHub tool available"}
        elif action == "custom_action":
            # Implement custom logic here
            result = {"message": f"Processed {parameters.get('item')}"}
        else:
            result = {"error": f"Unsupported action: {action}"}
        ```
        
        Parameters:
        ----------
        db : Session
            Database session
        agent_id : int
            ID of the agent to execute
        action_data : Dict[str, Any]
            Dictionary containing the action and parameters
            
        Returns:
        -------
        Dict[str, Any]
            Execution result
        """
        db_agent = self.get_agent(db, agent_id)
        if not db_agent:
            raise ValueError(f"Agent {agent_id} not found")
            
        try:
            action = action_data.get("action", "")
            parameters = action_data.get("parameters", {})
            
            logger.info(f"Executing agent {db_agent.name} with action '{action}' and parameters {parameters}")
            
            # Import tool service to use for tool execution
            from ..services.tool_service import ToolService
            tool_service = ToolService()
            
            # Create tool execution helper function
            def execute_tool(tool_id, tool_action, tool_params):
                tool = next((t for t in db_agent.tools if t.id == tool_id), None)
                if not tool:
                    raise ValueError(f"Tool {tool_id} not found or not associated with this agent")
                
                if tool.type == "github":
                    return tool_service.execute_github_action(db, tool_id, tool_action, tool_params)
                elif tool.type == "slack":
                    return tool_service.execute_slack_action(db, tool_id, tool_action, tool_params)
                elif tool.type == "jira":
                    return tool_service.execute_jira_action(db, tool_id, tool_action, tool_params)
                else:
                    raise ValueError(f"Unsupported tool type: {tool.type}")
            
            # Prepare the execution context
            exec_locals = {
                "agent_id": agent_id,
                "agent_name": db_agent.name,
                "action": action,
                "parameters": parameters,
                "tools": db_agent.tools,
                "config": db_agent.config or {},
                "execute_tool": execute_tool,
                "result": None,
                "db": db  # Provide db access for database operations
            }
            
            # Execute the agent's code
            try:
                # Add any imported modules that might be commonly needed
                exec_globals = {
                    "json": __import__("json"),
                    "requests": __import__("requests"),
                    "datetime": __import__("datetime"),
                    "os": __import__("os"),
                    "re": __import__("re"),
                    "logging": __import__("logging")
                }
                
                # Create a safe execution environment
                exec(db_agent.code, exec_globals, exec_locals)
                
                # Get the execution result
                result = exec_locals.get("result")
                
                # If result is not set in the code, create a default response
                if result is None:
                    result = {
                        "message": f"Agent '{db_agent.name}' executed but didn't produce a result"
                    }
                
                # Prepare the final response
                response = {
                    "agent_id": agent_id,
                    "agent_name": db_agent.name,
                    "action": action,
                    "status": "success",
                    "result": result
                }
                
                return response
            except Exception as code_error:
                logger.error(f"Error in agent code execution: {str(code_error)}")
                return {
                    "agent_id": agent_id,
                    "agent_name": db_agent.name,
                    "action": action,
                    "status": "error",
                    "error": str(code_error),
                    "result": f"Failed to execute agent code: {str(code_error)}"
                }
                
        except Exception as e:
            logger.error(f"Error executing agent: {str(e)}")
            raise 