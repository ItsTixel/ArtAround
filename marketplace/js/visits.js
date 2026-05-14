const API = '/api/visits';
const PAGE_SIZE = 12;

const urlParams = new URLSearchParams(window.location.search);
const museumId = urlParams.get('museum') || '';
const museumName = urlParams.get('museumName') || '';

const state = {
  page: 0,
  tags: '',
  sort: 'title',
  total: 0,
};

let tagsPopulated = false;

function initHero() {
  if (!museumName) return;
  const titleEl = document.getElementById('hero-title');
  const subtitleEl = document.getElementById('hero-subtitle');
  if (titleEl) titleEl.textContent = museumName;
  if (subtitleEl) subtitleEl.textContent = 'Visite guidate disponibili in questo museo';
  document.title = `ArtAround — ${museumName}`;
}

function initMuseumChip() {
  if (!museumId) return;
  const wrapper = document.getElementById('museum-chip-wrapper');
  if (!wrapper) return;
  const chip = document.createElement('div');
  chip.className = 'museum-chip';
  const label = museumName || 'Museo selezionato';
  chip.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#9e7a46" aria-hidden="true">
      <path d="M22 11V9L12 2 2 9v2h2v9h5v-5h6v5h5v-9h2z"/>
    </svg>
    <span>${label.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
    <a href="/marketplace/pages/visits.html" class="chip-remove" aria-label="Rimuovi filtro museo">✕</a>
  `;
  wrapper.appendChild(chip);
}

async function fetchVisits() {
  const params = new URLSearchParams({
    pageSize: PAGE_SIZE,
    page: state.page,
    sort: state.sort,
  });
  if (museumId) params.set('museum', museumId);
  if (state.tags) params.set('tags', state.tags);

  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderGrid(visits) {
  const grid = document.getElementById('visits-grid');
  grid.innerHTML = '';

  if (visits.length === 0) {
    grid.innerHTML = '<p class="no-results">Nessuna visita trovata.</p>';
    return;
  }

  visits.forEach((visit) => {
    const card = document.createElement('visit-card');
    card.setAttribute('visit-id', visit._id);
    card.setAttribute('title', visit.title || '');
    card.setAttribute('description', visit.description || '');
    card.setAttribute('base-price', visit.base_price ?? 0);
    card.setAttribute('duration', visit.estimated_duration_sec ?? 0);
    card.setAttribute('tags', (visit.tags || []).join(','));
    card.setAttribute('image-url', visit.image_url || '');
    const names = (visit.museum || [])
      .map(m => (typeof m === 'object' && m !== null ? m.name : '') || '')
      .filter(Boolean)
      .join(', ');
    card.setAttribute('museum-name', names);
    grid.appendChild(card);
  });
}

function renderPagination(totalItems, pageSize, page) {
  const container = document.getElementById('pagination');
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

function updateResultsCount(total) {
  const el = document.getElementById('results-count');
  if (el) el.textContent = `${total} visit${total !== 1 ? 'e' : 'a'} trovat${total !== 1 ? 'e' : 'a'}`;
}

function populateTagsDropdown(visits) {
  if (tagsPopulated) return;
  const allTags = [...new Set(visits.flatMap(v => v.tags || []))].sort();
  if (allTags.length === 0) return;
  const select = document.getElementById('tags-filter');
  if (!select) return;
  while (select.options.length > 1) select.remove(1);
  allTags.forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = tag;
    select.appendChild(opt);
  });
  tagsPopulated = true;
}

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
    populateTagsDropdown(data);
  } catch (e) {
    grid.innerHTML = '<p class="error-message">Errore nel caricamento delle visite. Riprova più tardi.</p>';
    console.error('Failed to fetch visits:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initMuseumChip();

  const tagsFilter = document.getElementById('tags-filter');
  const sortSelect = document.getElementById('sort-select');

  tagsFilter.addEventListener('change', (e) => {
    state.tags = e.target.value;
    tagsPopulated = false;
    load(0);
  });

  sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    load(0);
  });

  load(0);
});
