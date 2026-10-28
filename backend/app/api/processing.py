import os
import shutil
import threading
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.core.config import settings
from app.models.session import Session as ClassroomSession
from app.models.attendance import AttendanceRecord
from app.models.engagement import EngagementMetric
from app.models.recommendation import Recommendation
from app.models.student import Student
from app.schemas.attendance import AttendanceRecordOut, AttendanceRecordCorrection
from app.schemas.engagement import EngagementMetricOut
from app.schemas.recommendation import RecommendationOut, RecommendationUpdate
from app.services.audit_service import log_audit_event
from app.services.recommendation_engine import evaluate_teaching_recommendations
from app.vision.vision_engine import vision_processor

router = APIRouter(prefix="/sessions/{session_id}", tags=["Processing & Metrics"])

# In-memory progress tracking for background jobs
job_progress: Dict[str, Dict[str, Any]] = {}

def run_video_processing_task(session_id: str, file_path: str):
    db: Session = SessionLocal()
    try:
        job_progress[session_id] = {"status": "processing", "progress": 5, "message": "Initializing video decoder"}
        sess = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
        if not sess:
            job_progress[session_id] = {"status": "failed", "progress": 0, "message": "Session not found"}
            return

        sess.status = "processing"
        db.commit()

        def update_pct(pct):
            job_progress[session_id] = {
                "status": "processing",
                "progress": max(10, min(95, pct)),
                "message": f"Analyzing video frames... {pct}%"
            }

        # Run local OpenCV processor
        attendance_tracks, metrics_raw = vision_processor.process_video_file(
            video_path=file_path,
            session_id=session_id,
            sample_interval_sec=1.0,
            min_presence_sec=15.0,
            progress_callback=update_pct
        )

        job_progress[session_id] = {"status": "processing", "progress": 96, "message": "Saving metrics and presence tracks"}

        # Delete previous records if re-processing
        db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).delete()
        db.query(EngagementMetric).filter(EngagementMetric.session_id == session_id).delete()
        db.query(Recommendation).filter(Recommendation.session_id == session_id).delete()

        # Save Attendance Records
        for tr in attendance_tracks:
            rec = AttendanceRecord(
                session_id=session_id,
                anonymous_track_id=tr["anonymous_track_id"],
                observed_duration=tr["observed_duration"],
                status=tr["status"],
                source="vision_detector",
                confidence=tr["confidence"],
                notes=tr.get("notes")
            )
            db.add(rec)

        # Save Engagement Metrics
        metric_objs = []
        for m in metrics_raw:
            mo = EngagementMetric(
                session_id=session_id,
                interval_start=m["interval_start"],
                interval_end=m["interval_end"],
                metric_name=m["metric_name"],
                metric_value=m["metric_value"],
                confidence=m["confidence"],
                source_modality=m["source_modality"],
                metadata_json=m.get("metadata_json")
            )
            db.add(mo)
            metric_objs.append(mo)

        # Generate Explainable Recommendations
        recs = evaluate_teaching_recommendations(session_id, metric_objs, ["video"])
        for r in recs:
            db.add(Recommendation(
                session_id=session_id,
                title=r["title"],
                explanation=r["explanation"],
                evidence_json=r["evidence_json"],
                suggested_action=r["suggested_action"],
                confidence=r["confidence"],
                status=r["status"]
            ))

        sess.status = "completed"
        db.commit()

        # Privacy cleanup if enabled
        if settings.AUTO_DELETE_RAW_MEDIA and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Notice: Could not delete temporary video: {e}")

        job_progress[session_id] = {"status": "completed", "progress": 100, "message": "Processing complete"}

    except Exception as e:
        db.rollback()
        job_progress[session_id] = {"status": "failed", "progress": 0, "message": str(e)}
        sess = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
        if sess:
            sess.status = "failed"
            db.commit()
    finally:
        db.close()

