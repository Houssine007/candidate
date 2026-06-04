from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as PgEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum

# Mobilité Interne
class InternalPositionStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    FILLED = "FILLED"

class InternalPosition(Base):
    """Postes disponibles en interne pour mobilité"""
    __tablename__ = "internal_positions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(Text)
    department = Column(String)
    location = Column(String)
    salary_min = Column(Float)
    salary_max = Column(Float)
    
    status = Column(PgEnum(InternalPositionStatus), default=InternalPositionStatus.OPEN)
    posted_by = Column(Integer, ForeignKey("employees.id"))
    posted_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime)
    
    # Relations
    company = relationship("Company")
    requirements = relationship("InternalPositionRequirement", back_populates="position", cascade="all, delete-orphan")
    applications = relationship("InternalApplication", back_populates="position")


class InternalPositionRequirement(Base):
    """Compétences requises pour un poste interne"""
    __tablename__ = "internal_position_requirements"

    id = Column(Integer, primary_key=True, index=True)
    position_id = Column(Integer, ForeignKey("internal_positions.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    required_level = Column(Integer, nullable=False)
    is_mandatory = Column(Integer, default=1)
    
    # Relations
    position = relationship("InternalPosition", back_populates="requirements")
    skill = relationship("Skill")


class InternalApplicationStatus(str, enum.Enum):
    PENDING = "PENDING"
    REVIEWING = "REVIEWING"
    INTERVIEW = "INTERVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class InternalApplication(Base):
    """Candidatures internes (employés → postes internes)"""
    __tablename__ = "internal_applications"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    position_id = Column(Integer, ForeignKey("internal_positions.id"), nullable=False)
    
    status = Column(PgEnum(InternalApplicationStatus), default=InternalApplicationStatus.PENDING)
    motivation_letter = Column(Text)
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    employee = relationship("Employee", back_populates="internal_applications")
    position = relationship("InternalPosition", back_populates="applications")


# Formations
class TrainingCategory(str, enum.Enum):
    TECHNICAL = "TECHNICAL"
    SOFT_SKILLS = "SOFT_SKILLS"
    MANAGEMENT = "MANAGEMENT"
    COMPLIANCE = "COMPLIANCE"
    LANGUAGE = "LANGUAGE"

class Training(Base):
    """Catalogue de formations"""
    __tablename__ = "trainings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(PgEnum(TrainingCategory), nullable=False)
    duration_hours = Column(Float)
    provider = Column(String)
    cost = Column(Float)
    max_participants = Column(Integer)
    
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    company = relationship("Company")
    enrollments = relationship("TrainingEnrollment", back_populates="training")
    skills_taught = relationship("TrainingSkill", back_populates="training")


class TrainingSkill(Base):
    """Compétences enseignées par une formation"""
    __tablename__ = "training_skills"

    id = Column(Integer, primary_key=True, index=True)
    training_id = Column(Integer, ForeignKey("trainings.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    level_gained = Column(Integer, default=1)
    
    # Relations
    training = relationship("Training", back_populates="skills_taught")
    skill = relationship("Skill")


class EnrollmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class TrainingEnrollment(Base):
    """Inscriptions aux formations"""
    __tablename__ = "training_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    training_id = Column(Integer, ForeignKey("trainings.id"), nullable=False)
    
    status = Column(PgEnum(EnrollmentStatus), default=EnrollmentStatus.PENDING)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    score = Column(Float)
    feedback = Column(Text)
    
    # Relations
    employee = relationship("Employee", back_populates="training_enrollments")
    training = relationship("Training", back_populates="enrollments")


# Évaluations
class Evaluation(Base):
    """Évaluations annuelles"""
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    evaluator_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    overall_rating = Column(Float)
    strengths = Column(Text)
    areas_for_improvement = Column(Text)
    objectives = Column(Text)
    comments = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    employee = relationship("Employee", back_populates="evaluations", foreign_keys=[employee_id])
    evaluator = relationship("Employee", foreign_keys=[evaluator_id])
