/* ============================================================
 *  create-museum.js — Pagina "Crea Museo"
 *  Form a carosello (6 sezioni) riservato agli autori per
 *  aggiungere un museo al catalogo.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { createWizard } from '/marketplace/js/wizard.js';
import { createImageField } from '/marketplace/js/image-field.js';
import { setupHoursGrid, setupKvList, setupMapsList } from '/marketplace/js/museum-form-fields.js';

const API_MUSEUMS = '/api/museums';
const LOGIN_URL   = '/marketplace/login.html';

let imageField = null;
let hoursField = null;
let servicesField = null;
let accessibilityField = null;
let mapsField = null;
let wizard = null;

async function submitMuseum() {
  const feedback = document.getElementById('form-feedback');
  const mapsFeedback = document.getElementById('maps-feedback');
  mapsFeedback.style.color = '';
  mapsFeedback.textContent = '';

  const mapsError = mapsField.validate();
  if (mapsError) {
    mapsFeedback.style.color = 'var(--color-danger)';
    mapsFeedback.textContent = mapsError;
    wizard.setSubmitEnabled(true);
    return;
  }

  const image = imageField.getValue();

  const basePayload = {
    name:        document.getElementById('name').value.trim(),
    wikidata_id: document.getElementById('wikidata_id').value.trim(),
    description: document.getElementById('description').value.trim(),
    image_url:   image.url,
    website:     document.getElementById('website').value.trim(),
    is_accessible: document.getElementById('is_accessible').checked,
    address: {
      street:  document.getElementById('street').value.trim(),
      city:    document.getElementById('city').value.trim(),
      zip:     document.getElementById('zip').value.trim(),
      country: document.getElementById('country').value.trim() || 'Italia',
    },
    opening_hours:      hoursField.collect(),
    services:           servicesField.collect(),
    accessibility_info: accessibilityField.collect(),
  };

  // Immagine e JSON restano separati anche nella richiesta: il server
  // (controllers/museum.js) è quello che li ricompone in Museum.maps.
  const formData = new FormData();
  formData.append('data', JSON.stringify(basePayload));
  mapsField.appendToFormData(formData);
  if (image.file) formData.append('image', image.file);

  feedback.classList.remove('is-success', 'is-error');
  feedback.classList.add('is-pending');
  feedback.textContent = 'Creazione in corso…';

  try {
    const res = await fetch(API_MUSEUMS, {
      method: 'POST',
      credentials: 'include',
      body: formData, // niente Content-Type: lo imposta il browser (multipart/form-data + boundary)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore durante la creazione del museo.');

    feedback.classList.remove('is-pending');
    feedback.classList.add('is-success');
    feedback.textContent = 'Museo creato. Reindirizzamento…';
    setTimeout(() => { window.location.href = '/marketplace'; }, 1200);
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

  hoursField = setupHoursGrid(document.getElementById('hours-grid'));

  servicesField = setupKvList(document.getElementById('services-list'), document.getElementById('add-service'), {}, {
    keyPlaceholder: 'Es. Toilette',
    valuePlaceholder: 'Es. In fondo a destra dopo la biglietteria',
    removeLabel: 'Rimuovi servizio',
  });

  accessibilityField = setupKvList(document.getElementById('accessibility-list'), document.getElementById('add-accessibility'), {}, {
    keyPlaceholder: 'Es. Accesso',
    valuePlaceholder: 'Es. Rampa a 5° di inclinazione',
    removeLabel: 'Rimuovi dettaglio',
  });

  imageField = createImageField({});
  document.getElementById('image-field').appendChild(imageField.el);

  mapsField = setupMapsList(document.getElementById('maps-list'), document.getElementById('add-map'));

  wizard = createWizard({
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
