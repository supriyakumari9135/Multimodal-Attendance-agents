from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now

class Consent(Base):
    __tablename__ = "consents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    consent_type = Column(String(50), nullable=False)  # video_presence, voice_activity, reference_image
    granted = Column(Boolean, default=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="consents")
