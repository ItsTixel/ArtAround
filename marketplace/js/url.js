/* ============================================================
 *  url.js — Sanificazione degli URL forniti dall'utente prima di
 *  inserirli in un attributo `href`.
 *
 *  Opere (external_links) e musei (website) accettano URL liberi
 *  digitati dall'autore. Interpolati in `href` tramite escaping HTML
 *  soltanto, un valore come `javascript:…` o `data:text/html,…`
 *  resterebbe intatto ed eseguibile al click: l'escaping impedisce di
 *  uscire dall'attributo, non di usare uno schema pericoloso.
 * ============================================================ */

/* Schemi ammessi in un link cliccabile del catalogo. Tutto il resto
 * (javascript:, data:, vbscript:, blob:, file:…) viene rifiutato. */
const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

/**
 * Restituisce una versione dell'URL sicura da mettere in `href`, oppure
 * stringa vuota se il valore non è utilizzabile: il chiamante, trovando
 * '', non renderizza affatto il link.
 *
 * - Un valore senza schema esplicito ("www.museo.it", "museo.it/sala")
 *   viene interpretato come `https://…`, comportamento atteso per un
 *   campo "sito web".
 * - Un valore con schema non consentito, o non parsabile come URL,
 *   restituisce ''.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function safeExternalUrl(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';

  // `scheme:` iniziale = URL assoluto; altrimenti lo si tratta come host
  // relativo a https (i campi del form si aspettano un sito completo).
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const candidate = hasScheme ? value : `https://${value}`;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return '';
  }
  return SAFE_URL_SCHEMES.has(url.protocol) ? candidate : '';
}
