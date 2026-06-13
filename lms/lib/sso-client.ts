// Pont SSO côté client : le LMS est un service de la plateforme RH (RecruitPRO).
// L'utilisateur s'authentifie sur la plateforme RH (port 3000) ; le token JWT RH
// est transmis au LMS (port 3001) via le paramètre d'URL `?token=`, puis stocké
// localement. Aucune page de login propre au LMS.

export const RH_BASE_URL =
  process.env.NEXT_PUBLIC_RH_URL || 'http://localhost:3000';

export const RH_LOGIN_URL = `${RH_BASE_URL}/login`;

// Récupère le token depuis l'URL (?token=) si présent, le persiste et nettoie l'URL.
// Retourne le token courant (URL ou localStorage), ou null.
export function captureSsoToken(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    localStorage.setItem('token', urlToken);
    // Nettoyage de l'URL pour ne pas laisser traîner le token
    params.delete('token');
    const clean =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : '');
    window.history.replaceState({}, '', clean);
    return urlToken;
  }

  return localStorage.getItem('token');
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// Redirige vers le login de la plateforme RH en mémorisant la destination LMS.
export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const back = encodeURIComponent(window.location.href);
  window.location.href = `${RH_LOGIN_URL}?redirect=${back}`;
}
