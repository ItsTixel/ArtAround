/* ============================================================
 *  create-entity.js — Pagina "Crea Opera"
 *  Form a carosello riservato agli autori. Il primo step chiede
 *  se l'opera è fisica: se "No", la sezione "Posizione nel museo"
 *  viene saltata.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { createWizard } from '/marketplace/js/wizard.js';

const API_ENTITIES = '/api/entities';
const API_MUSEUMS  = '/api/museums';
const LOGIN_URL    = '/marketplace/login.html';

const STEP_PHYSICAL   = 0;
const STEP_INFO       = 1;
const STEP_PLACEMENTS = 2;
const STEP_LINKS      = 3;

let museumOptionsHtml = '<option value="">Seleziona un museo…</option>';
let wizard = null;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isPhysical() {
  return document.querySelector('input[name="is_physical"]:checked')?.value === 'true';
}

function getPath() {
  return isPhysical()
    ? [STEP_PHYSICAL, STEP_INFO, STEP_PLACEMENTS, STEP_LINKS]
    : [STEP_PHYSICAL, STEP_INFO, STEP_LINKS];
}

async function loadMuseums() {
  try {
    const res = await fetch(`${API_MUSEUMS}?pageSize=200&sort=name`);
    if (!res.ok) throw new Error();
    const { data } = await res.json();
    if (data.length) {
      museumOptionsHtml += data.map(m => `<option value="${m._id}">${esc(m.name)}</option>`).join('');
    } else {
      document.getElementById('placements-hint').textContent =
        'Non ci sono ancora musei nel catalogo: crea prima un museo per poter collocare qui le opere.';
      document.getElementById('add-placement').hidden = true;
    }
  } catch {
    document.getElementById('placements-hint').textContent =
      'Impossibile caricare l\'elenco dei musei al momento.';
    document.getElementById('add-placement').hidden = true;
  }
}

function addPlacementRow() {
  const list = document.getElementById('placements-list');
  const row = document.createElement('div');
  row.className = 'dynamic-row stack';
  row.innerHTML = `
    <div class="field">
      <label>Museo</label>
      <select class="placement-museum">${museumOptionsHtml}</select>
    </div>
    <div class="field-row-2">
      <div class="field">
        <label>Stanza</label>
        <input type="text" class="placement-room" placeholder="Es. Sala 12">
      </div>
      <div class="field">
        <label>Piano</label>
        <input type="text" class="placement-floor" placeholder="Es. Primo piano">
      </div>
    </div>
    <div class="field">
      <label>Note</label>
      <input type="text" class="placement-note" placeholder="Es. Accanto all'ingresso della sala">
    </div>
    <button type="button" class="remove-row" aria-label="Rimuovi collocazione">✕</button>
  `;
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

function addLinkRow() {
  const list = document.getElementById('links-list');
  const row = document.createElement('div');
  row.className = 'dynamic-row kv';
  row.innerHTML = `
    <input type="text" class="dynamic-key" placeholder="Es. Wikipedia">
    <input type="text" class="dynamic-value" placeholder="https://...">
    <button type="button" class="remove-row" aria-label="Rimuovi link">✕</button>
  `;
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

function collectTags() {
  return document.getElementById('tags').value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

function collectPlacements() {
  const placements = [];
  document.querySelectorAll('#placements-list .dynamic-row').forEach(row => {
    const museum = row.querySelector('.placement-museum').value;
    if (!museum) return;
    const room  = row.querySelector('.placement-room').value.trim();
    const floor = row.querySelector('.placement-floor').value.trim();
    const note  = row.querySelector('.placement-note').value.trim();
    const placement = { museum };
    if (room || floor || note) placement.location = { room, floor, note };
    placements.push(placement);
  });
  return placements;
}

function collectExternalLinks() {
  const links = [];
  document.querySelectorAll('#links-list .dynamic-row').forEach(row => {
    const label = row.querySelector('.dynamic-key').value.trim();
    const url   = row.querySelector('.dynamic-value').value.trim();
    if (url) links.push({ label, url });
  });
  return links;
}

async function submitEntity() {
  const feedback = document.getElementById('form-feedback');
  const physical = isPhysical();

  const payload = {
    name:           document.getElementById('name').value.trim(),
    is_physical:    physical,
    artwork_author: document.getElementById('artwork_author').value.trim(),
    wikidata_id:    document.getElementById('wikidata_id').value.trim(),
    description:    document.getElementById('description').value.trim(),
    image_url:      document.getElementById('image_url').value.trim(),
    alt_text:       document.getElementById('alt_text').value.trim(),
    tags:           collectTags(),
    external_links: collectExternalLinks(),
    placements:     physical ? collectPlacements() : [],
  };

  feedback.style.color = '';
  feedback.textContent = 'Creazione in corso…';

  try {
    const res = await fetch(API_ENTITIES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore durante la creazione dell'opera.");

    feedback.style.color = 'green';
    feedback.textContent = 'Opera creata con successo! Reindirizzamento…';
    setTimeout(() => { window.location.href = '/marketplace'; }, 1200);
  } catch (err) {
    feedback.style.color = 'red';
    feedback.textContent = err.message;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(window.location.pathname)}`;
    return;
  }
  if (user.role !== 'author') {
    document.querySelector('main').innerHTML = `
      <section class="page-hero" aria-label="Accesso non consentito">
        <div class="page-hero-inner">
          <div class="kicker">Crea contenuto</div>
          <h1>Accesso non consentito</h1>
          <p class="hero-sub">Solo gli autori possono creare nuovi contenuti su ArtAround.</p>
        </div>
      </section>
    `;
    return;
  }

  await loadMuseums();
  addLinkRow();

  document.getElementById('add-placement').addEventListener('click', addPlacementRow);
  document.getElementById('add-link').addEventListener('click', addLinkRow);

  wizard = createWizard({
    form: document.getElementById('entity-form'),
    track: document.getElementById('carousel-track'),
    stepButtons: document.querySelectorAll('.wizard-step'),
    lineEls: document.querySelectorAll('.wizard-step-line'),
    prevBtn: document.getElementById('wizard-prev'),
    nextBtn: document.getElementById('wizard-next'),
    getPath,
    submitLabel: "Crea opera",
    onSubmit: submitEntity,
  });

  document.querySelectorAll('input[name="is_physical"]').forEach(radio => {
    radio.addEventListener('change', () => wizard.render());
  });
});
