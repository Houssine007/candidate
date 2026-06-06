import fitz  # PyMuPDF
import json
import re
from typing import Dict, Any
from openai import AsyncOpenAI
from ..core.config import settings

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text()
    except Exception as e:
        print(f"Erreur extraction PDF: {str(e)}")
    return text

def heuristic_parse_cv(text: str) -> Dict[str, Any]:
    data = {
        "first_name": "", "last_name": "", "email": "", "phone": "",
        "years_of_experience": 0.0, "education_level": 0,
        "skills": [], "bio_summary": "Extrait brut (IA non disponible)", "experience_detail": ""
    }
    emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if emails: data["email"] = emails[0]
    phones = re.findall(r'(\+?\d[\d\s-]{8,}\d)', text)
    if phones: data["phone"] = phones[0]
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if lines:
        name_parts = lines[0].split()
        if len(name_parts) >= 2:
            data["first_name"] = name_parts[0]
            data["last_name"] = " ".join(name_parts[1:])
    exp_match = re.search(r'(\d+)[\s-]*(ans|year)', text, re.IGNORECASE)
    if exp_match:
        data["years_of_experience"] = float(exp_match.group(1))
    return data

async def parse_cv_with_ai(cv_text: str) -> Dict[str, Any]:
    """Use Groq (llama-3.3-70b) to extract structured info from a CV."""
    if not settings.GROQ_API_KEY:
        print("❌ GROQ_API_KEY manquante dans .env")
        return heuristic_parse_cv(cv_text)

    client = AsyncOpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )

    prompt = f"""Analyse le texte suivant extrait d'un CV et extrais les informations au format JSON uniquement.

Structure attendue :
{{
    "first_name": "...", "last_name": "...", "email": "...", "phone": "...",
    "years_of_experience": 0.0,
    "education_level": 0,
    "skills": [ {{ "name": "...", "level": 1, "years_experience": 0.0 }} ],
    "bio_summary": "...",
    "experience_detail": "..."
}}

education_level : entier 0-8 (ex: 5 pour Bac+5 / Master).
skill level : entier 1-4 (1=débutant, 4=expert).
Réponds UNIQUEMENT avec le JSON.

Texte du CV :
---
{cv_text}
---"""

    try:
        print("Parsing CV avec Groq (llama-3.3-70b-versatile)...")
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048,
        )
        content = response.choices[0].message.content or ""
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        data = json.loads(content.strip())
        print("✅ Parsing CV réussi avec Groq")
        return data
    except Exception as e:
        print(f"❌ Échec Groq: {e}")
        return heuristic_parse_cv(cv_text)

async def parse_text_skills(text: str, context: str = "experience") -> Dict[str, Any]:
    """Use Groq to extract ROME skills from a free-text block."""
    if not settings.GROQ_API_KEY:
        return {"skills_detected": [], "years_experience_detected": 0, "domaines_metier": []}

    client = AsyncOpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )

    prompt = f"""Analyse ce texte ({context}) et extrais les informations structurées au format JSON uniquement.

Structure attendue :
{{
    "skills_detected": [
        {{ "name": "Nom compétence", "rome_code": "D1234 ou null", "level_suggested": 1 }}
    ],
    "years_experience_detected": 0,
    "domaines_metier": ["Développement logiciel"]
}}

Réponds UNIQUEMENT avec le JSON.

Texte :
---
{text}
---"""

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1024,
        )
        content = response.choices[0].message.content or ""
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        return json.loads(content.strip())
    except Exception as e:
        print(f"❌ parse_text_skills error: {e}")
        return {"skills_detected": [], "years_experience_detected": 0, "domaines_metier": []}
