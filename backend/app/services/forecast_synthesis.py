"""
Synthèse RH en langage naturel de la GPEC prévisionnelle.

Principe (cf. architecture validée) : l'IA générative est cantonnée à la
RESTITUTION. Elle ne calcule rien — elle met en mots des faits déjà produits
par le moteur déterministe (`forecast.py`). Zéro hallucination de chiffres :
on lui interdit d'inventer des nombres et on fournit un repli déterministe.
"""
from typing import Tuple
from ..core.config import settings

_STATUS_FR = {"critique": "critique", "partiel": "partiel", "couvert": "couvert"}


def _facts(f: dict) -> str:
    """Résumé factuel compact passé au modèle (ou utilisé tel quel en repli)."""
    lines = [
        f"Effectif total : {f['headcount']}.",
        f"Emplois-types cibles suivis : {f['targets_count']}.",
        f"Indice de couverture des besoins futurs : {f['coverage_index']}% "
        f"(objectif {f['coverage_target']}%).",
        f"Cibles en tension : {f['tension_count']}.",
        "Détail par emploi-type cible :",
    ]
    for r in f["roles"]:
        emj = ", ".join(e["skill"] for e in r.get("emergent_skills", [])
                        if e.get("holders_at_level", 0) == 0)
        emj_txt = f" Compétences d'avenir non couvertes : {emj}." if emj else ""
        lines.append(
            f"- {r['role']} (horizon {r['horizon'] or 'n.d.'}) : effectif cible {r['target_headcount']}, "
            f"qualifiés {r['qualified_count']}, potentiels internes {r['potential_count']}, "
            f"écart {r['gap']}, statut {_STATUS_FR.get(r['status'], r['status'])}.{emj_txt}"
        )
    return "\n".join(lines)


def _fallback(f: dict) -> str:
    """Synthèse déterministe (sans LLM) — toujours disponible."""
    crit = [r for r in f["roles"] if r["status"] == "critique"]
    part = [r for r in f["roles"] if r["status"] == "partiel"]
    parts = [
        f"Le taux de couverture des besoins futurs s'établit à {f['coverage_index']} % "
        f"pour un objectif de {f['coverage_target']} %, avec {f['tension_count']} "
        f"emploi(s)-type(s) cible(s) en tension sur {f['targets_count']}."
    ]
    if crit:
        noms = ", ".join(f"{r['role']} (écart de {r['gap']})" for r in crit)
        parts.append(
            f"Priorité critique : {noms} — aucun collaborateur ne couvre aujourd'hui ce besoin, "
            f"un recrutement externe est à envisager à court terme."
        )
    if part:
        noms = ", ".join(
            f"{r['role']} ({r['qualified_count']}/{r['target_headcount']}, "
            f"{r['potential_count']} potentiels internes)" for r in part
        )
        parts.append(
            f"Tensions partielles : {noms}. Ces écarts peuvent être comblés en priorité "
            f"par la formation des collaborateurs à fort potentiel identifiés."
        )
    total_gap = f["total_gap"]
    parts.append(
        f"Au total, {total_gap} poste(s) restent à pourvoir pour atteindre les cibles, "
        f"par recrutement ou montée en compétences."
    )
    return " ".join(parts)


