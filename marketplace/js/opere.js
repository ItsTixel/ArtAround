/* ============================================================
 *  opere.js — lista opere con filtraggio e paginazione server-side
 *  Stessa struttura di visits.js: ogni cambio filtro = nuova fetch.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { normalizeEntity } from '/marketplace/js/entity-utils.js';
import { attachFilterSheet } from '/marketplace/js/filter-sheet.js';

const API_ENTITIES = '/api/entities';
const API_MUSEUMS  = '/api/museums';
const API_USERS    = '/api/users';
const LOGIN_URL    = '/marketplace/login.html';
const PAGE_SIZE    = 12;

const state = {
  page:       0,
  sort:       'name',
  name:       '',
  museumIds:  [],
  authors:    [],
  tags:       [],
  isPhysical: 'all', // 'all' | 'true' | 'false'
  total:      0,
};

let allMuseums    = [];
let favoritedIds  = new Set();
let currentUserId = null;

/* ---- Costruisce la query e fetcha dal backend ---- */
async function fetchEntities() {
  const params = new URLSearchParams({
    pageSize: PAGE_SIZE,
    page:     state.page,
    sort:     state.sort,
  });

  if (state.name)                 params.set('name',           state.name);
  if (state.museumIds.length)     params.set('museum',         state.museumIds.join(','));
  if (state.authors.length)       params.set('artwork_author', state.authors.join(','));
  if (state.tags.length)          params.set('tags',           state.tags.join(','));
  if (state.isPhysical !== 'all') params.set('is_physical',    state.isPhysical);

  const res = await fetch(`${API_ENTITIES}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---- Render griglia card ---- */
function renderGrid(entities) {
  const grid = document.getElementById('opere-grid');
  grid.innerHTML = '';
  if (entities.length === 0) {
    grid.innerHTML = '<p class="empty">Nessuna opera trovata. Prova a rimuovere qualche filtro.</p>';
    return;
  }
  entities.forEach(e => {
    const card = document.createElement('opera-card');
    card.data = normalizeEntity(e, favoritedIds);
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
  el.textContent = `${total} oper${s ? 'a' : 'e'} disponibil${s ? 'e' : 'i'}`;
}

function updateHeroStats(total) {
  const el = document.getElementById('hero-total');
  if (el) el.textContent = `${total} oper${total === 1 ? 'a' : 'e'} disponibil${total === 1 ? 'e' : 'i'}`;
}

/* ---- Caricamento pagina ---- */
async function load(page = 0) {
  state.page = page;
  const grid = document.getElementById('opere-grid');
  grid.innerHTML = '<p class="loading"></p>';

  try {
    const { data, totalItems, pageSize } = await fetchEntities();
    state.total = totalItems;
    renderGrid(data);
    renderPagination(totalItems, pageSize, page);
    updateResultsCount(totalItems);
    updateHeroStats(totalItems);
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Failed to fetch entities:', e);
  }
}

/* ---- Facets per la sidebar (fetch separata, senza filtri attivi) ---- */
async function loadFacets() {
  const res = await fetch(`${API_ENTITIES}?pageSize=100`);
  if (!res.ok) return { authors: [], tags: [] };
  const { data } = await res.json();

  const authorCounts = {};
  data.forEach(e => {
    if (e.artwork_author) authorCounts[e.artwork_author] = (authorCounts[e.artwork_author] || 0) + 1;
  });
  const authors = Object.entries(authorCounts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const tagCounts = {};
  data.forEach(e => {
    (e.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  const tags = Object.entries(tagCounts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return { authors, tags };
}

/* ============================================================
 *  Bootstrap
 * ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('opere-grid');
  if (grid) grid.innerHTML = '<p class="loading"></p>';

  /* Su mobile la sidebar filtri diventa un "bottom sheet" con barra
     flottante (vedi js/filter-sheet.js). Su desktop non ha effetto. */
  attachFilterSheet(document.querySelector('entity-filter-sidebar'));

  /* Le opera-card aprono il popup con i dettagli */
  document.addEventListener('open-opera', (e) => {
    document.querySelector('opera-modal')?.open(e.detail.id);
  });

  /* Dopo una modifica riuscita nel popup, ricarica la griglia corrente */
  document.querySelector('opera-modal')?.addEventListener('entity-updated', () => {
    load(state.page);
  });

  /* Cuoricino sulle opera-card: aggiorna/rimuove il preferito lato server */
  document.addEventListener('toggle-favorite-entity', async (e) => {
    const { id, favorited, revert } = e.detail;
    if (!currentUserId) {
      revert();
      window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    try {
      const method = favorited ? 'PUT' : 'DELETE';
      const res = await fetch(`${API_USERS}/${currentUserId}/bookmark-entity/${id}`, { method, credentials: 'include' });
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
    allMuseums    = musRes.data || [];
    favoritedIds  = new Set((user?.bookmarked_entities || []).map(String));
    currentUserId = user?._id || null;

    const sidebar = document.querySelector('entity-filter-sidebar');
    sidebar.data = {
      museums: allMuseums.map(m => ({
        id:    m._id,
        name:  m.name,
        short: m.name,
        city:  m.address?.city || '',
      })),
      authors: facets.authors,
      tags:    facets.tags,
    };

    sidebar.addEventListener('filters-change', (e) => {
      const { museumIds, authors, tags } = e.detail;
      state.museumIds = museumIds || [];
      state.authors   = authors   || [];
      state.tags      = tags      || [];
      load(0);
    });
  } catch (e) {
    console.error('Errore nel caricamento della sidebar:', e);
  }

  /* Ricerca testuale → param ?name= al backend */
  let searchTimer;
  document.getElementById('search-opera').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.name = e.target.value.trim();
      load(0);
    }, 320);
  });

  /* Ordinamento → param ?sort= al backend */
  document.getElementById('sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    load(0);
  });

  /* Toggle Tutte/Fisiche/Non fisiche */
  document.getElementById('type-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-type]');
    if (!btn) return;
    document.querySelectorAll('#type-toggle button').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    state.isPhysical = btn.dataset.type;
    load(0);
  });

  load(0);
});
