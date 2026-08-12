/* ============================================================
 *  create-museum.js — Pagina "Crea Museo"
 *  Form riservato agli autori per aggiungere un museo al catalogo.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';

const API_MUSEUMS = '/api/museums';
const LOGIN_URL   = '/marketplace/login.html';
const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

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

function setupForm() {
  const form = document.getElementById('museum-form');
  const feedback = document.getElementById('form-feedback');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

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
  setupForm();
});
