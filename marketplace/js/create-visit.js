/* ============================================================
 *  create-visit.js — Pagina "Crea Visita"
 *  Form a carosello (4 sezioni, l'ultima solo per le visite di
 *  gruppo). La sezione "Sequenza" apre un modale con 3 viste
 *  (Tutto il catalogo / Create da te / Preferiti) per scegliere
 *  le opere da inserire come tappe, ciascuna con museo, opere
 *  (item/descrizioni) e note.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { createWizard } from '/marketplace/js/wizard.js';

const API_VISITS   = '/api/visits';
const API_ENTITIES = '/api/entities';
const API_ITEMS    = '/api/items';
const API_MUSEUMS  = '/api/museums';
const LOGIN_URL    = '/marketplace/login.html';

const STEP_TYPE     = 0;
const STEP_INFO     = 1;
const STEP_SEQUENCE = 2;
const STEP_QUIZ     = 3;

let currentUser = null;
let wizard = null;
let allMuseums = [];

/* Sequenza in costruzione. Ogni voce: { entity, museum, items[], introNote, logisticNote } */
const state = { steps: [], editingIndex: null };

/* Filtri del modale di selezione opera */
const pickerState = { tab: 'catalog', search: '', museum: '' };
let pickerSelectedEntity = null; // opera scelta nel browse, in attesa di configurazione
let pickerSearchTimer = null;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ============================================================
 *  Tipo di visita / Informazioni generali
 * ============================================================ */

function isGroup() {
  return document.querySelector('input[name="visit_type"]:checked')?.value === 'group';
}

function getPath() {
  return isGroup()
    ? [STEP_TYPE, STEP_INFO, STEP_SEQUENCE, STEP_QUIZ]
    : [STEP_TYPE, STEP_INFO, STEP_SEQUENCE];
}

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

/* Le visite di gruppo sono sempre private e gratuite: nasconde prezzo/
 * visibilità e mostra invece la nota, invece di lasciare campi che
 * verrebbero comunque ignorati dal server. */
function syncGroupFields() {
  const group = isGroup();
  document.getElementById('price-field').hidden = group;
  document.getElementById('visibility-field').hidden = group;
  document.getElementById('group-info-hint').hidden = !group;
}

