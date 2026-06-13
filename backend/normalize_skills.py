"""
Normalise skills.rome_code et skills.category dans la base de données.
Stratégie : statique → API France Travail → keywords → existant → "Autre"

Usage:
    python normalize_skills.py            # applique les changements
    python normalize_skills.py --dry-run  # aperçu sans écriture
    python normalize_skills.py --no-api   # force le mode hors ligne
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.skill import Skill

# ─── Référentiel statique skill → ROME ────────────────────────────────────────

NAME_TO_ROME: dict[str, str] = {
    # Développement web / fullstack
    "python": "M1805", "django": "M1805", "flask": "M1805", "fastapi": "M1805",
    "javascript": "M1805", "typescript": "M1805", "node.js": "M1805", "nodejs": "M1805",
    "react": "M1805", "vue.js": "M1805", "vuejs": "M1805", "angular": "M1805",
    "next.js": "M1805", "nextjs": "M1805", "svelte": "M1805",
    "html": "M1805", "css": "M1805", "tailwind": "M1805", "bootstrap": "M1805",
    "php": "M1805", "laravel": "M1805", "symfony": "M1805",
    "ruby": "M1805", "rails": "M1805", "ruby on rails": "M1805",
    "java": "M1805", "spring": "M1805", "spring boot": "M1805",
    "kotlin": "M1805", "swift": "M1805", "flutter": "M1805", "dart": "M1805",
    "c#": "M1805", ".net": "M1805", "asp.net": "M1805",
    "c++": "M1805", "c": "M1805", "rust": "M1805", "go": "M1805", "golang": "M1805",
    "scala": "M1805", "elixir": "M1805", "haskell": "M1805",
    # Data / ML / IA
    "machine learning": "M1403", "deep learning": "M1403", "nlp": "M1403",
    "tensorflow": "M1403", "pytorch": "M1403", "keras": "M1403",
    "scikit-learn": "M1403", "pandas": "M1403", "numpy": "M1403",
    "data science": "M1403", "data analysis": "M1403",
    "sql": "M1403", "postgresql": "M1403", "mysql": "M1403", "sqlite": "M1403",
    "mongodb": "M1403", "redis": "M1403", "elasticsearch": "M1403",
    "tableau": "M1403", "power bi": "M1403", "looker": "M1403",
    "spark": "M1403", "hadoop": "M1403", "kafka": "M1403", "airflow": "M1403",
    "dbt": "M1403", "snowflake": "M1403", "bigquery": "M1403",
    # DevOps / infra / Cloud
    "docker": "M1810", "kubernetes": "M1810", "helm": "M1810",
    "terraform": "M1810", "ansible": "M1810", "puppet": "M1810",
    "aws": "M1810", "azure": "M1810", "gcp": "M1810", "google cloud": "M1810",
    "linux": "M1810", "bash": "M1810", "shell": "M1810",
    "nginx": "M1810", "apache": "M1810",
    "ci/cd": "M1810", "github actions": "M1810", "gitlab ci": "M1810",
    "jenkins": "M1810", "travis ci": "M1810",
    # Sécurité
    "cybersecurity": "M1802", "sécurité informatique": "M1802",
    "penetration testing": "M1802", "pentest": "M1802",
    "owasp": "M1802", "siem": "M1802", "soc": "M1802",
    # Gestion de projet / méthodes
    "agile": "M1302", "scrum": "M1302", "kanban": "M1302", "jira": "M1302",
    "project management": "M1302", "gestion de projet": "M1302",
    "prince2": "M1302", "pmp": "M1302",
    # Design / UX
    "figma": "E1205", "sketch": "E1205", "adobe xd": "E1205",
    "ux design": "E1205", "ui design": "E1205", "wireframing": "E1205",
    "photoshop": "E1205", "illustrator": "E1205",
    # Communication / marketing
    "seo": "M1705", "sem": "M1705", "google ads": "M1705",
    "marketing digital": "M1705", "content marketing": "M1705",
    "copywriting": "M1705",
    # Management / organisation
    "project management": "M1302", "gestion de projet": "M1302",
    "product management": "M1302", "product manager": "M1302",
    "leadership": "M1302", "leadership d'équipe": "M1302",
    "account management": "D1212", "account manager": "D1212",
    # Supply chain / logistique
    "supply chain management": "N1303", "supply chain": "N1303",
    # Design / UX (noms composés)
    "ui/ux design": "E1205", "ux/ui design": "E1205",
    # Marketing digital (analytics)
    "google analytics": "E1401", "google analytics / tag manager": "E1401",
    "google analytics / ga4": "E1401", "tag manager": "E1401",
    "social media management": "E1106", "social media": "E1106",
    # Communication / soft skills
    "communication orale": "M1604", "communication orale et écrite": "M1604",
    "communication écrite": "M1604",
    "travail en équipe": "K1802", "teamwork": "K1802",
    # Langues
    "english": "K1802", "french": "K1802", "anglais": "K1802", "français": "K1802",
}

ROME_DOMAINS: dict[str, str] = {
    "A": "Agriculture", "B": "Arts et spectacles", "C": "Banque et assurances",
    "D": "Commerce et distribution", "E": "Communication / Multimédia",
    "F": "Construction / BTP", "G": "Hôtellerie / Tourisme",
    "H": "Industrie", "I": "Installation / Maintenance",
    "J": "Santé", "K": "Services à la personne",
    "L": "Spectacle", "M": "Informatique / Gestion", "N": "Transport / Logistique",
}

ROME_SUBDOMAINS: dict[str, str] = {
    "M1805": "Développement logiciel", "M1803": "Développement web",
    "M1403": "Data / IA", "M1810": "DevOps / Cloud", "M1802": "Cybersécurité",
    "M1302": "Management & Organisation", "M1705": "Marketing digital",
    "M1604": "Communication & Relations", "M1203": "Finance & Comptabilité",
    "M1202": "Audit & Contrôle", "M1402": "Conseil & Gestion",
    "M1501": "Ressources humaines", "M1502": "Formation",
    "M1806": "Data Engineering", "M1801": "Infrastructure & Cloud",
    "E1205": "Design / UX", "E1106": "Marketing & Communication digitale",
    "E1401": "Études & Analytics", "E1205": "Design / UX",
    "D1212": "Commerce & Vente", "N1303": "Logistique & Supply Chain",
    "K1802": "Soft skills & Langues",
    "H1206": "Électronique", "H1208": "Industrie & Automatisme",
}


def static_rome(name: str) -> str | None:
    return NAME_TO_ROME.get(name.lower().strip())


def keyword_rome(name: str) -> str | None:
    n = name.lower()
    if any(k in n for k in ["data", "sql", "bi ", "analytics", "analyse"]):
        return "M1403"
    if any(k in n for k in ["devops", "cloud", "infra", "ops", "deploy"]):
        return "M1810"
    if any(k in n for k in ["secur", "cyber", "hack", "pentest"]):
        return "M1802"
    if any(k in n for k in ["design", "ux", "ui ", "figma", "proto"]):
        return "E1205"
    if any(k in n for k in ["market", "seo", "content", "growth"]):
        return "M1705"
    if any(k in n for k in ["dev", "code", "program", "script", "api", "web", "app"]):
        return "M1805"
    return None


def label_for_rome(rome: str) -> str:
    sub = ROME_SUBDOMAINS.get(rome)
    if sub:
        return sub
    domain = ROME_DOMAINS.get(rome[0].upper() if rome else "")
    return domain or "Autre"


def resolve_rome(skill: Skill, use_api: bool) -> tuple[str | None, str]:
    """Returns (rome_code, category_label)."""
    name = skill.name or ""

    # 1. Statique
    rome = static_rome(name)
    if rome:
        return rome, label_for_rome(rome)

    # 2. API France Travail (seulement si configurée et champ vide)
    if use_api and not skill.rome_code:
        try:
            from app.services.rome_api import search_rome_code
            rome = search_rome_code(name)
            if rome:
                return rome, label_for_rome(rome)
        except Exception:
            pass

    # 3. Keywords
    rome = keyword_rome(name)
    if rome:
        return rome, label_for_rome(rome)

    # 4. Existant en DB
    if skill.rome_code:
        return skill.rome_code, label_for_rome(skill.rome_code)

    return None, "Autre"


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    use_api = "--no-api" not in sys.argv

    db = SessionLocal()
    try:
        skills = db.query(Skill).all()
        print(f"{'[DRY RUN] ' if dry_run else ''}Normalisation de {len(skills)} compétences\n")

        changed = 0
        unknown = []

        for skill in skills:
            rome, category = resolve_rome(skill, use_api)
            old_rome = skill.rome_code or ""
            old_cat = skill.category or ""

            if rome != old_rome or category != old_cat:
                print(
                    f"  {'~' if dry_run else '✓'} {skill.name!r:30s}"
                    f"  ROME: {old_rome or '—':8s} → {rome or '—':8s}"
                    f"  Catégorie: {old_cat!r} → {category!r}"
                )
                if not dry_run:
                    skill.rome_code = rome
                    skill.category = category
                changed += 1
            else:
                print(f"  = {skill.name!r:30s}  {rome or '—':8s}  {category!r}")

            if not rome:
                unknown.append(skill.name)

        if not dry_run:
            db.commit()
            print(f"\n✅ {changed} compétences mises à jour.")
        else:
            print(f"\n[DRY RUN] {changed} compétences seraient modifiées.")

        if unknown:
            print(f"\n⚠️  {len(unknown)} compétences sans ROME :")
            for n in unknown:
                print(f"   - {n!r}")
    finally:
        db.close()


if __name__ == "__main__":
    main()


