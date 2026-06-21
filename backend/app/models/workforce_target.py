from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class WorkforceTarget(Base):
    """
    GPEC prévisionnelle — « cible d'effectif » (intention stratégique).

    Relie le référentiel d'emplois-types (JobStandard, réutilisé) à l'intention
    stratégique d'une entreprise : combien de personnes sur ce métier, à quel
    horizon. C'est la SEULE saisie humaine du dispositif prévisionnel — tout le
    reste (compétences cibles, qualifiés, potentiels, écarts) est dérivé.

    Scope tenant : filtré par company_id.
    """
    __tablename__ = "workforce_targets"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    job_standard_id = Column(Integer, ForeignKey("job_standards.id"), nullable=False)
    org_unit_id = Column(Integer, ForeignKey("org_units.id"), nullable=True)

    target_headcount = Column(Integer, nullable=False, default=1)  # effectif cible
    horizon = Column(String(20), nullable=True)                    # "2026", "T+18m"…
    priority = Column(Integer, default=2)                          # 1 haute / 2 normale
    status = Column(String(20), default="active")                 # active | archived
    notes = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    company = relationship("Company")
    job_standard = relationship("JobStandard")
    org_unit = relationship("OrgUnit")