function collectTags() {
  return document.getElementById('tags').value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

/* ============================================================
 *  Modale di selezione opera
 * ============================================================ */

function openPicker() {
  pickerSelectedEntity = null;
  state.editingIndex = null;
  document.getElementById('picker-browse').hidden = false;
  document.getElementById('picker-configure').hidden = true;
  document.getElementById('picker-overlay').hidden = false;
  loadPickerGrid();
}

function closePicker() {
  document.getElementById('picker-overlay').hidden = true;
}

async function fetchPickerEntities() {
  const params = new URLSearchParams({ pageSize: 100, sort: 'name', is_physical: 'true' });
  if (pickerState.search) params.set('name', pickerState.search);
  if (pickerState.museum) params.set('museum', pickerState.museum);
  if (pickerState.tab === 'created') params.set('added_by', currentUser._id);

  const res = await fetch(`${API_ENTITIES}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data } = await res.json();

  // Solo le opere collocabili in almeno un museo possono diventare una tappa.
  let list = data.filter(e => (e.placements || []).length > 0);

  if (pickerState.tab === 'favorites') {
    const favIds = new Set((currentUser.bookmarked_entities || []).map(String));
    list = list.filter(e => favIds.has(String(e._id)));
  }
  return list;
}

function museumLine(placements = []) {
  if (!placements.length) return '';
  const names = placements.map(p => p.museum?.name).filter(Boolean);
  if (!names.length) return '';
  return names.length > 1 ? `${names[0]} +${names.length - 1} altri` : names[0];
}

function renderPickerCard(entity) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'picker-card';
  btn.innerHTML = `
    <div class="picker-card-thumb">${entity.image_url ? `<img src="${esc(entity.image_url)}" alt="" loading="lazy">` : ''}</div>
    <div class="picker-card-body">
      <span class="picker-card-name">${esc(entity.name)}</span>
      <span class="picker-card-author">${esc(entity.artwork_author || 'Autore sconosciuto')}</span>
      <span class="picker-card-museum">${esc(museumLine(entity.placements))}</span>
    </div>
  `;
  btn.addEventListener('click', () => openConfigure(entity));
  return btn;
}

async function loadPickerGrid() {
  const grid = document.getElementById('picker-grid');
  grid.innerHTML = '<p class="picker-message">Caricamento…</p>';
  try {
    const entities = await fetchPickerEntities();
    grid.innerHTML = '';
    if (!entities.length) {
      grid.innerHTML = '<p class="picker-message">Nessuna opera trovata con questi filtri.</p>';
      return;
    }
    entities.forEach(e => grid.appendChild(renderPickerCard(e)));
  } catch (e) {
    grid.innerHTML = '<p class="picker-message">Errore nel caricamento. Riprova più tardi.</p>';
    console.error('Errore nel caricamento delle opere:', e);
  }
}

/* ---- Configurazione della tappa (museo, opere/item, note) ---- */

function populateStepMuseumSelect(entity) {
  const select = document.getElementById('step-museum');
  select.innerHTML = (entity.placements || [])
    .filter(p => p.museum)
    .map(p => `<option value="${p.museum._id}">${esc(p.museum.name)}</option>`)
    .join('');
}

async function loadStepItems(entity) {
  const list = document.getElementById('step-items-list');
  list.innerHTML = '<p class="step-items-empty">Caricamento…</p>';
  try {
    const res = await fetch(`${API_ITEMS}?artwork=${entity._id}&pageSize=100`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();

    // Le descrizioni Private/Reserved di un altro autore non sono
    // utilizzabili in questa visita (vedi Visit.pre('save') sul backend):
    // filtrate qui per non far scegliere qualcosa che il salvataggio rifiuterebbe.
    const usable = data.filter(it => it.license === 'Public' || it.author?._id === currentUser._id);

    list.innerHTML = '';
    if (!usable.length) {
      list.innerHTML = '<p class="step-items-empty">Nessuna descrizione disponibile per questa opera. Puoi comunque aggiungere la tappa senza descrizioni, oppure crearne una prima.</p>';
      return;
    }

    const preselected = new Set((state.editingIndex !== null ? state.steps[state.editingIndex].items : []).map(it => it.id));

    usable.forEach(it => {
      const row = document.createElement('label');
      row.className = 'step-item-row';
      row.innerHTML = `
        <input type="checkbox" value="${it._id}" ${preselected.has(it._id) ? 'checked' : ''}>
        <span class="step-item-row-body">
          <span class="step-item-row-summary">${esc(it.marketplace_summary)}</span>
          <span class="step-item-row-meta">${esc(it.tone)} · ${esc(it.license)}</span>
        </span>
      `;
      list.appendChild(row);
    });
  } catch (e) {
    list.innerHTML = '<p class="step-items-empty">Errore nel caricamento delle descrizioni.</p>';
    console.error('Errore nel caricamento degli item:', e);
  }
}

async function openConfigure(entity) {
  pickerSelectedEntity = entity;
  document.getElementById('picker-browse').hidden = true;
  document.getElementById('picker-configure').hidden = false;

  document.getElementById('picker-configure-entity').innerHTML = `
    ${entity.image_url ? `<img src="${esc(entity.image_url)}" alt="">` : ''}
    <span class="picker-configure-entity-body">
      <span class="picker-configure-entity-name">${esc(entity.name)}</span>
      <span class="picker-configure-entity-author">${esc(entity.artwork_author || 'Autore sconosciuto')}</span>
    </span>
  `;

  populateStepMuseumSelect(entity);

  const editing = state.editingIndex !== null ? state.steps[state.editingIndex] : null;
  if (editing) {
    document.getElementById('step-museum').value = editing.museum.id;
    document.getElementById('step-intro-note').value = editing.introNote || '';
    document.getElementById('step-logistic-note').value = editing.logisticNote || '';
  } else {
    document.getElementById('step-intro-note').value = '';
    document.getElementById('step-logistic-note').value = '';
  }

  await loadStepItems(entity);
}

function backToBrowse() {
  document.getElementById('picker-configure').hidden = true;
  document.getElementById('picker-browse').hidden = false;
}

function confirmStep() {
  const museumId = document.getElementById('step-museum').value;
  if (!museumId) return; // nessun museo disponibile per questa opera (non dovrebbe succedere: filtrata a monte)
  const museumOpt = document.getElementById('step-museum').selectedOptions[0];

  const items = Array.from(document.querySelectorAll('#step-items-list input[type="checkbox"]:checked'))
    .map(cb => ({ id: cb.value }));

  const stepData = {
    entity: { id: pickerSelectedEntity._id, name: pickerSelectedEntity.name, imageUrl: pickerSelectedEntity.image_url },
    museum: { id: museumId, name: museumOpt.textContent },
    items,
    introNote: document.getElementById('step-intro-note').value.trim(),
    logisticNote: document.getElementById('step-logistic-note').value.trim(),
  };

  if (state.editingIndex !== null) {
    state.steps[state.editingIndex] = stepData;
  } else {
    state.steps.push(stepData);
  }

  renderStepsList();
  closePicker();
}

/* ============================================================
 *  Lista delle tappe della sequenza
 * ============================================================ */

function renderStepsList() {
  const list = document.getElementById('steps-list');
  const emptyHint = document.getElementById('steps-empty-hint');
  list.innerHTML = '';
  emptyHint.hidden = state.steps.length > 0;

  state.steps.forEach((step, i) => {
    const row = document.createElement('div');
    row.className = 'step-row';
    row.innerHTML = `
      <span class="step-row-order">${i + 1}</span>
      <span class="step-row-thumb">${step.entity.imageUrl ? `<img src="${esc(step.entity.imageUrl)}" alt="">` : ''}</span>
      <span class="step-row-body">
        <span class="step-row-name">${esc(step.entity.name)}</span>
        <span class="step-row-meta">${esc(step.museum.name)} · ${step.items.length} descrizion${step.items.length === 1 ? 'e' : 'i'}</span>
      </span>
      <span class="step-row-actions">
        <button type="button" class="step-up" title="Sposta su" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="step-down" title="Sposta giù" aria-label="Sposta giù" ${i === state.steps.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="step-remove" title="Rimuovi tappa" aria-label="Rimuovi tappa">✕</button>
      </span>
    `;

    row.addEventListener('click', async (e) => {
      if (e.target.closest('.step-row-actions')) return;
      state.editingIndex = i;
      document.getElementById('picker-overlay').hidden = false;
      document.getElementById('picker-browse').hidden = true;
      document.getElementById('picker-configure').hidden = false;
      try {
        // Rifetcha l'opera per avere l'elenco completo delle sue collocazioni
        // (non solo quella già scelta per questa tappa, salvata in step.museum).
        const res = await fetch(`${API_ENTITIES}/${step.entity.id}`);
        const entity = await res.json();
        await openConfigure(entity);
      } catch (err) {
        console.error('Errore nel ricaricamento dell\'opera:', err);
        closePicker();
      }
    });
    row.querySelector('.step-up').addEventListener('click', (e) => {
      e.stopPropagation();
      if (i === 0) return;
      [state.steps[i - 1], state.steps[i]] = [state.steps[i], state.steps[i - 1]];
      renderStepsList();
    });
    row.querySelector('.step-down').addEventListener('click', (e) => {
      e.stopPropagation();
      if (i === state.steps.length - 1) return;
      [state.steps[i + 1], state.steps[i]] = [state.steps[i], state.steps[i + 1]];
      renderStepsList();
    });
    row.querySelector('.step-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state.steps.splice(i, 1);
      renderStepsList();
    });

    list.appendChild(row);
  });
}

/* ============================================================
 *  Quiz (solo visite di gruppo)
 * ============================================================ */

function addOptionRow(list, text = '', correct = false) {
  const row = document.createElement('div');
  row.className = 'quiz-option-row';
  const groupName = list.closest('.quiz-question-row').dataset.qid;
  row.innerHTML = `
    <input type="radio" name="correct-${groupName}" class="option-correct" ${correct ? 'checked' : ''}>
    <input type="text" class="option-text" placeholder="Opzione" value="${esc(text)}">
    <button type="button" class="remove-option" aria-label="Rimuovi opzione">✕</button>
  `;
  row.querySelector('.remove-option').addEventListener('click', () => {
    if (list.children.length <= 2) return; // servono almeno 2 opzioni
    row.remove();
  });
  list.appendChild(row);
}

let questionCounter = 0;

function addQuestionRow() {
  const container = document.getElementById('quiz-questions-list');
  const qid = `q${questionCounter++}`;
  const row = document.createElement('div');
  row.className = 'dynamic-row stack quiz-question-row';
  row.dataset.qid = qid;
  row.innerHTML = `
    <div class="field">
      <label>Domanda</label>
      <input class="question-text" type="text" placeholder="Es. Chi ha dipinto quest'opera?">
    </div>
    <div class="field">
      <label>Opera collegata (facoltativo)</label>
      <select class="question-item"><option value="">Nessuna</option></select>
    </div>
    <div class="field">
      <label>Opzioni (seleziona quella corretta)</label>
      <div class="quiz-options-list"></div>
      <button type="button" class="btn-secondary add-option">+ Aggiungi opzione</button>
    </div>
    <button type="button" class="remove-row" aria-label="Rimuovi domanda">✕</button>
  `;

  const optionsList = row.querySelector('.quiz-options-list');
  addOptionRow(optionsList, '', true);
  addOptionRow(optionsList);

  row.querySelector('.add-option').addEventListener('click', () => addOptionRow(optionsList));
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());

  populateQuestionItemSelect(row.querySelector('.question-item'));

  container.appendChild(row);
}

/* Le domande possono riferirsi a una delle opere/descrizioni già scelte
 * nella sequenza: l'elenco va ricostruito ogni volta che si apre lo step
 * Quiz, perché la sequenza può essere cambiata nel frattempo. */
function populateQuestionItemSelect(select) {
  const current = select.value;
  const options = ['<option value="">Nessuna</option>'];
  state.steps.forEach(step => {
    step.items.forEach(it => {
      options.push(`<option value="${it.id}">${esc(step.entity.name)}</option>`);
    });
  });
  select.innerHTML = options.join('');
  select.value = current;
}

function refreshQuizItemSelects() {
  document.querySelectorAll('.question-item').forEach(populateQuestionItemSelect);
}

function collectQuiz() {
  const title = document.getElementById('quiz-title').value.trim();
  const questions = [];
  document.querySelectorAll('#quiz-questions-list .quiz-question-row').forEach(row => {
    const text = row.querySelector('.question-text').value.trim();
    if (!text) return;

    const options = [];
    let correctIndex = -1;
    row.querySelectorAll('.quiz-option-row').forEach(optRow => {
      const value = optRow.querySelector('.option-text').value.trim();
      if (!value) return;
      if (optRow.querySelector('.option-correct').checked) correctIndex = options.length;
      options.push(value);
    });
    if (options.length < 2 || correctIndex < 0) return;

    const itemId = row.querySelector('.question-item').value;
    const question = { text, options, correct_option_index: correctIndex };
    if (itemId) question.item = itemId;
    questions.push(question);
  });
  return { title, questions };
}

/* ============================================================
 *  Invio del form
 * ============================================================ */

async function submitVisit() {
  const feedback = document.getElementById('form-feedback');
  const group = isGroup();

  if (!state.steps.length) {
    feedback.classList.remove('is-pending', 'is-success');
    feedback.classList.add('is-error');
    feedback.textContent = 'Aggiungi almeno una tappa alla sequenza.';
    wizard.setSubmitEnabled(true);
    wizard.goToStep(STEP_SEQUENCE);
    return;
  }

  const payload = {
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    image_url: document.getElementById('image_url').value.trim(),
    tags: collectTags(),
    is_group: group,
    steps: state.steps.map((s, i) => ({
      entity: s.entity.id,
      museum: s.museum.id,
      items: s.items.map(it => it.id),
      order: i,
      intro_note: s.introNote || undefined,
      logistic_note: s.logisticNote || undefined,
    })),
  };

  if (group) {
    payload.is_public = false;
    payload.base_price = 0;
    const quiz = collectQuiz();
    if (!quiz.questions.length) {
      feedback.classList.remove('is-pending', 'is-success');
      feedback.classList.add('is-error');
      feedback.textContent = 'Aggiungi almeno una domanda valida al quiz (con almeno 2 opzioni e una corretta).';
      wizard.setSubmitEnabled(true);
      wizard.goToStep(STEP_QUIZ);
      return;
    }
    payload.quiz = quiz;
  } else {
    payload.base_price = Number(document.getElementById('base_price').value) || 0;
    payload.is_public = currentUser.role === 'author'
      ? document.getElementById('visibility-group').dataset.value === 'public'
      : false; // i visitatori possono avere solo visite private
  }

  feedback.classList.remove('is-success', 'is-error');
  feedback.classList.add('is-pending');
  feedback.textContent = 'Creazione in corso…';

  try {
    const res = await fetch(API_VISITS, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore durante la creazione della visita.');

    feedback.classList.remove('is-pending');
    feedback.classList.add('is-success');
    feedback.textContent = 'Visita creata. Reindirizzamento…';
    setTimeout(() => { window.location.href = '/marketplace/pages/profile.html#visite:create'; }, 1200);
  } catch (err) {
    feedback.classList.remove('is-pending');
    feedback.classList.add('is-error');
    feedback.textContent = err.message;
    wizard.setSubmitEnabled(true);
  }
}

/* ============================================================
 *  Bootstrap
 * ============================================================ */

async function loadMuseumFilterOptions() {
  try {
    const res = await fetch(`${API_MUSEUMS}?pageSize=200&sort=name`);
    if (!res.ok) throw new Error();
    const { data } = await res.json();
    allMuseums = data || [];
    const select = document.getElementById('picker-museum');
    allMuseums.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m._id;
      opt.textContent = m.name;
      select.appendChild(opt);
    });
  } catch {
    // La ricerca funziona comunque senza il filtro museo.
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(window.location.pathname)}`;
    return;
  }
  currentUser = user;

  if (user.role !== 'author') {
    document.getElementById('visit-type-group').disabled = true;
    document.getElementById('group-choice-card').classList.add('is-disabled');
    document.getElementById('group-disabled-hint').hidden = false;
  }

  await loadMuseumFilterOptions();

  setupBtnGroup('visibility-group', 'public');
  syncGroupFields();

  document.querySelectorAll('input[name="visit_type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      syncGroupFields();
      wizard.render();
    });
  });

  renderStepsList();

  /* ---- Modale di selezione opera ---- */
  document.getElementById('open-picker').addEventListener('click', openPicker);
  document.getElementById('picker-close-browse').addEventListener('click', closePicker);
  document.getElementById('picker-close-configure').addEventListener('click', closePicker);
  document.getElementById('picker-back').addEventListener('click', backToBrowse);
  document.getElementById('step-confirm').addEventListener('click', confirmStep);
  document.getElementById('picker-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'picker-overlay') closePicker();
  });

  document.querySelectorAll('#picker-tabs .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#picker-tabs .pill').forEach(b => b.classList.toggle('active', b === btn));
      pickerState.tab = btn.dataset.tab;
      loadPickerGrid();
    });
  });
  document.getElementById('picker-search').addEventListener('input', (e) => {
    clearTimeout(pickerSearchTimer);
    pickerSearchTimer = setTimeout(() => {
      pickerState.search = e.target.value.trim();
      loadPickerGrid();
    }, 320);
  });
  document.getElementById('picker-museum').addEventListener('change', (e) => {
    pickerState.museum = e.target.value;
    loadPickerGrid();
  });

  /* ---- Quiz ---- */
  document.getElementById('add-question').addEventListener('click', addQuestionRow);

  /* ---- Wizard ---- */
  wizard = createWizard({
    form: document.getElementById('visit-form'),
    track: document.getElementById('carousel-track'),
    stepButtons: document.querySelectorAll('.wizard-step'),
    lineEls: document.querySelectorAll('.wizard-step-line'),
    prevBtn: document.getElementById('wizard-prev'),
    nextBtn: document.getElementById('wizard-next'),
    getPath,
    submitLabel: 'Crea visita',
    onSubmit: submitVisit,
  });

  // Entrando nello step Quiz, la prima domanda va aggiunta se non c'è
  // ancora nulla, e gli elenchi "Opera collegata" vanno aggiornati con
  // la sequenza più recente. Il cambio di step vero e proprio (currentStep)
  // avviene dentro il click/submit handler di wizard.js: un setTimeout(0)
  // rimanda il controllo a dopo quella transizione sincrona.
  document.querySelectorAll('.wizard-step, #wizard-next').forEach(el => {
    el.addEventListener('click', () => {
      setTimeout(() => {
        if (wizard.getCurrentStep() !== STEP_QUIZ) return;
        if (!document.getElementById('quiz-questions-list').children.length) addQuestionRow();
        refreshQuizItemSelects();
      }, 0);
    });
  });
});
