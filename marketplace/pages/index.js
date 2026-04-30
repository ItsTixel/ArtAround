const API = 'http://localhost:8000/api';
const grid = document.getElementById('cards-grid');
const pagination = document.getElementById('pagination');
const countEl = document.getElementById('results-count');

let state = { page: 0, pageSize: 9, museum: '', tones: [], price: '', sort: 'title', search: '' };

const TONE_MAP = { childish: 'Infantile', simple: 'Elementare', medium: 'Medio', technical: 'Specialistico' };

function visitToCard(v) {
  const allItems = (v.steps || []).flatMap(s => s.items || []);
  const firstImg = allItems.find(i => i?.image_url)?.image_url || '';
  const totalSec = allItems.reduce((s, i) => s + ((i?.descriptions?.[0]?.duration_sec) || 0), 0);
  const tones = allItems.map(i => i?.tone).filter(Boolean);
  const primaryTone = tones.length
    ? Object.entries(tones.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {}))
        .sort((a, b) => b[1] - a[1])[0][0]
    : 'medium';
  return {
    id: v._id,
    title: v.title,
    museum: v.museum?.name || '—',
    city: v.museum?.address?.city || '',
    price: v.base_price || 0,
    image: firstImg,
    duration: totalSec,
    tone: primaryTone,
    itemCount: allItems.length,
    author: v.author?.username || 'Anonimo',
  };
}

function showSkeleton(n = 9) {
  grid.innerHTML = Array.from({ length: n }, () => `
    <div class="card-skeleton" aria-hidden="true">
      <div class="sk-img skeleton"></div>
      <div class="sk-body">
        <div class="sk-title skeleton" style="width:80%"></div>
        <div class="sk-line skeleton" style="width:55%"></div>
        <div class="sk-line skeleton" style="width:65%"></div>
        <div class="sk-line skeleton" style="width:40%"></div>
      </div>
    </div>`).join('');
}

