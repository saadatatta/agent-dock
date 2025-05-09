from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime

class SettingsBase(BaseModel):
    key: str
    value: Optional[Any] = None
    description: Optional[str] = None
    is_secret: bool = False

class SettingsCreate(SettingsBase):
    pass

class SettingsUpdate(BaseModel):
    value: Optional[Any] = None
    description: Optional[str] = None
    is_secret: Optional[bool] = None

class Settings(SettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SettingsResponse(BaseModel):
    status: str
    data: Settings
    message: Optional[str] = None

class SettingsListResponse(BaseModel):
    status: str
    data: List[Settings]
    total: int
    message: Optional[str] = None

# Models specific schema
class LLMModelConfig(BaseModel):
    provider: str  # "openai", "groq", "anthropic", etc.
    model_name: str
    api_key: Optional[str] = None
    api_key_env_var: Optional[str] = None  # Environment variable name where API key is stored
    parameters: Optional[Dict[str, Any]] = None  # temperature, max_tokens, etc.
    is_active: bool = False
    api_key_available: Optional[bool] = None  # Whether the API key is available and valid
    key: Optional[str] = None  # The key/identifier for the model

class LLMModelsResponse(BaseModel):
    status: str
    data: List[LLMModelConfig]
    active_model: str
    message: Optional[str] = None 