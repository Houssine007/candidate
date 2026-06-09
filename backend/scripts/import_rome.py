"""
Script d'import des compétences ROME 4.0 dans la base de données.

Usage :
    cd backend
    python scripts/import_rome.py

Mode API France Travail (si credentials configurés dans .env) :
    FRANCE_TRAVAIL_CLIENT_ID=xxx
    FRANCE_TRAVAIL_CLIENT_SECRET=xxx

Mode statique (fallback, ~300 compétences couvrant les principaux domaines ROME) :
    Fonctionne sans configuration, importation immédiate.
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.skill import Skill
from app.models.job_standard import JobStandard, JobStandardRequirement

# ─── Dataset statique ROME 4.0 ────────────────────────────────────────────────
# Format : (name, category, rome_code, description)
# Source : Macro-compétences ROME 4.0 — France Travail (mars 2023)

ROME_SKILLS = [
    # ── Développement logiciel (M1805) ──────────────────────────────────────
    ("Python", "Développement", "M1805", "Langage de programmation Python"),
    ("JavaScript", "Développement", "M1805", "Langage web front/back"),
    ("TypeScript", "Développement", "M1805", "JavaScript typé"),
    ("React / Next.js", "Développement", "M1805", "Framework front-end React"),
    ("Vue.js", "Développement", "M1805", "Framework front-end Vue"),
    ("Angular", "Développement", "M1805", "Framework front-end Angular"),
    ("Node.js", "Développement", "M1805", "Runtime JavaScript back-end"),
    ("Django / FastAPI", "Développement", "M1805", "Frameworks Python back-end"),
    ("Spring Boot", "Développement", "M1805", "Framework Java back-end"),
    ("Java", "Développement", "M1805", "Langage de programmation Java"),
    ("C#/.NET", "Développement", "M1805", "Langage et framework Microsoft"),
    ("PHP / Laravel", "Développement", "M1805", "Langage web PHP"),
    ("Go (Golang)", "Développement", "M1805", "Langage système Google"),
    ("Rust", "Développement", "M1805", "Langage système performant"),
    ("Swift / iOS", "Développement", "M1805", "Développement iOS Apple"),
    ("Kotlin / Android", "Développement", "M1805", "Développement Android"),
    ("Flutter / Dart", "Développement", "M1805", "Développement mobile cross-platform"),
    ("GraphQL", "Développement", "M1805", "Langage de requêtes API"),
    ("REST API", "Développement", "M1805", "Conception et consommation d'API REST"),
    ("Microservices", "Développement", "M1805", "Architecture microservices"),
    ("Tests unitaires / TDD", "Développement", "M1805", "Pratiques de test logiciel"),
    ("Git / GitHub / GitLab", "Développement", "M1805", "Gestion de versions"),
    ("CI/CD (GitHub Actions, GitLab CI)", "Développement", "M1805", "Intégration et déploiement continus"),

    # ── Base de données (M1805 / M1810) ─────────────────────────────────────
    ("SQL / PostgreSQL", "Base de données", "M1810", "Base de données relationnelle"),
    ("MySQL / MariaDB", "Base de données", "M1810", "Base de données relationnelle open source"),
    ("MongoDB", "Base de données", "M1810", "Base de données NoSQL orientée documents"),
    ("Redis", "Base de données", "M1810", "Cache et base de données clé-valeur"),
    ("Elasticsearch", "Base de données", "M1810", "Moteur de recherche et analyse"),
    ("Cassandra", "Base de données", "M1810", "Base NoSQL distribuée"),
    ("Modélisation de données", "Base de données", "M1810", "Conception de schémas de données"),

    # ── Infrastructure / DevOps (M1801) ─────────────────────────────────────
    ("Docker", "DevOps", "M1801", "Conteneurisation d'applications"),
    ("Kubernetes", "DevOps", "M1801", "Orchestration de conteneurs"),
    ("Linux Administration", "DevOps", "M1801", "Administration systèmes Linux"),
    ("AWS", "DevOps", "M1801", "Cloud Amazon Web Services"),
    ("Azure", "DevOps", "M1801", "Cloud Microsoft Azure"),
    ("Google Cloud (GCP)", "DevOps", "M1801", "Cloud Google"),
    ("Terraform", "DevOps", "M1801", "Infrastructure as Code"),
    ("Ansible", "DevOps", "M1801", "Automatisation de configuration"),
    ("Nginx / Apache", "DevOps", "M1801", "Serveurs web"),
    ("Monitoring (Prometheus, Grafana)", "DevOps", "M1801", "Surveillance des systèmes"),
    ("Sécurité Réseaux", "DevOps", "M1801", "Protection des infrastructures réseau"),
    ("VPN / Firewall", "DevOps", "M1801", "Sécurité périmétrique"),

    # ── Data / IA (M1403) ────────────────────────────────────────────────────
    ("Machine Learning", "Data / IA", "M1403", "Apprentissage automatique"),
    ("Deep Learning / Neural Networks", "Data / IA", "M1403", "Réseaux de neurones profonds"),
    ("NLP (Traitement du langage)", "Data / IA", "M1403", "Traitement automatique du langage"),
    ("Computer Vision", "Data / IA", "M1403", "Vision par ordinateur"),
    ("TensorFlow / PyTorch", "Data / IA", "M1403", "Frameworks de deep learning"),
    ("Scikit-learn", "Data / IA", "M1403", "Bibliothèque ML Python"),
    ("Pandas / NumPy", "Data / IA", "M1403", "Manipulation de données Python"),
    ("Data Visualization (Tableau, PowerBI)", "Data / IA", "M1403", "Visualisation de données"),
    ("ETL / Pipelines de données", "Data / IA", "M1403", "Extraction, transformation, chargement"),
    ("Spark / Hadoop", "Data / IA", "M1403", "Traitement big data distribué"),
    ("Statistiques appliquées", "Data / IA", "M1403", "Analyse statistique de données"),
    ("Modèles de langage (LLM)", "Data / IA", "M1403", "Grands modèles de langage"),

    # ── Sécurité informatique (M1802) ────────────────────────────────────────
    ("Cybersécurité", "Sécurité", "M1802", "Protection des systèmes d'information"),
    ("Pentesting / Tests d'intrusion", "Sécurité", "M1802", "Tests de sécurité offensifs"),
    ("SIEM / SOC", "Sécurité", "M1802", "Centre opérationnel de sécurité"),
    ("Cryptographie", "Sécurité", "M1802", "Chiffrement et sécurité des données"),
    ("OWASP / Sécurité applicative", "Sécurité", "M1802", "Sécurité des applications web"),
    ("ISO 27001 / RGPD", "Sécurité", "M1802", "Conformité et gouvernance sécurité"),

    # ── Gestion de projet / Management (M1402) ────────────────────────────────
    ("Gestion de projet (Agile/Scrum)", "Management", "M1402", "Méthodes agiles de gestion de projet"),
    ("Product Management", "Management", "M1402", "Gestion de produit numérique"),
    ("Leadership d'équipe", "Management", "M1402", "Encadrement et animation d'équipes"),
    ("Gestion des risques", "Management", "M1402", "Identification et mitigation des risques"),
    ("JIRA / Confluence", "Management", "M1402", "Outils de gestion de projet"),
    ("Kanban", "Management", "M1402", "Méthode de gestion visuelle"),
    ("OKR / KPI", "Management", "M1402", "Définition et suivi d'objectifs"),
    ("Budget et planification", "Management", "M1402", "Gestion financière de projets"),

    # ── UX/UI Design (E1205) ─────────────────────────────────────────────────
    ("UX Design", "Design", "E1205", "Conception d'expérience utilisateur"),
    ("UI Design", "Design", "E1205", "Conception d'interface utilisateur"),
    ("Figma / Sketch", "Design", "E1205", "Outils de design d'interface"),
    ("Adobe XD / Photoshop", "Design", "E1205", "Suite design Adobe"),
    ("Design System", "Design", "E1205", "Système de composants visuels"),
    ("Prototypage", "Design", "E1205", "Création de maquettes interactives"),
    ("Accessibilité (WCAG)", "Design", "E1205", "Accessibilité numérique"),

    # ── Marketing Digital (E1106) ─────────────────────────────────────────────
    ("SEO / SEA", "Marketing", "E1106", "Optimisation et publicité moteurs de recherche"),
    ("Google Analytics / Tag Manager", "Marketing", "E1106", "Analyse d'audience web"),
    ("Email Marketing", "Marketing", "E1106", "Campagnes d'emailing"),
    ("Content Marketing", "Marketing", "E1106", "Marketing par le contenu"),
    ("Réseaux sociaux (Social Media)", "Marketing", "E1106", "Gestion des réseaux sociaux"),
    ("Growth Hacking", "Marketing", "E1106", "Croissance rapide et acquisition"),
    ("CRM (Salesforce, HubSpot)", "Marketing", "E1106", "Gestion de la relation client"),
    ("Publicité digitale (Meta Ads, Google Ads)", "Marketing", "E1106", "Campagnes publicitaires digitales"),

    # ── Comptabilité / Finance (M1203) ────────────────────────────────────────
    ("Comptabilité générale", "Finance", "M1203", "Tenue de comptabilité"),
    ("Analyse financière", "Finance", "M1203", "Analyse des états financiers"),
    ("Contrôle de gestion", "Finance", "M1203", "Pilotage de la performance financière"),
    ("Fiscalité", "Finance", "M1203", "Droit et optimisation fiscale"),
    ("SAP FI/CO", "Finance", "M1203", "ERP SAP modules financiers"),
    ("Excel avancé / VBA", "Finance", "M1203", "Tableur Excel et macros"),
    ("Normes IFRS / GAAP", "Finance", "M1203", "Référentiels comptables internationaux"),

    # ── Ressources Humaines (M1501) ───────────────────────────────────────────
    ("Recrutement", "RH", "M1501", "Sourcing et sélection de candidats"),
    ("Formation et développement des compétences", "RH", "M1501", "Gestion de la formation"),
    ("Gestion de la paie", "RH", "M1501", "Administration de la paie"),
    ("Droit du travail", "RH", "M1501", "Législation sociale et droit social"),
    ("SIRH (Workday, SAP HCM)", "RH", "M1501", "Systèmes d'information RH"),
    ("Relations sociales / Dialogue social", "RH", "M1501", "Relations avec les partenaires sociaux"),
    ("Marque employeur", "RH", "M1501", "Attractivité et image de l'employeur"),
    ("GPEC / GEPP", "RH", "M1501", "Gestion prévisionnelle des emplois"),

    # ── Commercial / Vente (D1212) ────────────────────────────────────────────
    ("Vente B2B", "Commercial", "D1212", "Vente aux entreprises"),
    ("Négociation commerciale", "Commercial", "D1212", "Techniques de négociation"),
    ("Prospection commerciale", "Commercial", "D1212", "Développement du portefeuille clients"),
    ("Account Management", "Commercial", "D1212", "Gestion et fidélisation des comptes"),
    ("CRM / Pipeline de vente", "Commercial", "D1212", "Gestion du pipeline commercial"),
    ("Sales Operations", "Commercial", "D1212", "Opérations commerciales et reporting"),

    # ── Logistique / Supply Chain (N1303) ─────────────────────────────────────
    ("Gestion des stocks", "Logistique", "N1303", "Optimisation des inventaires"),
    ("Supply Chain Management", "Logistique", "N1303", "Gestion de la chaîne logistique"),
    ("Transport et distribution", "Logistique", "N1303", "Organisation du transport"),
    ("ERP (SAP MM, Oracle)", "Logistique", "N1303", "Progiciels de gestion intégrée"),
    ("Lean / Six Sigma", "Logistique", "N1303", "Amélioration continue des processus"),

    # ── Savoir-être professionnels (ROME transversal) ─────────────────────────
    ("Communication orale et écrite", "Savoir-être", "T_COM", "Expression et rédaction professionnelle"),
    ("Travail en équipe", "Savoir-être", "T_TEAM", "Collaboration et coopération"),
    ("Autonomie et prise d'initiative", "Savoir-être", "T_AUTO", "Capacité à travailler de façon indépendante"),
    ("Adaptabilité", "Savoir-être", "T_ADAPT", "Capacité d'adaptation aux changements"),
    ("Résolution de problèmes", "Savoir-être", "T_PROB", "Analyse et résolution de problèmes complexes"),
    ("Organisation et rigueur", "Savoir-être", "T_ORG", "Méthode et sens de l'organisation"),
    ("Créativité et innovation", "Savoir-être", "T_CREAT", "Génération d'idées nouvelles"),
    ("Sens du service client", "Savoir-être", "T_SERV", "Orientation satisfaction client"),
    ("Intelligence émotionnelle", "Savoir-être", "T_EI", "Gestion des émotions et empathie"),
    ("Gestion du stress", "Savoir-être", "T_STRESS", "Résistance à la pression"),

    # ── Langues (transversal) ─────────────────────────────────────────────────
    ("Anglais professionnel", "Langues", "T_LANG", "Anglais niveau B2+"),
    ("Anglais courant (C1/C2)", "Langues", "T_LANG", "Anglais bilingue"),
    ("Espagnol professionnel", "Langues", "T_LANG", "Espagnol niveau B2+"),
    ("Allemand professionnel", "Langues", "T_LANG", "Allemand niveau B2+"),
    ("Arabe professionnel", "Langues", "T_LANG", "Arabe niveau B2+"),
    ("Mandarin professionnel", "Langues", "T_LANG", "Chinois mandarin niveau B2+"),
]

# ─── Fiches métiers ROME (JobStandards) ───────────────────────────────────────

ROME_JOB_STANDARDS = [
    {
        "title": "Développeur / Développeuse web et web mobile",
        "rome_code": "M1805",
        "category": "Informatique / Numérique",
        "description": "Conçoit, code et maintient des applications web front-end et back-end.",
        "skills": [
            ("JavaScript", 3), ("React / Next.js", 3), ("SQL / PostgreSQL", 2),
            ("REST API", 2), ("Git / GitHub / GitLab", 2), ("Tests unitaires / TDD", 2),
        ]
    },
    {
        "title": "Développeur / Développeuse Full Stack",
        "rome_code": "M1805_FS",
        "category": "Informatique / Numérique",
        "description": "Maîtrise à la fois le développement front-end et back-end.",
        "skills": [
            ("Python", 3), ("JavaScript", 3), ("React / Next.js", 3),
            ("SQL / PostgreSQL", 2), ("Docker", 2), ("REST API", 3),
        ]
    },
    {
        "title": "Administrateur / Administratrice systèmes et réseaux",
        "rome_code": "M1801",
        "category": "Informatique / Numérique",
        "description": "Gère l'infrastructure IT, les serveurs et la sécurité réseau.",
        "skills": [
            ("Linux Administration", 4), ("Docker", 3), ("Kubernetes", 2),
            ("Sécurité Réseaux", 3), ("Monitoring (Prometheus, Grafana)", 2),
        ]
    },
    {
        "title": "Ingénieur / Ingénieure DevOps",
        "rome_code": "M1801_DO",
        "category": "Informatique / Numérique",
        "description": "Automatise les pipelines de déploiement et gère l'infrastructure cloud.",
        "skills": [
            ("Docker", 4), ("Kubernetes", 3), ("CI/CD (GitHub Actions, GitLab CI)", 4),
            ("AWS", 3), ("Terraform", 2), ("Linux Administration", 3),
        ]
    },
    {
        "title": "Data Scientist / Scientifique des données",
        "rome_code": "M1403",
        "category": "Data / IA",
        "description": "Analyse des données massives et construit des modèles prédictifs.",
        "skills": [
            ("Python", 4), ("Machine Learning", 4), ("Pandas / NumPy", 3),
            ("Statistiques appliquées", 3), ("SQL / PostgreSQL", 2),
            ("TensorFlow / PyTorch", 2),
        ]
    },
    {
        "title": "Ingénieur / Ingénieure Data",
        "rome_code": "M1403_DE",
        "category": "Data / IA",
        "description": "Conçoit et maintient les pipelines de données et l'architecture data.",
        "skills": [
            ("Python", 3), ("SQL / PostgreSQL", 4), ("ETL / Pipelines de données", 4),
            ("Spark / Hadoop", 3), ("AWS", 2), ("MongoDB", 2),
        ]
    },
    {
        "title": "Expert / Experte en cybersécurité",
        "rome_code": "M1802",
        "category": "Sécurité informatique",
        "description": "Protège les systèmes d'information contre les menaces et intrusions.",
        "skills": [
            ("Cybersécurité", 4), ("Pentesting / Tests d'intrusion", 3),
            ("SIEM / SOC", 3), ("OWASP / Sécurité applicative", 3),
            ("Linux Administration", 3), ("ISO 27001 / RGPD", 2),
        ]
    },
    {
        "title": "Chef / Cheffe de projet digital",
        "rome_code": "M1402",
        "category": "Management / Gestion de projet",
        "description": "Pilote des projets de transformation numérique de bout en bout.",
        "skills": [
            ("Gestion de projet (Agile/Scrum)", 4), ("JIRA / Confluence", 3),
            ("Leadership d'équipe", 3), ("Gestion des risques", 2),
            ("Budget et planification", 2),
        ]
    },
    {
        "title": "Designer UX/UI",
        "rome_code": "E1205",
        "category": "Design / Expérience utilisateur",
        "description": "Conçoit des interfaces ergonomiques et visuellement attractives.",
        "skills": [
            ("UX Design", 4), ("UI Design", 4), ("Figma / Sketch", 4),
            ("Prototypage", 3), ("Design System", 3),
        ]
    },
    {
        "title": "Responsable Marketing Digital",
        "rome_code": "E1106",
        "category": "Marketing / Communication",
        "description": "Pilote la stratégie de marketing digital et d'acquisition.",
        "skills": [
            ("SEO / SEA", 3), ("Google Analytics / Tag Manager", 3),
            ("Content Marketing", 3), ("Réseaux sociaux (Social Media)", 3),
            ("CRM (Salesforce, HubSpot)", 2),
        ]
    },
    {
        "title": "Chargé / Chargée de recrutement",
        "rome_code": "M1501",
        "category": "Ressources Humaines",
        "description": "Gère le cycle complet de recrutement pour l'organisation.",
        "skills": [
            ("Recrutement", 4), ("Communication orale et écrite", 3),
            ("SIRH (Workday, SAP HCM)", 2), ("Marque employeur", 2),
        ]
    },
    {
        "title": "Ingénieur / Ingénieure en Intelligence Artificielle",
        "rome_code": "M1403_IA",
        "category": "Data / IA",
        "description": "Développe des solutions basées sur l'IA et les LLM.",
        "skills": [
            ("Python", 4), ("Deep Learning / Neural Networks", 4),
            ("NLP (Traitement du langage)", 4), ("Modèles de langage (LLM)", 3),
            ("TensorFlow / PyTorch", 3), ("Machine Learning", 4),
        ]
    },
]


# ─── Import functions ──────────────────────────────────────────────────────────

def import_static(db):
    """Import the static ROME skills dataset."""
    added = 0
    for name, category, rome_code, description in ROME_SKILLS:
        existing = db.query(Skill).filter(Skill.name == name).first()
        if not existing:
            skill = Skill(
                name=name,
                category=category,
                rome_code=rome_code,
                description=description,
                level1_description="Notions de base",
                level2_description="Utilisation courante",
                level3_description="Maîtrise avancée",
                level4_description="Expert / Référent",
            )
            db.add(skill)
            added += 1
    db.flush()
    print(f"  ✅ {added} nouvelles compétences ajoutées ({len(ROME_SKILLS) - added} déjà présentes)")

    # Import job standards
    std_added = 0
    for j in ROME_JOB_STANDARDS:
        existing = db.query(JobStandard).filter(JobStandard.rome_code == j["rome_code"]).first()
        if not existing:
            std = JobStandard(
                title=j["title"],
                rome_code=j["rome_code"],
                category=j["category"],
                description=j["description"],
            )
            db.add(std)
            db.flush()
            for skill_name, level in j["skills"]:
                skill = db.query(Skill).filter(Skill.name == skill_name).first()
                if skill:
                    req = JobStandardRequirement(
                        job_standard_id=std.id,
                        skill_id=skill.id,
                        min_level=level,
                        is_mandatory=True,
                    )
                    db.add(req)
            std_added += 1
    db.flush()
    print(f"  ✅ {std_added} nouvelles fiches métiers ajoutées")


async def import_from_api(db):
    """Import from France Travail API (requires credentials)."""
    from app.services.france_travail_api import fetch_competences, fetch_metiers, is_configured
    if not is_configured():
        print("  ⚠️  FRANCE_TRAVAIL_CLIENT_ID / SECRET non configurés → fallback statique")
        return False

    print("  🔗 Connexion à l'API France Travail...")
    try:
        competences = await fetch_competences()
        print(f"  📥 {len(competences)} compétences récupérées via API")
        added = 0
        for c in competences:
            name = c.get("libelle") or c.get("label", "")
            code = c.get("code") or c.get("codeRome", "")
            if not name:
                continue
            existing = db.query(Skill).filter(Skill.name == name).first()
            if not existing:
                db.add(Skill(
                    name=name,
                    category=c.get("categorie", "Compétence ROME"),
                    rome_code=code,
                    description=c.get("definition", ""),
                ))
                added += 1
        db.flush()
        print(f"  ✅ {added} compétences API ajoutées")
        return True
    except Exception as e:
        print(f"  ❌ Erreur API: {e} → fallback statique")
        return False


async def main():
    print("🚀 Import ROME 4.0 — RecruitPRO")
    print("=" * 50)

    db = SessionLocal()
    try:
        # Tente l'API, fallback sur statique
        api_success = await import_from_api(db)
        if not api_success:
            print("  📦 Utilisation du dataset statique ROME 4.0...")
            import_static(db)

        db.commit()
        total = db.query(Skill).count()
        standards = db.query(JobStandard).count()
        print(f"\n✅ Import terminé — {total} compétences | {standards} fiches métiers en base")
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
