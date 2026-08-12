/* ============================================================
 *  create-museum.js — Pagina "Crea Museo"
 *  Form a carosello (4 sezioni) riservato agli autori per
 *  aggiungere un museo al catalogo.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';

const API_MUSEUMS = '/api/museums';
const LOGIN_URL   = '/marketplace/login.html';
const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const TOTAL_STEPS = 4;

let currentStep = 0;

function buildHoursGrid() {
  const grid = document.getElementById('hours-grid');
  DAYS.forEach(day => {
    const row = document.createElement('div');
    row.className = 'hours-row';
    const id = `hours-${day}`;
    row.innerHTML = `
      <label for="${id}">${day}</label>
      <input id="${id}" data-day="${day}" type="text" placeholder="9:00–19:00 oppure Chiuso">
    `;
    grid.appendChild(row);
  });
}

function addServiceRow() {
  const list = document.getElementById('services-list');
  const row = document.createElement('div');
  row.className = 'service-row';
  row.innerHTML = `
    <input type="text" class="service-key" placeholder="Es. Toilette">
    <input type="text" class="service-value" placeholder="Es. In fondo a destra dopo la biglietteria">
    <button type="button" class="remove-service" aria-label="Rimuovi servizio">✕</button>
  `;
  row.querySelector('.remove-service').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

function collectOpeningHours() {
  const hours = {};
  document.querySelectorAll('#hours-grid input[data-day]').forEach(input => {
    const val = input.value.trim();
    if (val) hours[input.dataset.day] = val;
  });
  return hours;
}

function collectServices() {
  const services = {};
  document.querySelectorAll('.service-row').forEach(row => {
    const key = row.querySelector('.service-key').value.trim();
    const value = row.querySelector('.service-value').value.trim();
    if (key && value) services[key] = value;
  });
  return services;
}

/* ---- Carosello: navigazione tra le sezioni ---- */

function renderWizard() {
  const track = document.getElementById('carousel-track');
  const slides = track.querySelectorAll('.carousel-slide');
  const steps = document.querySelectorAll('.wizard-step');
  const lines = document.querySelectorAll('.wizard-step-line');
  const prevBtn = document.getElementById('wizard-prev');
  const nextBtn = document.getElementById('wizard-next');

  track.style.transform = `translateX(-${currentStep * 100}%)`;

  slides.forEach((slide, i) => {
    const isActive = i === currentStep;
    slide.setAttribute('aria-hidden', String(!isActive));
    slide.querySelectorAll('input, textarea, button').forEach(el => {
      el.tabIndex = isActive ? 0 : -1;
    });
    if (isActive) {
      slide.classList.remove('entering');
      // Forza il reflow per poter riavviare l'animazione anche se la
      // sezione era già stata visitata in precedenza.
      void slide.offsetWidth;
      slide.classList.add('entering');
    }
  });

  steps.forEach((step, i) => {
    step.classList.toggle('active', i === currentStep);
    step.classList.toggle('done', i < currentStep);
  });
  lines.forEach((line, i) => line.classList.toggle('filled', i < currentStep));

  prevBtn.classList.toggle('hidden', currentStep === 0);
  prevBtn.disabled = currentStep === 0;
  nextBtn.textContent = currentStep === TOTAL_STEPS - 1 ? 'Crea museo' : 'Avanti →';
}

/** Trova il primo campo obbligatorio non valido tra gli step precedenti a `upToStep`. */
function findFirstInvalid(upToStep) {
  const slides = document.querySelectorAll('.carousel-slide');
  for (let i = 0; i < upToStep; i++) {
    const invalidInput = slides[i].querySelector('[required]:invalid');
    if (invalidInput) return { step: i, input: invalidInput };
  }
  return null;
}

function goToStep(index) {
  const clamped = Math.max(0, Math.min(TOTAL_STEPS - 1, index));
  const invalid = clamped > 0 ? findFirstInvalid(clamped) : null;

  if (invalid) {
    currentStep = invalid.step;
    renderWizard();
    invalid.input.reportValidity();
    return;
  }

  currentStep = clamped;
  renderWizard();
}

function setupWizardNav() {
  document.querySelectorAll('.wizard-step').forEach(step => {
    step.addEventListener('click', () => goToStep(parseInt(step.dataset.step, 10)));
  });
  document.getElementById('wizard-prev').addEventListener('click', () => goToStep(currentStep - 1));
}

/* ---- Invio del form ---- */

async function submitMuseum() {
  const feedback = document.getElementById('form-feedback');

  const payload = {
    name:        document.getElementById('name').value.trim(),
    wikidata_id: document.getElementById('wikidata_id').value.trim(),
    description: document.getElementById('description').value.trim(),
    image_url:   document.getElementById('image_url').value.trim(),
    website:     document.getElementById('website').value.trim(),
    address: {
      street:  document.getElementById('street').value.trim(),
      city:    document.getElementById('city').value.trim(),
      zip:     document.getElementById('zip').value.trim(),
      country: document.getElementById('country').value.trim() || 'Italia',
    },
    opening_hours: collectOpeningHours(),
    services:      collectServices(),
  };

  feedback.style.color = '';
  feedback.textContent = 'Creazione in corso…';

  try {
    const res = await fetch(API_MUSEUMS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore durante la creazione del museo.');

    feedback.style.color = 'green';
    feedback.textContent = 'Museo creato con successo! Reindirizzamento…';
    setTimeout(() => { window.location.href = '/marketplace'; }, 1200);
  } catch (err) {
    feedback.style.color = 'red';
    feedback.textContent = err.message;
  }
}

function setupForm() {
  const form = document.getElementById('museum-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (currentStep < TOTAL_STEPS - 1) {
      goToStep(currentStep + 1);
      return;
    }
    const invalid = findFirstInvalid(TOTAL_STEPS);
    if (invalid) {
      currentStep = invalid.step;
      renderWizard();
      invalid.input.reportValidity();
      return;
    }
    submitMuseum();
  });
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

  buildHoursGrid();
  addServiceRow();
  document.getElementById('add-service').addEventListener('click', addServiceRow);
  setupWizardNav();
  setupForm();
  renderWizard();
});