def build_synthesis(f: dict) -> Tuple[str, str]:
    """Retourne (texte, source) où source ∈ {'groq', 'fallback'}."""
    if not f["roles"]:
        return ("Aucun emploi-type cible n'est encore défini : ajoutez des cibles "
                "d'effectif pour obtenir une analyse prévisionnelle.", "fallback")

    facts = _facts(f)
    if settings.GROQ_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.GROQ_API_KEY,
                            base_url="https://api.groq.com/openai/v1")
            system = (
                "Tu es un consultant RH expert en GPEC (gestion prévisionnelle des emplois et "
                "des compétences). Tu rédiges une synthèse de pilotage concise et professionnelle "
                "en français, à partir de DONNÉES FACTUELLES fournies. "
                "RÈGLES STRICTES : n'invente AUCUN chiffre, nom ou métier ; utilise uniquement les "
                "faits donnés ; ne te répète pas ; 120 à 180 mots ; pas de listes à puces, un texte "
                "fluide en 2-3 paragraphes ; termine par une recommandation d'action "
                "(former / recruter) priorisée."
            )
            user = (
                "Voici l'état de la couverture prévisionnelle des besoins en compétences. "
                "Rédige la synthèse de pilotage RH :\n\n" + facts
            )
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": system},
                          {"role": "user", "content": user}],
                temperature=0.3,
                max_tokens=500,
            )
            text = (resp.choices[0].message.content or "").strip()
            if text:
                return text, "groq"
        except Exception as e:  # réseau, quota, etc.
            print(f"[forecast_synthesis] Groq indisponible, repli déterministe : {e}")

    return _fallback(f), "fallback"


def _mobility_fallback(a: dict) -> str:
    """Explication de mobilité déterministe (sans LLM)."""
    atouts = ", ".join(h["skill"] for h in a["have"]) or "aucune compétence cible encore au niveau"
    manques = ", ".join(f"{d['skill']} (niveau {d['actual']}→{d['required']})" for d in a["to_develop"])
    statut = ("déjà qualifié(e) pour ce métier"
              if a["qualified"] else f"transformable (potentiel {round(a['potential_score'] or 0)}/100)")
    txt = (f"{a['name']} ({a['job_title']}) est {statut} vers « {a['role']} ». "
           f"Atouts mobilisables : {atouts}.")
    if manques:
        txt += f" Compétences à renforcer : {manques}."
    return txt


def build_mobility_explanation(a: dict) -> Tuple[str, str]:
    """Explique la proximité d'un collaborateur vers un métier cible (restitution LLM).
    NE prescrit AUCUNE formation nommée : décrit l'écart, l'entreprise conçoit ses parcours."""
    if settings.GROQ_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.GROQ_API_KEY,
                            base_url="https://api.groq.com/openai/v1")
            atouts = ", ".join(f"{h['skill']} (niveau {h['level']})" for h in a["have"]) or "(aucune compétence cible encore au niveau requis)"
            manques = ", ".join(f"{d['skill']} (niveau actuel {d['actual']}, requis {d['required']})" for d in a["to_develop"]) or "(aucune)"
            system = (
                "Tu es un consultant RH en mobilité interne et GPEC. Tu rédiges une courte "
                "évaluation de la proximité d'un collaborateur vis-à-vis d'un métier cible, en "
                "français, à partir de FAITS fournis. RÈGLES STRICTES : 60 à 90 mots ; n'invente "
                "aucun chiffre ni compétence ; NE CITE AUCUNE formation, cours ou organisme précis "
                "(l'entreprise conçoit elle-même ses parcours) ; décris seulement les compétences à "
                "renforcer ; ton factuel et utile à une décision RH."
            )
            user = (
                f"Collaborateur : {a['name']} ({a['job_title']}).\n"
                f"Métier cible : {a['role']} (horizon {a.get('horizon') or 'n.d.'}).\n"
                f"Statut : {'déjà qualifié' if a['qualified'] else 'potentiel ' + str(round(a['potential_score'] or 0)) + '/100'}.\n"
                f"Compétences déjà au niveau : {atouts}.\n"
                f"Compétences à développer : {manques}.\n\n"
                "Rédige l'évaluation de mobilité."
            )
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": system},
                          {"role": "user", "content": user}],
                temperature=0.3, max_tokens=300,
            )
            text = (resp.choices[0].message.content or "").strip()
            if text:
                return text, "groq"
        except Exception as e:
            print(f"[mobility] Groq indisponible, repli déterministe : {e}")
    return _mobility_fallback(a), "fallback"
