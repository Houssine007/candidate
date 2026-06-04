from .user import User, UserRole
from .candidate import Candidate, CandidateSkill
from .recruiter import Recruiter
from .company import Company
from .job import Job, JobRequirement
from .skill import Skill
from .application import Application, ApplicationStatus
from .employee import Employee
from .internal_hr import (
    InternalPosition, 
    InternalPositionRequirement, 
    InternalApplication,
    Training,
    TrainingSkill,
    TrainingEnrollment,
    Evaluation
)
from .organization import OrgUnit
from .job_standard import JobStandard, JobStandardRequirement
from .permissions import Permission, InternalRole, role_permissions



# Liste pour export
__all__ = [
    "User", 
    "UserRole",
    "Candidate", 
    "CandidateSkill",
    "Recruiter", 
    "Company", 
    "Job", 
    "JobRequirement", 
    "Skill", 
    "Application",
    "ApplicationStatus",
    "Employee",
    "InternalPosition",
    "InternalPositionRequirement",
    "InternalApplication",
    "Training",
    "TrainingSkill",
    "TrainingEnrollment",
    "Evaluation",
    "OrgUnit",
    "JobStandard",
    "JobStandardRequirement",
    "Permission",
    "InternalRole",
    "role_permissions"
]


