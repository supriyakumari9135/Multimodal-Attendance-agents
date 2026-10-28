from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.student import Student
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.session import Session as ClassroomSession
from app.models.attendance import AttendanceRecord
from app.models.engagement import EngagementMetric
from app.models.recommendation import Recommendation
from app.schemas.analytics import OverviewMetrics, StudentAttendanceHistory
from app.schemas.engagement import SessionEngagementSummary
from app.core.config import settings

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=OverviewMetrics)
def get_analytics_overview(
    course_id: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Total enrolled students
    tot_students_q = db.query(Student)
    if course_id:
        tot_students_q = tot_students_q.join(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.status == "active"
        )
    total_enrolled = tot_students_q.count()

    # Determine active / focus session
    active_session = None
    if session_id:
        active_session = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not active_session:
        active_session = db.query(ClassroomSession).filter(ClassroomSession.status == "running").first()
    if not active_session:
        active_session = db.query(ClassroomSession).order_by(ClassroomSession.created_at.desc()).first()

    present_count = 0
    att_rate = 0.0
    sess_duration_mins = 0.0
    avg_engagement = 0.0
    participation_level = "Moderate"
    act_sess_id = None
    act_sess_title = None

    if active_session:
        act_sess_id = active_session.id
        act_sess_title = active_session.title
        
        # Present count
        present_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == active_session.id,
            AttendanceRecord.status.in_(["present", "manually_confirmed"])
        ).count()

        total_rec = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == active_session.id
        ).count()
        if total_rec > 0:
            att_rate = round((present_count / total_rec) * 100, 1)

        # Duration
        if active_session.start_time:
            end_t = active_session.end_time or active_session.start_time
            dur_secs = (end_t - active_session.start_time).total_seconds()
            sess_duration_mins = round(max(5.0, dur_secs / 60.0), 1)

        # Engagement
        eng_vals = db.query(EngagementMetric.metric_value).filter(
            EngagementMetric.session_id == active_session.id,
            EngagementMetric.metric_name == "composite_engagement"
        ).all()
        if eng_vals:
            avg_engagement = round(sum(v[0] for v in eng_vals) / len(eng_vals), 1)

        if avg_engagement >= 75.0:
            participation_level = "High"
        elif avg_engagement < 50.0:
            participation_level = "Low"

    # Recent sessions
    recent_sess_q = db.query(ClassroomSession).order_by(ClassroomSession.created_at.desc()).limit(5).all()
    recent_sessions_data = []
    for s in recent_sess_q:
        p_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == s.id,
            AttendanceRecord.status.in_(["present", "manually_confirmed"])
        ).count()
        recent_sessions_data.append({
            "id": s.id,
            "title": s.title,
            "course_name": s.course.name if s.course else "General",
            "status": s.status,
            "input_mode": s.input_mode,
            "present_count": p_count,
            "created_at": s.created_at.isoformat()
        })

    # Recent attendance events
    recent_att_q = db.query(AttendanceRecord).order_by(AttendanceRecord.created_at.desc()).limit(6).all()
    recent_att_data = []
    for a in recent_att_q:
        recent_att_data.append({
            "id": a.id,
            "session_id": a.session_id,
            "student_name": a.student.display_name if a.student else (a.anonymous_track_id or "Anonymous Track"),
            "status": a.status,
            "observed_duration": a.observed_duration,
            "source": a.source,
            "time": a.created_at.strftime("%H:%M:%S")
        })

    # Top recommendations
    rec_q = db.query(Recommendation).order_by(Recommendation.created_at.desc()).limit(4).all()
    top_recs = [
        {
            "id": r.id,
            "title": r.title,
            "explanation": r.explanation,
            "suggested_action": r.suggested_action,
            "status": r.status,
            "confidence": r.confidence
        }
        for r in rec_q
    ]

    is_demo = any(s.input_mode == "simulated" for s in recent_sess_q)

    return OverviewMetrics(
        total_enrolled_students=total_enrolled,
        present_students_count=present_count,
        attendance_rate_percentage=att_rate,
        current_session_duration_minutes=sess_duration_mins,
        average_engagement_score=avg_engagement,
        participation_activity_level=participation_level,
        active_session_id=act_sess_id,
        active_session_title=act_sess_title,
        recent_sessions=recent_sessions_data,
        recent_attendance_events=recent_att_data,
        teaching_recommendations_count=len(top_recs),
        top_recommendations=top_recs,
        is_demo_data=is_demo
    )

