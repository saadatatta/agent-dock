from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Tuple
from ..models.settings import Settings
from ..schemas.settings import SettingsCreate, SettingsUpdate, LLMModelConfig
import os
import json
import logging

logger = logging.getLogger(__name__)

class SettingsService:
    def create_setting(self, db: Session, setting: SettingsCreate) -> Settings:
        """Create a new setting"""
        db_setting = Settings(
            key=setting.key,
            value=setting.value,
            description=setting.description,
            is_secret=setting.is_secret
        )
        db.add(db_setting)
        db.commit()
        db.refresh(db_setting)
        return db_setting

    def get_settings(self, db: Session, skip: int = 0, limit: int = 100) -> List[Settings]:
        """Get all settings with pagination"""
        return db.query(Settings).offset(skip).limit(limit).all()

    def get_setting_by_key(self, db: Session, key: str) -> Optional[Settings]:
        """Get a setting by key"""
        return db.query(Settings).filter(Settings.key == key).first()

    def update_setting(self, db: Session, key: str, setting: SettingsUpdate) -> Optional[Settings]:
        """Update a setting by key"""
        db_setting = self.get_setting_by_key(db, key)
        if not db_setting:
            return None

        # Handle Pydantic models
        update_data = setting.model_dump(exclude_unset=True)
        if "value" in update_data and hasattr(update_data["value"], "model_dump"):
            update_data["value"] = update_data["value"].model_dump()

        for field, value in update_data.items():
            setattr(db_setting, field, value)

        db.commit()
        db.refresh(db_setting)
        return db_setting

    def delete_setting(self, db: Session, key: str) -> Optional[Settings]:
        """Delete a setting by key"""
        db_setting = self.get_setting_by_key(db, key)
        if not db_setting:
            return None

        db.delete(db_setting)
        db.commit()
        return db_setting

    def get_or_create_setting(self, db: Session, key: str, default_value: Any = None, 
                              description: str = None, is_secret: bool = False) -> Settings:
        """Get a setting by key or create it with default values if it doesn't exist"""
        setting = self.get_setting_by_key(db, key)
        if not setting:
            # Convert Pydantic models to dictionaries if needed
            if hasattr(default_value, "model_dump"):
                default_value = default_value.model_dump()
            elif isinstance(default_value, dict):
                for k, v in default_value.items():
                    if hasattr(v, "model_dump"):
                        default_value[k] = v.model_dump()
                    
            setting = self.create_setting(
                db, 
                SettingsCreate(
                    key=key, 
                    value=default_value,
                    description=description,
                    is_secret=is_secret
                )
            )
        return setting

    # LLM Model specific methods
    def get_available_llm_models(self, db: Session) -> Dict[str, dict]:
        """Get all available LLM models"""
        # Define default models
        default_models = {
            "groq": LLMModelConfig(
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                api_key_env_var="GROQ_API_KEY",
                parameters={
                    "temperature": 0.1,
                    "max_tokens": 1000
                },
                is_active=True
            ),
            "openai": LLMModelConfig(
                provider="openai",
                model_name="gpt-4o",
                api_key_env_var="OPENAI_API_KEY",
                parameters={
                    "temperature": 0.1,
                    "max_tokens": 1000
                },
                is_active=False
            ),
            "anthropic": LLMModelConfig(
                provider="anthropic",
                model_name="claude-3-haiku-20240307",
                api_key_env_var="ANTHROPIC_API_KEY",
                parameters={
                    "temperature": 0.1,
                    "max_tokens": 1000
                },
                is_active=False
            )
        }

        # Convert Pydantic models to dictionaries for JSON serialization
        default_models_dict = {
            key: model.model_dump() for key, model in default_models.items()
        }

        # Get models from database or create default ones
        models_setting = self.get_or_create_setting(
            db, 
            "llm_models", 
            default_value=default_models_dict,  # Use dictionary instead of Pydantic models
            description="Available LLM models configuration"
        )
        
        # Update with environment variables and check API key availability
        models = models_setting.value
        for model_key, model in models.items():
            if model.get("api_key_env_var"):
                env_var = model.get("api_key_env_var")
                # Get API key from environment variable
                api_key = os.getenv(env_var, "")
                
                # Debug log to see what's happening
                logger.info(f"Checking API key for {model_key} from env var {env_var}: {'Available' if api_key else 'Not available'}")
                
                # Consider placeholder/default values as not available
                if api_key and any(placeholder in api_key for placeholder in ["your_", "placeholder", "default"]):
                    logger.warning(f"API key for {model_key} appears to be a placeholder value: {api_key[:5]}...")
                    api_key = ""
                
                # We don't store the actual API key in the database
                models[model_key]["api_key_available"] = bool(api_key)
                
        return models

    def get_active_llm_model(self, db: Session) -> Tuple[str, dict]:
        """Get the currently active LLM model"""
        models = self.get_available_llm_models(db)
        for model_key, model in models.items():
            if model.get("is_active"):
                return model_key, model
        
        # Default to groq if no active model found
        return "groq", models.get("groq")

    def set_active_llm_model(self, db: Session, model_key: str) -> bool:
        """Set the active LLM model"""
        models_setting = self.get_setting_by_key(db, "llm_models")
        if not models_setting:
            return False
            
        models = models_setting.value
        if model_key not in models:
            return False
            
        # Set the new active model and deactivate others
        for key in models:
            models[key]["is_active"] = (key == model_key)
            
        # Update the setting
        models_setting.value = models
        db.commit()
        
        return True 