from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from ..core.database import Base



class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String, index=True)
    rome_code = Column(String, index=True, nullable=True)
    description = Column(Text)
    level1_description = Column(Text)
    level2_description = Column(Text)
    level3_description = Column(Text)
    level4_description = Column(Text)

    # Relations
    candidates = relationship("CandidateSkill", back_populates="skill", cascade="all, delete-orphan")
    job_requirements = relationship("JobRequirement", back_populates="skill", cascade="all, delete-orphan")
    employee_skills = relationship("EmployeeSkill", back_populates="skill", cascade="all, delete-orphan") 




