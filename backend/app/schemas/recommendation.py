from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class RecommendationOut(BaseModel):
    id: str
    session_id: str
    title: str
    explanation: str
    evidence_json: Optional[Dict[str, Any]] = None
    suggested_action: str
    confidence: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class RecommendationUpdate(BaseModel):
    status: str  # accepted, dismissed, completed
