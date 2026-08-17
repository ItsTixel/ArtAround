/**
 * Normalizza un'opera (Entity) API → formato usato da <opera-card>.
 * Condiviso tra js/opere.js (catalogo pubblico) e js/profile.js
 * (pannello "Opere" del profilo) per evitare due mapping divergenti.
 *
 * `favoritedIds` è un Set di id (stringa) delle opere salvate tra i
 * preferiti dall'utente corrente.
 */
export function normalizeEntity(e, favoritedIds = new Set()) {
  const museums = (e.placements || []).map(p => {
    const m = (typeof p.museum === 'object' && p.museum !== null) ? p.museum : {};
    return { id: m._id || p.museum, name: m.name || '', city: m.address?.city || '' };
  });
  return {
    id:            e._id,
    name:          e.name || '',
    artworkAuthor: e.artwork_author || '',
    description:   e.description || '',
    imageUrl:      e.image_url || '',
    isPhysical:    !!e.is_physical,
    tags:          e.tags || [],
    museums,
    favorited:     favoritedIds.has(String(e._id)),
  };
}
