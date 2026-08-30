/**
 * Visibilità dei contenuti: etichette e colori condivisi da card e modali.
 *
 * Le descrizioni (item) hanno tre livelli nel campo `license`
 * (Public/Reserved/Private), le visite solo due nel booleano `is_public`:
 * `visitLicense()` riporta il booleano sullo stesso vocabolario, così la
 * pillola è identica ovunque — griglia descrizioni, visit-card, item-modal
 * e visit-modal — e l'utente riconosce la visibilità dal colore.
 */

import { TAG_PILL } from '/marketplace/js/ui-tokens.js';

export const LICENSE_LABELS = { Public: 'Pubblica', Reserved: 'Riservata', Private: 'Privata' };

// Solo colore di testo e bordo: la forma della pillola la mette chi la usa
// (TAG_PILL nelle card/item-modal, la pillola arrotondata del visit-modal).
export const LICENSE_COLOR = {
  private:  'text-rose-500 dark:text-rose-400 border-rose-400/40',
  reserved: 'text-sky-600 dark:text-sky-400 border-sky-400/40',
  public:   'text-slate-600 dark:text-slate-300 border-slate-400/30',
};

export function licenseColor(license) {
  return LICENSE_COLOR[String(license || 'public').toLowerCase()] || LICENSE_COLOR.public;
}

export function licenseLabel(license) {
  return LICENSE_LABELS[license] || license || '';
}

/** Pillola standard (stessa forma dei tag) già completa di colore. */
export function licensePillClass(license) {
  return `${TAG_PILL} ${licenseColor(license)}`;
}

/** Visite: `is_public` → lo stesso vocabolario delle descrizioni. */
export function visitLicense(isPublic) {
  return isPublic === false ? 'Private' : 'Public';
}
