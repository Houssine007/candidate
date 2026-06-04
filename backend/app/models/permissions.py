from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from ..core.database import Base

# Table de jointure Many-to-Many entre Rôles et Permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("internal_roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True)
)

class Permission(Base):
    """
    Représente une action atomique autorisée (ex: 'jobs:create', 'employees:view_salary')
    """
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50)) # ex: 'recruitment', 'hr', 'org'

    def __repr__(self):
        return f"<Permission(name='{self.name}')>"

class InternalRole(Base):
    """
    Rôle défini au sein d'une entreprise (ex: 'DRH', 'Chef d'équipe', 'Stagiaire')
    """
    __tablename__ = "internal_roles"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_system_role = Column(Integer, default=0) # 1 si c'est un rôle par défaut non modifiable

    # Relations
    company = relationship("Company")
    permissions = relationship("Permission", secondary=role_permissions, backref="roles")
    employees = relationship("Employee", back_populates="internal_role")

    def __repr__(self):
        return f"<InternalRole(name='{self.name}', company_id={self.company_id})>"
