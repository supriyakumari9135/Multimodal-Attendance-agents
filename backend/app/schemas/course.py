from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class CourseBase(BaseModel):
    course_code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    teacher_id: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    course_code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_archived: Optional[bool] = None

class CourseOut(BaseModel):
    id: str
    course_code: str
    name: str
    description: Optional[str]
    teacher_id: str
    is_archived: bool
    created_at: datetime
    enrolled_count: Optional[int] = 0

    class Config:
        from_attributes = True
