/**
 * <museum-modal>
 * Overlay in sovraimpressione con le informazioni di un museo: nome,
 * descrizione, immagine, sito web e indirizzo. In fondo un tasto porta
 * alla lista delle visite di quel museo. Il tasto "Modifica" — visibile
 * a chiunque sia autore (non ai visitatori) — trasforma il corpo del
 * popup in un form completo, sullo stesso schema del carosello di
 * "Crea Museo" (create-museum.js), inclusi orari, servizi, dettagli di
 * accessibilità e mappe: i campi condivisi vengono da
 * museum-form-fields.js, così le due UI restano coerenti.
 *
 * Come <opera-modal>, questo modal si apre sia dal profilo sia dal
 * catalogo pubblico (index.html): il tasto "Modifica" compare per
 * qualunque autore loggato, non solo per chi ha creato il museo (il
 * backend, per i musei, applica comunque solo il controllo di ruolo,
 * non di proprietà — vedi routes/museums.js).
 *
 * Uso:
 *   document.querySelector('museum-modal').open(museumId);
 *
 * Alla modifica riuscita viene emesso 'museum-updated' (bubbles) con il
 * nuovo museo in detail.
 */

import { GLASS_MODAL as GLASS, TRANSITION } from '/marketplace/js/ui-tokens.js';
import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { trapTabKey, focusDialog } from '/marketplace/js/focus-trap.js';
import { createImageField } from '/marketplace/js/image-field.js';
import { setupHoursGrid, setupKvList, setupMapsList } from '/marketplace/js/museum-form-fields.js';
import { slugify } from '/marketplace/js/slug.js';

const API_MUSEUMS = '/api/museums';
const VISITS_URL  = '/marketplace/pages/visits.html';

class MuseumModal extends HTMLElement {
  constructor() {
    super();
    this._museum = null;
    this._loading = false;
    this._error = null;
    this._mode = 'view'; // 'view' | 'edit'
    this._currentUser = undefined; // undefined = non ancora caricato
    this._previouslyFocused = null;
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() { this._render(); }

  async open(museumId) {
    this._museum = null;
    this._loading = true;
    this._error = null;
    this._mode = 'view';

    this._previouslyFocused = document.activeElement;
    this.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKeydown);
    this._render();
    focusDialog(this.querySelector('.panel'));

    try {
      const [museum] = await Promise.all([
        fetch(`${API_MUSEUMS}/${museumId}`).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        this._loadCurrentUserOnce(),
      ]);
      this._museum = museum;
    } catch (e) {
      console.error('Errore nel caricamento del museo:', e);
      this._error = 'Errore nel caricamento del museo. Riprova più tardi.';
    } finally {
      this._loading = false;
      this._render();
    }
  }

