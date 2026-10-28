from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field

class SessionBase(BaseModel):
    course_id: str
    title: str = Field(..., min_length=2, max_length=200)
    teacher_name: Optional[str] = "Faculty Instructor"
    subject: Optional[str] = None
    input_mode: str = "simulated"  # live_camera, uploaded_video, simulated
    configuration_json: Optional[Dict[str, Any]] = None

class SessionCreate(SessionBase):
    pass

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    teacher_name: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[str] = None
    configuration_json: Optional[Dict[str, Any]] = None

class SessionOut(BaseModel):
    id: str
    course_id: str
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    title: str
    teacher_name: str
    subject: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    status: str
    input_mode: str
    configuration_json: Optional[Dict[str, Any]]
    created_at: datetime
    present_count: Optional[int] = 0
    total_enrolled: Optional[int] = 0
    average_engagement: Optional[float] = 0.0

    class Config:
        from_attributes = True

class SessionStateAction(BaseModel):
    action: str  # start, pause, resume, stop, finalize
    timestamp: Optional[datetime] = None
