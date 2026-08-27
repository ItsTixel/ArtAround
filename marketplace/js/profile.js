/* ============================================================
 *  profile.js — Pagina "Il tuo profilo"
 *  Tab principali (Visite / Descrizioni / Vendite & acquisti /
 *  Impostazioni) più sotto-filtri per la sezione Visite.
 * ============================================================ */

import { getCurrentUser, resetCurrentUser } from '/marketplace/js/auth-session.js';
import { createImageField } from '/marketplace/js/image-field.js';
import { GLASS, TRANSITION, TAG_PILL } from '/marketplace/js/ui-tokens.js';
import { normalizeEntity } from '/marketplace/js/entity-utils.js';
import { TONE_LABELS } from '/marketplace/js/tone-labels.js';

const LICENSE_LABELS = { Public: 'Pubblica', Reserved: 'Riservata', Private: 'Privata' };

const API_VISITS   = '/api/visits';
const API_ITEMS    = '/api/items';
const API_ENTITIES = '/api/entities';
const API_MUSEUMS  = '/api/museums';
const API_USERS    = '/api/users';
const API_ORDERS   = '/api/orders';
const LOGIN_URL    = '/marketplace/login.html';

let currentUser  = null;
let avatarField  = null;
let ownedIds     = new Set();
let favoritedIds = new Set();
let favoritedEntityIds = new Set();
let activeSub    = 'create';
let activeOrdersSub = 'purchases';
let activeOpereSub = 'create';
let activeOperePhysical = 'all'; // 'all' | 'true' | 'false'
let descriptionsLoaded = false;
let museiLoaded = false;
let visiteQuery = '';
let opereQuery = '';
let descrizioniQuery = '';
let museiQuery = '';
let descriptionsCache = null;
let museiCache = null;
const visitsCache = { create: null, adopted: null, favorites: null };
const ordersCache = { purchases: null, sales: null };
const operesCache = { create: null, favorites: null };

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---- Ricerca client-side nei pannelli: le liste sono già caricate per
 * intero (pageSize=100), quindi si filtrano in memoria senza rifare la
 * fetch ad ogni tasto. ---- */
function filterByText(list, query, getText) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(item => getText(item).toLowerCase().includes(q));
}

function withSearchEmptyMessage(list, filtered, query, fallback) {
  if (list.length && !filtered.length && query.trim()) {
    return `Nessun risultato per «${esc(query.trim())}».`;
  }
  return fallback;
}

/* ---- Visite: create / adottate / preferiti ---- */

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
    museumDetails,
    images:        operaImages(v.steps),
    owned:         ownedIds.has(String(v._id)),
    favorited:     favoritedIds.has(String(v._id)),
  };
}

function renderVisitsGrid(visits, emptyMessage) {
  const grid = document.getElementById('visite-grid');
  grid.innerHTML = '';
  if (!visits.length) {
    grid.innerHTML = `<p class="empty">${emptyMessage}</p>`;
    return;
  }
  visits.forEach(v => {
    const card = document.createElement('visit-card');
    card.data = normalizeVisit(v);
    grid.appendChild(card);
  });
}