@router.post("/upload")
async def upload_session_video(
    session_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uploads classroom video file and begins local offline processing."""
    s = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")

    allowed_exts = (".mp4", ".avi", ".mov", ".mkv", ".webm")
    if not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(status_code=400, detail=f"Unsupported format. Allowed: {', '.join(allowed_exts)}")

    dest_filename = f"{session_id}_{int(os.times().elapsed)}_{file.filename}"
    dest_path = str(settings.UPLOAD_DIR / dest_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    s.input_mode = "uploaded_video"
    s.status = "processing"
    db.commit()

    job_progress[session_id] = {"status": "processing", "progress": 2, "message": "Video uploaded, queuing processor"}
    background_tasks.add_task(run_video_processing_task, session_id, dest_path)

    log_audit_event(db, "UPLOAD_VIDEO", "Session", session_id, details={"filename": file.filename})

    return {
        "success": True,
        "message": "Video successfully uploaded. Processing started in background.",
        "session_id": session_id
    }

@router.get("/processing-status")
def get_processing_status(session_id: str, db: Session = Depends(get_db)):
    """Returns background video processing progress."""
    if session_id in job_progress:
        return job_progress[session_id]
    s = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "status": s.status,
        "progress": 100 if s.status == "completed" else (0 if s.status in ("ready", "draft") else 50),
        "message": f"Session status is {s.status}"
    }

@router.get("/attendance", response_model=List[AttendanceRecordOut])
def get_session_attendance(session_id: str, db: Session = Depends(get_db)):
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    results = []
    for r in records:
        results.append(AttendanceRecordOut(
            id=r.id,
            session_id=r.session_id,
            student_id=r.student_id,
            student_name=r.student.display_name if r.student else (r.anonymous_track_id or "Anonymous Track"),
            student_code=r.student.student_code if r.student else None,
            anonymous_track_id=r.anonymous_track_id,
            first_seen=r.first_seen,
            last_seen=r.last_seen,
            observed_duration=r.observed_duration,
            status=r.status,
            source=r.source,
            manually_corrected=r.manually_corrected,
            confidence=r.confidence,
            notes=r.notes,
            created_at=r.created_at
        ))
    return results

@router.patch("/attendance/{record_id}", response_model=AttendanceRecordOut)
def correct_attendance_record(
    session_id: str,
    record_id: str,
    payload: AttendanceRecordCorrection,
    db: Session = Depends(get_db)
):
    rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == record_id,
        AttendanceRecord.session_id == session_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    old_status = rec.status
    rec.status = payload.status
    rec.manually_corrected = True
    if payload.student_id is not None:
        rec.student_id = payload.student_id
    if payload.notes is not None:
        rec.notes = payload.notes

    db.commit()
    db.refresh(rec)

    log_audit_event(
        db,
        "CORRECT_ATTENDANCE",
        "AttendanceRecord",
        rec.id,
        details={"old_status": old_status, "new_status": rec.status, "notes": rec.notes}
    )

    return AttendanceRecordOut(
        id=rec.id,
        session_id=rec.session_id,
        student_id=rec.student_id,
        student_name=rec.student.display_name if rec.student else (rec.anonymous_track_id or "Anonymous Track"),
        student_code=rec.student.student_code if rec.student else None,
        anonymous_track_id=rec.anonymous_track_id,
        first_seen=rec.first_seen,
        last_seen=rec.last_seen,
        observed_duration=rec.observed_duration,
        status=rec.status,
        source=rec.source,
        manually_corrected=rec.manually_corrected,
        confidence=rec.confidence,
        notes=rec.notes,
        created_at=rec.created_at
    )

@router.get("/metrics", response_model=List[EngagementMetricOut])
def get_session_metrics(session_id: str, db: Session = Depends(get_db)):
    metrics = db.query(EngagementMetric).filter(
        EngagementMetric.session_id == session_id
    ).order_by(EngagementMetric.interval_start.asc()).all()
    return metrics

@router.get("/recommendations", response_model=List[RecommendationOut])
def get_session_recommendations(session_id: str, db: Session = Depends(get_db)):
    recs = db.query(Recommendation).filter(
        Recommendation.session_id == session_id
    ).order_by(Recommendation.created_at.desc()).all()
    return recs

@router.patch("/recommendations/{rec_id}", response_model=RecommendationOut)
def update_recommendation_status(
    session_id: str,
    rec_id: str,
    payload: RecommendationUpdate,
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(
        Recommendation.id == rec_id,
        Recommendation.session_id == session_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    rec.status = payload.status
    db.commit()
    db.refresh(rec)

    log_audit_event(
        db,
        "UPDATE_RECOMMENDATION",
        "Recommendation",
        rec.id,
        details={"status": rec.status}
    )
    return rec
