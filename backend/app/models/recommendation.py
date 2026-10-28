from sqlalchemy import Column, String, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    explanation = Column(String(1000), nullable=False)
    evidence_json = Column(JSON, nullable=True)
    suggested_action = Column(String(500), nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    status = Column(String(30), default="pending", nullable=False)  # pending, accepted, dismissed, completed
    created_at = Column(DateTime, default=utc_now, nullable=False)

    session = relationship("Session", back_populates="recommendations")
