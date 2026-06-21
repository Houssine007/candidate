"""
Client léger pour l'API ROME 4.0 (France Travail / francetravail.io).

Utilisé en FALLBACK par la normalisation des skills : quand un skill n'est pas
dans le mapping statique, on interroge l'API pour deviner son code ROME.

Robustesse : si les credentials sont absents ou si l'API échoue (réseau, quota,
endpoint), toutes les fonctions renvoient None SANS lever d'exception — la
normalisation continue alors avec le seul mapping statique.

Authentification : OAuth2 client_credentials.
  - ROME_CLIENT_ID / ROME_CLIENT_SECRET   (depuis francetravail.io)
  - ROME_SCOPE, ROME_TOKEN_URL, ROME_API_BASE  configurables dans config.py

⚠️ Les endpoints / scopes exacts dépendent des API souscrites sur ton compte
francetravail.io. Les valeurs par défaut visent l'API "ROME 4.0 - Métiers".
Ajuste ROME_SCOPE / ROME_API_BASE si ton abonnement diffère.
"""
import time
import logging
from typing import Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache mémoire du token (évite de re-authentifier à chaque appel)
_token_cache = {"value": None, "expires_at": 0.0}

# Limiteur de débit : l'API ROME 4.0 est plafonnée à 1 appel/seconde.
# On garantit un intervalle minimal entre deux requêtes data pour éviter les 429.
_MIN_INTERVAL = 1.1
_last_call = {"at": 0.0}


def _throttle() -> None:
    now = time.time()
    wait = _MIN_INTERVAL - (now - _last_call["at"])
    if wait > 0:
        time.sleep(wait)
    _last_call["at"] = time.time()


def _is_configured() -> bool:
    return bool(settings.ROME_CLIENT_ID and settings.ROME_CLIENT_SECRET)


def get_access_token() -> Optional[str]:
    """Retourne un token OAuth valide (avec cache), ou None si non configuré/échec."""
    if not _is_configured():
        return None

    now = time.time()
    if _token_cache["value"] and now < _token_cache["expires_at"]:
        return _token_cache["value"]

    try:
        resp = requests.post(
            settings.ROME_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": settings.ROME_CLIENT_ID,
                "client_secret": settings.ROME_CLIENT_SECRET,
                "scope": settings.ROME_SCOPE,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token")
        expires_in = int(data.get("expires_in", 1500))
        if token:
            # marge de sécurité de 60s
            _token_cache["value"] = token
            _token_cache["expires_at"] = now + max(expires_in - 60, 60)
            return token
    except Exception as e:
        logger.warning(f"[ROME] échec authentification : {e}")
    return None


def search_rome_code(skill_name: str) -> Optional[str]:
    """
    Cherche le code ROME le plus pertinent pour un nom de compétence/métier.
    Renvoie un code (ex. 'M1805') ou None si rien trouvé / API indisponible.
    """
    if not skill_name or not _is_configured():
        return None

    token = get_access_token()
    if not token:
        return None

    try:
        _throttle()  # respecte la limite 1 appel/seconde de l'API ROME
        # Recherche libre par métier : endpoint `/metier/requete?q=...`
        # (le simple GET /metiers ne supporte pas ?q= et renvoie 404).
        resp = requests.get(
            settings.ROME_API_BASE.rstrip("/") + "/metier/requete",
            params={"q": skill_name},
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json()

        # Réponse : {"totalResultats": N, "resultats": [{"code": "M1434", ...}, ...]}
        items = results.get("resultats") if isinstance(results, dict) else results
        if isinstance(items, list) and items:
            first = items[0]
            code = (
                first.get("code")
                or first.get("metier", {}).get("code")
                or first.get("romeCode")
            )
            if code:
                return str(code).strip().upper()
    except Exception as e:
        logger.warning(f"[ROME] recherche échouée pour '{skill_name}': {e}")
    return None


def fetch_metier_competences(rome_code: str) -> Optional[dict]:
    """
    Récupère les compétences mobilisées par un métier ROME (détail métier).
    Renvoie {'libelle', 'principales': [...], 'emergentes': [...], 'toutes': [...]}
    (libellés ROME), ou None si non configuré / indisponible / code inconnu.

    Sert à l'auto-alimentation du référentiel de compétences cibles (GPEC prévisionnelle).
    """
    if not rome_code or not _is_configured():
        return None
    token = get_access_token()
    if not token:
        return None
    try:
        _throttle()  # 1 appel/seconde
        resp = requests.get(
            settings.ROME_API_BASE.rstrip("/") + f"/metier/{rome_code.strip().upper()}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=10,
        )
        if resp.status_code == 404:
            logger.warning(f"[ROME] métier introuvable : {rome_code}")
            return None
        resp.raise_for_status()
        d = resp.json()

        def _names(key: str) -> list:
            out = []
            for c in (d.get(key) or []):
                lib = c.get("libelle")
                if lib:
                    out.append(lib.strip())
            return out

        return {
            "libelle": d.get("libelle"),
            "principales": _names("competencesMobiliseesPrincipales"),
            "emergentes": _names("competencesMobiliseesEmergentes"),
            "toutes": _names("competencesMobilisees"),
        }
    except Exception as e:
        logger.warning(f"[ROME] détail métier échoué pour '{rome_code}': {e}")
    return None
