from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class StudentBase(BaseModel):
    student_code: str = Field(..., min_length=2, max_length=50)
    display_name: str = Field(..., min_length=2, max_length=150)

class StudentCreate(StudentBase):
    course_ids: Optional[List[str]] = []

class StudentUpdate(BaseModel):
    student_code: Optional[str] = None
    display_name: Optional[str] = None
    course_ids: Optional[List[str]] = None

class StudentOut(BaseModel):
    id: str
    student_code: str
    display_name: str
    has_reference_image: bool
    created_at: datetime
    updated_at: datetime
    enrolled_courses: Optional[List[str]] = []
    consent_status: Optional[str] = "granted"

    class Config:
        from_attributes = True

class StudentImportRow(BaseModel):
    student_code: str
    display_name: str
    course_code: Optional[str] = None

class StudentImportResult(BaseModel):
    total_processed: int
    imported_count: int
    skipped_count: int
    errors: List[str] = []
