import json
from groq import Groq
from app.core.config import settings
import fitz  # PyMuPDF

# Initialisation Groq
client = Groq(api_key=settings.GROQ_API_KEY)

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extraire le texte brut d'un fichier PDF."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        print(f"Erreur extraction PDF: {e}")
        return ""

async def parse_cv_with_ai(cv_text: str) -> dict:
    """
    Analyse le CV avec un LLM (Llama 3.3 via Groq) pour extraire des données structurées.
    """
    if not cv_text:
        return None

    prompt = f"""Analyse le texte suivant extrait d'un CV et extrais les informations au format JSON uniquement.

Structure attendue :
{{
    "first_name": "...", "last_name": "...", "email": "...", "phone": "...",
    "years_of_experience": 0.0,
    "education_level": 0,
    "skills": [ {{ "name": "...", "level": 1, "years_experience": 0.0 }} ],
    "bio_summary": "...",
    "experience_detail": "...",
    "formations": "...",
    "certifications": "..."
}}

education_level : entier 0-8 par rapport au système français. (Ex : 2=Bac, 3=Bac+2, 5=Bac+5/Master, 8=Doctorat). 
Important : Le Master est Bac+5. Ne dépasse 5 que pour un MBA (6) ou Doctorat (8).
skill level : entier 1-4 (1=débutant, 4=expert).
formations : Texte court résumant les diplômes et dates.
certifications : Liste des certifs ou formations courtes (ex: AWS, Google, etc).
Réponds UNIQUEMENT avec le JSON.

Texte du CV :
---
{cv_text[:4000]}
---
"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        return json.loads(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Erreur parsing IA: {e}")
        # Fallback basique ou retour None
        return None

async def parse_text_skills(text: str, context: str = "experience") -> dict:
    """Extrait des compétences spécifiques à partir d'un bloc de texte libre."""
    prompt = f"""Analyse ce bloc de texte ({context}) et extrais les compétences techniques et soft skills.
Pour chaque compétence, trouve le code ROME le plus proche si possible.

Structure attendue :
{{
    "skills": [ {{ "name": "...", "level": 1, "years_experience": 0.0, "rome_code": "..." }} ],
    "experience_years_extracted": 0.0
}}

Texte : {text[:2000]}
Réponds uniquement en JSON.
"""
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.1
        )
        return json.loads(response.choices[0].message.content)
    except:
        return {{"skills": [], "experience_years_extracted": 0.0}}
