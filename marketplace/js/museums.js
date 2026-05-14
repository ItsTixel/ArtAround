const API = '/api/museums';
const PAGE_SIZE = 12;

const state = {
  page: 0,
  name: '',
  city: '',
  sort: 'name',
  total: 0,
};

let searchTimer = null;
let heroStatsSet = false;

async function fetchMuseums() {
  const params = new URLSearchParams({
    pageSize: PAGE_SIZE,
    page: state.page,
    sort: state.sort,
  });
  if (state.name) params.set('name', state.name);
  if (state.city) params.set('city', state.city);

  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderGrid(museums) {
  const grid = document.getElementById('museums-grid');
  grid.innerHTML = '';

  if (museums.length === 0) {
    grid.innerHTML = '<p class="no-results">Nessun museo trovato.</p>';
    return;
  }

  museums.forEach((museum) => {
    const card = document.createElement('museum-card');
    card.setAttribute('museum-id', museum._id);
    card.setAttribute('name', museum.name);
    card.setAttribute('city', museum.address?.city ?? '');
    card.setAttribute('country', museum.address?.country ?? '');
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
  if (el) el.textContent = `${total} muse${total !== 1 ? 'i' : 'o'} trovat${total !== 1 ? 'i' : 'o'}`;
}

/* Aggiorna il contatore nella hero solo al primo caricamento (nessun filtro attivo) */
function updateHeroStats(total) {
  if (heroStatsSet) return;
  const el = document.getElementById('hero-total');
  if (el) {
    const s = total === 1;
    el.textContent = `${total} muse${s ? 'o' : 'i'} disponibil${s ? 'e' : 'i'}`;
  }
  heroStatsSet = true;
}

async function load(page = 0) {
  state.page = page;
  const grid = document.getElementById('museums-grid');
  grid.innerHTML = '<p class="loading"></p>';

  try {
    const { data, totalItems, pageSize } = await fetchMuseums();
    state.total = totalItems;
    renderGrid(data);
    renderPagination(totalItems, pageSize, page);
    updateResultsCount(totalItems);
    updateHeroStats(totalItems);
  } catch (e) {
    grid.innerHTML = '<p class="error-message">Errore nel caricamento dei musei. Riprova più tardi.</p>';
    console.error('Failed to fetch museums:', e);
  }
}

async function populateCityDropdown() {
  try {
    const res = await fetch(`${API}?pageSize=100&sort=address.city`);
    const { data } = await res.json();
    const cities = [...new Set(data.map((m) => m.address?.city).filter(Boolean))].sort();
    const select = document.getElementById('city-filter');
    cities.forEach((city) => {
      const opt = document.createElement('option');
      opt.value = city;
      opt.textContent = city;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to fetch cities:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const cityFilter  = document.getElementById('city-filter');
  const sortSelect  = document.getElementById('sort-select');

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.name = e.target.value.trim();
      load(0);
    }, 320);
  });

  cityFilter.addEventListener('change', (e) => {
    state.city = e.target.value;
    load(0);
  });

  sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    load(0);
  });

  populateCityDropdown();
  load(0);
});
