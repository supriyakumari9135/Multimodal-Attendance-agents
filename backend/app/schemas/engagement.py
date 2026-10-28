from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel

class EngagementMetricOut(BaseModel):
    id: str
    session_id: str
    interval_start: float
    interval_end: float
    metric_name: str
    metric_value: float
    confidence: float
    source_modality: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SessionEngagementSummary(BaseModel):
    session_id: str
    composite_engagement_score: float
    confidence_level: float
    available_modalities: List[str]
    missing_modalities: List[str]
    weights_used: Dict[str, float]
    timeline_intervals: List[Dict[str, Any]]
    explanation_notes: List[str]
    data_quality_status: str
