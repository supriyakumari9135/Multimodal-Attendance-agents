from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    display_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(30), nullable=False, default="teacher")  # teacher, admin, observer
    created_at = Column(DateTime, default=utc_now, nullable=False)

    courses = relationship("Course", back_populates="teacher", cascade="all, delete-orphan")
