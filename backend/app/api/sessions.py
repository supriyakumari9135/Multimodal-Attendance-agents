from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.session import Session as ClassroomSession
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.attendance import AttendanceRecord
from app.models.engagement import EngagementMetric
from app.models.student import Student
from app.schemas.session import SessionCreate, SessionUpdate, SessionOut, SessionStateAction
from app.services.audit_service import log_audit_event
from app.services.simulation_engine import generate_simulated_session_data

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.get("", response_model=List[SessionOut])
def list_sessions(
    course_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(ClassroomSession)
    if course_id:
        query = query.filter(ClassroomSession.course_id == course_id)
    if status_filter:
        query = query.filter(ClassroomSession.status == status_filter)

    sessions = query.order_by(ClassroomSession.created_at.desc()).all()
    results = []
    for s in sessions:
        # Enrolled count in course
        tot_enrolled = db.query(Enrollment).filter(Enrollment.course_id == s.course_id, Enrollment.status == "active").count()
        # Present count in session
        present_cnt = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == s.id,
            AttendanceRecord.status.in_(["present", "manually_confirmed"])
        ).count()
        # Average engagement
        comp_metrics = db.query(EngagementMetric.metric_value).filter(
            EngagementMetric.session_id == s.id,
            EngagementMetric.metric_name == "composite_engagement"
        ).all()
        avg_eng = (sum(m[0] for m in comp_metrics) / len(comp_metrics)) if comp_metrics else 0.0

        results.append(SessionOut(
            id=s.id,
            course_id=s.course_id,
            course_name=s.course.name if s.course else None,
            course_code=s.course.course_code if s.course else None,
            title=s.title,
            teacher_name=s.teacher_name,
            subject=s.subject,
            start_time=s.start_time,
            end_time=s.end_time,
            status=s.status,
            input_mode=s.input_mode,
            configuration_json=s.configuration_json,
            created_at=s.created_at,
            present_count=present_cnt,
            total_enrolled=tot_enrolled,
            average_engagement=round(avg_eng, 1)
        ))
    return results

@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Selected course does not exist.")

    session_obj = ClassroomSession(
        course_id=course.id,
        title=payload.title.strip(),
        teacher_name=payload.teacher_name or course.teacher.display_name if course.teacher else "Faculty Instructor",
        subject=payload.subject,
        input_mode=payload.input_mode,
        status="ready",
        configuration_json=payload.configuration_json or {
            "sample_interval": 1.0,
            "min_duration_seconds": 15.0,
            "weights": {"participation": 0.35, "movement": 0.25, "head_orientation": 0.20, "audio": 0.20},
            "modalities_enabled": ["video", "audio"]
        }
    )
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)

    log_audit_event(db, "CREATE_SESSION", "Session", session_obj.id, details={"title": session_obj.title, "mode": session_obj.input_mode})

    # If created in simulated mode and started, populate simulated records
    if session_obj.input_mode == "simulated":
        enrolled_students = db.query(Student).join(Enrollment).filter(Enrollment.course_id == course.id).all()
        if not enrolled_students:
            enrolled_students = db.query(Student).limit(14).all()
        if enrolled_students:
            att, met, rec = generate_simulated_session_data(
                session_id=session_obj.id,
                students=enrolled_students,
                duration_minutes=30,
                seed=42 + len(session_obj.title)
            )
            db.add_all(att)
            db.add_all(met)
            db.add_all(rec)
            db.commit()

    tot_enrolled = db.query(Enrollment).filter(Enrollment.course_id == course.id, Enrollment.status == "active").count()
    return SessionOut(
        id=session_obj.id,
        course_id=session_obj.course_id,
        course_name=course.name,
        course_code=course.course_code,
        title=session_obj.title,
        teacher_name=session_obj.teacher_name,
        subject=session_obj.subject,
        start_time=session_obj.start_time,
        end_time=session_obj.end_time,
        status=session_obj.status,
        input_mode=session_obj.input_mode,
        configuration_json=session_obj.configuration_json,
        created_at=session_obj.created_at,
        present_count=0,
        total_enrolled=tot_enrolled,
        average_engagement=0.0
    )

@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    tot_enrolled = db.query(Enrollment).filter(Enrollment.course_id == s.course_id, Enrollment.status == "active").count()
    present_cnt = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == s.id,
        AttendanceRecord.status.in_(["present", "manually_confirmed"])
    ).count()
    comp_metrics = db.query(EngagementMetric.metric_value).filter(
        EngagementMetric.session_id == s.id,
        EngagementMetric.metric_name == "composite_engagement"
    ).all()
    avg_eng = (sum(m[0] for m in comp_metrics) / len(comp_metrics)) if comp_metrics else 0.0

    return SessionOut(
        id=s.id,
        course_id=s.course_id,
        course_name=s.course.name if s.course else None,
        course_code=s.course.course_code if s.course else None,
        title=s.title,
        teacher_name=s.teacher_name,
        subject=s.subject,
        start_time=s.start_time,
        end_time=s.end_time,
        status=s.status,
        input_mode=s.input_mode,
        configuration_json=s.configuration_json,
        created_at=s.created_at,
        present_count=present_cnt,
        total_enrolled=tot_enrolled,
        average_engagement=round(avg_eng, 1)
    )

@router.post("/{session_id}/start", response_model=SessionOut)
def start_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    if s.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot restart a completed session.")

    s.status = "running"
    if not s.start_time:
        s.start_time = datetime.now(timezone.utc)
    db.commit()
    log_audit_event(db, "START_SESSION", "Session", s.id)
    return get_session(session_id, db)

@router.post("/{session_id}/pause", response_model=SessionOut)
def pause_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    if s.status != "running":
        raise HTTPException(status_code=400, detail=f"Cannot pause session in '{s.status}' state.")

    s.status = "paused"
    db.commit()
    log_audit_event(db, "PAUSE_SESSION", "Session", s.id)
    return get_session(session_id, db)

@router.post("/{session_id}/resume", response_model=SessionOut)
def resume_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    if s.status != "paused":
        raise HTTPException(status_code=400, detail=f"Cannot resume session from '{s.status}' state.")

    s.status = "running"
    db.commit()
    log_audit_event(db, "RESUME_SESSION", "Session", s.id)
    return get_session(session_id, db)

@router.post("/{session_id}/stop", response_model=SessionOut)
def stop_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")

    s.status = "completed"
    s.end_time = datetime.now(timezone.utc)
    db.commit()
    log_audit_event(db, "STOP_SESSION", "Session", s.id)
    return get_session(session_id, db)

@router.post("/{session_id}/finalize", response_model=SessionOut)
def finalize_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")

    s.status = "completed"
    if not s.end_time:
        s.end_time = datetime.now(timezone.utc)
    db.commit()
    log_audit_event(db, "FINALIZE_SESSION", "Session", s.id)
    return get_session(session_id, db)
