import fitz  # PyMuPDF
import google.generativeai as genai
import json
import os
import re
from typing import Dict, Any, Optional
from ..core.config import settings

def extract_text_from_pdf(file_path: str) -> str:
    """Extraire le texte brut d'un fichier PDF."""
    text = ""
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text()
    except Exception as e:
        print(f"Erreur extraction PDF: {str(e)}")
    return text

def heuristic_parse_cv(text: str) -> Dict[str, Any]:
    """Analyse simple par expressions régulières (fallback sans IA)."""
    data = {
        "first_name": "",
        "last_name": "",
        "email": "",
        "phone": "",
        "years_of_experience": 0.0,
        "education_level": 0,
        "skills": [],
        "bio_summary": "Extrait brut (IA non disponible)",
        "experience_detail": ""
    }
    
    # Email
    emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if emails: data["email"] = emails[0]
    
    # Phone (simple)
    phones = re.findall(r'(\+?\d[\d\s-]{8,}\d)', text)
    if phones: data["phone"] = phones[0]
    
    # Extraction sommaire du nom (souvent en haut)
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if lines:
        name_parts = lines[0].split()
        if len(name_parts) >= 2:
            data["first_name"] = name_parts[0]
            data["last_name"] = " ".join(name_parts[1:])
            
    # Expérience (cherche des chiffres près de "ans" ou "exp")
    exp_match = re.search(r'(\d+)[\s-]*(ans|year)', text, re.IGNORECASE)
    if exp_match:
        data["years_of_experience"] = float(exp_match.group(1))
        
    return data

async def parse_cv_with_ai(cv_text: str) -> Dict[str, Any]:
    """Utiliser Gemini pour extraire des informations structurées du CV."""
    if not settings.GOOGLE_API_KEY:
        print("❌ Erreur : GOOGLE_API_KEY est manquante dans .env")
        return {}

    genai.configure(api_key=settings.GOOGLE_API_KEY)
    
    # Liste des modèles par ordre de préférence (Flash est plus rapide/gratuit)
    models_to_try = [
        'gemini-flash-latest', 
        'gemini-1.5-flash', 
        'gemini-2.0-flash', 
        'gemini-2.0-flash-lite',
        'gemini-pro-latest'
    ]

    prompt = f"""
    Analyse le texte suivant extrait d'un CV et extrais les informations de manière structurée au format JSON uniquement.
    
    Structure attendue :
    {{
        "first_name": "...",
        "last_name": "...",
        "email": "...",
        "phone": "...",
        "years_of_experience": 0.0,
        "education_level": 0, // 0-8 (ex: 5 pour Bac+5)
        "skills": [
            {{ "name": "Nom de la compétence", "level": 1-4, "years_experience": 0.0 }}
        ],
        "bio_summary": "Un court résumé professionnel",
        "experience_detail": "Résumé des expériences principales"
    }}

    Texte du CV :
    ---
    {cv_text}
    ---
    """

    last_error = ""
    for model_name in models_to_try:
        try:
            print(f"Tentative de parsing avec le modèle : {model_name}...")
            model = genai.GenerativeModel(model_name)
            response = await model.generate_content_async(prompt)
            
            content = response.text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            data = json.loads(content.strip())
            print(f"✅ Parsing réussi avec {model_name}")
            return data
            
        except Exception as e:
            last_error = str(e)
            print(f"❌ Échec avec {model_name}: {last_error}")
            # Si c'est une erreur de quota (429), on continue vers le modèle suivant
            # Si c'est une erreur de modèle non trouvé (404), on continue aussi
            continue
            
    print(f"⚠️ Tous les modèles IA ont échoué. Utilisation du parser heuristique local.")
    return heuristic_parse_cv(cv_text)
