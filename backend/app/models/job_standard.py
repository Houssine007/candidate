from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from ..core.database import Base

class JobStandard(Base):
    """
    Représente une 'Fiche Métier' type (ex: ROME 4.0).
    Sert de gabarit pour les offres d'emploi et de benchmark pour les candidats.
    """
    __tablename__ = "job_standards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    rome_code = Column(String, unique=True, index=True)
    description = Column(Text)
    category = Column(String, index=True)

    # Relations
    skills_requirements = relationship("JobStandardRequirement", back_populates="job_standard", cascade="all, delete-orphan")

class JobStandardRequirement(Base):
    """Lien entre une Fiche Métier et ses compétences incontournables."""
    __tablename__ = "job_standard_requirements"

    job_standard_id = Column(Integer, ForeignKey("job_standards.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)
    min_level = Column(Integer, default=1) # Niveau requis (1-4)
    is_mandatory = Column(Boolean, default=True)

    # Relations
    job_standard = relationship("JobStandard", back_populates="skills_requirements")
    skill = relationship("Skill")
