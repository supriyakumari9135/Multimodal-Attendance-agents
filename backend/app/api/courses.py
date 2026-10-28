from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.course import Course
from app.models.user import User
from app.models.enrollment import Enrollment
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("", response_model=List[CourseOut])
def list_courses(
    include_archived: bool = Query(False),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Course)
    if not include_archived:
        query = query.filter(Course.is_archived == False)
    if search:
        s = f"%{search}%"
        query = query.filter((Course.name.ilike(s)) | (Course.course_code.ilike(s)))
    
    courses = query.order_by(Course.created_at.desc()).all()
    results = []
    for c in courses:
        enr_count = db.query(Enrollment).filter(Enrollment.course_id == c.id, Enrollment.status == "active").count()
        out = CourseOut(
            id=c.id,
            course_code=c.course_code,
            name=c.name,
            description=c.description,
            teacher_id=c.teacher_id,
            is_archived=c.is_archived,
            created_at=c.created_at,
            enrolled_count=enr_count
        )
        results.append(out)
    return results

@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    # Check duplicate course_code
    existing = db.query(Course).filter(Course.course_code == payload.course_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Course with code '{payload.course_code}' already exists.")
    
    # Assign default teacher if not provided
    teacher_id = payload.teacher_id
    if not teacher_id:
        teacher = db.query(User).filter(User.role == "teacher").first()
        if not teacher:
            teacher = User(display_name="Dr. Eleanor Vance", email="teacher@institution.edu", role="teacher")
            db.add(teacher)
            db.flush()
        teacher_id = teacher.id

    course = Course(
        course_code=payload.course_code.strip().upper(),
        name=payload.name.strip(),
        description=payload.description,
        teacher_id=teacher_id
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    log_audit_event(db, "CREATE_COURSE", "Course", course.id, details={"course_code": course.course_code})

    return CourseOut(
        id=course.id,
        course_code=course.course_code,
        name=course.name,
        description=course.description,
        teacher_id=course.teacher_id,
        is_archived=course.is_archived,
        created_at=course.created_at,
        enrolled_count=0
    )

@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    enr_count = db.query(Enrollment).filter(Enrollment.course_id == course.id, Enrollment.status == "active").count()
    return CourseOut(
        id=course.id,
        course_code=course.course_code,
        name=course.name,
        description=course.description,
        teacher_id=course.teacher_id,
        is_archived=course.is_archived,
        created_at=course.created_at,
        enrolled_count=enr_count
    )

@router.patch("/{course_id}", response_model=CourseOut)
def update_course(course_id: str, payload: CourseUpdate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    if payload.course_code is not None:
        c_code = payload.course_code.strip().upper()
        existing = db.query(Course).filter(Course.course_code == c_code, Course.id != course.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another course already has this code.")
        course.course_code = c_code
    if payload.name is not None:
        course.name = payload.name.strip()
    if payload.description is not None:
        course.description = payload.description
    if payload.is_archived is not None:
        course.is_archived = payload.is_archived

    db.commit()
    db.refresh(course)
    log_audit_event(db, "UPDATE_COURSE", "Course", course.id, details={"name": course.name})

    enr_count = db.query(Enrollment).filter(Enrollment.course_id == course.id, Enrollment.status == "active").count()
    return CourseOut(
        id=course.id,
        course_code=course.course_code,
        name=course.name,
        description=course.description,
        teacher_id=course.teacher_id,
        is_archived=course.is_archived,
        created_at=course.created_at,
        enrolled_count=enr_count
    )

@router.delete("/{course_id}")
def delete_course(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    
    db.delete(course)
    db.commit()
    log_audit_event(db, "DELETE_COURSE", "Course", course_id)
    return {"success": True, "message": "Course deleted successfully."}
