from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class OverviewMetrics(BaseModel):
    total_enrolled_students: int
    present_students_count: int
    attendance_rate_percentage: float
    current_session_duration_minutes: float
    average_engagement_score: float
    participation_activity_level: str  # High, Moderate, Low
    active_session_id: Optional[str] = None
    active_session_title: Optional[str] = None
    recent_sessions: List[Dict[str, Any]] = []
    recent_attendance_events: List[Dict[str, Any]] = []
    teaching_recommendations_count: int = 0
    top_recommendations: List[Dict[str, Any]] = []
    is_demo_data: bool = False

class StudentAttendanceHistory(BaseModel):
    student_id: str
    student_code: str
    display_name: str
    total_sessions: int
    attended_sessions: int
    attendance_rate: float
    sessions: List[Dict[str, Any]]
