/* ============================================================
 *  profile.js — Pagina "Il tuo profilo"
 *  Tab principali (Visite / Descrizioni / Vendite & acquisti /
 *  Impostazioni) più sotto-filtri per la sezione Visite.
 * ============================================================ */

import { getCurrentUser, resetCurrentUser } from '/marketplace/js/auth-session.js';
import { createImageField } from '/marketplace/js/image-field.js';

const API_VISITS = '/api/visits';
const API_ITEMS  = '/api/items';
const API_USERS  = '/api/users';
const LOGIN_URL  = '/marketplace/login.html';

let currentUser  = null;
let avatarField  = null;
let ownedIds     = new Set();
let activeSub    = 'create';
let descriptionsLoaded = false;
const visitsCache = { create: null, adopted: null, favorites: null };

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---- Visite: create / adottate / preferiti ---- */

function operaImages(steps = []) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const seen = new Set();
  const images = [];
  for (const s of sorted) {
    const url = s.entity?.image_url;
    if (url && !seen.has(url)) { seen.add(url); images.push(url); }
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
      const res = await fetch(`${API_VISITS}?author=${currentUser._id}&pageSize=100`);
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

async function loadSub(sub) {
  activeSub = sub;
  document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p.dataset.sub === sub));
  if (history.replaceState) history.replaceState(null, '', `#visite:${sub}`);

  const config = SUB_CONFIG[sub];
  const hintEl = document.getElementById('visite-hint');
  if (hintEl) hintEl.innerHTML = config.hint;

  const grid = document.getElementById('visite-grid');
  if (visitsCache[sub]) {
    renderVisitsGrid(visitsCache[sub], config.empty);
    return;
  }

  grid.innerHTML = '<p class="loading"></p>';
  try {
    visitsCache[sub] = await config.load();
    renderVisitsGrid(visitsCache[sub], config.empty);
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Errore nel caricamento delle visite:', e);
  }
}

/* ---- Descrizioni create ---- */

function renderDescriptions(items) {
  const grid = document.getElementById('descrizioni-grid');
  grid.innerHTML = '';
  if (!items.length) {
    grid.innerHTML = '<p class="empty">Non hai ancora creato nessuna descrizione.</p>';
    return;
  }
  const LICENSE_STYLE = {
    private:  'text-rose-500 dark:text-rose-400 border-rose-400/40',
    reserved: 'text-sky-600 dark:text-sky-400 border-sky-400/40',
    public:   'text-slate-600 dark:text-slate-300 border-slate-400/30',
  };
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'desc-card cursor-pointer bg-slate-400/10 backdrop-blur-lg border border-slate-400/20 shadow-xl shadow-black/5 rounded-2xl p-6 flex flex-col gap-2.5 text-slate-800 dark:text-slate-100 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:bg-white/20 hover:border-white/30 hover:shadow-2xl';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.itemId = item._id;
    const licenseKey = String(item.license || 'public').toLowerCase();
    const licenseStyle = LICENSE_STYLE[licenseKey] || LICENSE_STYLE.public;
    const tagCls = 'text-[0.62rem] tracking-[0.06em] uppercase border rounded-md px-2 py-0.5 border-slate-400/30 text-slate-500 dark:text-slate-400';
    card.innerHTML = `
      <div class="text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-slate-500 dark:text-slate-400">${esc(item.artwork?.name || 'Opera')}</div>
      <p class="text-base italic leading-snug" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${esc(item.marketplace_summary)}</p>
      <div class="flex flex-wrap gap-1.5 mt-auto pt-1">
        <span class="${tagCls} ${licenseStyle}">${esc(item.license)}</span>
        <span class="${tagCls}">${esc(item.tone)}</span>
        ${(item.tags || []).slice(0, 3).map(t => `<span class="${tagCls}">${esc(t)}</span>`).join('')}
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

async function loadDescriptions() {
  const grid = document.getElementById('descrizioni-grid');
  grid.innerHTML = '<p class="loading"></p>';
  try {
    const res = await fetch(`${API_ITEMS}?author=${currentUser._id}&pageSize=100`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    renderDescriptions(data);
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Errore nel caricamento delle descrizioni:', e);
  }
}

/* ---- Impostazioni ---- */

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
      feedback.style.color = 'red';
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

      feedback.style.color = 'green';
      feedback.textContent = 'Profilo aggiornato con successo.';
      document.getElementById('password').value = '';
      document.getElementById('password_confirm').value = '';

      // Se cambia lo username la navbar (già renderizzata) va aggiornata.
      if (usernameChanged) setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      feedback.style.color = 'red';
      feedback.textContent = err.message;
    }
  });
}

/* ---- Tab principali ---- */

function activateTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));

  // loadSub() imposta già l'hash con il sotto-filtro (#visite:adopted);
  // per le altre tab basta il nome della tab.
  if (tab === 'visite') {
    loadSub(activeSub);
  } else {
    if (history.replaceState) history.replaceState(null, '', `#${tab}`);
    if (tab === 'descrizioni' && !descriptionsLoaded) {
      descriptionsLoaded = true;
      loadDescriptions();
    }
  }
}

/* Legge dall'hash la tab (e l'eventuale sotto-filtro) da attivare
 * all'apertura della pagina: "#visite", "#visite:adopted", ecc. */
function parseHash() {
  const [rawTab, rawSub] = location.hash.slice(1).split(':');
  const validTabs = ['visite', 'descrizioni', 'vendite', 'impostazioni'];
  return {
    tab: validTabs.includes(rawTab) ? rawTab : 'visite',
    sub: SUB_CONFIG[rawSub] ? rawSub : null,
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

  const user = await getCurrentUser();
  if (!user) {
    const redirectTo = window.location.pathname + window.location.hash;
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectTo)}`;
    return;
  }
  currentUser = user;
  ownedIds = new Set((user.adopted_visits || []).map(String));

  const heroSub = document.getElementById('hero-sub');
  if (heroSub) heroSub.textContent = `${user.display_name || user.username} · ${user.email}`;

  fillSettingsForm(user);
  setupSettingsForm();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
  document.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => loadSub(btn.dataset.sub));
  });

  const { tab: initialTab, sub: initialSub } = parseHash();
  if (initialSub) activeSub = initialSub;
  activateTab(initialTab);
});