  close() {
    this.removeAttribute('open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this._onKeydown);
    this._mode = 'view';
    this._render();
    this._previouslyFocused?.focus?.();
    this._previouslyFocused = null;
  }

  _onKeydown(e) {
    if (e.key === 'Escape') { this.close(); return; }
    trapTabKey(e, () => this.querySelector('.panel'));
  }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async _loadCurrentUserOnce() {
    if (this._currentUser !== undefined) return this._currentUser;
    this._currentUser = await getCurrentUser();
    return this._currentUser;
  }

  _isAuthor() {
    return this._currentUser?.role === 'author';
  }

  _enterEdit() {
    this._mode = 'edit';
    this._render();
  }

  _cancelEdit() {
    this._mode = 'view';
    this._render();
  }

  _addressLine(a = {}) {
    return [a.street, [a.zip, a.city].filter(Boolean).join(' '), a.country]
      .filter(Boolean).join(', ');
  }

  _hoursHtml(hours = {}) {
    const dayOrder = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const days = dayOrder.filter((d) => hours[d]);
    if (!days.length) return '';

    const todayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const today = todayNames[new Date().getDay()];

    return `
      <div class="mb-5 pt-4 border-t border-slate-400/20">
        <h3 class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-3">Orari di apertura</h3>
        <ul class="flex flex-col gap-1.5">
          ${days.map((day) => `
          <li class="flex items-center justify-between gap-4 text-sm ${day === today ? 'text-slate-800 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}">
            <span class="capitalize">${this._esc(day)}</span>
            <span>${this._esc(hours[day])}</span>
          </li>`).join('')}
        </ul>
      </div>
    `;
  }

  _accessibilityHtml(m) {
    const details = m.accessibility_info || {};
    const keys = Object.keys(details);
    if (!m.is_accessible && !keys.length) return '';

    return `
      <div class="mb-5 pt-4 border-t border-slate-400/20">
        <h3 class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-3">Accessibilità</h3>
        <span class="inline-flex items-center gap-1.5 w-fit text-[0.68rem] font-medium leading-none px-3 py-1.5 rounded-full ${GLASS} text-slate-800 dark:text-slate-100 mb-3">
          <span class="w-1.5 h-1.5 rounded-full shrink-0 ${m.is_accessible ? 'bg-green-400/80' : 'bg-red-400/80'}" aria-hidden="true"></span>
          <span>${m.is_accessible ? 'Museo accessibile' : 'Museo non accessibile'}</span>
        </span>
        ${keys.length ? `
        <ul class="flex flex-col gap-1.5">
          ${keys.map((key) => `
          <li class="text-sm text-slate-500 dark:text-slate-400">
            <span class="font-semibold text-slate-800 dark:text-slate-100">${this._esc(key)}:</span>
            <span> ${this._esc(details[key])}</span>
          </li>`).join('')}
        </ul>` : ''}
      </div>
    `;
  }

  _viewBodyHtml() {
    const m = this._museum;
    const address = this._addressLine(m.address);
    const cityLine = [m.address?.city, m.address?.country].filter(Boolean).join(' · ');

    return `
      <div class="relative h-[190px] bg-slate-300/20 dark:bg-slate-800/40 border-b border-slate-400/20 flex items-center justify-center overflow-hidden shrink-0">
        ${m.image_url
          ? `<img class="absolute inset-0 w-full h-full object-cover" src="${this._esc(m.image_url)}" alt="${this._esc(m.name)}" loading="lazy">`
          : `<div class="absolute inset-0" style="background-image: repeating-linear-gradient(135deg, transparent 0 11px, rgba(100,116,139,0.12) 11px 12px);"></div>
             <svg class="relative w-12 h-12 fill-slate-400 dark:fill-slate-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
               <path d="M22 11V9L12 2 2 9v2h2v9h5v-5h6v5h5v-9h2z"/>
             </svg>`}
        <span class="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1] text-[0.68rem] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full ${GLASS} text-slate-800 dark:text-slate-100 text-center max-w-[80%] whitespace-nowrap overflow-hidden text-ellipsis" style="font-family: var(--font-mono);">${this._esc(m.name)}</span>
      </div>

      <div class="pt-7 px-5 sm:px-8 pb-7 sm:pb-8">
        ${cityLine ? `<div class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-2">${this._esc(cityLine)}</div>` : ''}
        <h2 class="text-2xl font-semibold leading-tight text-slate-800 dark:text-slate-100 mb-4" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._esc(m.name)}</h2>

        ${m.description ? `<p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400 mb-5">${this._esc(m.description)}</p>` : ''}

        ${this._hoursHtml(m.opening_hours)}
        ${this._accessibilityHtml(m)}

        <ul class="flex flex-col gap-2.5 pt-4 border-t border-slate-400/20">
          ${address ? `
          <li class="flex items-center gap-2.5 text-sm text-slate-800 dark:text-slate-100">
            <svg class="w-4 h-4 shrink-0 fill-slate-500 dark:fill-slate-400" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
            <span>${this._esc(address)}</span>
          </li>` : ''}
          ${m.website ? `
          <li class="flex items-center gap-2.5 text-sm text-slate-800 dark:text-slate-100">
            <svg class="w-4 h-4 shrink-0 fill-slate-500 dark:fill-slate-400" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.93 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a7.95 7.95 0 0 1 0-4h3.38a16.6 16.6 0 0 0 0 4H4.26zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56A8.03 8.03 0 0 1 5.07 16zm2.95-8H5.07a8.03 8.03 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.02 8zM12 19.96a15.7 15.7 0 0 1-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66a14.6 14.6 0 0 1 0-4h4.68a14.6 14.6 0 0 1 0 4zm.27 2h2.95a8.03 8.03 0 0 1-4.33 3.56c.6-1.11 1.06-2.31 1.38-3.56zm-.27-8a14.6 14.6 0 0 0 0-4h2.95a7.95 7.95 0 0 1 0 4h-2.95zM7.4 4.44A15.7 15.7 0 0 0 6.02 8H3.07a8.03 8.03 0 0 1 4.33-3.56z"/>
            </svg>
            <a class="hover:underline break-all" style="color: var(--link-color, #93c5fd);" href="${this._esc(m.website)}" target="_blank" rel="noopener noreferrer">${this._esc(m.website.replace(/^https?:\/\//, ''))}</a>
          </li>` : ''}
        </ul>
      </div>
    `;
  }

  _viewFooterHtml() {
    const m = this._museum;
    const slug = slugify(m.name);
    const visitsUrl = slug ? `${VISITS_URL}/${slug}` : VISITS_URL;
    const btnBase = `text-[0.72rem] font-semibold tracking-[0.08em] uppercase px-6 py-3 rounded-full border border-transparent cursor-pointer whitespace-nowrap ${TRANSITION}`;
    const btnGhost = `${btnBase} bg-transparent border-slate-400/20 text-slate-800 dark:text-slate-100 hover:bg-white/20 hover:border-white/30`;
    return `
      ${this._isAuthor() ? `<button type="button" class="btn ghost ${btnGhost}" id="edit-btn">Modifica</button>` : ''}
      <a class="btn primary inline-block ${btnBase} bg-slate-800 text-white dark:bg-white dark:text-slate-900 hover:opacity-90" id="visits-btn" href="${visitsUrl}">Scopri visite</a>
    `;
  }

  _bindView() {
    this.querySelector('#edit-btn')?.addEventListener('click', () => this._enterEdit());
  }

  /* ---- Form di modifica ---- */

  _editBodyHtml() {
    const m = this._museum;

    return `
      <div class="pt-7 px-5 sm:px-8 pb-7 sm:pb-8">
        <form id="museum-edit-form" class="create-form" style="gap: 1.4rem;">
          <div class="field">
            <label for="edit-name">Nome *</label>
            <input id="edit-name" type="text" value="${this._esc(m.name)}" required>
          </div>
          <div class="field">
            <label for="edit-wikidata-id">ID Wikidata</label>
            <input id="edit-wikidata-id" type="text" value="${this._esc(m.wikidata_id)}" placeholder="Es. Q51252">
          </div>
          <div class="field">
            <label for="edit-description">Descrizione</label>
            <textarea id="edit-description" rows="4">${this._esc(m.description)}</textarea>
          </div>
          <div class="field">
            <label>Immagine</label>
            <div id="edit-image-field"></div>
          </div>
          <div class="field">
            <label for="edit-website">Sito web</label>
            <input id="edit-website" type="text" value="${this._esc(m.website)}" placeholder="https://…">
          </div>
          <div class="field">
            <label>Accessibilità</label>
            <div class="btn-group" id="edit-accessible-group" role="radiogroup" aria-label="Museo accessibile">
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="true">Accessibile</button>
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="false">Non accessibile</button>
            </div>
          </div>
          <div class="field">
            <label for="edit-street">Via *</label>
            <input id="edit-street" type="text" value="${this._esc(m.address?.street)}" required>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="edit-city">Città *</label>
              <input id="edit-city" type="text" value="${this._esc(m.address?.city)}" required>
            </div>
            <div class="field">
              <label for="edit-zip">CAP *</label>
              <input id="edit-zip" type="text" value="${this._esc(m.address?.zip)}" required>
            </div>
            <div class="field">
              <label for="edit-country">Paese *</label>
              <input id="edit-country" type="text" value="${this._esc(m.address?.country)}" required>
            </div>
          </div>
          <div class="field">
            <label>Orari di apertura</label>
            <div id="edit-hours-grid"></div>
          </div>
          <div class="field">
            <label>Servizi</label>
            <div id="edit-services-list" class="dynamic-list"></div>
            <button type="button" id="edit-add-service" class="btn-secondary">+ Aggiungi servizio</button>
          </div>
          <div class="field">
            <label>Dettagli di accessibilità</label>
            <div id="edit-accessibility-list" class="dynamic-list"></div>
            <button type="button" id="edit-add-accessibility" class="btn-secondary">+ Aggiungi dettaglio</button>
          </div>
          <div class="field">
            <label>Mappe (piante con punti di interesse)</label>
            <div id="edit-maps-list" class="dynamic-list"></div>
            <button type="button" id="edit-add-map" class="btn-secondary" aria-describedby="edit-maps-feedback">+ Aggiungi mappa</button>
            <p class="feedback" id="edit-maps-feedback"></p>
          </div>
          <p class="feedback" id="edit-feedback"></p>
        </form>
      </div>
    `;
  }

  _editFooterHtml() {
    const btnBase = `text-[0.72rem] font-semibold tracking-[0.08em] uppercase px-6 py-3 rounded-full border border-transparent cursor-pointer whitespace-nowrap ${TRANSITION}`;
    const btnPrimary = `${btnBase} bg-slate-800 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 disabled:cursor-default disabled:hover:opacity-50`;
    const btnGhost = `${btnBase} bg-transparent border-slate-400/20 text-slate-800 dark:text-slate-100 hover:bg-white/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-default`;
    return `
      <button type="button" class="btn ghost ${btnGhost}" id="cancel-edit-btn">Annulla</button>
      <button type="submit" form="museum-edit-form" class="btn primary ${btnPrimary}" id="save-edit-btn">Salva modifiche</button>
    `;
  }

  _setupBtnGroup(groupId, defaultValue) {
    const group = this.querySelector(`#${groupId}`);
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

  _bindEdit() {
    const m = this._museum;
    this._setupBtnGroup('edit-accessible-group', String(!!m.is_accessible));

    this._imageField = createImageField({ initialUrl: m.image_url || '' });
    this.querySelector('#edit-image-field').appendChild(this._imageField.el);

    this._hoursField = setupHoursGrid(this.querySelector('#edit-hours-grid'), m.opening_hours || {});

    this._servicesField = setupKvList(
      this.querySelector('#edit-services-list'), this.querySelector('#edit-add-service'), m.services || {},
      { keyPlaceholder: 'Es. Toilette', valuePlaceholder: 'Es. In fondo a destra dopo la biglietteria', removeLabel: 'Rimuovi servizio' }
    );

    this._accessibilityField = setupKvList(
      this.querySelector('#edit-accessibility-list'), this.querySelector('#edit-add-accessibility'), m.accessibility_info || {},
      { keyPlaceholder: 'Es. Accesso', valuePlaceholder: 'Es. Rampa a 5° di inclinazione', removeLabel: 'Rimuovi dettaglio' }
    );

    this._mapsField = setupMapsList(this.querySelector('#edit-maps-list'), this.querySelector('#edit-add-map'), m.maps || []);

    this.querySelector('#cancel-edit-btn')?.addEventListener('click', () => this._cancelEdit());
    this.querySelector('#museum-edit-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._saveEdit();
    });
  }

