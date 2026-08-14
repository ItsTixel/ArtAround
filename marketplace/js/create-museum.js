/* ============================================================
 *  create-museum.js — Pagina "Crea Museo"
 *  Form a carosello (4 sezioni) riservato agli autori per
 *  aggiungere un museo al catalogo.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { createWizard } from '/marketplace/js/wizard.js';
import { createImageField } from '/marketplace/js/image-field.js';

const API_MUSEUMS = '/api/museums';
const LOGIN_URL   = '/marketplace/login.html';
const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

let imageField = null;

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
  row.className = 'dynamic-row kv';
  row.innerHTML = `
    <input type="text" class="dynamic-key" placeholder="Es. Toilette">
    <input type="text" class="dynamic-value" placeholder="Es. In fondo a destra dopo la biglietteria">
    <button type="button" class="remove-row" aria-label="Rimuovi servizio">✕</button>
  `;
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
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
  document.querySelectorAll('#services-list .dynamic-row').forEach(row => {
    const key = row.querySelector('.dynamic-key').value.trim();
    const value = row.querySelector('.dynamic-value').value.trim();
    if (key && value) services[key] = value;
  });
  return services;
}

/* ── Mappe: immagine e JSON allegati separatamente ──────────
 * Per ogni mappa l'utente allega due cose indipendenti:
 *  - l'immagine della pianta, come file locale oppure come URL;
 *  - un JSON "di indicazione" con name + points (niente image_url:
 *    quello arriva dall'immagine, non dal JSON).
 * Il client non li unisce: manda i due pezzi separati (vedi
 * submitMuseum) ed è il server a comporre Museum.maps. */
const ALLOWED_ICON_TYPES = ['service', 'entity', 'generic'];
let mapSlots = [];
let mapSlotSeq = 0;

function readFileAsJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error(`"${file.name}": il file non è un JSON valido.`));
      }
    };
    reader.onerror = () => reject(new Error(`"${file.name}": impossibile leggere il file.`));
    reader.readAsText(file);
  });
}

function validateMapIndications(data, filename) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`"${filename}": il file deve contenere un oggetto JSON.`);
  }
  if (!data.name || typeof data.name !== 'string') {
    throw new Error(`"${filename}": manca il campo "name".`);
  }
  const rawPoints = Array.isArray(data.points) ? data.points : [];
  const points = rawPoints.map((p, i) => {
    if (!p || typeof p !== 'object') throw new Error(`"${filename}": il punto ${i + 1} non è un oggetto valido.`);
    if (!p.label || typeof p.label !== 'string') throw new Error(`"${filename}": il punto ${i + 1} non ha una "label".`);
    if (typeof p.x !== 'number' || p.x < 0 || p.x > 1) throw new Error(`"${filename}": il punto ${i + 1} ha una "x" non valida (deve essere un numero tra 0 e 1).`);
    if (typeof p.y !== 'number' || p.y < 0 || p.y > 1) throw new Error(`"${filename}": il punto ${i + 1} ha una "y" non valida (deve essere un numero tra 0 e 1).`);
    return {
      label: p.label.trim(),
      icon_type: ALLOWED_ICON_TYPES.includes(p.icon_type) ? p.icon_type : 'generic',
      x: p.x,
      y: p.y,
      ...(p.service_key ? { service_key: String(p.service_key).trim() } : {}),
      ...(p.entity ? { entity: String(p.entity).trim() } : {}),
      ...(p.description ? { description: String(p.description).trim() } : {}),
    };
  });

  return { name: data.name.trim(), points };
}

function addMapSlot() {
  mapSlots.push({
    id: mapSlotSeq++,
    imageMode: 'file',
    imageFile: null,
    imageUrl: '',
    mapData: null,
    mapDataFilename: '',
    mapDataError: '',
  });
  renderMapsList();
}

function fieldLabel(text) {
  const label = document.createElement('span');
  label.textContent = text;
  label.style.cssText =
    'display:block;font-size:0.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:0.3rem;';
  return label;
}

