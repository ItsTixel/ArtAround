/**
 * Gestione tema chiaro/scuro, condivisa da tutte le pagine.
 * Persistita in localStorage così la scelta vale su ogni pagina.
 * Il flash iniziale è evitato dallo snippet inline in <head> di ogni
 * pagina, che applica il tema salvato prima del primo paint: questo
 * modulo si limita a tenere sincronizzati stato, storage e listener.
 */

const STORAGE_KEY = 'artaround-theme';

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage non disponibile */ }
}

export function toggleTheme() {
  setTheme(getTheme() === 'light' ? 'dark' : 'light');
  return getTheme();
}
