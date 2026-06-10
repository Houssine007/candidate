from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from ..core.database import get_db
from ..models.employee import Employee, EmployeeSkill
from ..models.user import User
from ..models.skill import Skill
from .auth import get_current_user
from ..core.permissions import has_permission

router = APIRouter()

# Pydantic Models
class SkillLevel(BaseModel):
    skill_id: int
    level: int
    years_experience: float
    certified: bool = False

class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    job_title: str
    org_unit_id: Optional[int] = None
    internal_role_id: Optional[int] = None
    manager_id: Optional[int] = None
    years_of_experience: float = 0
    education_level: int = 0

class EmployeeCreate(EmployeeBase):
    skills: List[SkillLevel] = []

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    org_unit_id: Optional[int] = None
    internal_role_id: Optional[int] = None
    manager_id: Optional[int] = None
    years_of_experience: Optional[float] = None
    education_level: Optional[int] = None
    skills: Optional[List[SkillLevel]] = None

class SkillResponse(BaseModel):
    skill_id: int
    level: int
    years_experience: float
    certified: int = 0

    class Config:
        from_attributes = True

class EmployeeResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    org_unit_id: Optional[int] = None
    internal_role_id: Optional[int] = None
    manager_id: Optional[int] = None
    years_of_experience: float = 0
    education_level: int = 0
    hire_date: Optional[datetime] = None
    skills: Optional[List[SkillResponse]] = []

    class Config:
        from_attributes = True


# Endpoints
@router.post("/", response_model=EmployeeResponse)
async def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:edit"))
):

    """Créer un nouvel employé"""
    if current_user.role not in ["ADMIN", "RECRUITER"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Vérifier email unique
    existing = db.query(Employee).filter(Employee.email == employee.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Récupérer l'entreprise du recruteur
    from ..models.recruiter import Recruiter
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        raise HTTPException(status_code=400, detail="Profil recruteur non trouvé")

    # Créer employé sans user_id (employé manuel, sans compte utilisateur)
    db_employee = Employee(
        user_id=None, # À changer si on crée un employé pour quelqu'un d'autre
        company_id=recruiter.company_id,
        **employee.model_dump(exclude={"skills"})
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)


    # Ajouter les compétences si fournies
    if employee.skills:
        for s in employee.skills:
            from ..models.employee import EmployeeSkill
            db.add(EmployeeSkill(
                employee_id=db_employee.id,
                skill_id=s.skill_id,
                level=s.level,
                years_experience=s.years_experience,
                certified=int(s.certified),
            ))
        db.commit()
        db.refresh(db_employee)
    
    return db_employee


@router.get("/", response_model=List[EmployeeResponse])
async def get_employees(
    skip: int = 0,
    limit: int = 100,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:view"))
):

    # Récupérer l'entreprise du recruteur
    from ..models.recruiter import Recruiter
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    if not recruiter:
        return []
        
    query = db.query(Employee).options(
        joinedload(Employee.skills)
    ).filter(Employee.company_id == recruiter.company_id)

    if department:
        from ..models.organization import OrgUnit
        query = query.join(OrgUnit).filter(OrgUnit.name.ilike(f"%{department}%"))
    
    employees = query.offset(skip).limit(limit).all()
    return employees




@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:edit"))
):
    """Mettre à jour un employé (assignation unité/rôle)"""
    from ..models.recruiter import Recruiter
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    
    db_employee = db.query(Employee).filter(
        Employee.id == employee_id, 
        Employee.company_id == recruiter.company_id
    ).first()
    
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
        
    update_dict = employee_data.model_dump(exclude_unset=True, exclude={"skills"})
    for key, value in update_dict.items():
        setattr(db_employee, key, value)
        
    db.commit()
    db.refresh(db_employee)
    return db_employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _perm: bool = Depends(has_permission("employees:edit"))
):
    """Supprimer un employé"""
    from ..models.recruiter import Recruiter
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    
    db_employee = db.query(Employee).filter(
        Employee.id == employee_id, 
        Employee.company_id == recruiter.company_id
    ).first()
    
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
        
    db.delete(db_employee)
    db.commit()
    return None


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Détail d'un employé"""
    from ..models.recruiter import Recruiter
    recruiter = db.query(Recruiter).filter(Recruiter.user_id == current_user.id).first()
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == recruiter.company_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    return employee


@router.get("/orgchart/tree")
async def get_orgchart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Organigramme hiérarchique"""
    employees = db.query(Employee).all()
    
    # Construire l'arbre
    tree = []
    emp_dict = {e.id: {
        "id": e.id,
        "name": f"{e.first_name} {e.last_name}",
        "title": e.job_title,
        "department": e.department,
        "manager_id": e.manager_id,
        "children": []
    } for e in employees}
    
    for emp_id, emp_data in emp_dict.items():
        if emp_data["manager_id"] is None:
            tree.append(emp_data)
        else:
            parent = emp_dict.get(emp_data["manager_id"])
            if parent:
                parent["children"].append(emp_data)
    
    return tree
