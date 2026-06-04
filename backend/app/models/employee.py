from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Informations personnelles
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    phone = Column(String)
    
    # Informations professionnelles
    job_title = Column(String, nullable=False)
    department = Column(String) # Sera déprécié au profit de org_unit_id
    org_unit_id = Column(Integer, ForeignKey("org_units.id"), nullable=True)
    internal_role_id = Column(Integer, ForeignKey("internal_roles.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    hire_date = Column(DateTime, default=datetime.utcnow)
    
    # Compétences et expérience
    years_of_experience = Column(Float, default=0)
    education_level = Column(Integer, default=0)
    
    # Métadonnées
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Integer, default=1)
    
    # Relations
    user = relationship("User", back_populates="employee")
    company = relationship("Company", back_populates="employees")
    org_unit = relationship("OrgUnit", foreign_keys=[org_unit_id], back_populates="employees")
    internal_role = relationship("InternalRole", back_populates="employees")
    manager = relationship("Employee", remote_side=[id], backref="subordinates")
    skills = relationship("EmployeeSkill", back_populates="employee", cascade="all, delete-orphan")
    internal_applications = relationship("InternalApplication", back_populates="employee")
    training_enrollments = relationship("TrainingEnrollment", back_populates="employee")
    evaluations = relationship("Evaluation", back_populates="employee", foreign_keys="[Evaluation.employee_id]")


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    level = Column(Integer, nullable=False)  # 1-4
    years_experience = Column(Float, default=0)
    certified = Column(Integer, default=0)  # 0 ou 1
    last_used = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    employee = relationship("Employee", back_populates="skills")
    skill = relationship("Skill", back_populates="employee_skills")
