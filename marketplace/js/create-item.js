/* ============================================================
 *  create-item.js — Pagina "Crea Descrizione"
 *  Form a carosello (2 sezioni) riservato agli autori. L'elenco
 *  dei paragrafi mantiene sempre un ultimo paragrafo vuoto: appena
 *  si inizia a scriverci, ne viene aggiunto uno nuovo in coda.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { createWizard } from '/marketplace/js/wizard.js';

const API_ITEMS    = '/api/items';
const API_ENTITIES = '/api/entities';
const LOGIN_URL    = '/marketplace/login.html';

// Velocità media di lettura della sintesi vocale (window.speechSynthesis a
// rate 1.0), usata per calcolare la durata dei paragrafi dal loro testo
// invece di chiederla manualmente.
const TTS_WORDS_PER_MINUTE = 150;

function estimateDurationSec(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 0;
  return Math.max(1, Math.round((words / TTS_WORDS_PER_MINUTE) * 60));
}

function formatDuration(sec) {
  if (sec < 60) return `~${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `~${m}m ${s}s`;
}

/* ---- Tono / Visibilità: gruppi di bottoni al posto delle <select> ---- */

function setupBtnGroup(groupId, defaultValue) {
  const group = document.getElementById(groupId);
  group.dataset.value = defaultValue;
  group.querySelectorAll('.btn-option').forEach(btn => {
    const isDefault = btn.dataset.value === defaultValue;
    btn.setAttribute('aria-checked', String(isDefault));
    btn.addEventListener('click', () => {
      group.querySelectorAll('.btn-option').forEach(b => b.setAttribute('aria-checked', 'false'));
      btn.setAttribute('aria-checked', 'true');
      group.dataset.value = btn.dataset.value;
    });
  });
}

/* Tooltip condiviso, agganciato al <body> e posizionato via JS in base al
 * bottone puntato: se vivesse dentro .form-block verrebbe tagliato dal suo
 * overflow:hidden (necessario per la barra superiore arrotondata della card). */
