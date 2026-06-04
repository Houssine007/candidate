from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class OrgUnit(Base):
    """
    Représente une Unité Organisationnelle flexible (Département, Squad, Direction, Bureau, etc.)
    Supporte une structure hiérarchique infinie via parent_id.
    """
    __tablename__ = "org_units"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("org_units.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    name = Column(String(255), nullable=False)
    unit_type = Column(String(100), nullable=True)  # ex: "Département", "Squad", "Pôle"
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    company = relationship("Company")
    parent = relationship("OrgUnit", remote_side=[id], backref="children")
    manager = relationship("Employee", foreign_keys=[manager_id])
    
    # Unité liée aux employés et aux jobs
    employees = relationship("Employee", back_populates="org_unit", foreign_keys="[Employee.org_unit_id]")
    jobs = relationship("Job", back_populates="org_unit")

    def __repr__(self):
        return f"<OrgUnit(name='{self.name}', type='{self.unit_type}')>"
