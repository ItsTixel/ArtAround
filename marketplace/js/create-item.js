/* ============================================================
 *  create-item.js — Pagina "Crea Descrizione"
 *  Form a carosello (2 sezioni) riservato agli autori. L'elenco
 *  dei paragrafi mantiene sempre un ultimo paragrafo vuoto: appena
 *  si inizia a scriverci, ne viene aggiunto uno nuovo in coda.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { createWizard } from '/marketplace/js/wizard.js';
import { setupParagraphList } from '/marketplace/js/paragraph-list.js';
import { createImageField } from '/marketplace/js/image-field.js';

const API_ITEMS    = '/api/items';
const API_ENTITIES = '/api/entities';
const LOGIN_URL    = '/marketplace/login.html';

let paragraphList = null;
let imageField = null;
let wizard = null;

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

function collectTags() {
  return document.getElementById('tags').value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

/* ---- Invio del form ---- */

async function submitItem() {
  const feedback = document.getElementById('form-feedback');
  const descriptions = paragraphList.collect();

  if (!descriptions.length) {
    feedback.classList.remove('is-pending', 'is-success');
    feedback.classList.add('is-error');
    feedback.textContent = 'Aggiungi almeno un paragrafo alla descrizione.';
    paragraphList.focusFirst();
    wizard.setSubmitEnabled(true);
    return;
  }

  const image = imageField.getValue();

  const payload = {
    artwork:             document.getElementById('artwork').value,
    marketplace_summary: document.getElementById('marketplace_summary').value.trim(),
    tone:                document.getElementById('tone-group').dataset.value,
    license:             document.getElementById('license-group').dataset.value,
    image_url:           image.url,
    alt_text:            document.getElementById('alt_text').value.trim(),
    tags:                collectTags(),
    descriptions,
  };

  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  if (image.file) formData.append('image', image.file);

  feedback.classList.remove('is-success', 'is-error');
  feedback.classList.add('is-pending');
  feedback.textContent = 'Creazione in corso…';

  try {
    const res = await fetch(API_ITEMS, {
      method: 'POST',
      credentials: 'include',
      body: formData, // niente Content-Type: lo imposta il browser (multipart/form-data + boundary)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore durante la creazione della descrizione.');

    feedback.classList.remove('is-pending');
    feedback.classList.add('is-success');
    feedback.textContent = 'Descrizione creata. Reindirizzamento…';
    setTimeout(() => { window.location.href = '/marketplace/pages/profile.html#descrizioni'; }, 1200);
  } catch (err) {
    feedback.classList.remove('is-pending');
    feedback.classList.add('is-error');
    feedback.textContent = err.message;
    wizard.setSubmitEnabled(true);
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
  paragraphList = setupParagraphList(document.getElementById('paragraphs-list'));

  imageField = createImageField({});
  document.getElementById('image-field').appendChild(imageField.el);
  setupBtnGroup('tone-group', 'simple');
  setupBtnGroup('license-group', 'Public');
  setupTooltips();

  const summary = document.getElementById('marketplace_summary');
  const counter = document.getElementById('summary-counter');
  summary.addEventListener('input', () => {
    counter.textContent = `${summary.value.length}/300`;
  });

  wizard = createWizard({
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
