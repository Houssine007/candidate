from sqlalchemy import text
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from app.core.database import Base, engine, SessionLocal
from app.models.skill import Skill
from app.models.job_standard import JobStandard, JobStandardRequirement

load_dotenv()

# ─── Skills catalogue ─────────────────────────────────────────────────────────

ALL_SKILLS = [
    # Dev
    {"name": "Python",                   "cat": "Dev",      "rome": "M1805"},
    {"name": "JavaScript",               "cat": "Dev",      "rome": "M1805"},
    {"name": "TypeScript",               "cat": "Dev",      "rome": "M1805"},
    {"name": "React",                    "cat": "Dev",      "rome": "M1805"},
    {"name": "Vue.js",                   "cat": "Dev",      "rome": "M1805"},
    {"name": "Node.js",                  "cat": "Dev",      "rome": "M1805"},
    {"name": "Java",                     "cat": "Dev",      "rome": "M1805"},
    {"name": "PHP",                      "cat": "Dev",      "rome": "M1805"},
    {"name": "Go",                       "cat": "Dev",      "rome": "M1805"},
    {"name": "C++",                      "cat": "Dev",      "rome": "M1805"},
    {"name": "Swift / iOS",              "cat": "Dev",      "rome": "M1805"},
    {"name": "Kotlin / Android",         "cat": "Dev",      "rome": "M1805"},
    {"name": "Flutter",                  "cat": "Dev",      "rome": "M1805"},
    {"name": "REST API",                 "cat": "Dev",      "rome": "M1805"},
    {"name": "GraphQL",                  "cat": "Dev",      "rome": "M1805"},
    # Data / IA
    {"name": "SQL / PostgreSQL",         "cat": "Data",     "rome": "M1806"},
    {"name": "MongoDB",                  "cat": "Data",     "rome": "M1806"},
    {"name": "Machine Learning",         "cat": "Data",     "rome": "M1806"},
    {"name": "Deep Learning",            "cat": "Data",     "rome": "M1806"},
    {"name": "TensorFlow / PyTorch",     "cat": "Data",     "rome": "M1806"},
    {"name": "Pandas / NumPy",           "cat": "Data",     "rome": "M1806"},
    {"name": "Power BI / Tableau",       "cat": "Data",     "rome": "M1806"},
    {"name": "Spark / Hadoop",           "cat": "Data",     "rome": "M1806"},
    {"name": "ETL / Data Pipeline",      "cat": "Data",     "rome": "M1806"},
    {"name": "NLP / LLM",                "cat": "Data",     "rome": "M1806"},
    # DevOps / Cloud
    {"name": "Docker / Kubernetes",      "cat": "DevOps",   "rome": "M1801"},
    {"name": "Linux Administration",     "cat": "DevOps",   "rome": "M1801"},
    {"name": "CI/CD (GitHub Actions / GitLab)", "cat": "DevOps", "rome": "M1801"},
    {"name": "AWS",                      "cat": "Cloud",    "rome": "M1801"},
    {"name": "Azure",                    "cat": "Cloud",    "rome": "M1801"},
    {"name": "GCP",                      "cat": "Cloud",    "rome": "M1801"},
    {"name": "Terraform / IaC",          "cat": "DevOps",   "rome": "M1801"},
    {"name": "Monitoring (Prometheus / Grafana)", "cat": "DevOps", "rome": "M1801"},
    # Sécurité
    {"name": "Sécurité Réseaux",         "cat": "Sécurité", "rome": "M1802"},
    {"name": "Pentest / Ethical Hacking","cat": "Sécurité", "rome": "M1802"},
    {"name": "SIEM / SOC",               "cat": "Sécurité", "rome": "M1802"},
    {"name": "Cryptographie",            "cat": "Sécurité", "rome": "M1802"},
    {"name": "ISO 27001 / RGPD",         "cat": "Sécurité", "rome": "M1802"},
    # Design / UX
    {"name": "Figma",                    "cat": "Design",   "rome": "E1205"},
    {"name": "Design System",            "cat": "Design",   "rome": "E1205"},
    {"name": "User Research",            "cat": "Design",   "rome": "E1205"},
    {"name": "Prototypage",              "cat": "Design",   "rome": "E1205"},
    {"name": "Adobe XD / Illustrator",   "cat": "Design",   "rome": "E1205"},
    # Gestion de projet / Product
    {"name": "Gestion de projet Agile",  "cat": "Projet",   "rome": "M1302"},
    {"name": "Scrum / Kanban",           "cat": "Projet",   "rome": "M1302"},
    {"name": "Product Management",       "cat": "Projet",   "rome": "M1302"},
    {"name": "Roadmap produit",          "cat": "Projet",   "rome": "M1302"},
    {"name": "OKR / KPI",                "cat": "Projet",   "rome": "M1302"},
    # Marketing / Growth
    {"name": "SEO / SEA",                "cat": "Marketing","rome": "E1401"},
    {"name": "Google Analytics / GA4",   "cat": "Marketing","rome": "E1401"},
    {"name": "Email Marketing",          "cat": "Marketing","rome": "E1401"},
    {"name": "Social Media Management",  "cat": "Marketing","rome": "E1401"},
    {"name": "Growth Hacking",           "cat": "Marketing","rome": "E1401"},
    {"name": "CRM (Salesforce / HubSpot)","cat":"Marketing","rome": "E1401"},
    # RH
    {"name": "Recrutement",              "cat": "RH",       "rome": "M1501"},
    {"name": "Formation / GPEC",         "cat": "RH",       "rome": "M1501"},
    {"name": "Paie / ADP",               "cat": "RH",       "rome": "M1501"},
    {"name": "Droit du travail",         "cat": "RH",       "rome": "M1501"},
    # Finance
    {"name": "Comptabilité générale",    "cat": "Finance",  "rome": "M1202"},
    {"name": "Contrôle de gestion",      "cat": "Finance",  "rome": "M1202"},
    {"name": "Excel / Modélisation financière", "cat": "Finance", "rome": "M1202"},
    {"name": "Audit financier",          "cat": "Finance",  "rome": "M1202"},
    # Robotique / Industrie
    {"name": "Programmation d'Automates (PLC)", "cat": "Robotics", "rome": "H1208"},
    {"name": "Conception CAO (SolidWorks)",     "cat": "Robotics", "rome": "H1208"},
    {"name": "Vision Industrielle",             "cat": "Robotics", "rome": "H1208"},
    # Transversal
    {"name": "Communication orale",      "cat": "Soft",     "rome": "M1302"},
    {"name": "Leadership",               "cat": "Soft",     "rome": "M1302"},
    {"name": "Anglais professionnel",    "cat": "Langue",   "rome": None},
]

