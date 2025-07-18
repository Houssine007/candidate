from sqlalchemy import Column, Integer, Text, DateTime, Boolean, ForeignKey, Enum as PgEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum

class ApplicationStatus(str, enum.Enum):
    PENDING = "PENDING"
    REVIEWING = "REVIEWING"
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"
    ACCEPTED = "ACCEPTED"

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    status = Column(PgEnum(ApplicationStatus, name="applicationstatus"), nullable=False, default=ApplicationStatus.PENDING)
    cover_letter = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relations
    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("Job", back_populates="applications")
