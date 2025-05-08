from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ToolBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str
    config: Optional[Dict[str, Any]] = None
    is_active: bool = True

class ToolCreate(ToolBase):
    pass

class ToolUpdate(ToolBase):
    name: Optional[str] = None
    type: Optional[str] = None

class Tool(ToolBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ToolWithAgents(Tool):
    agents: List["Agent"] = []

class ToolResponse(BaseModel):
    status: str
    data: Tool
    message: Optional[str] = None

class ToolListResponse(BaseModel):
    status: str
    data: List[Tool]
    total: int
    message: Optional[str] = None

class ToolLogBase(BaseModel):
    tool_id: int
    action: str
    status: str
    details: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class ToolLogCreate(ToolLogBase):
    pass

class ToolLog(ToolLogBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ToolLogResponse(BaseModel):
    status: str
    data: ToolLog
    message: Optional[str] = None

class ToolLogListResponse(BaseModel):
    status: str
    data: List[ToolLog]
    total: int
    message: Optional[str] = None 