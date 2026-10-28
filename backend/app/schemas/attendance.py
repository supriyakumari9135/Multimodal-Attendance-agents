from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class AttendanceRecordBase(BaseModel):
    session_id: str
    student_id: Optional[str] = None
    anonymous_track_id: Optional[str] = None
    status: str = "unverified"
    source: str = "simulated"
    confidence: float = 1.0
    notes: Optional[str] = None

class AttendanceRecordCreate(AttendanceRecordBase):
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    observed_duration: float = 0.0

class AttendanceRecordCorrection(BaseModel):
    status: str
    student_id: Optional[str] = None
    notes: Optional[str] = None

class AttendanceRecordOut(BaseModel):
    id: str
    session_id: str
    student_id: Optional[str]
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    anonymous_track_id: Optional[str]
    first_seen: Optional[datetime]
    last_seen: Optional[datetime]
    observed_duration: float
    status: str
    source: str
    manually_corrected: bool
    confidence: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
