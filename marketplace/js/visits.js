/* ============================================================
 *  visits.js — lista visite con filtraggio e paginazione server-side
 *  Stessa struttura di museums.js: ogni cambio filtro = nuova fetch.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { TONE_ORDER, TONE_LABELS } from '/marketplace/js/tone-labels.js';
import { slugify } from '/marketplace/js/slug.js';

const API_VISITS  = '/api/visits';
const API_MUSEUMS = '/api/museums';
const API_USERS   = '/api/users';
const LOGIN_URL   = '/marketplace/login.html';
const PAGE_SIZE   = 12;

const state = {
  page:        0,
  sort:        'recommended',
  title:       '',
  museumIds:   [],
  price:       'all',
  durationMax: null,   /* null = nessun filtro; altrimenti minuti */
  tags:        [],
  tones:       [],
  accessible:  false,
  total:       0,
};

let allMuseums     = [];
let maxDurationMin = 240;
let ownedIds        = new Set();
let favoritedIds     = new Set();
let currentUserId    = null;

/* ---- Costruisce la query e fetcha dal backend ---- */
async function fetchVisits() {
  const params = new URLSearchParams({
    pageSize: PAGE_SIZE,
    page:     state.page,
    sort:     state.sort,
    is_group: false,
  });

  if (state.title)            params.set('title',       state.title);
  if (state.museumIds.length) params.set('museum',      state.museumIds.join(','));
  if (state.price !== 'all')  params.set('price',       state.price);
  if (state.durationMax)      params.set('durationMax', state.durationMax);
  if (state.tags.length)      params.set('tags',        state.tags.join(','));
  if (state.tones.length)     params.set('tones',       state.tones.join(','));
  if (state.accessible)       params.set('accessible',  'true');

  const res = await fetch(`${API_VISITS}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* Immagini delle opere della visita, in ordine di tappa (per il carosello della card) */
function operaImages(steps = []) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const seen = new Set();
  const images = [];
  for (const s of sorted) {
    const url = s.entity?.image_url;
    if (url && !seen.has(url)) { seen.add(url); images.push({ url, alt: s.entity.alt_text || s.entity.name || '' }); }
  }
  return images;
}

/* Toni presenti tra le descrizioni delle opere della visita: un tono compare
 * se almeno un'opera di uno step lo usa, così si intuisce a colpo d'occhio
 * il target della visita (bambini, esperti, ...). */
function visitTones(steps = []) {
  const present = new Set();
  steps.forEach(s => (s.items || []).forEach(it => { if (it?.tone) present.add(it.tone); }));
  return TONE_ORDER.filter(t => present.has(t));
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
    images:        operaImages(v.steps),
    tones:         visitTones(v.steps),
    owned:         ownedIds.has(String(v._id)),
    favorited:     favoritedIds.has(String(v._id)),
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

function updateHeroStats(total, museumCount) {
  const el = document.getElementById('hero-total');
  /* Con un filtro museo attivo il conteggio riflette i musei selezionati,
   * non i musei distinti tra i risultati (che può includere musei "di passaggio"
   * nei percorsi inframuseali collegati al filtro). */
  const count = state.museumIds.length ? state.museumIds.length : museumCount;
  if (el) el.textContent = `${total} percorsi · ${count} musei`;
}

/* ---- Caricamento pagina ---- */
async function load(page = 0) {
  state.page = page;
  const grid = document.getElementById('visits-grid');
  grid.innerHTML = '<p class="loading"></p>';

  try {
    const { data, totalItems, museumCount, pageSize } = await fetchVisits();
    state.total = totalItems;
    renderGrid(data);
    renderPagination(totalItems, pageSize, page);
    updateResultsCount(totalItems);
    updateHeroStats(totalItems, museumCount);
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Failed to fetch visits:', e);
  }
}

/* ---- Facets per la sidebar (fetch separata, senza filtri attivi) ---- */
async function loadFacets() {
  const res = await fetch(`${API_VISITS}?pageSize=100`);
  if (!res.ok) return { tags: [], tones: [], maxDurationMin: 240 };
  const { data } = await res.json();

  const tagCounts = {};
  data.forEach(v => {
    (v.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  const tags = Object.entries(tagCounts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const toneCounts = {};
  data.forEach(v => {
    visitTones(v.steps).forEach(t => { toneCounts[t] = (toneCounts[t] || 0) + 1; });
  });
  const tones = TONE_ORDER
    .filter(t => toneCounts[t])
    .map(value => ({ value, label: TONE_LABELS[value] || value, count: toneCounts[value] }));

  const durationsMin = data.map(v => (v.estimated_duration_sec || 0) / 60).filter(d => d > 0);
  const maxRaw = durationsMin.length ? Math.max(...durationsMin) : 60;
  maxDurationMin = Math.max(60, Math.ceil(maxRaw / 30) * 30);

  return { tags, tones, maxDurationMin };
}

/* Ricalcola i conteggi "Linguaggio" tenendo conto degli altri filtri attivi
 * (museo, prezzo, durata, titolo, temi), ma non del filtro tono stesso:
 * altrimenti selezionare un tono azzererebbe il conteggio degli altri. */
async function refreshToneCounts() {
  const params = new URLSearchParams({ pageSize: 100 });
  if (state.title)            params.set('title',       state.title);
  if (state.museumIds.length) params.set('museum',      state.museumIds.join(','));
  if (state.price !== 'all')  params.set('price',       state.price);
  if (state.durationMax)      params.set('durationMax', state.durationMax);
  if (state.tags.length)      params.set('tags',        state.tags.join(','));
  if (state.accessible)       params.set('accessible',  'true');

  const res = await fetch(`${API_VISITS}?${params}`);
  if (!res.ok) return;
  const { data } = await res.json();

  const toneCounts = {};
  data.forEach(v => {
    visitTones(v.steps).forEach(t => { toneCounts[t] = (toneCounts[t] || 0) + 1; });
  });
  const tones = TONE_ORDER
    .filter(t => toneCounts[t] || state.tones.includes(t))
    .map(value => ({ value, label: TONE_LABELS[value] || value, count: toneCounts[value] || 0 }));

  const sidebar = document.querySelector('filter-sidebar');
  if (sidebar) sidebar.data = { tones };
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

  /* Tasto cuore sulle visit-card: aggiorna/rimuove il preferito lato server */
  document.addEventListener('toggle-favorite', async (e) => {
    const { id, favorited, revert } = e.detail;
    if (!currentUserId) {
      revert();
      window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    try {
      const method = favorited ? 'PUT' : 'DELETE';
      const res = await fetch(`${API_USERS}/${currentUserId}/bookmark/${id}`, { method, credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (favorited) favoritedIds.add(id); else favoritedIds.delete(id);
    } catch (err) {
      console.error('Errore nel salvataggio dei preferiti:', err);
      revert();
    }
  });

  try {
    const [musRes, facets, user] = await Promise.all([
      fetch(`${API_MUSEUMS}?pageSize=100&sort=name`).then(r => r.json()),
      loadFacets(),
      getCurrentUser(),
    ]);
    allMuseums     = musRes.data || [];
    maxDurationMin = facets.maxDurationMin;
    ownedIds       = new Set((user?.adopted_visits || []).map(String));
    favoritedIds   = new Set((user?.bookmarked_visits || []).map(String));
    currentUserId  = user?._id || null;

    const sidebar = document.querySelector('filter-sidebar');
    sidebar.data = {
      museums: allMuseums.map(m => ({
        id:    m._id,
        name:  m.name,
        short: m.name,
        city:  m.address?.city || '',
      })),
      tones:          facets.tones,
      tags:           facets.tags,
      maxDurationMin,
    };

    sidebar.addEventListener('filters-change', (e) => {
      const { museumIds, price, durationMax, tags, tones, accessible } = e.detail;
      state.museumIds   = museumIds || [];
      state.price       = price     || 'all';
      state.durationMax = (durationMax && durationMax < maxDurationMin) ? durationMax : null;
      state.tags        = tags      || [];
      state.tones       = tones     || [];
      state.accessible  = accessible || false;
      load(0);
      refreshToneCounts();
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
      refreshToneCounts();
    }, 320);
  });

  /* Ordinamento → param ?sort= al backend */
  document.getElementById('sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    load(0);
  });

  /* Path /visits.html/<slug-del-nome> → pre-seleziona il museo nella sidebar
     (slug generato al volo dal nome, nessun campo slug nel DB: stesso
     pattern del navigator, vedi navigator/src/utils/slug.js). */
  const museumSlug = decodeURIComponent(location.pathname.split('/visits.html/')[1] || '').replace(/\/+$/, '');
  if (museumSlug && allMuseums.length) {
    const matched = allMuseums.find(m => slugify(m.name) === museumSlug);
    if (matched) {
      document.querySelector('filter-sidebar').setMuseumSelection([matched._id]);
      return;
    }
  }

  load(0);
});
