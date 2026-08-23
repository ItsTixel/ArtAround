/* ============================================================
 *  create-visit.js — Pagina "Crea Visita"
 *  Form a carosello di 3 sezioni (Tipo, Informazioni, Sequenza).
 *  La sezione "Sequenza" apre un modale con 3 viste (Tutto il
 *  catalogo / Create da te / Preferiti) per scegliere le opere da
 *  inserire come tappe, ciascuna con museo, opere (item/descrizioni)
 *  e note. Per le visite di gruppo, dopo la Sequenza si chiede se
 *  aggiungere un quiz finale: solo in caso affermativo il 4° step
 *  "Quiz" — presente nello stepper ma disabilitato finché non si
 *  decide — entra nel percorso attivo e diventa raggiungibile.
 * ============================================================ */

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { createWizard } from '/marketplace/js/wizard.js';
import { TONE_ORDER, TONE_LABELS } from '/marketplace/js/tone-labels.js';

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

/* Modalità modifica: ?edit=<id> nell'URL. Stessa pagina/form della
 * creazione, ma precompilata con i dati esistenti e che invia PUT invece di POST  */
const editVisitId = new URLSearchParams(window.location.search).get('edit');

/* Codice della visita di gruppo: il valore per cui l'ultima verifica al
 * backend ha risposto "disponibile". Si azzera a ogni modifica del campo e
 * viene ricontrollato al submit, perché la validità nativa dell'input
 * (customValidity) da sola non copre il caso "l'utente ha inviato il form
 * mentre la verifica era ancora in corso". */
let confirmedCode = null;
let codeCheckTimer = null;
let codeCheckToken = 0;

/* Modalità modifica: il codice che la visita aveva già al caricamento.
 * GET /code/:code/available la segnalerebbe come "in uso" trovando la
 * visita stessa, quindi se il campo torna a valere questo codice va
 * considerato per forza libero, senza richiederlo al backend. */
let originalCode = null;

/* Modalità modifica: true se la visita era già pubblica al caricamento.
 * Una volta pubblica una visita non può tornare privata (il contrario è
 * invece permesso, anche avanti e indietro finché non si salva): usato da
 * setupBtnGroup per bloccare l'opzione "Privata" nel gruppo di visibilità. */
let originalIsPublic = false;

/* Sequenza in costruzione. Ogni voce: { entity, museum, items[], introNote, logisticNote } */
const state = { steps: [], editingIndex: null };

/* Il quiz è facoltativo per le visite di gruppo: si decide con il prompt
 * mostrato dopo la Sequenza (vedi #quiz-prompt-overlay), non è più uno step
 * numerato dello stepper. true anche in modifica se la visita ha già un quiz. */
let wantsQuiz = false;

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
  const base = [STEP_TYPE, STEP_INFO, STEP_SEQUENCE];
  return (isGroup() && wantsQuiz) ? [...base, STEP_QUIZ] : base;
}

/* Popup breve e non bloccante per segnalare un tentativo di modifica non
 * permesso (privatizzare una visita pubblica, cambiare tipo di visita in
 * modifica): stesso pattern posizionale del tooltip di create-item.js,
 * ma mostrato al click invece che all'hover e con sparizione automatica. */
let lockPopupEl = null;
let lockPopupTimer = null;

function showLockPopup(anchorEl, text) {
  if (!lockPopupEl) {
    lockPopupEl = document.createElement('div');
    lockPopupEl.className = 'lock-popup';
    lockPopupEl.setAttribute('role', 'alert');
    document.body.appendChild(lockPopupEl);
  }
  clearTimeout(lockPopupTimer);
  lockPopupEl.textContent = text;
  lockPopupEl.classList.add('visible');

  const margin = 12;
  const rect = anchorEl.getBoundingClientRect();
  const half = lockPopupEl.offsetWidth / 2;
  const center = Math.min(
    Math.max(rect.left + rect.width / 2, half + margin),
    window.innerWidth - half - margin
  );
  lockPopupEl.style.left = `${center}px`;
  lockPopupEl.style.top = `${rect.top - 10}px`;
  lockPopupEl.style.transform = 'translate(-50%, -100%)';

  lockPopupTimer = setTimeout(() => lockPopupEl.classList.remove('visible'), 2600);
}

