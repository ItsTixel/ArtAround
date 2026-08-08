/* ============================================================
 *  visits.js — lista visite con filtraggio e paginazione server-side
 *  Stessa struttura di museums.js: ogni cambio filtro = nuova fetch.
 * ============================================================ */

const API_VISITS  = '/api/visits';
const API_MUSEUMS = '/api/museums';
const PAGE_SIZE   = 12;

const state = {
  page:        0,
  sort:        'recommended',
  title:       '',
  museumIds:   [],
  price:       'all',
  durationMax: null,   /* null = nessun filtro; altrimenti minuti */
  tags:        [],
  total:       0,
};

let allMuseums     = [];
let maxDurationMin = 240;
let heroStatsSet   = false;

/* ---- Costruisce la query e fetcha dal backend ---- */
async function fetchVisits() {
  const params = new URLSearchParams({
    pageSize: PAGE_SIZE,
    page:     state.page,
    sort:     state.sort,
  });

  if (state.title)            params.set('title',       state.title);
  if (state.museumIds.length) params.set('museum',      state.museumIds.join(','));
  if (state.price !== 'all')  params.set('price',       state.price);
  if (state.durationMax)      params.set('durationMax', state.durationMax);
  if (state.tags.length)      params.set('tags',        state.tags.join(','));

  const res = await fetch(`${API_VISITS}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* Immagine di default: quella della prima opera (per ordine di tappa) che ne ha una */
function firstOperaImage(steps = []) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  return sorted.find(s => s.entity?.image_url)?.entity?.image_url || '';
}

/* ---- Normalizza un oggetto visita API → formato usato dalla card ---- */
function normalizeVisit(v) {
  const museumDetails = (v.museum || []).map(m => {
    const obj = (typeof m === 'object' && m !== null) ? m : {};
    return {
      id:    obj._id  || m,
      name:  obj.name || '',
      short: obj.name || '',
      city:  obj.address?.city || '',
    };
  });
  return {
    id:            v._id,
    title:         v.title                  || '',
    description:   v.description            || '',
    durationSec:   v.estimated_duration_sec || 0,
    steps:         v.steps?.length          || 0,
    basePrice:     v.base_price             || 0,
    tags:          v.tags                   || [],
    museums:       museumDetails.map(m => m.id),
    museumDetails,
    placeholderTag: v.title || `Visita ${v._id}`,
    image:         firstOperaImage(v.steps),
  };
}

/* ---- Render griglia card ---- */
function renderGrid(visits) {
  const grid = document.getElementById('visits-grid');
  grid.innerHTML = '';
  if (visits.length === 0) {
    grid.innerHTML = '<p class="empty">Nessuna visita trovata. Prova a rimuovere qualche filtro.</p>';
    return;
  }
  visits.forEach(v => {
    const card = document.createElement('visit-card');
    card.data = normalizeVisit(v);
    grid.appendChild(card);
  });
}

/* ---- Paginazione ---- */
function renderPagination(totalItems, pageSize, page) {
  const container = document.getElementById('pagination');
  if (!container) return;
  container.innerHTML = '';
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return;

  if (page > 0) {
    const btn = document.createElement('button');
    btn.textContent = '← Precedente';
    btn.addEventListener('click', () => load(page - 1));
    container.appendChild(btn);
  }

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `Pagina ${page + 1} di ${totalPages}`;
  container.appendChild(info);

  if (page < totalPages - 1) {
    const btn = document.createElement('button');
    btn.textContent = 'Successiva →';
    btn.addEventListener('click', () => load(page + 1));
    container.appendChild(btn);
  }
}

/* ---- Contatori ---- */
function updateResultsCount(total) {
  const el = document.getElementById('results-count');
  if (!el) return;
  const s = total === 1;
  el.textContent = `${total} visit${s ? 'a' : 'e'} disponibil${s ? 'e' : 'i'}`;
}

function updateHeroStats(total) {
  if (heroStatsSet) return;
  const el = document.getElementById('hero-total');
  if (el) el.textContent = `${total} percorsi · ${allMuseums.length} musei`;
  heroStatsSet = true;
}

/* ---- Caricamento pagina ---- */
async function load(page = 0) {
  state.page = page;
  const grid = document.getElementById('visits-grid');
  grid.innerHTML = '<p class="loading"></p>';

  try {
    const { data, totalItems, pageSize } = await fetchVisits();
    state.total = totalItems;
    renderGrid(data);
    renderPagination(totalItems, pageSize, page);
    updateResultsCount(totalItems);
    updateHeroStats(totalItems);
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Failed to fetch visits:', e);
  }
}

/* ---- Facets per la sidebar (fetch separata, senza filtri attivi) ---- */
async function loadFacets() {
  const res = await fetch(`${API_VISITS}?pageSize=100`);
  if (!res.ok) return { tags: [], maxDurationMin: 240 };
  const { data } = await res.json();

  const tagCounts = {};
  data.forEach(v => {
    (v.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  const tags = Object.entries(tagCounts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const durationsMin = data.map(v => (v.estimated_duration_sec || 0) / 60).filter(d => d > 0);
  const maxRaw = durationsMin.length ? Math.max(...durationsMin) : 60;
  maxDurationMin = Math.max(60, Math.ceil(maxRaw / 30) * 30);

  return { tags, maxDurationMin };
}

/* ============================================================
 *  Bootstrap
 * ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('visits-grid');
  if (grid) grid.innerHTML = '<p class="loading"></p>';

  /* Le visit-card aprono il menù in sovraimpressione con i dettagli */
  document.addEventListener('open-visit', (e) => {
    document.querySelector('visit-modal')?.open(e.detail.id);
  });

  try {
    const [musRes, facets] = await Promise.all([
      fetch(`${API_MUSEUMS}?pageSize=100&sort=name`).then(r => r.json()),
      loadFacets(),
    ]);
    allMuseums     = musRes.data || [];
    maxDurationMin = facets.maxDurationMin;

    const sidebar = document.querySelector('filter-sidebar');
    sidebar.data = {
      museums: allMuseums.map(m => ({
        id:    m._id,
        name:  m.name,
        short: m.name,
        city:  m.address?.city || '',
      })),
      tones:          [],
      tags:           facets.tags,
      maxDurationMin,
    };

    sidebar.addEventListener('filters-change', (e) => {
      const { museumIds, price, durationMax, tags } = e.detail;
      state.museumIds   = museumIds || [];
      state.price       = price     || 'all';
      state.durationMax = (durationMax && durationMax < maxDurationMin) ? durationMax : null;
      state.tags        = tags      || [];
      load(0);
    });
  } catch (e) {
    console.error('Errore nel caricamento della sidebar:', e);
  }

  /* Ricerca testuale → param ?title= al backend */
  let searchTimer;
  document.getElementById('search-visit').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.title = e.target.value.trim();
      load(0);
    }, 320);
  });

  /* Ordinamento → param ?sort= al backend */
  document.getElementById('sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    load(0);
  });

  /* URL param ?museum=<ObjectId> → pre-seleziona il museo nella sidebar */
  const params   = new URLSearchParams(location.search);
  const urlMusId = params.get('museum');
  if (urlMusId && allMuseums.length) {
    let matchedId = allMuseums.find(m => m._id === urlMusId)?._id || null;
    if (!matchedId) {
      const hint = (params.get('museumName') || '').toLowerCase();
      if (hint) {
        const found = allMuseums.find(m =>
          m.name.toLowerCase().includes(hint) || hint.includes(m.name.toLowerCase())
        );
        if (found) matchedId = found._id;
      }
    }
    if (matchedId) {
      document.querySelector('filter-sidebar').setMuseumSelection([matchedId]);
      return;
    }
  }

  load(0);
});