function setupTooltips() {
  const tooltip = document.createElement('div');
  tooltip.className = 'item-tooltip';
  document.body.appendChild(tooltip);

  const margin = 12;

  function show(btn) {
    const text = btn.dataset.tooltip;
    if (!text) return;
    tooltip.textContent = text;
    tooltip.classList.add('visible');

    const rect = btn.getBoundingClientRect();
    const half = tooltip.offsetWidth / 2;
    const center = Math.min(
      Math.max(rect.left + rect.width / 2, half + margin),
      window.innerWidth - half - margin
    );
    tooltip.style.left = `${center}px`;
    tooltip.style.top = `${rect.top - 10}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';
  }

  function hide() {
    tooltip.classList.remove('visible');
  }

  document.querySelectorAll('.btn-option[data-tooltip]').forEach(btn => {
    btn.addEventListener('mouseenter', () => show(btn));
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('focus', () => show(btn));
    btn.addEventListener('blur', hide);
  });
}

/* ---- Opera a cui appartiene la descrizione ---- */

async function loadEntities() {
  const select = document.getElementById('artwork');
  try {
    const res = await fetch(`${API_ENTITIES}?pageSize=200&sort=name`);
    if (!res.ok) throw new Error();
    const { data } = await res.json();
    if (!data.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Nessuna opera disponibile — creane prima una';
      select.appendChild(opt);
      return;
    }
    data.forEach(entity => {
      const opt = document.createElement('option');
      opt.value = entity._id;
      opt.textContent = entity.artwork_author ? `${entity.name} — ${entity.artwork_author}` : entity.name;
      select.appendChild(opt);
    });
  } catch {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Impossibile caricare le opere al momento';
    select.appendChild(opt);
  }
}

/* ---- Paragrafi: l'elenco si allunga da solo mentre scrivi ---- */

function paragraphRows() {
  return document.querySelectorAll('#paragraphs-list .paragraph-row');
}

function lastParagraphRow() {
  const rows = paragraphRows();
  return rows[rows.length - 1] || null;
}

function renumberParagraphs() {
  const rows = paragraphRows();
  rows.forEach((row, i) => {
    row.querySelector('.paragraph-index').textContent = `Paragrafo ${i + 1}`;
    row.querySelector('.remove-row').hidden = rows.length <= 1;
  });
}

function ensureTrailingEmptyParagraph() {
  const last = lastParagraphRow();
  if (last && last.querySelector('.paragraph-text').value.trim()) {
    addParagraphRow();
  }
}

function addParagraphRow() {
  const list = document.getElementById('paragraphs-list');
  const row = document.createElement('div');
  row.className = 'dynamic-row paragraph-row';
  row.innerHTML = `
    <div class="paragraph-row-head">
      <span class="paragraph-index"></span>
      <div class="paragraph-row-meta">
        <span class="paragraph-duration-estimate">~0s</span>
        <button type="button" class="remove-row" aria-label="Rimuovi paragrafo">✕</button>
      </div>
    </div>
    <textarea class="paragraph-text" rows="3" placeholder="Testo del paragrafo…"></textarea>
  `;

  const textarea = row.querySelector('.paragraph-text');
  const estimateEl = row.querySelector('.paragraph-duration-estimate');
  textarea.addEventListener('input', (e) => {
    estimateEl.textContent = formatDuration(estimateDurationSec(e.target.value));
    if (row === lastParagraphRow() && e.target.value.trim()) {
      addParagraphRow();
    }
  });
  row.querySelector('.remove-row').addEventListener('click', () => {
    if (paragraphRows().length <= 1) return;
    row.remove();
    renumberParagraphs();
    ensureTrailingEmptyParagraph();
  });

  list.appendChild(row);
  renumberParagraphs();
}

function collectDescriptions() {
  const descriptions = [];
  paragraphRows().forEach(row => {
    const text = row.querySelector('.paragraph-text').value.trim();
    if (!text) return;
    descriptions.push({ text, duration_sec: estimateDurationSec(text) });
  });
  return descriptions;
}

function collectTags() {
  return document.getElementById('tags').value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

/* ---- Invio del form ---- */

async function submitItem() {
  const feedback = document.getElementById('form-feedback');
  const descriptions = collectDescriptions();

  if (!descriptions.length) {
    feedback.style.color = 'red';
    feedback.textContent = 'Aggiungi almeno un paragrafo alla descrizione.';
    document.querySelector('.paragraph-text')?.focus();
    return;
  }

  const payload = {
    artwork:             document.getElementById('artwork').value,
    marketplace_summary: document.getElementById('marketplace_summary').value.trim(),
    tone:                document.getElementById('tone-group').dataset.value,
    license:             document.getElementById('license-group').dataset.value,
    image_url:           document.getElementById('image_url').value.trim(),
    alt_text:            document.getElementById('alt_text').value.trim(),
    tags:                collectTags(),
    descriptions,
  };

  feedback.style.color = '';
  feedback.textContent = 'Creazione in corso…';

  try {
    const res = await fetch(API_ITEMS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore durante la creazione della descrizione.');

    feedback.style.color = 'green';
    feedback.textContent = 'Descrizione creata con successo! Reindirizzamento…';
    setTimeout(() => { window.location.href = '/marketplace/pages/profile.html#descrizioni'; }, 1200);
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

  await loadEntities();
  addParagraphRow();
  setupBtnGroup('tone-group', 'simple');
  setupBtnGroup('license-group', 'Public');
  setupTooltips();

  const summary = document.getElementById('marketplace_summary');
  const counter = document.getElementById('summary-counter');
  summary.addEventListener('input', () => {
    counter.textContent = `${summary.value.length}/300`;
  });

  createWizard({
    form: document.getElementById('item-form'),
    track: document.getElementById('carousel-track'),
    stepButtons: document.querySelectorAll('.wizard-step'),
    lineEls: document.querySelectorAll('.wizard-step-line'),
    prevBtn: document.getElementById('wizard-prev'),
    nextBtn: document.getElementById('wizard-next'),
    submitLabel: 'Crea descrizione',
    onSubmit: submitItem,
  });
});
