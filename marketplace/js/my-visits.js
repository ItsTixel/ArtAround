/* ============================================================
 *  my-visits.js — griglia delle visite già in possesso dell'utente
 *  Stessa logica di normalizzazione di visits.js, ma senza filtri:
 *  legge adopted_visits dall'utente loggato e fetcha ogni visita.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';

const API_VISITS = '/api/visits';
const LOGIN_URL  = '/marketplace/login.html';

function firstOperaImage(steps = []) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  return sorted.find(s => s.entity?.image_url)?.entity?.image_url || '';
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
    placeholderTag: v.title || `Visita ${v._id}`,
    image:         firstOperaImage(v.steps),
    owned:         true,
  };
}

function renderGrid(visits) {
  const grid = document.getElementById('visits-grid');
  grid.innerHTML = '';
  if (visits.length === 0) {
    grid.innerHTML = '<p class="empty">Non hai ancora nessuna visita. Esplora il catalogo per iniziare.</p>';
    return;
  }
  visits.forEach(v => {
    const card = document.createElement('visit-card');
    card.data = normalizeVisit(v);
    grid.appendChild(card);
  });
}

function updateCounts(total) {
  const s = total === 1;
  const label = `${total} visit${s ? 'a' : 'e'} in tuo possesso`;
  const countEl = document.getElementById('results-count');
  if (countEl) countEl.textContent = label;
  const heroEl = document.getElementById('hero-total');
  if (heroEl) heroEl.textContent = label;
}

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('visits-grid');
  grid.innerHTML = '<p class="loading"></p>';

  /* Le visit-card aprono il menù in sovraimpressione con i dettagli */
  document.addEventListener('open-visit', (e) => {
    document.querySelector('visit-modal')?.open(e.detail.id);
  });

  const user = await getCurrentUser();
  if (!user) {
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(window.location.pathname)}`;
    return;
  }

  const ids = [...new Set((user.adopted_visits || []).map(String))];
  if (!ids.length) {
    renderGrid([]);
    updateCounts(0);
    return;
  }

  try {
    const results = await Promise.all(
      ids.map(id => fetch(`${API_VISITS}/${id}`).then(r => (r.ok ? r.json() : null)))
    );
    const visits = results.filter(Boolean);
    renderGrid(visits);
    updateCounts(visits.length);
  } catch (e) {
    grid.innerHTML = '<p class="empty">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Errore nel caricamento delle tue visite:', e);
  }
});
