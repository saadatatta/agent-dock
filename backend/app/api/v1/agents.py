from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.schemas.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse,
    Agent,
    AgentWithTools
)
from app.models.agent import Agent as AgentModel
from app.services.agent_service import AgentService

router = APIRouter()
agent_service = AgentService()

@router.post("/", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(agent: AgentCreate, db: Session = Depends(get_db)):
    """Create a new agent"""
    try:
        created_agent = agent_service.create_agent(db, agent)
        return AgentResponse(
            status="success",
            data=created_agent,
            message="Agent created successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=AgentListResponse)
async def list_agents(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """List all agents"""
    agents = agent_service.get_agents(db, skip=skip, limit=limit)
    total = agent_service.count_agents(db)
    return AgentListResponse(
        status="success",
        data=agents,
        total=total,
        message="Agents retrieved successfully"
    )

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int, db: Session = Depends(get_db)):
    """Get a specific agent by ID"""
    agent = agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return AgentResponse(
        status="success",
        data=agent,
        message="Agent retrieved successfully"
    )

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    agent: AgentUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing agent"""
    updated_agent = agent_service.update_agent(db, agent_id, agent)
    if not updated_agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return AgentResponse(
        status="success",
        data=updated_agent,
        message="Agent updated successfully"
    )

@router.delete("/{agent_id}", response_model=AgentResponse)
async def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    """Delete an agent"""
    deleted_agent = agent_service.delete_agent(db, agent_id)
    if not deleted_agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return AgentResponse(
        status="success",
        data=deleted_agent,
        message="Agent deleted successfully"
    )

@router.post("/{agent_id}/tools/{tool_id}", response_model=AgentResponse)
async def add_tool_to_agent(
    agent_id: int,
    tool_id: int,
    db: Session = Depends(get_db)
):
    """Add a tool to an agent"""
    agent = agent_service.add_tool_to_agent(db, agent_id, tool_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent or tool not found"
        )
    return AgentResponse(
        status="success",
        data=agent,
        message="Tool added to agent successfully"
    )

@router.delete("/{agent_id}/tools/{tool_id}", response_model=AgentResponse)
async def remove_tool_from_agent(
    agent_id: int,
    tool_id: int,
    db: Session = Depends(get_db)
):
    """Remove a tool from an agent"""
    agent = agent_service.remove_tool_from_agent(db, agent_id, tool_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent or tool not found"
        )
    return AgentResponse(
        status="success",
        data=agent,
        message="Tool removed from agent successfully"
    )

@router.post("/{agent_id}/execute", status_code=status.HTTP_200_OK)
async def execute_agent(
    agent_id: int,
    action_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Execute an agent with the specified action and parameters"""
    try:
        agent = agent_service.get_agent(db, agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        if not agent.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent is not active"
            )
        
        # Execute the agent
        result = agent_service.execute_agent(db, agent_id, action_data)
        
        return {
            "status": "success",
            "data": result,
            "message": f"Agent executed successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 