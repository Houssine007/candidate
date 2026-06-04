from sqlalchemy.orm import Session
from ..models.permissions import Permission, InternalRole
from ..models.company import Company

DEFAULT_PERMISSIONS = [
    # Recruitment
    ("jobs:create", "Créer des offres d'emploi", "recruitment"),
    ("jobs:view", "Voir les offres d'emploi", "recruitment"),
    ("jobs:edit", "Modifier les offres d'emploi", "recruitment"),
    ("jobs:delete", "Supprimer les offres d'emploi", "recruitment"),
    ("applications:view", "Voir les candidatures", "recruitment"),
    ("applications:review", "Évaluer les candidats", "recruitment"),
    
    # Organization
    ("org:view", "Voir la structure de l'entreprise", "org"),
    ("org:edit", "Modifier la structure (unités)", "org"),
    
    # Employees
    ("employees:view", "Voir la liste des employés", "hr"),
    ("employees:edit", "Modifier les dossiers employés", "hr"),
    ("employees:view_salary", "Voir les informations de paie", "hr"),
    
    # Settings
    ("settings:edit", "Modifier les paramètres de l'entreprise", "admin"),
]

def init_permissions(db: Session):
    """Initialise les permissions atomiques dans la base (global)."""
    for name, desc, cat in DEFAULT_PERMISSIONS:
        existing = db.query(Permission).filter(Permission.name == name).first()
        if not existing:
            perm = Permission(name=name, description=desc, category=cat)
            db.add(perm)
    db.commit()

def init_company_roles(db: Session, company_id: int):
    """Crée les rôles par défaut pour une nouvelle entreprise."""
    # S’assurer que les permissions existent
    init_permissions(db)
    perms = {p.name: p for p in db.query(Permission).all()}

    # 1. Rôle Administrateur (Tout)
    admin_role = InternalRole(
        company_id=company_id, 
        name="Administrateur", 
        description="Accès total à tous les modules",
        is_system_role=1
    )
    admin_role.permissions = list(perms.values())
    db.add(admin_role)

    # 2. Rôle RH (Recrutement + Employés)
    hr_permissions = [p for name, p in perms.items() if p.category in ['recruitment', 'hr', 'org']]
    hr_role = InternalRole(
        company_id=company_id,
        name="RH / Recruteur",
        description="Gère le recrutement et le personnel",
        is_system_role=1
    )
    hr_role.permissions = hr_permissions
    db.add(hr_role)

    # 3. Rôle Manager (Recrutement + Vue Org)
    manager_perms = [perms[n] for n in ["jobs:view", "jobs:create", "applications:view", "applications:review", "org:view", "employees:view"]]
    manager_role = InternalRole(
        company_id=company_id,
        name="Manager",
        description="Gère son équipe et ses recrutements",
        is_system_role=1
    )
    manager_role.permissions = manager_perms
    db.add(manager_role)

    # 4. Rôle Employé (Vue Org + Self)
    employee_perms = [perms[n] for n in ["org:view", "employees:view"]]
    employee_role = InternalRole(
        company_id=company_id,
        name="Collaborateur",
        description="Accès standard aux outils de l'entreprise",
        is_system_role=1
    )
    employee_role.permissions = employee_perms
    db.add(employee_role)

    db.commit()
