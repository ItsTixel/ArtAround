// Stessa chiave e stesse regole di marketplace/js/theme.js: tema condiviso
// (via localStorage) tra marketplace e navigator, anche se questo modulo è
// duplicato — navigator è un bundle Vite a parte e non può importare un
// path assoluto servito dal backend del marketplace.
const STORAGE_KEY = 'artaround-theme';

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage non disponibile
  }
}

export function toggleTheme() {
  setTheme(getTheme() === 'light' ? 'dark' : 'light');
  return getTheme();
}
