// Slug leggibile per l'URL a partire dal nome di un museo (es. "Galleria
// degli Uffizi" -> "galleria-degli-uffizi"). Nessun campo slug nel DB: si
// genera qui e si risolve al volo lato client (vedi museumVisit.js).
const DIACRITICS_RE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g'
)

export function slugify(name) {
  return (name || '')
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