  async _saveEdit() {
    const feedback = this.querySelector('#edit-feedback');
    const mapsFeedback = this.querySelector('#edit-maps-feedback');
    const saveBtn = this.querySelector('#save-edit-btn');
    const cancelBtn = this.querySelector('#cancel-edit-btn');
    feedback.style.color = '';
    feedback.textContent = '';
    mapsFeedback.style.color = '';
    mapsFeedback.textContent = '';

    const name = this.querySelector('#edit-name').value.trim();
    const street = this.querySelector('#edit-street').value.trim();
    const city = this.querySelector('#edit-city').value.trim();
    const zip = this.querySelector('#edit-zip').value.trim();
    const country = this.querySelector('#edit-country').value.trim();
    if (!name || !street || !city || !zip || !country) {
      feedback.style.color = 'red';
      feedback.textContent = 'Nome e indirizzo completo sono obbligatori.';
      return;
    }

    const mapsError = this._mapsField.validate();
    if (mapsError) {
      mapsFeedback.style.color = 'red';
      mapsFeedback.textContent = mapsError;
      return;
    }

    const image = this._imageField.getValue();

    const basePayload = {
      name,
      wikidata_id:   this.querySelector('#edit-wikidata-id').value.trim(),
      description:   this.querySelector('#edit-description').value.trim(),
      image_url:     image.url,
      website:       this.querySelector('#edit-website').value.trim(),
      is_accessible: this.querySelector('#edit-accessible-group').dataset.value === 'true',
      address: { street, city, zip, country },
      opening_hours:      this._hoursField.collect(),
      services:           this._servicesField.collect(),
      accessibility_info: this._accessibilityField.collect(),
    };

    const formData = new FormData();
    formData.append('data', JSON.stringify(basePayload));
    this._mapsField.appendToFormData(formData);
    if (image.file) formData.append('image', image.file);

    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvataggio…';
    cancelBtn.disabled = true;

    try {
      const res = await fetch(`${API_MUSEUMS}/${this._museum._id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData, // niente Content-Type: lo imposta il browser (multipart/form-data + boundary)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante il salvataggio.');

      this._museum = data;
      this._mode = 'view';
      this.dispatchEvent(new CustomEvent('museum-updated', { detail: { museum: data }, bubbles: true }));
      this._render();
    } catch (err) {
      feedback.style.color = 'red';
      feedback.textContent = err.message;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salva modifiche';
      cancelBtn.disabled = false;
    }
  }

  /* ---- Struttura del popup ---- */

  _render() {
    const isOpen = this.hasAttribute('open');
    const m = this._museum;
    const isEdit = this._mode === 'edit';
    const ready = !this._loading && !this._error && m;
    const footerHtml = ready ? (isEdit ? this._editFooterHtml() : this._viewFooterHtml()) : '';

    this.className = isOpen ? '' : 'hidden';
    this.innerHTML = isOpen ? `
      <div class="backdrop fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"></div>
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6" style="pointer-events: none;">
        <div class="panel relative w-full max-w-md min-w-0 max-h-[85vh] sm:w-[min(640px,92vw)] sm:max-w-none sm:max-h-[92vh] rounded-2xl overflow-hidden flex flex-col ${GLASS} text-slate-800 dark:text-slate-100" style="pointer-events: auto;" role="dialog" aria-modal="true" aria-label="${m ? this._esc(m.name) : 'Informazioni museo'}">
          <button class="liquid-glass-pill close-btn absolute top-3 right-3 z-10 w-9 h-9 rounded-full border border-slate-400/20 backdrop-blur-lg flex items-center justify-center text-lg leading-none hover:bg-white/20 hover:border-white/30 ${TRANSITION}" aria-label="Chiudi">×</button>
          <div class="body-scroll overflow-y-auto flex-1 min-h-0">
            ${this._loading ? '<p class="py-16 px-8 text-center text-slate-500 dark:text-slate-400 text-sm">Caricamento…</p>' : ''}
            ${this._error ? `<p class="py-16 px-8 text-center text-slate-500 dark:text-slate-400 text-sm">${this._esc(this._error)}</p>` : ''}
            ${ready ? (isEdit ? this._editBodyHtml() : this._viewBodyHtml()) : ''}
          </div>
          ${footerHtml ? `<div class="footer shrink-0 flex items-center justify-end gap-4 px-5 py-4 sm:px-8 sm:py-[1.1rem] border-t border-slate-400/20">${footerHtml}</div>` : ''}
        </div>
      </div>
    ` : '';

    if (isOpen) {
      this.querySelector('.backdrop')?.addEventListener('click', () => this.close());
      this.querySelector('.close-btn')?.addEventListener('click', () => this.close());
      if (ready) {
        if (isEdit) this._bindEdit();
        else this._bindView();
      }
    }
  }
}

customElements.define('museum-modal', MuseumModal);
