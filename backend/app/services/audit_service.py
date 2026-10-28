from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.core.config import settings

def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> Optional[AuditLog]:
    if not settings.ENABLE_AUDIT_LOGGING:
        return None
    try:
        log_entry = AuditLog(
            user_id=user_id or "system_teacher",
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            details_json=details or {}
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        db.rollback()
        print(f"Error logging audit event: {e}")
        return None
