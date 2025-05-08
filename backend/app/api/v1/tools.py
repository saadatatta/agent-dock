from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.schemas.tool import (
    ToolCreate,
    ToolUpdate,
    ToolResponse,
    ToolListResponse,
    ToolLogResponse,
    ToolLogListResponse,
    Tool
)
from app.models.tool import Tool as ToolModel
from app.services.tool_service import ToolService

router = APIRouter()
tool_service = ToolService()

@router.post("/", response_model=ToolResponse, status_code=status.HTTP_201_CREATED)
async def create_tool(tool: ToolCreate, db: Session = Depends(get_db)):
    """Create a new tool"""
    try:
        created_tool = tool_service.create_tool(db, tool)
        return ToolResponse(
            status="success",
            data=created_tool,
            message="Tool created successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=ToolListResponse)
async def list_tools(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """List all tools"""
    tools = tool_service.get_tools(db, skip=skip, limit=limit)
    total = tool_service.count_tools(db)
    return ToolListResponse(
        status="success",
        data=tools,
        total=total,
        message="Tools retrieved successfully"
    )

@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(tool_id: int, db: Session = Depends(get_db)):
    """Get a specific tool by ID"""
    tool = tool_service.get_tool(db, tool_id)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found"
        )
    return ToolResponse(
        status="success",
        data=tool,
        message="Tool retrieved successfully"
    )

@router.put("/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: int,
    tool: ToolUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing tool"""
    updated_tool = tool_service.update_tool(db, tool_id, tool)
    if not updated_tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found"
        )
    return ToolResponse(
        status="success",
        data=updated_tool,
        message="Tool updated successfully"
    )

@router.delete("/{tool_id}", response_model=ToolResponse)
async def delete_tool(tool_id: int, db: Session = Depends(get_db)):
    """Delete a tool"""
    deleted_tool = tool_service.delete_tool(db, tool_id)
    if not deleted_tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found"
        )
    return ToolResponse(
        status="success",
        data=deleted_tool,
        message="Tool deleted successfully"
    )

@router.get("/{tool_id}/logs", response_model=ToolLogListResponse)
async def get_tool_logs(
    tool_id: int,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get logs for a specific tool"""
    logs = tool_service.get_tool_logs(db, tool_id, skip=skip, limit=limit)
    return ToolLogListResponse(
        status="success",
        data=logs,
        total=len(logs),
        message="Tool logs retrieved successfully"
    )

@router.post("/{tool_id}/github/{action}", response_model=ToolResponse)
async def execute_github_action(
    tool_id: int,
    action: str,
    params: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Execute a GitHub action"""
    try:
        result = tool_service.execute_github_action(db, tool_id, action, params)
        return ToolResponse(
            status="success",
            data=result,
            message=f"GitHub action {action} executed successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{tool_id}/slack/{action}", response_model=ToolResponse)
async def execute_slack_action(
    tool_id: int,
    action: str,
    params: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Execute a Slack action"""
    try:
        result = tool_service.execute_slack_action(db, tool_id, action, params)
        return ToolResponse(
            status="success",
            data=result,
            message=f"Slack action {action} executed successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{tool_id}/jira/{action}", response_model=ToolResponse)
async def execute_jira_action(
    tool_id: int,
    action: str,
    params: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Execute a Jira action"""
    try:
        result = tool_service.execute_jira_action(db, tool_id, action, params)
        return ToolResponse(
            status="success",
            data=result,
            message=f"Jira action {action} executed successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 