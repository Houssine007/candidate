"""
Client pour l'API France Travail (ex Pôle Emploi) — ROME 4.0
Documentation : https://francetravail.io/data/api/rome-metiers

Inscription gratuite sur francetravail.io pour obtenir client_id / client_secret.
"""
import httpx
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from ..core.config import settings

TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token"
API_BASE = "https://api.francetravail.io/partenaire/rome-metiers/v1"

_token_cache: Dict[str, Any] = {"token": None, "expires_at": None}


async def _get_token() -> Optional[str]:
    """Obtenir un token OAuth2 France Travail (mis en cache)."""
    if not settings.FRANCE_TRAVAIL_CLIENT_ID or not settings.FRANCE_TRAVAIL_CLIENT_SECRET:
        return None

    now = datetime.utcnow()
    if _token_cache["token"] and _token_cache["expires_at"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            TOKEN_URL,
            params={"realm": "/partenaire"},
            data={
                "grant_type": "client_credentials",
                "client_id": settings.FRANCE_TRAVAIL_CLIENT_ID,
                "client_secret": settings.FRANCE_TRAVAIL_CLIENT_SECRET,
                "scope": "api_rome-metiersv1",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        _token_cache["token"] = data["access_token"]
        _token_cache["expires_at"] = now + timedelta(seconds=data.get("expires_in", 1200) - 60)
        return _token_cache["token"]


async def fetch_domaines() -> List[Dict]:
    """Récupère les domaines professionnels ROME."""
    token = await _get_token()
    if not token:
        return []
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/domaineProfessionnel",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_metiers(code_domaine: Optional[str] = None) -> List[Dict]:
    """Récupère les fiches métiers ROME, optionnellement filtrées par domaine."""
    token = await _get_token()
    if not token:
        return []
    params = {}
    if code_domaine:
        params["codeDomaineProfessionnel"] = code_domaine
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{API_BASE}/metier",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params,
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_competences(code_metier: Optional[str] = None) -> List[Dict]:
    """Récupère les compétences ROME, optionnellement liées à un métier."""
    token = await _get_token()
    if not token:
        return []
    params = {}
    if code_metier:
        params["codeRome"] = code_metier
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{API_BASE}/competence",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            params=params,
        )
        resp.raise_for_status()
        return resp.json()


def is_configured() -> bool:
    return bool(settings.FRANCE_TRAVAIL_CLIENT_ID and settings.FRANCE_TRAVAIL_CLIENT_SECRET)
