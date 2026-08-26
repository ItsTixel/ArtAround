import { slugify } from './slug'

// Percorso della home di scelta visite per un museo specifico, come slug del
// nome (non l'id, per un URL leggibile). SelectVisit.jsx lo risolve di nuovo
// a un museo con una GET a /api/museums. Senza un museo noto ripiega sulla
// home generica delle visite.
export function museumVisitPath(museum) {
  const slug = slugify(museum?.name)
  if (!slug) return '/visite'
  return `/visite/${slug}`
}