const SUB_CONFIG = {
  create: {
    hint: 'Le visite che hai creato tu.',
    empty: 'Non hai ancora creato nessuna visita.',
    async load() {
      const res = await fetch(`${API_VISITS}?author=${currentUser._id}&pageSize=100`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json();
      return data;
    },
  },
  adopted: {
    hint: 'Le visite che hai adottato.',
    empty: 'Non hai ancora adottato nessuna visita.',
    async load() {
      const ids = [...new Set((currentUser.adopted_visits || []).map(String))];
      if (!ids.length) return [];
      const results = await Promise.all(
        ids.map(id => fetch(`${API_VISITS}/${id}`).then(r => (r.ok ? r.json() : null)))
      );
      return results.filter(Boolean);
    },
  },
  favorites: {
    hint: 'Le visite che hai salvato tra i preferiti.',
    empty: 'Non hai ancora salvato nessuna visita tra i preferiti.',
    async load() {
      const ids = [...new Set((currentUser.bookmarked_visits || []).map(String))];
      if (!ids.length) return [];
      const results = await Promise.all(
        ids.map(id => fetch(`${API_VISITS}/${id}`).then(r => (r.ok ? r.json() : null)))
      );
      return results.filter(Boolean);
    },
  },
};

function renderFilteredVisits() {
  const list = visitsCache[activeSub] || [];
  const filtered = filterByText(list, visiteQuery, v => v.title || '');
  const config = SUB_CONFIG[activeSub];
  renderVisitsGrid(filtered, withSearchEmptyMessage(list, filtered, visiteQuery, config.empty));
}

async function loadSub(sub) {
  activeSub = sub;
  document.querySelectorAll('#panel-visite .pill').forEach(p => p.classList.toggle('active', p.dataset.sub === sub));
  if (history.replaceState) history.replaceState(null, '', `#visite:${sub}`);

  const config = SUB_CONFIG[sub];
  const hintEl = document.getElementById('visite-hint');
  if (hintEl) hintEl.innerHTML = config.hint;

  const grid = document.getElementById('visite-grid');
  if (visitsCache[sub]) {
    renderFilteredVisits();
    return;
  }

  grid.innerHTML = '<p class="loading"></p>';
  try {
    visitsCache[sub] = await config.load();
    renderFilteredVisits();
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Errore nel caricamento delle visite:', e);
  }
}

/* ---- Vendite & acquisti ---- */

function fmtOrderPrice(p) {
  if (!p) return 'Gratis';
  return `€ ${(+p).toFixed(2).replace('.', ',')}`;
}

function fmtOrderDate(d) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ORDERS_CONFIG = {
  purchases: {
    hint: 'Le visite che hai acquistato.',
    empty: 'Non hai ancora acquistato nessuna visita.',
    api: `${API_ORDERS}/purchases`,
    counterpartKey: 'seller',
    counterpartLabel: 'Venditore',
  },
  sales: {
    hint: 'Le visite che hai venduto.',
    empty: 'Non hai ancora venduto nessuna visita.',
    api: `${API_ORDERS}/sales`,
    counterpartKey: 'buyer',
    counterpartLabel: 'Acquirente',
  },
};

// order.visit arriva dal backend popolato solo con { _id, title,
// image_url, base_price } (vedi controllers/order.js), molto più
// magro dei documenti restituiti da /api/visits — per questo non passa
// da normalizeVisit() ma costruisce direttamente la forma minima che
// <visit-card> sa già gestire con i suoi campi opzionali.
function normalizeOrderVisit(visit) {
  const id = String(visit._id || '');
  return {
    id,
    title: visit.title || 'Visita rimossa',
    description: '',
    durationSec: visit.estimated_duration_sec || 0,
    steps: 0,
    basePrice: visit.base_price || 0,
    tags: [],
    museumDetails: [],
    images: visit.image_url ? [{ url: visit.image_url, alt: visit.title || '' }] : [],
    owned: ownedIds.has(id),
    favorited: favoritedIds.has(id),
  };
}

// Stessa <visit-card> di visits.html/griglia "Le tue visite": un
// ordine deve avere lo stesso aspetto di una visita ovunque compaia,
// non una riga costruita a mano con un proprio stile. Il venditore/
// acquirente e la data restano come didascalia sotto la card, perché
// <visit-card> non ha modo di mostrare metadati specifici dell'ordine.
function renderOrders(orders, config) {
  const list = document.getElementById('vendite-list');
  list.innerHTML = '';
  if (!orders.length) {
    list.innerHTML = `<p class="empty">${config.empty}</p>`;
    return;
  }
  orders.forEach(order => {
    const visit = order.visit || {};
    const counterpart = order[config.counterpartKey] || {};
    const item = document.createElement('div');
    item.className = 'flex flex-col gap-2';
    // Figlio diretto di #vendite-list (role="list"): l'item della lista è
    // questo contenitore (card + didascalia dell'ordine), non la <visit-card>
    // stessa, che qui perde il proprio role="listitem" per non annidare due
    // listitem uno dentro l'altro.
    item.setAttribute('role', 'listitem');

    let card = null;
    if (visit._id) {
      card = document.createElement('visit-card');
      card.data = normalizeOrderVisit(visit);
      item.appendChild(card);
    } else {
      const removed = document.createElement('p');
      removed.className = 'empty';
      removed.textContent = 'Visita rimossa';
      item.appendChild(removed);
    }

    const meta = document.createElement('p');
    meta.className = 'text-[0.72rem] text-slate-500 dark:text-slate-400 px-1';
    meta.textContent = `${config.counterpartLabel}: ${counterpart.display_name || counterpart.username || '—'} · ${fmtOrderDate(order.createdAt)} · ${fmtOrderPrice(order.price_paid)}`;
    item.appendChild(meta);

    list.appendChild(item);
    // connectedCallback di <visit-card> (che si auto-assegna role="listitem")
    // scatta solo ora, all'inserimento nel documento: va rimosso dopo,
    // altrimenti resta un listitem annidato dentro quello di `item`.
    card?.removeAttribute('role');
  });
}

async function loadOrders(sub) {
  activeOrdersSub = sub;
  document.querySelectorAll('#panel-vendite .pill').forEach(p => p.classList.toggle('active', p.dataset.sub === sub));
  if (history.replaceState) history.replaceState(null, '', `#vendite:${sub}`);

  const config = ORDERS_CONFIG[sub];
  const hintEl = document.getElementById('vendite-hint');
  if (hintEl) hintEl.textContent = config.hint;

  const list = document.getElementById('vendite-list');
  if (ordersCache[sub]) {
    renderOrders(ordersCache[sub], config);
    return;
  }

  list.innerHTML = '<p class="loading"></p>';
  try {
    const res = await fetch(config.api, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ordersCache[sub] = await res.json();
    renderOrders(ordersCache[sub], config);
  } catch (e) {
    list.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Errore nel caricamento degli ordini:', e);
  }
}

/* ---- Descrizioni create ---- */

function renderDescriptions(items, emptyMessage) {
  const grid = document.getElementById('descrizioni-grid');
  grid.innerHTML = '';
  if (!items.length) {
    grid.innerHTML = `<p class="empty">${emptyMessage}</p>`;
    return;
  }
  const LICENSE_STYLE = {
    private:  'text-rose-500 dark:text-rose-400 border-rose-400/40',
    reserved: 'text-sky-600 dark:text-sky-400 border-sky-400/40',
    public:   'text-slate-600 dark:text-slate-300 border-slate-400/30',
  };
  items.forEach(item => {
    const artwork = item.artwork || {};
    const card = document.createElement('div');
    card.className = `card group desc-card cursor-pointer ${GLASS} overflow-hidden flex flex-row sm:flex-col h-full text-slate-800 dark:text-slate-100 ${TRANSITION} hover:-translate-y-1 hover:bg-white/20 hover:border-white/30 hover:shadow-2xl`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.itemId = item._id;
    const licenseKey = String(item.license || 'public').toLowerCase();
    const licenseStyle = LICENSE_STYLE[licenseKey] || LICENSE_STYLE.public;
    const tagCls = TAG_PILL;
    card.innerHTML = `
      <div class="relative w-32 shrink-0 self-stretch sm:self-auto sm:w-full sm:h-44 bg-slate-300/20 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden">
        ${artwork.image_url
          ? `<img class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="${esc(artwork.image_url)}" alt="${esc(artwork.alt_text || artwork.name || '')}" loading="lazy">`
          : `<div class="absolute inset-0 img-placeholder"></div>`}
      </div>
      <div class="min-w-0 p-3.5 sm:p-6 flex-1 flex flex-col gap-1.5 sm:gap-2.5">
        <div class="text-[0.6rem] sm:text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-slate-500 dark:text-slate-400">${esc(artwork.name || 'Opera')}</div>
        <p class="text-sm sm:text-base italic leading-snug font-serif">${esc(item.marketplace_summary)}</p>
        <div class="flex flex-wrap gap-1.5 mt-auto pt-1">
          <span class="${tagCls} ${licenseStyle}">${esc(LICENSE_LABELS[item.license] || item.license)}</span>
          <span class="${tagCls} hidden sm:inline-block">${esc(TONE_LABELS[item.tone] || item.tone)}</span>
          ${(item.tags || []).slice(0, 3).map(t => `<span class="${tagCls} hidden sm:inline-block">${esc(t)}</span>`).join('')}
        </div>
      </div>
    `;
    const openModal = () => document.querySelector('item-modal')?.open(item._id);
    card.addEventListener('click', openModal);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); }
    });
    grid.appendChild(card);
  });
}