/* isBlocked(value), se passato, decide per ogni click se il cambio va
 * impedito: ritornando il messaggio da mostrare nel popup invece del
 * normale aggiornamento del gruppo. */
function setupBtnGroup(groupId, defaultValue, isBlocked) {
  const group = document.getElementById(groupId);
  group.dataset.value = defaultValue;
  group.querySelectorAll('.btn-option').forEach(btn => {
    const isDefault = btn.dataset.value === defaultValue;
    btn.setAttribute('aria-checked', String(isDefault));
    btn.addEventListener('click', () => {
      const blockMessage = isBlocked?.(btn.dataset.value);
      if (blockMessage) {
        showLockPopup(btn, blockMessage);
        return;
      }
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

  // Il 4° step "Quiz" riguarda solo le visite di gruppo: per le singole va
  // nascosto del tutto (non solo sbiadito come quando è di gruppo ma il
  // quiz non è ancora stato scelto — quello lo gestisce già il wizard).
  document.getElementById('quiz-step').hidden = !group;
  document.getElementById('quiz-step-line').hidden = !group;

  const codeInput = document.getElementById('visit-code');
  document.getElementById('group-code-field').hidden = !group;
  codeInput.required = group;
  if (group) {
    onCodeInput({ target: codeInput }); // ri-valida un eventuale codice già scritto in precedenza
  } else {
    resetCodeCheck();
  }
}

const CODE_DEFAULT_HINT = 'I partecipanti useranno questo codice per unirsi alla visita. 4-15 caratteri, lettere e numeri.';

function setCodeStatus(iconState, hintText, hintState) {
  const icon = document.getElementById('code-status-icon');
  const hint = document.getElementById('code-status-hint');
  icon.className = 'code-status-icon' + (iconState ? ` is-${iconState}` : '');
  hint.className = 'block-hint' + (hintState ? ` is-${hintState}` : '');
  hint.textContent = hintText;
}

function resetCodeCheck() {
  clearTimeout(codeCheckTimer);
  codeCheckToken++;
  confirmedCode = null;
  document.getElementById('visit-code').setCustomValidity('');
  setCodeStatus('', CODE_DEFAULT_HINT);
}

async function checkCodeAvailability(code) {
  const token = ++codeCheckToken;
  const input = document.getElementById('visit-code');
  try {
    const res = await fetch(`${API_VISITS}/code/${encodeURIComponent(code)}/available`, { credentials: 'include' });
    if (token !== codeCheckToken) return; // l'utente ha continuato a scrivere: risposta obsoleta
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { available } = await res.json();
    if (available) {
      confirmedCode = code;
      input.setCustomValidity('');
      setCodeStatus('available', 'Codice disponibile.', 'success');
    } else {
      input.setCustomValidity('Codice già in uso.');
      setCodeStatus('taken', 'Codice già in uso, scegline un altro.', 'error');
    }
  } catch (e) {
    if (token !== codeCheckToken) return;
    input.setCustomValidity('');
    setCodeStatus('', 'Impossibile verificare il codice al momento.', 'error');
    console.error('Errore nella verifica del codice:', e);
  }
}

/* Chiamato sia dall'evento 'input' del campo sia da syncGroupFields quando
 * si torna sulla visita di gruppo con un codice già scritto. */
function onCodeInput(e) {
  const input = e.target;
  const cleaned = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned !== input.value) input.value = cleaned;

  clearTimeout(codeCheckTimer);
  codeCheckToken++; // invalida eventuali verifiche già in volo per il valore precedente
  confirmedCode = null;

  if (cleaned.length < 4) {
    input.setCustomValidity(cleaned ? 'Il codice deve avere almeno 4 caratteri.' : 'Scegli un codice per la visita.');
    setCodeStatus('', CODE_DEFAULT_HINT);
    return;
  }

  if (originalCode && cleaned === originalCode) {
    confirmedCode = cleaned;
    input.setCustomValidity('');
    setCodeStatus('available', 'Codice disponibile.', 'success');
    return;
  }

  input.setCustomValidity(''); // provvisorio: la verifica async lo conferma o lo nega a breve
  setCodeStatus('checking', 'Verifica disponibilità…');
  codeCheckTimer = setTimeout(() => checkCodeAvailability(cleaned), 400);
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
    <div class="picker-card-thumb">${entity.image_url ? `<img src="${esc(entity.image_url)}" alt="${esc(entity.alt_text || entity.name || '')}" loading="lazy">` : ''}</div>
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

/* Ogni tono può contribuire al massimo una descrizione alla tappa (vedi
 * feedback-visit-step-design in memoria: il tono è ciò che distingue le
 * versioni della stessa opera, non un dettaglio da sommare liberamente).
 * Le checkbox sono raggruppate per data-tone e questo listener le rende
 * mutualmente esclusive all'interno dello stesso tono, restando comunque
 * deselezionabili con un secondo click (a differenza di un vero radio). */
function enforceToneExclusivity(container, tone, checkbox) {
  if (!checkbox.checked) return;
  container.querySelectorAll(`input[data-tone="${tone}"]`).forEach(cb => {
    if (cb !== checkbox) cb.checked = false;
  });
}

function renderStepItemRow(container, it) {
  const row = document.createElement('div');
  row.className = 'step-item-row';
  const totalSec = (it.descriptions || []).reduce((sum, d) => sum + (d.duration_sec || 0), 0);
  row.innerHTML = `
    <label class="step-item-row-select">
      <input type="checkbox" value="${it._id}" data-tone="${it.tone}">
      <span class="step-item-row-body">
        <span class="step-item-row-summary">${esc(it.marketplace_summary)}</span>
        <span class="step-item-row-meta">${esc(it.license)}${totalSec ? ` · ${totalSec}s` : ''}</span>
      </span>
    </label>
    <button type="button" class="step-item-expand-btn" aria-expanded="false" aria-label="Mostra il testo di questa descrizione">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  `;

  const textPanel = document.createElement('div');
  textPanel.className = 'step-item-row-text';
  textPanel.hidden = true;
  textPanel.innerHTML = (it.descriptions || []).map(d => `<p>${esc(d.text)}</p>`).join('')
    || '<p class="step-items-empty">Nessun testo disponibile.</p>';

  row.querySelector('.step-item-expand-btn').addEventListener('click', (btnEvent) => {
    const btn = btnEvent.currentTarget;
    const opening = textPanel.hidden;
    textPanel.hidden = !opening;
    btn.setAttribute('aria-expanded', String(opening));
    btn.setAttribute('aria-label', opening ? 'Nascondi il testo di questa descrizione' : 'Mostra il testo di questa descrizione');
  });

  const checkbox = row.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => enforceToneExclusivity(container, it.tone, checkbox));

  container.appendChild(row);
  container.appendChild(textPanel);
  return checkbox;
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

    TONE_ORDER.forEach(tone => {
      const section = document.createElement('div');
      section.className = 'tone-section';
      section.innerHTML = `<div class="tone-section-title">${esc(TONE_LABELS[tone])}</div>`;

      const items = usable.filter(it => it.tone === tone);
      if (!items.length) {
        section.innerHTML += '<p class="step-items-empty">Nessuna descrizione con questo tono per questa opera.</p>';
      } else {
        items.forEach(it => {
          const checkbox = renderStepItemRow(section, it);
          checkbox.checked = preselected.has(it._id);
        });
      }

      list.appendChild(section);
    });
  } catch (e) {
    list.innerHTML = '<p class="step-items-empty">Errore nel caricamento delle descrizioni.</p>';
    console.error('Errore nel caricamento degli item:', e);
  }
}

/* Seleziona automaticamente la prima descrizione disponibile per ogni
 * tono che non ne ha ancora una scelta: non tocca i toni già impostati
 * a mano, così il tasto si può usare anche solo per completare i vuoti. */
function autofillStepItems() {
  const list = document.getElementById('step-items-list');
  TONE_ORDER.forEach(tone => {
    if (list.querySelector(`input[data-tone="${tone}"]:checked`)) return;
    const first = list.querySelector(`input[data-tone="${tone}"]`);
    if (first) first.checked = true;
  });
}

async function openConfigure(entity) {
  pickerSelectedEntity = entity;
  document.getElementById('picker-browse').hidden = true;
  document.getElementById('picker-configure').hidden = false;

  document.getElementById('picker-configure-entity').innerHTML = `
    ${entity.image_url ? `<img src="${esc(entity.image_url)}" alt="${esc(entity.alt_text || entity.name || '')}">` : ''}
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
    entity: { id: pickerSelectedEntity._id, name: pickerSelectedEntity.name, imageUrl: pickerSelectedEntity.image_url, altText: pickerSelectedEntity.alt_text },
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
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `Modifica tappa ${i + 1}: ${step.entity.name}`);
    row.innerHTML = `
      <span class="step-row-order">${i + 1}</span>
      <span class="step-row-thumb">${step.entity.imageUrl ? `<img src="${esc(step.entity.imageUrl)}" alt="${esc(step.entity.altText || step.entity.name || '')}">` : ''}</span>
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

    const openStepEditor = async () => {
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
    };
    row.addEventListener('click', (e) => {
      if (e.target.closest('.step-row-actions')) return;
      openStepEditor();
    });
    row.addEventListener('keydown', (e) => {
      if (e.target.closest('.step-row-actions')) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStepEditor(); }
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

/* Entrando nello step Quiz (dal prompt o dallo stepper una volta che il
 * quiz è stato scelto), la prima domanda va aggiunta se non c'è ancora
 * nulla, e gli elenchi "Opera collegata" vanno aggiornati con la sequenza
 * più recente (può essere cambiata dall'ultima visita a questo step). */
function enterQuizStep() {
  if (!document.getElementById('quiz-questions-list').children.length) addQuestionRow();
  refreshQuizItemSelects();
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
 *  Modalità modifica: precompilazione del form
 * ============================================================ */

async function loadVisitForEdit(id) {
  try {
    const res = await fetch(`${API_VISITS}/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const visit = await res.json();
    const authorId = visit.author?._id || visit.author;
    if (String(authorId) !== String(currentUser._id)) throw new Error('not-author');
    return visit;
  } catch (e) {
    console.error('Errore nel caricamento della visita da modificare:', e);
    window.location.href = '/marketplace/pages/profile.html#visite:create';
    return null;
  }
}

// Forza il tipo di visita e disabilita la modifica.
function applyVisitTypeToForm(visit) {
  document.querySelectorAll('input[name="visit_type"]').forEach(radio => {
    radio.checked = radio.value === (visit.is_group ? 'group' : 'single');
    radio.disabled = true; // is_group è immutabile dopo la creazione
  });

  // Il radio disabilitato da solo impedisce già il cambio, ma senza alcun
  // avviso: la label che lo contiene resta cliccabile, quindi ci si aggancia
  // il popup di blocco (solo quando si prova davvero a cambiare tipo).
  document.querySelectorAll('#type-choice .choice-card').forEach(card => {
    const input = card.querySelector('input[name="visit_type"]');
    card.addEventListener('click', (e) => {
      if (input.checked) return;
      e.preventDefault();
      showLockPopup(card, 'Il tipo di visita non può essere cambiato dopo la creazione.');
    });
  });
}

// converte visit.steps nel formato interno usato da state.steps
function applyStepsToForm(visit) {
  state.steps = (visit.steps || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(s => ({
      entity: { id: s.entity._id, name: s.entity.name, imageUrl: s.entity.image_url, altText: s.entity.alt_text },
      museum: { id: s.museum._id, name: s.museum.name },
      items: (s.items || []).map(it => ({ id: it._id })),
      introNote: s.intro_note || '',
      logisticNote: s.logistic_note || '',
    }));
  renderStepsList();
}

function applyQuizToForm(quiz) {
  document.getElementById('quiz-title').value = quiz?.title || '';
  const container = document.getElementById('quiz-questions-list');
  container.innerHTML = '';
  (quiz?.questions || []).forEach(q => {
    addQuestionRow();
    const row = container.lastElementChild;
    row.querySelector('.question-text').value = q.text || '';
    const optionsList = row.querySelector('.quiz-options-list');
    optionsList.innerHTML = '';
    (q.options || []).forEach((opt, idx) => addOptionRow(optionsList, opt, idx === q.correct_option_index));
    if (q.item) row.querySelector('.question-item').value = q.item._id || q.item;
  });
}

function applyEditingVisitToForm(visit) {
  document.getElementById('title').value = visit.title || '';
  document.getElementById('description').value = visit.description || '';
  document.getElementById('image_url').value = visit.image_url || '';
  document.getElementById('tags').value = (visit.tags || []).join(', ');
  applyStepsToForm(visit);

  if (visit.is_group) {
    const codeInput = document.getElementById('visit-code');
    originalCode = visit.code || null;
    codeInput.value = visit.code || '';
    codeInput.setCustomValidity('');
    confirmedCode = visit.code || null;
    setCodeStatus('available', 'Codice disponibile.', 'success');

    wantsQuiz = Boolean(visit.quiz);
    if (wantsQuiz) applyQuizToForm(visit.quiz);
  } else {
    document.getElementById('base_price').value = visit.base_price || 0;
  }
}

/* ============================================================
 *  Invio del form
 * ============================================================ */

async function submitVisit() {
  const feedback = document.getElementById('form-feedback');
  const group = isGroup();
  const editing = Boolean(editVisitId);

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

    const code = document.getElementById('visit-code').value.trim().toUpperCase();
    if (!code || code !== confirmedCode) {
      feedback.classList.remove('is-pending', 'is-success');
      feedback.classList.add('is-error');
      feedback.textContent = 'Scegli un codice disponibile per la visita.';
      wizard.setSubmitEnabled(true);
      wizard.goToStep(STEP_TYPE);
      return;
    }
    payload.code = code;

    if (wantsQuiz) {
      const quiz = collectQuiz();
      if (!quiz.questions.length) {
        feedback.classList.remove('is-pending', 'is-success');
        feedback.classList.add('is-error');
        feedback.textContent = 'Aggiungi almeno una domanda valida al quiz (con almeno 2 opzioni e una corretta), oppure "Continua senza quiz".';
        wizard.setSubmitEnabled(true);
        wizard.goToStep(STEP_QUIZ);
        return;
      }
      payload.quiz = quiz;
    } else if (editing) {
      payload.quiz = null; // segnala esplicitamente la rimozione di un quiz già esistente
    } // altrimenti (creazione senza quiz): il campo resta assente dal payload
  } else {
    payload.base_price = Number(document.getElementById('base_price').value) || 0;
    payload.is_public = currentUser.role === 'author'
      ? document.getElementById('visibility-group').dataset.value === 'public'
      : false; // i visitatori possono avere solo visite private
  }

  if (editing) delete payload.is_group; // immutabile dopo la creazione: non reinviarlo

  feedback.classList.remove('is-success', 'is-error');
  feedback.classList.add('is-pending');
  feedback.textContent = editing ? 'Salvataggio in corso…' : 'Creazione in corso…';

  try {
    const res = await fetch(editing ? `${API_VISITS}/${editVisitId}` : API_VISITS, {
      method: editing ? 'PUT' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Errore durante ${editing ? 'il salvataggio' : 'la creazione'} della visita.`);

    feedback.classList.remove('is-pending');
    feedback.classList.add('is-success');
    feedback.textContent = editing ? 'Modifiche salvate. Reindirizzamento…' : 'Visita creata. Reindirizzamento…';
    setTimeout(() => { window.location.href = '/marketplace/pages/profile.html#visite:create'; }, 1200);
  } catch (err) {
    feedback.classList.remove('is-pending');
    feedback.classList.add('is-error');
    feedback.textContent = err.message;
    wizard.setSubmitEnabled(true);
  }
}

/* Chiamato dal wizard alla fine del percorso attivo (getPath). Per le
 * visite di gruppo che non hanno ancora deciso sul quiz, intercetta l'invio
 * e chiede prima se aggiungerlo, invece di creare subito la visita. */
function handleWizardSubmit() {
  if (isGroup() && !wantsQuiz) {
    document.getElementById('quiz-prompt-overlay').hidden = false;
    return;
  }
  submitVisit();
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
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return;
  }
  currentUser = user;

  if (user.role !== 'author') {
    document.getElementById('visit-type-group').disabled = true;
    document.getElementById('group-choice-card').classList.add('is-disabled');
    document.getElementById('group-disabled-hint').hidden = false;
  }

  await loadMuseumFilterOptions();

  let editingVisit = null;
  if (editVisitId) {
    editingVisit = await loadVisitForEdit(editVisitId);
    if (!editingVisit) return; // proprietario non valido o errore: già reindirizzato
    originalIsPublic = Boolean(editingVisit.is_public);
    applyVisitTypeToForm(editingVisit);

    document.title = 'ArtAround — Modifica Visita';
    document.querySelector('.page-hero h1').textContent = 'Modifica la tua visita';
    document.querySelector('.page-hero .hero-sub').textContent = 'Aggiorna le informazioni, la sequenza o il quiz di questa visita';
  }

  setupBtnGroup(
    'visibility-group',
    editingVisit && !editingVisit.is_public ? 'private' : 'public',
    value => (value === 'private' && originalIsPublic) ? 'Una visita pubblica non può tornare privata.' : null,
  );
  syncGroupFields();
  if (editingVisit) applyEditingVisitToForm(editingVisit);

  document.querySelectorAll('input[name="visit_type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      wantsQuiz = false; // si torna a chiedere se cambia il tipo di visita
      syncGroupFields();
      wizard.render();
    });
  });
  document.getElementById('visit-code').addEventListener('input', onCodeInput);

  renderStepsList();

  /* ---- Modale di selezione opera ---- */
  document.getElementById('open-picker').addEventListener('click', openPicker);
  document.getElementById('picker-close-browse').addEventListener('click', closePicker);
  document.getElementById('picker-close-configure').addEventListener('click', closePicker);
  document.getElementById('picker-back').addEventListener('click', backToBrowse);
  document.getElementById('step-confirm').addEventListener('click', confirmStep);
  document.getElementById('step-items-autofill').addEventListener('click', autofillStepItems);
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
  document.getElementById('remove-quiz').addEventListener('click', () => {
    // Stesso risultato di "No, concludi senza" nel prompt: scarta il quiz
    // in corso di compilazione e crea/salva subito la visita senza,
    // invece di tornare alla Sequenza.
    wantsQuiz = false;
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-questions-list').innerHTML = '';
    wizard.setSubmitEnabled(false);
    submitVisit();
  });

  /* ---- Prompt "vuoi aggiungere un quiz?" (solo visite di gruppo, dopo la Sequenza) ---- */
  document.getElementById('quiz-prompt-yes').addEventListener('click', () => {
    document.getElementById('quiz-prompt-overlay').hidden = true;
    wantsQuiz = true;
    wizard.setSubmitEnabled(true);
    enterQuizStep();
    wizard.goToStep(STEP_QUIZ);
  });
  document.getElementById('quiz-prompt-no').addEventListener('click', () => {
    document.getElementById('quiz-prompt-overlay').hidden = true;
    submitVisit();
  });
  document.getElementById('quiz-prompt-overlay').addEventListener('click', (e) => {
    if (e.target.id !== 'quiz-prompt-overlay') return;
    e.currentTarget.hidden = true;
    wizard.setSubmitEnabled(true); // dismesso senza scegliere: si può riaprire ricliccando la conferma
  });

  /* ---- Wizard ---- */
  wizard = createWizard({
    form: document.getElementById('visit-form'),
    track: document.getElementById('carousel-track'),
    stepButtons: document.querySelectorAll('.wizard-step'),
    lineEls: document.querySelectorAll('.wizard-step-line'),
    prevBtn: document.getElementById('wizard-prev'),
    nextBtn: document.getElementById('wizard-next'),
    getPath,
    submitLabel: editingVisit ? 'Salva modifiche' : 'Crea visita',
    onSubmit: handleWizardSubmit,
  });

  // Se si raggiunge lo step Quiz dallo stepper (quiz già scelto in una
  // visita in modifica, o tornandoci dopo averlo lasciato), va comunque
  // garantita almeno una domanda e un elenco "Opera collegata" aggiornato.
  // Il cambio di step vero e proprio (currentStep) avviene dentro il
  // click/submit handler di wizard.js: un setTimeout(0) rimanda il
  // controllo a dopo quella transizione sincrona.
  document.querySelectorAll('.wizard-step, #wizard-next').forEach(el => {
    el.addEventListener('click', () => {
      setTimeout(() => {
        if (wizard.getCurrentStep() !== STEP_QUIZ) return;
        enterQuizStep();
      }, 0);
    });
  });
});