function buildMapSlotRow(slot) {
  const row = document.createElement('div');
  row.className = 'dynamic-row stack';

  /* Immagine: file locale oppure URL, uno dei due */
  row.appendChild(fieldLabel('Immagine della pianta'));

  const toggleWrap = document.createElement('div');
  toggleWrap.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;';
  const fileBtn = document.createElement('button');
  fileBtn.type = 'button';
  fileBtn.className = 'btn-secondary';
  fileBtn.textContent = 'File locale';
  const urlBtn = document.createElement('button');
  urlBtn.type = 'button';
  urlBtn.className = 'btn-secondary';
  urlBtn.textContent = 'URL';
  if (slot.imageMode === 'file') {
    fileBtn.style.borderColor = 'var(--color-accent)';
    fileBtn.style.color = 'var(--color-text)';
  } else {
    urlBtn.style.borderColor = 'var(--color-accent)';
    urlBtn.style.color = 'var(--color-text)';
  }
  fileBtn.addEventListener('click', () => { slot.imageMode = 'file'; renderMapsList(); });
  urlBtn.addEventListener('click', () => { slot.imageMode = 'url'; renderMapsList(); });
  toggleWrap.append(fileBtn, urlBtn);
  row.appendChild(toggleWrap);

  if (slot.imageMode === 'file') {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.addEventListener('change', (e) => {
      slot.imageFile = e.target.files[0] || null;
      renderMapsList();
    });
    row.appendChild(fileInput);
    if (slot.imageFile) {
      const info = document.createElement('span');
      info.style.cssText = 'display:block;font-size:0.78rem;color:var(--color-text-muted);margin-top:0.3rem;';
      info.textContent = `Selezionato: ${slot.imageFile.name}`;
      row.appendChild(info);
    }
  } else {
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = 'https://...';
    urlInput.value = slot.imageUrl;
    urlInput.addEventListener('input', (e) => { slot.imageUrl = e.target.value; });
    row.appendChild(urlInput);
  }

  /* JSON di indicazione: nome pianta + punti di interesse */
  const jsonLabel = fieldLabel('JSON indicazioni (nome pianta + punti)');
  jsonLabel.style.marginTop = '0.9rem';
  row.appendChild(jsonLabel);

  const jsonInput = document.createElement('input');
  jsonInput.type = 'file';
  jsonInput.accept = 'application/json,.json';
  jsonInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const raw = await readFileAsJson(file);
      slot.mapData = validateMapIndications(raw, file.name);
      slot.mapDataFilename = file.name;
      slot.mapDataError = '';
    } catch (err) {
      slot.mapData = null;
      slot.mapDataError = err.message;
    }
    renderMapsList();
  });
  row.appendChild(jsonInput);

  const jsonStatus = document.createElement('span');
  jsonStatus.style.cssText = 'display:block;font-size:0.78rem;margin-top:0.3rem;';
  if (slot.mapDataError) {
    jsonStatus.style.color = 'red';
    jsonStatus.textContent = slot.mapDataError;
    row.appendChild(jsonStatus);
  } else if (slot.mapData) {
    jsonStatus.style.color = 'var(--color-text-muted)';
    jsonStatus.textContent =
      `"${slot.mapData.name}" — ${slot.mapData.points.length} punt${slot.mapData.points.length === 1 ? 'o' : 'i'} di interesse (${slot.mapDataFilename})`;
    row.appendChild(jsonStatus);
  }

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-row';
  removeBtn.setAttribute('aria-label', 'Rimuovi mappa');
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => {
    mapSlots = mapSlots.filter(s => s.id !== slot.id);
    renderMapsList();
  });
  row.appendChild(removeBtn);

  return row;
}

function renderMapsList() {
  const list = document.getElementById('maps-list');
  list.innerHTML = '';
  mapSlots.forEach(slot => list.appendChild(buildMapSlotRow(slot)));
}

async function submitMuseum() {
  const feedback = document.getElementById('form-feedback');
  const mapsFeedback = document.getElementById('maps-feedback');
  mapsFeedback.style.color = '';
  mapsFeedback.textContent = '';

  for (const slot of mapSlots) {
    const hasImage = slot.imageMode === 'file' ? !!slot.imageFile : !!slot.imageUrl.trim();
    if (!hasImage || !slot.mapData) {
      mapsFeedback.style.color = 'red';
      mapsFeedback.textContent = 'Ogni mappa allegata deve avere sia un\'immagine sia un JSON di indicazioni valido (o rimuovila con ✕).';
      return;
    }
  }

  const image = imageField.getValue();

  const basePayload = {
    name:        document.getElementById('name').value.trim(),
    wikidata_id: document.getElementById('wikidata_id').value.trim(),
    description: document.getElementById('description').value.trim(),
    image_url:   image.url,
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

  // Immagine e JSON restano separati anche nella richiesta: il server
  // (controllers/museum.js) è quello che li ricompone in Museum.maps.
  const mapsMeta = mapSlots.map(slot => ({
    name: slot.mapData.name,
    points: slot.mapData.points,
    image_url: slot.imageMode === 'url' ? slot.imageUrl.trim() : undefined,
  }));

  const formData = new FormData();
  formData.append('data', JSON.stringify(basePayload));
  formData.append('mapsMeta', JSON.stringify(mapsMeta));
  if (image.file) formData.append('image', image.file);
  mapSlots.forEach((slot, i) => {
    if (slot.imageMode === 'file' && slot.imageFile) {
      formData.append(`mapImage_${i}`, slot.imageFile);
    }
  });

  feedback.style.color = '';
  feedback.textContent = 'Creazione in corso…';

  try {
    const res = await fetch(API_MUSEUMS, {
      method: 'POST',
      credentials: 'include',
      body: formData, // niente Content-Type: lo imposta il browser (multipart/form-data + boundary)
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

  imageField = createImageField({});
  document.getElementById('image-field').appendChild(imageField.el);

  document.getElementById('add-map').addEventListener('click', addMapSlot);

  createWizard({
    form: document.getElementById('museum-form'),
    track: document.getElementById('carousel-track'),
    stepButtons: document.querySelectorAll('.wizard-step'),
    lineEls: document.querySelectorAll('.wizard-step-line'),
    prevBtn: document.getElementById('wizard-prev'),
    nextBtn: document.getElementById('wizard-next'),
    submitLabel: 'Crea museo',
    onSubmit: submitMuseum,
  });
});