function renderFilteredDescriptions() {
  const list = descriptionsCache || [];
  const filtered = filterByText(list, descrizioniQuery, item => `${item.artwork?.name || ''} ${item.marketplace_summary || ''}`);
  renderDescriptions(filtered, withSearchEmptyMessage(list, filtered, descrizioniQuery, 'Non hai ancora creato nessuna descrizione.'));
}

async function loadDescriptions() {
  const grid = document.getElementById('descrizioni-grid');
  grid.innerHTML = '<p class="loading"></p>';
  try {
    const res = await fetch(`${API_ITEMS}?author=${currentUser._id}&pageSize=100`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    descriptionsCache = data;
    renderFilteredDescriptions();
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Errore nel caricamento delle descrizioni:', e);
  }
}

/* ---- Opere: create / preferiti ---- */

const OPERE_SUB_CONFIG = {
  create: {
    hint: 'Le opere che hai creato tu.',
    empty: 'Non hai ancora creato nessuna opera.',
    async load() {
      const res = await fetch(`${API_ENTITIES}?added_by=${currentUser._id}&pageSize=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json();
      return data;
    },
  },
  favorites: {
    hint: 'Le opere che hai salvato tra i preferiti.',
    empty: 'Non hai ancora salvato nessuna opera tra i preferiti.',
    async load() {
      const ids = [...new Set((currentUser.bookmarked_entities || []).map(String))];
      if (!ids.length) return [];
      const results = await Promise.all(
        ids.map(id => fetch(`${API_ENTITIES}/${id}`).then(r => (r.ok ? r.json() : null)))
      );
      return results.filter(Boolean);
    },
  },
};

function renderOperaGrid(entities, emptyMessage) {
  const grid = document.getElementById('opere-grid');
  grid.innerHTML = '';
  const byType = activeOperePhysical === 'all'
    ? entities
    : entities.filter(e => String(!!e.is_physical) === activeOperePhysical);
  const filtered = filterByText(byType, opereQuery, e => e.name || '');
  if (!filtered.length) {
    grid.innerHTML = `<p class="empty">${withSearchEmptyMessage(byType, filtered, opereQuery, emptyMessage)}</p>`;
    return;
  }
  filtered.forEach(e => {
    const card = document.createElement('opera-card');
    card.data = normalizeEntity(e, favoritedEntityIds);
    grid.appendChild(card);
  });
}

async function loadOpereSub(sub) {
  activeOpereSub = sub;
  document.querySelectorAll('#panel-opere .pill').forEach(p => p.classList.toggle('active', p.dataset.sub === sub));
  if (history.replaceState) history.replaceState(null, '', `#opere:${sub}`);

  const config = OPERE_SUB_CONFIG[sub];
  const hintEl = document.getElementById('opere-hint');
  if (hintEl) hintEl.textContent = config.hint;

  const grid = document.getElementById('opere-grid');
  if (operesCache[sub]) {
    renderOperaGrid(operesCache[sub], config.empty);
    return;
  }

  grid.innerHTML = '<p class="loading"></p>';
  try {
    operesCache[sub] = await config.load();
    renderOperaGrid(operesCache[sub], config.empty);
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Errore nel caricamento delle opere:', e);
  }
}

/* ---- Musei creati ---- */

function renderMuseiGrid(museums, emptyMessage) {
  const grid = document.getElementById('musei-grid');
  grid.innerHTML = '';
  if (!museums.length) {
    grid.innerHTML = `<p class="empty">${emptyMessage}</p>`;
    return;
  }
  museums.forEach(museum => {
    const card = document.createElement('museum-card');
    card.setAttribute('museum-id', museum._id);
    card.setAttribute('name', museum.name);
    card.setAttribute('city', museum.address?.city ?? '');
    card.setAttribute('country', museum.address?.country ?? '');
    if (museum.image_url) card.setAttribute('image', museum.image_url);
    if (museum.opening_hours && Object.keys(museum.opening_hours).length) {
      card.setAttribute('opening-hours', JSON.stringify(museum.opening_hours));
    }
    if (museum.is_accessible) card.setAttribute('is-accessible', '');
    grid.appendChild(card);
  });
}

function renderFilteredMusei() {
  const list = museiCache || [];
  const filtered = filterByText(list, museiQuery, m => m.name || '');
  renderMuseiGrid(filtered, withSearchEmptyMessage(list, filtered, museiQuery, 'Non hai ancora creato nessun museo.'));
}

async function loadMusei() {
  const grid = document.getElementById('musei-grid');
  grid.innerHTML = '<p class="loading"></p>';
  try {
    const res = await fetch(`${API_MUSEUMS}?added_by=${currentUser._id}&pageSize=100`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    museiCache = data;
    renderFilteredMusei();
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Errore nel caricamento dei musei:', e);
  }
}

/* ---- Impostazioni ---- */

function updateHeroAvatar(user) {
  const img = document.getElementById('hero-avatar-img');
  const initial = document.getElementById('hero-avatar-initial');
  if (!img || !initial) return;
  if (user.avatar_url) {
    img.src = user.avatar_url;
    img.alt = `Foto profilo di ${(user.display_name || user.username || '').trim()}`;
    img.hidden = false;
    initial.hidden = true;
  } else {
    img.hidden = true;
    img.src = '';
    initial.hidden = false;
    initial.textContent = (user.display_name || user.username || '?').trim().charAt(0).toUpperCase();
  }
}

function fillSettingsForm(user) {
  document.getElementById('display_name').value = user.display_name || '';
  document.getElementById('bio').value = user.bio || '';
  document.getElementById('username').value = user.username || '';
  document.getElementById('email').value = user.email || '';

  avatarField = createImageField({ initialUrl: user.avatar_url || '' });
  document.getElementById('avatar-field').appendChild(avatarField.el);
}

function setupSettingsForm() {
  const form = document.getElementById('settings-form');
  const feedback = document.getElementById('settings-feedback');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password_confirm').value;
    if (password && password !== passwordConfirm) {
      feedback.style.color = 'var(--color-danger)';
      feedback.textContent = 'Le due password non coincidono.';
      return;
    }

    const avatar = avatarField.getValue();

    const payload = {
      display_name: document.getElementById('display_name').value.trim(),
      bio:          document.getElementById('bio').value.trim(),
      avatar_url:   avatar.url,
      username:     document.getElementById('username').value.trim(),
      email:        document.getElementById('email').value.trim(),
    };
    if (password) payload.password = password;

    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    if (avatar.file) formData.append('avatar', avatar.file);

    feedback.style.color = '';
    feedback.textContent = 'Salvataggio in corso…';

    try {
      const res = await fetch(`${API_USERS}/${currentUser._id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData, // niente Content-Type: lo imposta il browser (multipart/form-data + boundary)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante il salvataggio.');

      const usernameChanged = data.username !== currentUser.username;
      currentUser = data;
      resetCurrentUser(); // la navbar rilegge /api/auth/me alla prossima navigazione

      document.getElementById('avatar-field').innerHTML = '';
      avatarField = createImageField({ initialUrl: data.avatar_url || '' });
      document.getElementById('avatar-field').appendChild(avatarField.el);
      updateHeroAvatar(data);

      feedback.style.color = 'var(--color-success)';
      feedback.textContent = 'Profilo aggiornato con successo.';
      document.getElementById('password').value = '';
      document.getElementById('password_confirm').value = '';

      // Se cambia lo username la navbar (già renderizzata) va aggiornata.
      if (usernameChanged) setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      feedback.style.color = 'var(--color-danger)';
      feedback.textContent = err.message;
    }
  });
}

function setupUpgradeToAuthor(user) {
  const card = document.getElementById('upgrade-author-card');
  if (!card) return;
  if (user.role !== 'visitor') return; // già autore: la card resta nascosta (display:none di default)

  card.style.display = 'block';
  const btn = document.getElementById('upgrade-author-btn');
  const feedback = document.getElementById('upgrade-author-feedback');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    feedback.style.color = '';
    feedback.textContent = 'Aggiornamento in corso…';

    try {
      const res = await fetch(`${API_USERS}/${currentUser._id}/upgrade`, {
        method: 'PUT',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante l\'aggiornamento.');

      resetCurrentUser(); // il ruolo cambia anche nel cookie JWT: la navbar deve rileggerlo
      feedback.style.color = 'var(--color-success)';
      feedback.textContent = 'Ora sei un autore! Ricaricamento…';
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      btn.disabled = false;
      feedback.style.color = 'var(--color-danger)';
      feedback.textContent = err.message;
    }
  });
}

/* ---- Tab principali ---- */

function activateTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));

  // loadSub()/loadOrders() impostano già l'hash con il sotto-filtro
  // (#visite:adopted, #vendite:sales); per le altre tab basta il nome della tab.
  if (tab === 'visite') {
    loadSub(activeSub);
  } else if (tab === 'opere') {
    loadOpereSub(activeOpereSub);
  } else if (tab === 'vendite') {
    loadOrders(activeOrdersSub);
  } else {
    if (history.replaceState) history.replaceState(null, '', `#${tab}`);
    if (tab === 'descrizioni' && !descriptionsLoaded) {
      descriptionsLoaded = true;
      loadDescriptions();
    }
    if (tab === 'musei' && !museiLoaded) {
      museiLoaded = true;
      loadMusei();
    }
  }
}

/* Legge dall'hash la tab (e l'eventuale sotto-filtro) da attivare
 * all'apertura della pagina: "#visite", "#visite:adopted", "#vendite:sales", ecc.
 * Il sotto-filtro è valido solo se appartiene alla config della tab indicata
 * dall'hash stesso: "create"/"favorites" esistono sia per Visite sia per
 * Opere, ma qui contano solo se la tab dell'hash è quella giusta. */
function parseHash() {
  const [rawTab, rawSub] = location.hash.slice(1).split(':');
  const validTabs = ['visite', 'descrizioni', 'opere', 'musei', 'vendite', 'impostazioni'];
  return {
    tab:       validTabs.includes(rawTab) ? rawTab : 'visite',
    sub:       (rawTab === 'visite' && SUB_CONFIG[rawSub]) ? rawSub : null,
    ordersSub: (rawTab === 'vendite' && ORDERS_CONFIG[rawSub]) ? rawSub : null,
    opereSub:  (rawTab === 'opere' && OPERE_SUB_CONFIG[rawSub]) ? rawSub : null,
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  /* Le visit-card aprono il menù in sovraimpressione con i dettagli */
  document.addEventListener('open-visit', (e) => {
    document.querySelector('visit-modal')?.open(e.detail.id);
  });

  /* Dopo una modifica riuscita nel popup, ricarica la griglia descrizioni */
  document.querySelector('item-modal')?.addEventListener('item-updated', () => {
    descriptionsLoaded = true;
    loadDescriptions();
  });

  /* Le opera-card aprono il popup con i dettagli dell'opera */
  document.addEventListener('open-opera', (e) => {
    document.querySelector('opera-modal')?.open(e.detail.id);
  });

  /* Le museum-card aprono il popup con i dettagli del museo */
  document.addEventListener('open-museum-info', (e) => {
    document.querySelector('museum-modal')?.open(e.detail.id);
  });

  /* Dopo una modifica riuscita nel popup museo, ricarica la griglia Musei */
  document.querySelector('museum-modal')?.addEventListener('museum-updated', () => {
    museiLoaded = true;
    loadMusei();
  });

  /* Dopo una modifica riuscita nel popup opera, invalida entrambe le cache
   * (l'opera modificata può comparire sia tra "Create" sia, se l'autore
   * l'ha salvata lui stesso, tra "Preferiti") e ricarica se il tab Opere
   * è quello attivo */
  document.querySelector('opera-modal')?.addEventListener('entity-updated', () => {
    operesCache.create = null;
    operesCache.favorites = null;
    if (document.getElementById('panel-opere')?.classList.contains('active')) {
      loadOpereSub(activeOpereSub);
    }
  });

  /* Cuoricino sulle opera-card: aggiorna/rimuove il preferito lato server */
  document.addEventListener('toggle-favorite-entity', async (e) => {
    const { id, favorited, revert } = e.detail;
    try {
      const method = favorited ? 'PUT' : 'DELETE';
      const res = await fetch(`${API_USERS}/${currentUser._id}/bookmark-entity/${id}`, { method, credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (favorited) favoritedEntityIds.add(id); else favoritedEntityIds.delete(id);
      operesCache.favorites = null;
    } catch (err) {
      console.error('Errore nel salvataggio dei preferiti:', err);
      revert();
    }
  });

  /* Tasto cuore sulle visit-card: aggiorna/rimuove il preferito lato server */
  document.addEventListener('toggle-favorite', async (e) => {
    const { id, favorited, revert } = e.detail;
    try {
      const method = favorited ? 'PUT' : 'DELETE';
      const res = await fetch(`${API_USERS}/${currentUser._id}/bookmark/${id}`, { method, credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (favorited) favoritedIds.add(id); else favoritedIds.delete(id);
      // La lista "Preferiti" potrebbe non riflettere più lo stato reale: la
      // invalidiamo così viene ricaricata la prossima volta che viene aperta.
      visitsCache.favorites = null;
    } catch (err) {
      console.error('Errore nel salvataggio dei preferiti:', err);
      revert();
    }
  });

  const user = await getCurrentUser();
  if (!user) {
    const redirectTo = window.location.pathname + window.location.hash;
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectTo)}`;
    return;
  }
  currentUser = user;
  ownedIds = new Set((user.adopted_visits || []).map(String));
  favoritedIds = new Set((user.bookmarked_visits || []).map(String));
  favoritedEntityIds = new Set((user.bookmarked_entities || []).map(String));

  const heroSub = document.getElementById('hero-sub');
  if (heroSub) heroSub.textContent = `${user.display_name || user.username} · ${user.email}`;
  updateHeroAvatar(user);

  fillSettingsForm(user);
  setupSettingsForm();
  setupUpgradeToAuthor(user);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
  document.querySelectorAll('#panel-visite .pill').forEach(btn => {
    btn.addEventListener('click', () => loadSub(btn.dataset.sub));
  });
  document.getElementById('search-visite')?.addEventListener('input', (e) => {
    visiteQuery = e.target.value;
    if (visitsCache[activeSub]) renderFilteredVisits();
  });
  document.getElementById('search-descrizioni')?.addEventListener('input', (e) => {
    descrizioniQuery = e.target.value;
    if (descriptionsCache) renderFilteredDescriptions();
  });
  document.querySelectorAll('#panel-opere .pill').forEach(btn => {
    btn.addEventListener('click', () => loadOpereSub(btn.dataset.sub));
  });
  document.getElementById('search-opere')?.addEventListener('input', (e) => {
    opereQuery = e.target.value;
    const config = OPERE_SUB_CONFIG[activeOpereSub];
    if (operesCache[activeOpereSub]) renderOperaGrid(operesCache[activeOpereSub], config.empty);
  });
  document.getElementById('search-musei')?.addEventListener('input', (e) => {
    museiQuery = e.target.value;
    if (museiCache) renderFilteredMusei();
  });
  document.getElementById('opere-type-toggle')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-type]');
    if (!btn) return;
    document.querySelectorAll('#opere-type-toggle button').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    activeOperePhysical = btn.dataset.type;
    const config = OPERE_SUB_CONFIG[activeOpereSub];
    if (operesCache[activeOpereSub]) renderOperaGrid(operesCache[activeOpereSub], config.empty);
  });
  document.querySelectorAll('#panel-vendite .pill').forEach(btn => {
    btn.addEventListener('click', () => loadOrders(btn.dataset.sub));
  });

  const { tab: initialTab, sub: initialSub, ordersSub: initialOrdersSub, opereSub: initialOpereSub } = parseHash();
  if (initialSub) activeSub = initialSub;
  if (initialOrdersSub) activeOrdersSub = initialOrdersSub;
  if (initialOpereSub) activeOpereSub = initialOpereSub;
  activateTab(initialTab);
});
