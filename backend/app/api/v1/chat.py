from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from app.core.database import get_db
from app.models.chat import ChatMessage
from pydantic import BaseModel
from datetime import datetime
import uuid

router = APIRouter()

class MessageMetadata(BaseModel):
    agent_id: Optional[int] = None
    agent_name: Optional[str] = None
    model_info: Optional[Dict[str, str]] = None
    additional_data: Optional[Dict[str, Any]] = None

class SaveMessageRequest(BaseModel):
    session_id: Optional[str] = None  # Optional, will be generated if not provided
    content: str
    sender: str  # 'user', 'agent', 'system'
    message_type: Optional[str] = "text"
    metadata: Optional[MessageMetadata] = None

class ChatMessageResponse(BaseModel):
    id: int
    session_id: str
    content: str
    sender: str
    message_type: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

class ChatHistoryResponse(BaseModel):
    status: str
    messages: List[ChatMessageResponse]
    session_id: str
    message: Optional[str] = None

@router.post("/messages", response_model=ChatMessageResponse)
async def save_chat_message(request: SaveMessageRequest, db: Session = Depends(get_db)):
    """Save a chat message to the database"""
    try:
        # Generate a session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Create the message
        chat_message = ChatMessage(
            session_id=session_id,
            content=request.content,
            sender=request.sender,
            message_type=request.message_type,
            message_metadata=request.metadata.dict() if request.metadata else None
        )
        
        db.add(chat_message)
        db.commit()
        db.refresh(chat_message)
        
        return ChatMessageResponse(
            id=chat_message.id,
            session_id=chat_message.session_id,
            content=chat_message.content,
            sender=chat_message.sender,
            message_type=chat_message.message_type,
            metadata=chat_message.message_metadata,
            created_at=chat_message.created_at,
            updated_at=chat_message.updated_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save chat message: {str(e)}"
        )

@router.get("/messages", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: Optional[str] = Query(None),
    limit: int = Query(20, gt=0, le=100),
    db: Session = Depends(get_db)
):
    """Get chat message history for a session or the latest session"""
    try:
        query = db.query(ChatMessage)
        
        if session_id:
            # Filter by specific session ID
            query = query.filter(ChatMessage.session_id == session_id)
        else:
            # Get the latest session ID
            latest_message = db.query(ChatMessage).order_by(ChatMessage.created_at.desc()).first()
            if not latest_message:
                return ChatHistoryResponse(
                    status="success",
                    messages=[],
                    session_id="",
                    message="No chat history found"
                )
            
            session_id = latest_message.session_id
            query = query.filter(ChatMessage.session_id == session_id)
        
        # Order by creation timestamp and limit results
        messages = query.order_by(ChatMessage.created_at).limit(limit).all()
        
        return ChatHistoryResponse(
            status="success",
            messages=[
                ChatMessageResponse(
                    id=message.id,
                    session_id=message.session_id,
                    content=message.content,
                    sender=message.sender,
                    message_type=message.message_type,
                    metadata=message.message_metadata,
                    created_at=message.created_at,
                    updated_at=message.updated_at
                ) for message in messages
            ],
            session_id=session_id,
            message="Chat history retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chat history: {str(e)}"
        )

@router.delete("/messages/{session_id}", response_model=Dict[str, Any])
async def delete_chat_session(session_id: str, db: Session = Depends(get_db)):
    """Delete all messages for a specific chat session"""
    try:
        # Delete all messages for the session
        result = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
        db.commit()
        
        return {
            "status": "success",
            "message": f"Deleted {result} messages from session {session_id}",
            "deleted_count": result
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chat session: {str(e)}"
        )

@router.get("/sessions", response_model=Dict[str, Any])
async def list_chat_sessions(
    limit: int = Query(10, gt=0, le=50),
    db: Session = Depends(get_db)
):
    """List all available chat sessions with their latest message"""
    try:
        # Use a more efficient query to get unique session IDs with their latest message
        # This is a more complex SQL query that needs to be correctly formatted for SQLAlchemy
        from sqlalchemy import func, desc
        
        # Get the max id for each session (the latest message)
        subquery = db.query(
            ChatMessage.session_id,
            func.max(ChatMessage.created_at).label("latest_timestamp")
        ).group_by(ChatMessage.session_id).subquery()
        
        # Join with the original table to get the full message data
        latest_messages = db.query(ChatMessage).join(
            subquery,
            (ChatMessage.session_id == subquery.c.session_id) & 
            (ChatMessage.created_at == subquery.c.latest_timestamp)
        ).order_by(desc(ChatMessage.created_at)).limit(limit).all()
        
        return {
            "status": "success",
            "sessions": [
                {
                    "session_id": message.session_id,
                    "last_message": {
                        "content": message.content,
                        "sender": message.sender,
                        "created_at": message.created_at
                    },
                    "timestamp": message.created_at
                } for message in latest_messages
            ],
            "count": len(latest_messages),
            "message": "Chat sessions retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list chat sessions: {str(e)}"
        ) 