# ─── Job Standards ────────────────────────────────────────────────────────────

JOB_STANDARDS = [
    {
        "title": "Développeur Fullstack",
        "code": "M1805-FS",
        "cat": "Développement",
        "desc": "Conçoit et développe des applications web de bout en bout, du frontend au backend. Maîtrise plusieurs frameworks et collabore avec les équipes produit et design.",
        "skills": [
            ("JavaScript", 3, True), ("TypeScript", 2, False), ("React", 3, True),
            ("Node.js", 3, True), ("SQL / PostgreSQL", 2, True), ("REST API", 2, True),
            ("Docker / Kubernetes", 1, False),
        ],
    },
    {
        "title": "Développeur Frontend",
        "code": "M1805-FE",
        "cat": "Développement",
        "desc": "Spécialiste de l'interface utilisateur. Développe des interfaces réactives et accessibles, optimise les performances et travaille en étroite collaboration avec les designers UX/UI.",
        "skills": [
            ("JavaScript", 3, True), ("TypeScript", 2, True), ("React", 3, True),
            ("Vue.js", 2, False), ("Figma", 2, False), ("REST API", 2, True),
        ],
    },
    {
        "title": "Développeur Backend",
        "code": "M1805-BE",
        "cat": "Développement",
        "desc": "Conçoit l'architecture serveur, les API et les bases de données. Garant des performances, de la sécurité et de la scalabilité des applications.",
        "skills": [
            ("Python", 3, True), ("Node.js", 2, False), ("SQL / PostgreSQL", 3, True),
            ("REST API", 3, True), ("Docker / Kubernetes", 2, False), ("MongoDB", 1, False),
        ],
    },
    {
        "title": "Développeur Mobile",
        "code": "M1805-MOB",
        "cat": "Développement",
        "desc": "Développe des applications mobiles natives ou cross-platform pour iOS et Android. Assure l'expérience utilisateur mobile et l'intégration avec les API backend.",
        "skills": [
            ("Swift / iOS", 3, False), ("Kotlin / Android", 3, False),
            ("Flutter", 3, False), ("REST API", 2, True), ("TypeScript", 2, False),
        ],
    },
    {
        "title": "Ingénieur DevOps",
        "code": "M1801-DO",
        "cat": "Infrastructure & Cloud",
        "desc": "Met en place et maintient les pipelines CI/CD, gère l'infrastructure cloud et automatise les déploiements. Garant de la disponibilité et de la performance des systèmes.",
        "skills": [
            ("Docker / Kubernetes", 4, True), ("CI/CD (GitHub Actions / GitLab)", 3, True),
            ("Linux Administration", 3, True), ("AWS", 2, False),
            ("Terraform / IaC", 2, False), ("Monitoring (Prometheus / Grafana)", 2, False),
        ],
    },
    {
        "title": "Ingénieur Cloud / SRE",
        "code": "M1801-CL",
        "cat": "Infrastructure & Cloud",
        "desc": "Conçoit et opère les architectures cloud. Assure la fiabilité, la scalabilité et la sécurité des plateformes. Intervient sur AWS, Azure ou GCP.",
        "skills": [
            ("AWS", 3, False), ("Azure", 3, False), ("GCP", 3, False),
            ("Terraform / IaC", 3, True), ("Docker / Kubernetes", 3, True),
            ("Monitoring (Prometheus / Grafana)", 2, False), ("Linux Administration", 3, True),
        ],
    },
    {
        "title": "Data Scientist",
        "code": "M1806-DS",
        "cat": "Data & IA",
        "desc": "Analyse les données pour en extraire de la valeur métier. Conçoit des modèles prédictifs et de machine learning. Collabore avec les équipes produit et engineering.",
        "skills": [
            ("Python", 4, True), ("Machine Learning", 3, True), ("Pandas / NumPy", 3, True),
            ("SQL / PostgreSQL", 3, True), ("TensorFlow / PyTorch", 2, False),
            ("Power BI / Tableau", 2, False), ("Deep Learning", 2, False),
        ],
    },
    {
        "title": "Data Engineer",
        "code": "M1806-DE",
        "cat": "Data & IA",
        "desc": "Construit et maintient les pipelines de données. Conçoit les architectures data (lacs, entrepôts). Garantit la qualité, la disponibilité et la performance des données.",
        "skills": [
            ("Python", 3, True), ("SQL / PostgreSQL", 4, True), ("Spark / Hadoop", 3, True),
            ("ETL / Data Pipeline", 3, True), ("MongoDB", 2, False),
            ("AWS", 2, False), ("Docker / Kubernetes", 2, False),
        ],
    },
    {
        "title": "Ingénieur IA / ML",
        "code": "M1806-AI",
        "cat": "Data & IA",
        "desc": "Conçoit et déploie des modèles d'intelligence artificielle en production. Spécialisé en deep learning, NLP ou computer vision. Transforme les recherches en solutions industrialisables.",
        "skills": [
            ("Python", 4, True), ("Deep Learning", 4, True), ("TensorFlow / PyTorch", 4, True),
            ("NLP / LLM", 3, False), ("Machine Learning", 4, True),
            ("Docker / Kubernetes", 2, False), ("SQL / PostgreSQL", 2, False),
        ],
    },
    {
        "title": "Analyste Business Intelligence",
        "code": "M1806-BI",
        "cat": "Data & IA",
        "desc": "Transforme les données en insights actionnables pour les décideurs. Crée des tableaux de bord et des rapports. Maîtrise les outils de visualisation et le SQL.",
        "skills": [
            ("SQL / PostgreSQL", 3, True), ("Power BI / Tableau", 4, True),
            ("Excel / Modélisation financière", 3, True), ("ETL / Data Pipeline", 2, False),
            ("Python", 1, False),
        ],
    },
    {
        "title": "Ingénieur Cybersécurité",
        "code": "M1802-CS",
        "cat": "Sécurité",
        "desc": "Protège les systèmes d'information contre les cybermenaces. Réalise des audits de sécurité, des tests d'intrusion et met en place les politiques de sécurité.",
        "skills": [
            ("Sécurité Réseaux", 4, True), ("Pentest / Ethical Hacking", 3, True),
            ("SIEM / SOC", 3, False), ("ISO 27001 / RGPD", 2, False),
            ("Linux Administration", 3, True), ("Cryptographie", 2, False),
        ],
    },
    {
        "title": "UX/UI Designer",
        "code": "E1205-UX",
        "cat": "Design",
        "desc": "Conçoit des expériences utilisateur intuitives et des interfaces visuelles attractives. Mène des recherches utilisateurs, crée des prototypes et collabore avec les développeurs.",
        "skills": [
            ("Figma", 4, True), ("Design System", 3, True), ("User Research", 3, True),
            ("Prototypage", 3, True), ("Adobe XD / Illustrator", 2, False),
        ],
    },
    {
        "title": "Product Manager",
        "code": "M1302-PM",
        "cat": "Produit",
        "desc": "Définit la vision et la stratégie produit. Priorise le backlog, coordonne les équipes tech et design, et mesure l'impact des livraisons sur les métriques métier.",
        "skills": [
            ("Product Management", 4, True), ("Roadmap produit", 3, True),
            ("Scrum / Kanban", 3, True), ("OKR / KPI", 3, True),
            ("Figma", 2, False), ("SQL / PostgreSQL", 1, False),
        ],
    },
    {
        "title": "Chef de Projet IT",
        "code": "M1302-CP",
        "cat": "Gestion de projet",
        "desc": "Pilote des projets informatiques de bout en bout. Coordonne les équipes, gère les délais et budgets, et assure la livraison dans les objectifs fixés.",
        "skills": [
            ("Gestion de projet Agile", 4, True), ("Scrum / Kanban", 3, True),
            ("OKR / KPI", 2, False), ("Communication orale", 3, True), ("Leadership", 3, True),
        ],
    },
    {
        "title": "Scrum Master / Agile Coach",
        "code": "M1302-SM",
        "cat": "Gestion de projet",
        "desc": "Facilite l'adoption des méthodes agiles. Anime les cérémonies Scrum, lève les obstacles et accompagne les équipes vers l'excellence opérationnelle.",
        "skills": [
            ("Scrum / Kanban", 4, True), ("Gestion de projet Agile", 4, True),
            ("Leadership", 3, True), ("Communication orale", 4, True),
        ],
    },
    {
        "title": "Responsable Marketing Digital",
        "code": "E1401-MKT",
        "cat": "Marketing",
        "desc": "Pilote la stratégie marketing digitale. Gère les campagnes SEO/SEA, les réseaux sociaux et les outils CRM pour générer des leads et fidéliser les clients.",
        "skills": [
            ("SEO / SEA", 3, True), ("Google Analytics / GA4", 3, True),
            ("Social Media Management", 3, True), ("CRM (Salesforce / HubSpot)", 2, False),
            ("Email Marketing", 3, True), ("Growth Hacking", 2, False),
        ],
    },
    {
        "title": "Chargé de Recrutement / RH",
        "code": "M1501-RH",
        "cat": "Ressources Humaines",
        "desc": "Gère le processus de recrutement de bout en bout. Définit les profils, sourcing, conduit les entretiens et intègre les nouveaux collaborateurs.",
        "skills": [
            ("Recrutement", 4, True), ("CRM (Salesforce / HubSpot)", 2, False),
            ("Droit du travail", 2, True), ("Communication orale", 3, True),
            ("Formation / GPEC", 2, False),
        ],
    },
    {
        "title": "Contrôleur de Gestion / Finance",
        "code": "M1202-FIN",
        "cat": "Finance",
        "desc": "Assure le suivi budgétaire et l'analyse de la performance financière. Produit les reportings, préconise des mesures correctives et accompagne les décisions stratégiques.",
        "skills": [
            ("Contrôle de gestion", 4, True), ("Excel / Modélisation financière", 4, True),
            ("Comptabilité générale", 3, True), ("Power BI / Tableau", 2, False),
            ("SQL / PostgreSQL", 1, False),
        ],
    },
    {
        "title": "Administrateur Systèmes & Cloud",
        "code": "M1801",
        "cat": "Infrastructure & Cloud",
        "desc": "Gère l'infrastructure, les serveurs et la sécurité. Assure la disponibilité et les performances des systèmes d'information.",
        "skills": [
            ("Linux Administration", 4, True), ("Docker / Kubernetes", 3, True),
            ("Sécurité Réseaux", 3, True), ("AWS", 2, False), ("Monitoring (Prometheus / Grafana)", 2, False),
        ],
    },
    {
        "title": "Développeur Fullstack Python / Django",
        "code": "M1805-PY",
        "cat": "Développement",
        "desc": "Développe des applications web avec Python côté backend (Django/FastAPI) et JavaScript côté frontend. Maîtrise les bases de données relationnelles.",
        "skills": [
            ("Python", 4, True), ("JavaScript", 2, True), ("React", 2, False),
            ("SQL / PostgreSQL", 3, True), ("REST API", 3, True), ("Docker / Kubernetes", 2, False),
        ],
    },
    {
        "title": "Ingénieur en Robotique Industrielle",
        "code": "H1208",
        "cat": "Industrie",
        "desc": "Conçoit, installe et programme des systèmes robotisés industriels. Intègre des solutions d'automatisation et de vision industrielle.",
        "skills": [
            ("Programmation d'Automates (PLC)", 4, True),
            ("Conception CAO (SolidWorks)", 3, True),
            ("Vision Industrielle", 2, False),
            ("C++", 2, False),
        ],
    },
]

