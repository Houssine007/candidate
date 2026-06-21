from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys

# Windows : la console par défaut (cp1252) ne peut pas encoder les emojis utilisés
# dans les print() de debug (✅ ❌ → …), ce qui provoque des UnicodeEncodeError et
# des erreurs 500 (ex. acceptation d'un candidat). On force l'UTF-8 sur les flux.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

from .core.config import settings
from .api import auth, candidates, jobs, skills, applications, companies, recruiters, users, organization, employees, roles, catalog, lms, internal_mobility, trainings, gpec
from . import models

app = FastAPI(
    title="Recruitment Platform API",
    description="API pour la plateforme de recrutement",
    version="1.0.0"
)

# Configuration CORS
# En dev, Next.js peut basculer de port (3000 occupé -> 3001, 3002, ...).
# Le regex autorise n'importe quel port localhost/127.0.0.1 pour éviter les
# blocages CORS intempestifs, tout en gardant la liste explicite (IP LAN, prod).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.56.1:3000"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
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
app.include_router(lms.router, prefix="/api/lms", tags=["LMS"])
app.include_router(internal_mobility.router, tags=["Internal Mobility"])
app.include_router(trainings.router, tags=["Trainings"])
app.include_router(gpec.router, prefix="/api/gpec", tags=["GPEC"])


@app.get("/")
async def root():
    return {"message": "Bienvenue sur l'API de la plateforme de recrutement"} 