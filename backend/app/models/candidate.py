from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

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
    education_level = Column(Integer, nullable=True) # Bac+X
    bio = Column(Text, nullable=True)
    cv_text = Column(Text, nullable=True)
    cv_url = Column(String, nullable=True)
    formations = Column(Text, nullable=True) # JSON or structured text
    certifications = Column(Text, nullable=True)
    experience_detail = Column(Text, nullable=True) # Détails libres
    onboarding_step = Column(Integer, default=1) # 1: Identity, 2: Skills, 3: Exp, 4: Done
    is_active = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True) # Pour le matching public
    
    # Relations
    user = relationship("User", back_populates="candidate")
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