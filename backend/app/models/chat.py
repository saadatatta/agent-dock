from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class ChatMessage(Base, TimestampMixin):
    """Model for storing chat messages and conversation history"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=False)  # To group messages by conversation
    content = Column(Text, nullable=False)
    sender = Column(String, nullable=False)  # 'user', 'agent', 'system'
    message_type = Column(String, default="text")  # text, image, etc.
    message_metadata = Column(JSON, nullable=True)  # For storing additional data like agent_id, tool_id, etc.
    
    # Create a composite index for faster queries
    __table_args__ = (
        Index('idx_session_created', "session_id", "created_at"),
    ) 