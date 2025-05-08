from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from app.core.database import get_db
from app.services.nl_service import NaturalLanguageService
from pydantic import BaseModel

router = APIRouter()
nl_service = NaturalLanguageService()

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    status: str
    result: Dict[str, Any]
    message: Optional[str] = None

class SuggestionResponse(BaseModel):
    status: str
    suggestions: List[Dict[str, Any]]
    message: Optional[str] = None

@router.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest, db: Session = Depends(get_db)):
    """Process a natural language query"""
    try:
        result = nl_service.process_query(db, request.query)
        return QueryResponse(
            status=result["status"],
            result=result.get("result", {}),
            message=result.get("message")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/suggest", response_model=SuggestionResponse)
async def get_agent_suggestions(request: QueryRequest, db: Session = Depends(get_db)):
    """Get agent suggestions for a query"""
    try:
        suggestions = nl_service.get_agent_suggestions(db, request.query)
        return SuggestionResponse(
            status="success",
            suggestions=suggestions,
            message="Agent suggestions retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 