from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from sqlalchemy import ForeignKey

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    years_of_experience = Column(Float, nullable=True)
    education_level = Column(Integer, nullable=True)
    
    # Relations
    #user = relationship("User", back_populates="candidate")
    skills = relationship("CandidateSkill", back_populates="candidate", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="candidate",  cascade="all, delete-orphan")
        

class CandidateSkill(Base):
    __tablename__ = "candidate_skills"

    candidate_id = Column(Integer, ForeignKey("candidates.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)
    level = Column(Integer)  # 1-4
    years_experience = Column(Float)
    
    # Relations
    candidate = relationship("Candidate", back_populates="skills")
    skill = relationship("Skill", back_populates="candidates") 

    

    # Puis dans CandidateBase/CandidateCreate : skills: List[SkillLevel] = []