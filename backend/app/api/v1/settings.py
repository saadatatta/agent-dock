from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.schemas.settings import (
    SettingsCreate, 
    SettingsUpdate, 
    SettingsResponse, 
    SettingsListResponse,
    LLMModelsResponse
)
from app.services.settings_service import SettingsService
import os

router = APIRouter()
settings_service = SettingsService()

@router.get("/", response_model=SettingsListResponse)
async def get_settings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all settings"""
    settings = settings_service.get_settings(db, skip=skip, limit=limit)
    # Filter out sensitive settings
    filtered_settings = [s for s in settings if not s.is_secret]
    return SettingsListResponse(
        status="success",
        data=filtered_settings,
        total=len(filtered_settings),
        message="Settings retrieved successfully"
    )

@router.get("/{key}", response_model=SettingsResponse)
async def get_setting(
    key: str,
    db: Session = Depends(get_db)
):
    """Get a setting by key"""
    setting = settings_service.get_setting_by_key(db, key)
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting with key '{key}' not found"
        )
    
    # Don't return sensitive settings
    if setting.is_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Setting with key '{key}' is marked as secret"
        )
        
    return SettingsResponse(
        status="success",
        data=setting,
        message=f"Setting '{key}' retrieved successfully"
    )

@router.post("/", response_model=SettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_setting(
    setting: SettingsCreate,
    db: Session = Depends(get_db)
):
    """Create a new setting"""
    try:
        # Check if setting already exists
        existing = settings_service.get_setting_by_key(db, setting.key)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Setting with key '{setting.key}' already exists"
            )
        
        created_setting = settings_service.create_setting(db, setting)
        return SettingsResponse(
            status="success",
            data=created_setting,
            message=f"Setting '{setting.key}' created successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{key}", response_model=SettingsResponse)
async def update_setting(
    key: str,
    setting: SettingsUpdate,
    db: Session = Depends(get_db)
):
    """Update a setting by key"""
    updated_setting = settings_service.update_setting(db, key, setting)
    if not updated_setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting with key '{key}' not found"
        )
    return SettingsResponse(
        status="success",
        data=updated_setting,
        message=f"Setting '{key}' updated successfully"
    )

@router.delete("/{key}", response_model=SettingsResponse)
async def delete_setting(
    key: str,
    db: Session = Depends(get_db)
):
    """Delete a setting by key"""
    deleted_setting = settings_service.delete_setting(db, key)
    if not deleted_setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting with key '{key}' not found"
        )
    return SettingsResponse(
        status="success",
        data=deleted_setting,
        message=f"Setting '{key}' deleted successfully"
    )

# LLM Model specific endpoints
@router.get("/llm/models", response_model=LLMModelsResponse)
async def get_llm_models(
    db: Session = Depends(get_db)
):
    """Get available LLM models"""
    models = settings_service.get_available_llm_models(db)
    active_model_key, _ = settings_service.get_active_llm_model(db)
    
    # Convert to list for response and check API key availability
    models_list = []
    for key, model in models.items():
        model_data = dict(model)
        # Add the key to the model data
        model_data["key"] = key
        model_data["is_active"] = (key == active_model_key)
        
        # Check if API key is available and not a placeholder
        if "api_key_env_var" in model_data:
            env_var = model_data["api_key_env_var"]
            api_key = os.getenv(env_var, "")
            
            # Consider placeholder/default values as not available
            api_key_available = bool(api_key)
            if api_key and any(placeholder in api_key for placeholder in ["your_", "placeholder", "default"]):
                api_key_available = False
                
            # Add availability flag
            model_data["api_key_available"] = api_key_available
        
        models_list.append(model_data)
    
    return LLMModelsResponse(
        status="success",
        data=models_list,
        active_model=active_model_key,
        message="LLM models retrieved successfully"
    )

@router.post("/llm/models/{model_key}/activate", response_model=LLMModelsResponse)
async def set_active_llm_model(
    model_key: str,
    db: Session = Depends(get_db)
):
    """Set the active LLM model"""
    success = settings_service.set_active_llm_model(db, model_key)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to set active model. Model key '{model_key}' not found"
        )
    
    # Get updated models
    models = settings_service.get_available_llm_models(db)
    
    # Convert to list for response and check API key availability
    models_list = []
    for key, model in models.items():
        model_data = dict(model)
        # Add the key to the model data
        model_data["key"] = key
        model_data["is_active"] = (key == model_key)
        
        # Check if API key is available and not a placeholder
        if "api_key_env_var" in model_data:
            env_var = model_data["api_key_env_var"]
            api_key = os.getenv(env_var, "")
            
            # Consider placeholder/default values as not available
            api_key_available = bool(api_key)
            if api_key and any(placeholder in api_key for placeholder in ["your_", "placeholder", "default"]):
                api_key_available = False
                
            # Add availability flag
            model_data["api_key_available"] = api_key_available
        
        models_list.append(model_data)
    
    return LLMModelsResponse(
        status="success",
        data=models_list,
        active_model=model_key,
        message=f"Model '{model_key}' activated successfully"
    ) 