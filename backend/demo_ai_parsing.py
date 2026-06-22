import asyncio
import os
import sys
from dotenv import load_dotenv

# Ajouter le chemin du projet pour importer les services
sys.path.append(os.getcwd())

load_dotenv()

from app.services.cv_service import parse_cv_with_ai, parse_text_skills

# Texte d'exemple d'un CV fictif
SAMPLE_CV = """
Jean Dupont
jean.dupont@email.com | 06 12 34 56 78
Développeur Senior Full Stack

Expériences :
- Tech Lead chez StartUpX (2020 - Présent) : Management d'une équipe de 5 personnes, architecture Next.js et FastAPI. Mise en place de CI/CD sur AWS.
- Développeur Java chez BigCorp (2017 - 2020) : Développement de microservices avec Spring Boot et Angular.

Formation :
- Master en Informatique (Bac+5), Université de Paris (2017)

Compétences : React, Python, Docker, Kubernetes, SQL, Anglais Courant.
"""

async def run_demo():
    print("--- DÉBUT DE LA DÉMONSTRATION IA ---")
    
    # 1. Parsing global du CV
    print("\n[Étape 1] Parsing global du CV avec Llama 3.3...")
    result = await parse_cv_with_ai(SAMPLE_CV)
    
    import json
    print("\nRésultat du parsing JSON :")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # 2. Focus sur l'extraction de compétences
    print("\n[Étape 2] Extraction approfondie des compétences d'un bloc de texte...")
    BIO_TEXT = "Passionné par l'IA et le Cloud, j'ai 5 ans d'expérience en Python et j'ai travaillé sur des modèles de NLP."
    skills_extracted = await parse_text_skills(BIO_TEXT, context="bio")
    
    print("\nCompétences détectées dans la bio :")
    print(json.dumps(skills_extracted, indent=2, ensure_ascii=False))
    
    print("\n--- FIN DE LA DÉMONSTRATION ---")

if __name__ == "__main__":
    asyncio.run(run_demo())
