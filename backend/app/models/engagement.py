from sqlalchemy import Column, String, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now

class EngagementMetric(Base):
    __tablename__ = "engagement_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    interval_start = Column(Float, nullable=False)  # seconds relative to session start
    interval_end = Column(Float, nullable=False)    # seconds relative to session start
    metric_name = Column(String(60), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    source_modality = Column(String(40), default="multimodal", nullable=False)  # video, audio, multimodal, simulated
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    session = relationship("Session", back_populates="engagement_metrics")
