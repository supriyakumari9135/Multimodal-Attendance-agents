from sqlalchemy import Column, String, DateTime, JSON
from app.core.database import Base
from app.models.base import generate_uuid, utc_now

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True)
    action = Column(String(80), nullable=False)
    entity_type = Column(String(60), nullable=False)
    entity_id = Column(String(60), nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    details_json = Column(JSON, nullable=True)
