/**
 * Stato di login condiviso tra i componenti del marketplace.
 * Il token vive in un cookie httpOnly: qui ci limitiamo a chiedere al
 * backend "chi sono?" (il cookie viaggia da solo con la richiesta).
 */

let _mePromise = null;

/** Utente loggato (oggetto user, senza password) o null se non autenticato. */
export function getCurrentUser() {
  if (!_mePromise) {
    _mePromise = fetch('/api/auth/me', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return _mePromise;
}

/** Da chiamare dopo login/logout per invalidare la cache in memoria. */
export function resetCurrentUser() {
  _mePromise = null;
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } finally {
    resetCurrentUser();
  }
}
