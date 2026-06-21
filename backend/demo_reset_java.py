"""Remet l'état de démo « boucle vivante / Java » à zéro pour refilmer.

Avant chaque prise :
  - Houssine (emp 8, candidat 21) : compétence Java (51) ramenée à niveau 1
  - Sophie  (emp 9)               : Java au niveau requis (2) — détentrice de référence
  - tout autre détenteur Java de company 9 sous le niveau requis -> 2

Résultat GPEC attendu : Java « partiel » (en tension) AVANT la formation de Houssine,
puis « ok » (couvert) APRÈS la réussite de son examen final (qui le fait passer 1 -> 2).

Usage :  venv\\Scripts\\python.exe demo_reset_java.py
"""
from app.core.database import SessionLocal
from app.models.employee import Employee, EmployeeSkill
from app.models.candidate import CandidateSkill

SKILL_JAVA = 51
REQUIRED = 2
COMPANY = 9
HOUSSINE_EMP = 8
HOUSSINE_CANDIDATE = 21
SOPHIE_EMP = 9


def main() -> None:
    db = SessionLocal()
    try:
        emp_ids = [e.id for e in db.query(Employee).filter(Employee.company_id == COMPANY).all()]

        def upsert_emp(eid: int, lvl: int) -> None:
            es = (
                db.query(EmployeeSkill)
                .filter(EmployeeSkill.employee_id == eid, EmployeeSkill.skill_id == SKILL_JAVA)
                .first()
            )
            if es:
                es.level = lvl
            else:
                db.add(EmployeeSkill(employee_id=eid, skill_id=SKILL_JAVA, level=lvl))

        # Houssine -> niveau 1 (employé + candidat)
        upsert_emp(HOUSSINE_EMP, 1)
        cs = (
            db.query(CandidateSkill)
            .filter(CandidateSkill.candidate_id == HOUSSINE_CANDIDATE, CandidateSkill.skill_id == SKILL_JAVA)
            .first()
        )
        if cs:
            cs.level = 1
        else:
            db.add(CandidateSkill(candidate_id=HOUSSINE_CANDIDATE, skill_id=SKILL_JAVA, level=1, years_experience=1))

        # Sophie -> au niveau requis
        upsert_emp(SOPHIE_EMP, REQUIRED)

        # Tout autre détenteur sous le niveau requis -> REQUIRED (pour un partiel -> ok propre)
        holders = (
            db.query(EmployeeSkill)
            .filter(EmployeeSkill.employee_id.in_(emp_ids), EmployeeSkill.skill_id == SKILL_JAVA)
            .all()
        )
        for es in holders:
            if es.employee_id not in (HOUSSINE_EMP, SOPHIE_EMP) and (es.level or 0) < REQUIRED:
                es.level = REQUIRED

        db.commit()

        # Rapport
        holders = {
            es.employee_id: es.level
            for es in db.query(EmployeeSkill)
            .filter(EmployeeSkill.employee_id.in_(emp_ids), EmployeeSkill.skill_id == SKILL_JAVA)
            .all()
        }
        employees_with = len(holders)
        at_level = len([1 for lvl in holders.values() if lvl >= REQUIRED])
        if at_level == 0:
            status = "critique"
        elif at_level < 2 or employees_with > at_level:
            status = "partiel"
        else:
            status = "ok"
        print("Détenteurs Java (company 9):", holders)
        print(f"Statut GPEC Java AVANT formation Houssine : {status}  (attendu: partiel)")
        print("=> Lance la démo : Houssine passe l'examen -> Java 1->2 -> GPEC devient 'ok'.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