function renderCards(visits) {
  if (!visits.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <h2>Nessuna visita trovata</h2>
        <p>Prova a modificare i filtri o la parola chiave di ricerca.</p>
        <button class="btn btn-secondary" onclick="resetFilters()">Azzera i filtri</button>
      </div>`;
    return;
  }
  grid.innerHTML = '';
  visits.forEach(v => {
    const card = document.createElement('art-visit-card');
    card.setAttribute('visit-id',    v.id);
    card.setAttribute('title',       v.title);
    card.setAttribute('museum',      v.museum);
    card.setAttribute('city',        v.city);
    card.setAttribute('price',       String(v.price));
    card.setAttribute('image',       v.image);
    card.setAttribute('duration',    String(v.duration));
    card.setAttribute('tone',        v.tone);
    card.setAttribute('item-count',  String(v.itemCount));
    card.setAttribute('author',      v.author);
    const bookmarks = JSON.parse(localStorage.getItem('artaround_bookmarks') || '[]');
    if (bookmarks.includes(v.id)) card.setAttribute('bookmarked', '');
    grid.appendChild(card);
  });
}

async function fetchVisits() {
  showSkeleton();
  countEl.textContent = 'Caricamento visite…';

  const params = new URLSearchParams();
  params.set('pageSize', state.pageSize);
  params.set('page', state.page);
  if (state.museum) params.set('museum', state.museum);
  if (state.sort)   params.set('sort', state.sort);

  try {
    const res = await fetch(`${API}/visits/?${params}`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    let visits = data.data.map(visitToCard);

    if (state.tones.length) {
      visits = visits.filter(v => state.tones.includes(v.tone));
    }
    if (state.price === 'free') {
      visits = visits.filter(v => v.price === 0);
    } else if (state.price === 'paid') {
      visits = visits.filter(v => v.price > 0);
    }
    if (state.search) {
      const q = state.search.toLowerCase();
      visits = visits.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.museum.toLowerCase().includes(q) ||
        v.author.toLowerCase().includes(q));
    }

    renderCards(visits);
    const total = data.totalItems;
    countEl.innerHTML = `<strong>${total}</strong> visite disponibili`;
    pagination.setAttribute('total', String(total));
    pagination.setAttribute('current', String(state.page));
    pagination.setAttribute('per-page', String(state.pageSize));
  } catch (err) {
    console.warn('API non raggiungibile, uso dati demo:', err.message);
    renderMock();
  }
}

function renderMock() {
  const mock = [
    { id:'m1', title:"L'Arte Greco-Romana: dai vasi alle statue", museum:'Museo Nazionale Romano', city:'Roma', price:2.99, image:'https://picsum.photos/seed/rome/600/340', duration:3600, tone:'medium', itemCount:18, author:'Prof. Marco Ferrini' },
    { id:'m2', title:'Rinascimento Fiorentino', museum:'Galleria degli Uffizi', city:'Firenze', price:0, image:'https://picsum.photos/seed/florence/600/340', duration:2700, tone:'simple', itemCount:12, author:'Sofia Marchetti' },
    { id:'m3', title:'Impressionismo e Post-Impressionismo', museum:'Pinacoteca di Brera', city:'Milano', price:1.99, image:'https://picsum.photos/seed/milan/600/340', duration:1800, tone:'childish', itemCount:8, author:'Dr. Elena Conti' },
    { id:'m4', title:"Arte Contemporanea: dalla Pop Art al Digitale", museum:'MAXXI', city:'Roma', price:3.99, image:'https://picsum.photos/seed/maxxi/600/340', duration:5400, tone:'technical', itemCount:24, author:'Alessandro Russo' },
    { id:'m5', title:"I Segreti del Louvre", museum:'Musée du Louvre', city:'Parigi', price:0, image:'https://picsum.photos/seed/louvre/600/340', duration:4500, tone:'medium', itemCount:20, author:'Marie Dubois' },
    { id:'m6', title:'Scultura Barocca a Roma', museum:'Galleria Borghese', city:'Roma', price:2.49, image:'https://picsum.photos/seed/borghese/600/340', duration:3000, tone:'simple', itemCount:15, author:'Dr. Lucia Barbieri' },
    { id:'m7', title:"L'Egitto Antico", museum:'Museo Egizio', city:'Torino', price:0, image:'https://picsum.photos/seed/egypt/600/340', duration:2400, tone:'childish', itemCount:10, author:'Ahmed Hassan' },
    { id:'m8', title:'Caravaggio e i Caravaggeschi', museum:'Galleria Nazionale', city:'Napoli', price:2.99, image:'https://picsum.photos/seed/naples/600/340', duration:3300, tone:'medium', itemCount:16, author:'Prof. Andrea Napoli' },
    { id:'m9', title:'Futurismo: velocità e modernità', museum:'GAM', city:'Milano', price:0, image:'https://picsum.photos/seed/gam/600/340', duration:2100, tone:'simple', itemCount:11, author:'Giulia Romano' },
  ];
  let visits = [...mock];
  if (state.tones.length) visits = visits.filter(v => state.tones.includes(v.tone));
  if (state.price === 'free') visits = visits.filter(v => v.price === 0);
  else if (state.price === 'paid') visits = visits.filter(v => v.price > 0);
  if (state.search) {
    const q = state.search.toLowerCase();
    visits = visits.filter(v => v.title.toLowerCase().includes(q) || v.museum.toLowerCase().includes(q));
  }
  renderCards(visits);
  countEl.innerHTML = `<strong>${visits.length}</strong> visite (modalità demo)`;
  pagination.setAttribute('total', String(visits.length));
  pagination.setAttribute('current', '0');
}

async function loadMuseums() {
  try {
    const res = await fetch(`${API}/museums/?pageSize=100`);
    if (!res.ok) return;
    const data = await res.json();
    const opts = data.data.map(m => `<option value="${m._id}">${m.name}${m.address?.city ? ` — ${m.address.city}` : ''}</option>`).join('');
    document.getElementById('search-museum').insertAdjacentHTML('beforeend', opts);
    document.getElementById('f-museo').insertAdjacentHTML('beforeend', opts);
  } catch {}
}

function updateFilterCount() {
  const count = (state.tones.length > 0 ? 1 : 0) + (state.price ? 1 : 0) + (state.museum ? 1 : 0);
  const badge = document.getElementById('filter-count');
  if (count > 0) { badge.textContent = count; badge.style.display = 'inline-flex'; }
  else badge.style.display = 'none';
}

function resetFilters() {
  state = { ...state, page: 0, museum: '', tones: [], price: '', search: '' };
  document.getElementById('f-museo').value = '';
  document.getElementById('f-price').value = '';
  document.getElementById('search-q').value = '';
  document.querySelectorAll('.filter-chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
  updateFilterCount();
  fetchVisits();
}

document.addEventListener('DOMContentLoaded', () => {
  loadMuseums();
  fetchVisits();

  document.getElementById('search-form').addEventListener('submit', e => {
    e.preventDefault();
    state.search  = document.getElementById('search-q').value.trim();
    state.museum  = document.getElementById('search-museum').value;
    state.page    = 0;
    fetchVisits();
  });

  document.getElementById('f-museo').addEventListener('change', e => {
    state.museum = e.target.value; state.page = 0; updateFilterCount(); fetchVisits();
  });
  document.getElementById('f-price').addEventListener('change', e => {
    state.price = e.target.value; state.page = 0; updateFilterCount(); fetchVisits();
  });
  document.getElementById('f-sort').addEventListener('change', e => {
    state.sort = e.target.value; state.page = 0; fetchVisits();
  });
  document.getElementById('btn-reset').addEventListener('click', resetFilters);

  document.querySelectorAll('.filter-chip[data-tone]').forEach(chip => {
    chip.addEventListener('click', () => {
      const tone = chip.dataset.tone;
      const pressed = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', String(!pressed));
      if (pressed) state.tones = state.tones.filter(t => t !== tone);
      else state.tones.push(tone);
      state.page = 0; updateFilterCount(); fetchVisits();
    });
  });

  document.getElementById('pagination').addEventListener('page-change', e => {
    state.page = e.detail.page;
    fetchVisits();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.addEventListener('bookmark-toggle', e => {
    const { visitId, bookmarked } = e.detail;
    let bm = JSON.parse(localStorage.getItem('artaround_bookmarks') || '[]');
    if (bookmarked) { if (!bm.includes(visitId)) bm.push(visitId); }
    else bm = bm.filter(id => id !== visitId);
    localStorage.setItem('artaround_bookmarks', JSON.stringify(bm));
    if (window.ArtToast) {
      window.ArtToast.show({ type: 'success', message: bookmarked ? 'Visita salvata!' : 'Visita rimossa dai salvati.' });
    }
  });
});
