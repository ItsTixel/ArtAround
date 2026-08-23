/**
 * Focus trap condiviso dai popup modali (item/opera/museum/visit-modal).
 * Ogni modale ricostruisce il proprio markup con `_render()` mentre è
 * aperto (cambio tab, stato di caricamento, submit…), quindi qui il
 * dialog va sempre interrogato al bisogno (`getDialog()`) invece di
 * essere salvato in una variabile: un riferimento cacheato punterebbe
 * a un nodo già rimosso dal DOM dopo il re-render successivo.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function focusableElements(dialog) {
  return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null);
}

/**
 * Da richiamare dal keydown handler già in ascolto su document (lo stesso
 * che gestisce Escape): se il tasto è Tab, tiene il focus dentro il dialog
 * corrente invece di farlo uscire sulla pagina sottostante.
 */
export function trapTabKey(e, getDialog) {
  if (e.key !== 'Tab') return;
  const dialog = getDialog();
  if (!dialog) return;

  const items = focusableElements(dialog);
  if (!items.length) { e.preventDefault(); return; }

  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;

  if (e.shiftKey) {
    if (active === first || !dialog.contains(active)) { e.preventDefault(); last.focus(); }
  } else if (active === last || !dialog.contains(active)) {
    e.preventDefault();
    first.focus();
  }
}

/** Porta il focus sul primo elemento interattivo del dialog appena aperto. */
export function focusDialog(dialog) {
  if (!dialog) return;
  const [first] = focusableElements(dialog);
  (first || dialog).focus();
}
