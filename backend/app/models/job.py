from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base
from sqlalchemy import Boolean
from sqlalchemy import ForeignKey

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("recruiters.id"))
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True) # Ajout pour isolation directe
    title = Column(String, index=True)
    description = Column(Text)
    company = Column(String, index=True) # Nom de l'entreprise (redondant mais utile pour le job board public)
    location = Column(String)
    salary_min = Column(Float)
    salary_max = Column(Float)
    min_years_experience = Column(Float, default=0.0)
    min_education_level = Column(Integer, default=0) # 0-8 (Bac+?)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    recruiter = relationship("Recruiter", back_populates="jobs")
    company_related = relationship("Company") # Relation technique
    org_unit_id = Column(Integer, ForeignKey("org_units.id"), nullable=True)
    org_unit = relationship("OrgUnit", back_populates="jobs")
    requirements = relationship("JobRequirement", back_populates="job")
    applications = relationship("Application", back_populates="job")

class JobRequirement(Base):
    __tablename__ = "job_requirements"

    job_id = Column(Integer, ForeignKey("jobs.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)
    required_level = Column(Integer)  # 1-4
    is_mandatory = Column(Boolean, default=True)
    
    # Relations
    job = relationship("Job", back_populates="requirements")
    skill = relationship("Skill", back_populates="job_requirements")

"""
class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    status = Column(String)  # pending, accepted, rejected
    match_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    job = relationship("Job", back_populates="applications")
    candidate = relationship("Candidate", back_populates="applications") 
"""