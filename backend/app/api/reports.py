from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.session import Session as ClassroomSession
from app.models.attendance import AttendanceRecord
from app.models.engagement import EngagementMetric
from app.models.recommendation import Recommendation
from app.services.report_service import generate_session_csv, generate_session_pdf
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/sessions/{session_id}/csv")
def download_session_csv(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found.")

    attendance = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    metrics = db.query(EngagementMetric).filter(EngagementMetric.session_id == session_id).all()
    recommendations = db.query(Recommendation).filter(Recommendation.session_id == session_id).all()

    csv_content = generate_session_csv(sess, attendance, metrics, recommendations)
    log_audit_event(db, "EXPORT_REPORT_CSV", "Session", session_id)

    safe_title = "".join(c for c in sess.title if c.isalnum() or c in ("-", "_")).rstrip()
    filename = f"Session_{safe_title}_{session_id[:8]}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/sessions/{session_id}/pdf")
def download_session_pdf(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(ClassroomSession).filter(ClassroomSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found.")

    attendance = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    metrics = db.query(EngagementMetric).filter(EngagementMetric.session_id == session_id).all()
    recommendations = db.query(Recommendation).filter(Recommendation.session_id == session_id).all()

    pdf_bytes = generate_session_pdf(sess, attendance, metrics, recommendations)
    log_audit_event(db, "EXPORT_REPORT_PDF", "Session", session_id)

    safe_title = "".join(c for c in sess.title if c.isalnum() or c in ("-", "_")).rstrip()
    filename = f"Session_Report_{safe_title}_{session_id[:8]}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
