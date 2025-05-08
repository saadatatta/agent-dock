from sqlalchemy import Column, Integer, String, JSON, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin
from .agent import agent_tools

class Tool(Base, TimestampMixin):
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    type = Column(String, nullable=False)  # github, slack, jira, etc.
    config = Column(JSON)  # Tool configuration
    is_active = Column(Boolean, default=True)
    agents = relationship("Agent", secondary=agent_tools, back_populates="tools")

class ToolLog(Base, TimestampMixin):
    __tablename__ = "tool_logs"

    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
    action = Column(String, nullable=False)
    status = Column(String, nullable=False)  # success, error
    details = Column(JSON)  # Request/response details
    error_message = Column(String)  # Error message if any
    tool = relationship("Tool") 