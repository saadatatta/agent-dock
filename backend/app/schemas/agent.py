from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field

# Define Tool forward reference
class Tool(BaseModel):
    id: int
    name: str
    type: str
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: bool = True

    class Config:
        from_attributes = True

class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    code: str
    config: Optional[Dict[str, Any]] = None
    is_active: bool = True

class AgentCreate(AgentBase):
    pass

class AgentUpdate(AgentBase):
    name: Optional[str] = None
    code: Optional[str] = None

class Agent(AgentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AgentWithTools(Agent):
    tools: List["Tool"] = []

class AgentResponse(BaseModel):
    status: str
    data: AgentWithTools
    message: Optional[str] = None

class AgentListResponse(BaseModel):
    status: str
    data: List[AgentWithTools]
    total: int
    message: Optional[str] = None 