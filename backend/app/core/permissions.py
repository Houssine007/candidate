from fastapi import HTTPException, Depends, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.user import User, UserRole
from ..models.employee import Employee
from ..models.permissions import Permission
from ..api.auth import get_current_user

def has_permission(permission_name: str):
    """
    Dépendance FastAPI pour vérifier si l'utilisateur a une permission spécifique.
    Prend en compte le rôle système (ADMIN global) et le rôle interne à l'entreprise.
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # 1. Si c'est l'ADMIN global du système, il a tous les droits
        if current_user.role == UserRole.ADMIN:
            return True

        # 2. Récupérer le profil employé de l'utilisateur
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        
        # Si c'est un RECRUITER (propriétaire de l'instance), il a souvent tous les droits par défaut
        if current_user.role == UserRole.RECRUITER and not employee:
            # On pourrait ici considérer que le Recruteur principal a tous les droits
            return True

        if not employee or not employee.internal_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Vous n'avez pas le rôle interne nécessaire pour effectuer cette action."
            )

        # 3. Vérifier si la permission est dans la liste des permissions du rôle
        has_perm = any(p.name == permission_name for p in employee.internal_role.permissions)
        
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission manquante : {permission_name}"
            )
        
        return True

    return permission_checker
