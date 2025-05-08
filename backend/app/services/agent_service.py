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
        """Execute an agent with the given action data"""
        db_agent = self.get_agent(db, agent_id)
        if not db_agent:
            raise ValueError(f"Agent {agent_id} not found")
            
        # In a real implementation, this would execute the agent's code
        # For now, we'll just return a mock response
        try:
            action = action_data.get("action", "")
            parameters = action_data.get("parameters", {})
            
            logger.info(f"Executing agent {db_agent.name} with action '{action}' and parameters {parameters}")
            
            # Mock execution result
            result = {
                "agent_id": agent_id,
                "agent_name": db_agent.name,
                "action": action,
                "status": "success",
                "result": f"Executed {action} successfully"
            }
            
            return result
        except Exception as e:
            logger.error(f"Error executing agent: {str(e)}")
            raise 