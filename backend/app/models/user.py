from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as PgEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    CANDIDATE = "CANDIDATE"
    RECRUITER = "RECRUITER"
    ADMIN = "ADMIN"
    EMPLOYEE = "EMPLOYEE"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(PgEnum(UserRole, name="userrole"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relations
    recruiter = relationship("Recruiter", uselist=False, back_populates="user")
    candidate = relationship("Candidate", uselist=False, back_populates="user")
    employee = relationship("Employee", uselist=False, back_populates="user")
