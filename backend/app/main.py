from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .core.config import settings
from .api import auth, candidates, jobs, skills, applications, companies, recruiters, users, organization, employees, roles, catalog
from . import models

app = FastAPI(
    title="Recruitment Platform API",
    description="API pour la plateforme de recrutement",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.56.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir les fichiers uploadés (CVs, etc.)
if not os.path.exists("uploads"):
    os.makedirs("uploads")
if not os.path.exists("uploads/cvs"):
    os.makedirs("uploads/cvs")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Inclusion des routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(candidates.router, prefix="/api/candidates", tags=["Candidates"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(skills.router, prefix="/api/skills", tags=["Skills"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["Catalog"])

app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(recruiters.router, prefix="/api/recruiters", tags=["Recruiters"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(organization.router, prefix="/api/organization", tags=["Organization"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])



@app.get("/")
async def root():
    return {"message": "Bienvenue sur l'API de la plateforme de recrutement"} 