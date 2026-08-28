/* ============================================================
 *  download-json.js — Innesca il download di un oggetto come
 *  file .json nel browser. Usato dai form che accettano JSON in
 *  caricamento (stile della visita, indicazioni delle mappe del
 *  museo) per offrire anche lo scarico dei dati attuali, così da
 *  poterli modificare e ricaricare.
 * ============================================================ */

export function downloadJson(data, filename) {
  const name = filename.endsWith('.json') ? filename : `${filename}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* Slug minimale per un nome file leggibile: minuscole, accenti
 * rimossi, gruppi di caratteri non alfanumerici ridotti a "-".
 * Stringa vuota -> fallback. */
export function slugForFilename(text, fallback = 'dati') {
  const slug = String(text ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}
