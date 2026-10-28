import os
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.session import Session as ClassroomSession
from app.models.attendance import AttendanceRecord
from app.models.engagement import EngagementMetric
from app.models.recommendation import Recommendation
from app.models.audit import AuditLog
from app.schemas.privacy import (
    PrivacySettingsOut,
    PrivacySettingsUpdate,
    DeleteSessionDataRequest
)
from app.services.audit_service import log_audit_event
from app.services.seed_service import seed_demo_data, reset_demo_data

router = APIRouter(prefix="/privacy", tags=["Privacy & Settings"])

@router.get("/settings", response_model=PrivacySettingsOut)
def get_privacy_settings(db: Session = Depends(get_db)):
    tot_sessions = db.query(ClassroomSession).count()
    tot_logs = db.query(AuditLog).count()
    
    # Check retained media files
    media_files = []
    if os.path.exists(settings.UPLOAD_DIR):
        media_files = [
            f for f in os.listdir(settings.UPLOAD_DIR)
            if not f.startswith(".") and os.path.isfile(settings.UPLOAD_DIR / f)
        ]

    return PrivacySettingsOut(
        local_processing_active=True,
        auto_delete_raw_media=settings.AUTO_DELETE_RAW_MEDIA,
        media_retention_hours=settings.MEDIA_RETENTION_HOURS,
        enable_audit_logging=settings.ENABLE_AUDIT_LOGGING,
        total_stored_sessions=tot_sessions,
        total_audit_logs=tot_logs,
        retained_media_files_count=len(media_files),
        storage_directory=str(settings.UPLOAD_DIR)
    )

@router.patch("/settings", response_model=PrivacySettingsOut)
def update_privacy_settings(payload: PrivacySettingsUpdate, db: Session = Depends(get_db)):
    if payload.auto_delete_raw_media is not None:
        settings.AUTO_DELETE_RAW_MEDIA = payload.auto_delete_raw_media
    if payload.media_retention_hours is not None:
        settings.MEDIA_RETENTION_HOURS = payload.media_retention_hours
    if payload.enable_audit_logging is not None:
        settings.ENABLE_AUDIT_LOGGING = payload.enable_audit_logging

    log_audit_event(
        db,
        "UPDATE_PRIVACY_SETTINGS",
        "SystemConfig",
        "global",
        details={
            "auto_delete": settings.AUTO_DELETE_RAW_MEDIA,
            "retention_hours": settings.MEDIA_RETENTION_HOURS,
            "audit_logging": settings.ENABLE_AUDIT_LOGGING
        }
    )
    return get_privacy_settings(db)

@router.post("/delete-session-data")
def delete_session_data(payload: DeleteSessionDataRequest, db: Session = Depends(get_db)):
    sess = db.query(ClassroomSession).filter(ClassroomSession.id == payload.session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found.")

    # 1. Clean up associated files in UPLOAD_DIR
    deleted_files = 0
    if os.path.exists(settings.UPLOAD_DIR):
        for f in os.listdir(settings.UPLOAD_DIR):
            if f.startswith(payload.session_id):
                try:
                    os.remove(settings.UPLOAD_DIR / f)
                    deleted_files += 1
                except Exception as e:
                    print(f"Error removing file {f}: {e}")

    # 2. If delete_media_only is False, delete database records
    if not payload.delete_media_only:
        db.query(AttendanceRecord).filter(AttendanceRecord.session_id == payload.session_id).delete()
        db.query(EngagementMetric).filter(EngagementMetric.session_id == payload.session_id).delete()
        db.query(Recommendation).filter(Recommendation.session_id == payload.session_id).delete()
        db.delete(sess)
        db.commit()

        log_audit_event(
            db,
            "PURGE_SESSION_DATA",
            "Session",
            payload.session_id,
            details={"deleted_media_files": deleted_files, "records_purged": True}
        )
        return {"success": True, "message": "All session records and media permanently deleted."}
    else:
        log_audit_event(
            db,
            "PURGE_SESSION_MEDIA_ONLY",
            "Session",
            payload.session_id,
            details={"deleted_media_files": deleted_files}
        )
        return {"success": True, "message": f"Deleted {deleted_files} retained media files for session."}

@router.post("/seed-demo")
def trigger_seed_demo_data(force: bool = False, db: Session = Depends(get_db)):
    result = seed_demo_data(db, force=force)
    return {"success": True, "data": result}

@router.post("/reset-demo")
def trigger_reset_demo_data(confirm: bool = False, db: Session = Depends(get_db)):
    if not confirm:
        raise HTTPException(status_code=400, detail="Confirmation required to reset demo data.")
    result = reset_demo_data(db)
    return {"success": True, "data": result}