# ─── Seed function ────────────────────────────────────────────────────────────

def seed_rome_data():
    print("Synchronisation de la base de données...")
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE skills ADD COLUMN IF NOT EXISTS rome_code VARCHAR"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS formations TEXT"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS certifications TEXT"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS experience_detail TEXT"))
            conn.commit()
            print("Colonnes synchronisées.")
        except Exception as e:
            print(f"Note: {e}")

    db = SessionLocal()
    try:
        # 1. Skills
        print(f"Seeding {len(ALL_SKILLS)} compétences...")
        for s_data in ALL_SKILLS:
            skill = db.query(Skill).filter(Skill.name == s_data["name"]).first()
            if not skill:
                db.add(Skill(
                    name=s_data["name"],
                    category=s_data["cat"],
                    rome_code=s_data["rome"],
                    description=f"Compétence liée au domaine {s_data['cat']}"
                ))
        db.flush()

        # 2. Job Standards
        print(f"Seeding {len(JOB_STANDARDS)} fiches métier...")
        for j in JOB_STANDARDS:
            std = db.query(JobStandard).filter(JobStandard.rome_code == j["code"]).first()
            if not std:
                std = JobStandard(
                    title=j["title"],
                    rome_code=j["code"],
                    description=j["desc"],
                    category=j["cat"],
                )
                db.add(std)
                db.flush()

                for (skill_name, level, mandatory) in j["skills"]:
                    skill = db.query(Skill).filter(Skill.name == skill_name).first()
                    if skill:
                        db.add(JobStandardRequirement(
                            job_standard_id=std.id,
                            skill_id=skill.id,
                            min_level=level,
                            is_mandatory=mandatory,
                        ))
            else:
                # Mise à jour du titre si changé
                std.title = j["title"]
                std.description = j["desc"]
                std.category = j["cat"]

        db.commit()
        print(f"✅ Seeding ROME terminé — {len(JOB_STANDARDS)} fiches, {len(ALL_SKILLS)} compétences.")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback; traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_rome_data()
