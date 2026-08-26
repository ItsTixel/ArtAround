// Percorso della home di scelta visite per un museo specifico — stesso
// formato costruito da Home.jsx quando si seleziona un museo (query string
// ?museum=<id>&museumName=<nome>), letto da SelectVisit.jsx per filtrare le
// liste. Senza un museo noto ripiega sulla home generica delle visite.
export function museumVisitPath(museum) {
  if (!museum?._id) return '/visite'
  const params = new URLSearchParams({ museum: museum._id, museumName: museum.name || '' })
  return `/visite?${params}`
}