@router.get("/sessions/{session_id}", response_model=SessionEngagementSummary)
def get_session_analytics_detail(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found.")

    metrics = db.query(EngagementMetric).filter(
        EngagementMetric.session_id == session_id
    ).order_by(EngagementMetric.interval_start.asc()).all()

    # Discover available modalities
    modalities = set(m.source_modality for m in metrics if m.source_modality not in ("multimodal", "simulated"))
    if not modalities:
        modalities = {"video"}

    available_mod_list = sorted(list(modalities))
    missing_mod_list = [m for m in ["video", "audio"] if m not in modalities]

    # Group metrics into timeline intervals for Recharts
    # Each interval will have: time_label, participation_activity, movement_frequency, head_orientation, audio_activity, composite
    intervals_map: Dict[float, Dict[str, Any]] = {}
    for m in metrics:
        t_key = m.interval_start
        if t_key not in intervals_map:
            mins = int(t_key // 60)
            secs = int(t_key % 60)
            intervals_map[t_key] = {
                "interval_start": t_key,
                "interval_end": m.interval_end,
                "time_label": f"{mins:02d}:{secs:02d}",
                "participation_activity": 0.0,
                "movement_frequency": 0.0,
                "head_orientation_indicator": 0.0,
                "voice_activity_ratio": None,
                "composite_engagement": 0.0
            }
        
        if m.metric_name in intervals_map[t_key]:
            intervals_map[t_key][m.metric_name] = m.metric_value

    timeline = [intervals_map[k] for k in sorted(intervals_map.keys())]

    # Composite average
    comp_vals = [t["composite_engagement"] for t in timeline if t["composite_engagement"] > 0]
    avg_comp = round(sum(comp_vals) / len(comp_vals), 1) if comp_vals else 0.0

    notes = [
        "Indicators reflect non-invasive proxies across visual and acoustic sensors.",
        "Low movement frequency indicates focused reading/listening, not necessarily disengagement."
    ]
    if "audio" not in modalities:
        notes.append("Audio indicators unavailable; composite weights renormalized over visual modalities.")

    return SessionEngagementSummary(
        session_id=session_id,
        composite_engagement_score=avg_comp,
        confidence_level=0.91 if len(timeline) > 3 else 0.70,
        available_modalities=available_mod_list,
        missing_modalities=missing_mod_list,
        weights_used={
            "participation": settings.WEIGHT_PARTICIPATION,
            "movement": settings.WEIGHT_MOVEMENT,
            "head_orientation": settings.WEIGHT_HEAD_ORIENTATION,
            "audio": settings.WEIGHT_AUDIO if "audio" in modalities else 0.0
        },
        timeline_intervals=timeline,
        explanation_notes=notes,
        data_quality_status="Optimal" if "audio" in modalities and len(timeline) >= 4 else "Partial Coverage"
    )

@router.get("/students/{student_id}/attendance-history", response_model=StudentAttendanceHistory)
def get_student_attendance_history(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
    sessions_data = []
    attended_count = 0

    for r in records:
        if r.status in ("present", "manually_confirmed", "late"):
            attended_count += 1
        sessions_data.append({
            "session_id": r.session_id,
            "session_title": r.session.title if r.session else "Session",
            "course_name": r.session.course.name if (r.session and r.session.course) else "N/A",
            "date": r.session.created_at.strftime("%Y-%m-%d") if r.session else "N/A",
            "status": r.status,
            "observed_duration": r.observed_duration,
            "confidence": r.confidence,
            "manually_corrected": r.manually_corrected,
            "notes": r.notes
        })

    total_sessions = len(records)
    rate = round((attended_count / total_sessions * 100), 1) if total_sessions > 0 else 0.0

    return StudentAttendanceHistory(
        student_id=student.id,
        student_code=student.student_code,
        display_name=student.display_name,
        total_sessions=total_sessions,
        attended_sessions=attended_count,
        attendance_rate=rate,
        sessions=sessions_data
    )
