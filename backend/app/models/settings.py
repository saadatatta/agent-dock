from sqlalchemy import Column, Integer, String, JSON, Boolean
from .base import Base, TimestampMixin

class Settings(Base, TimestampMixin):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(JSON, nullable=True)
    description = Column(String, nullable=True)
    is_secret = Column(Boolean, default=False)  # For sensitive values like API keys 