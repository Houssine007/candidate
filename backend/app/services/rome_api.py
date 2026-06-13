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
        resp = requests.get(
            settings.ROME_API_BASE,
            params={"q": skill_name},
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json()

        # L'API peut renvoyer une liste de métiers ; on prend le code du 1er.
        if isinstance(results, list) and results:
            first = results[0]
            code = (
                first.get("code")
                or first.get("metier", {}).get("code")
                or first.get("romeCode")
            )
            if code:
                return str(code).strip().upper()
        elif isinstance(results, dict):
            code = results.get("code")
            if code:
                return str(code).strip().upper()
    except Exception as e:
        logger.warning(f"[ROME] recherche échouée pour '{skill_name}': {e}")
    return None
