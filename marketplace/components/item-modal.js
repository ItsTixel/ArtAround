/**
 * <item-modal>
 * Overlay in sovraimpressione con i dettagli di una descrizione (item)
 * creata dall'utente: opera, riassunto, tono/licenza, tag e paragrafi.
 * Il tasto "Modifica" trasforma il corpo del popup in un form per
 * aggiornarla senza lasciare la pagina.
 *
 * Uso:
 *   document.querySelector('item-modal').open(itemId);
 *
 * Alla modifica riuscita viene emesso 'item-updated' (bubbles) con il
 * nuovo item in detail, così la pagina che lo ospita può aggiornare
 * le proprie liste senza ricaricarle da capo.
 */

import { GLASS_MODAL as GLASS, TRANSITION, TAG_PILL as TAG_CLS } from '/marketplace/js/ui-tokens.js';
import { setupParagraphList, formatDuration } from '/marketplace/js/paragraph-list.js';
import { TONE_LABELS } from '/marketplace/js/tone-labels.js';
import { trapTabKey, focusDialog } from '/marketplace/js/focus-trap.js';

const API_ITEMS    = '/api/items';
const API_ENTITIES = '/api/entities';

const LICENSE_LABELS = { Public: 'Pubblica', Reserved: 'Riservata', Private: 'Privata' };
const LICENSE_CLS = {
  private:  'text-rose-500 dark:text-rose-400 border-rose-400/40',
  reserved: 'text-sky-600 dark:text-sky-400 border-sky-400/40',
  public:   'text-slate-600 dark:text-slate-300 border-slate-400/30',
};

class ItemModal extends HTMLElement {
  constructor() {
    super();
    this._item = null;
    this._loading = false;
    this._error = null;
    this._mode = 'view'; // 'view' | 'edit'
    this._entities = null;
    this._paragraphList = null;
    this._previouslyFocused = null;
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() { this._render(); }

  async open(itemId) {
    this._item = null;
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
      const res = await fetch(`${API_ITEMS}/${itemId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._item = await res.json();
    } catch (e) {
      console.error('Errore nel caricamento della descrizione:', e);
      this._error = 'Errore nel caricamento della descrizione. Riprova più tardi.';
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

  async _loadEntitiesOnce() {
    if (this._entities) return this._entities;
    try {
      const res = await fetch(`${API_ENTITIES}?pageSize=200&sort=name`);
      const { data } = await res.json();
      this._entities = data || [];
    } catch {
      this._entities = [];
    }
    return this._entities;
  }

  async _enterEdit() {
    await this._loadEntitiesOnce();
    this._mode = 'edit';
    this._render();
  }

  _cancelEdit() {
    this._mode = 'view';
    this._render();
  }

  /* ---- Vista di sola lettura ---- */

  _viewBodyHtml() {
    const it = this._item;
    const artwork = it.artwork || {};
    const licenseKey = String(it.license || 'Public').toLowerCase();
    const paragraphs = it.descriptions || [];

    return `
      <div class="relative h-[190px] bg-slate-300/20 dark:bg-slate-800/40 border-b border-slate-400/20 flex items-center justify-center overflow-hidden shrink-0">
        ${artwork.image_url
          ? `<img class="absolute inset-0 w-full h-full object-cover" src="${this._esc(artwork.image_url)}" alt="${this._esc(artwork.alt_text || artwork.name || '')}" loading="lazy">`
          : `<div class="absolute inset-0 img-placeholder"></div>`}
        <span class="relative z-[1] text-[0.68rem] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full ${GLASS} text-slate-800 dark:text-slate-100 text-center max-w-[80%] overflow-hidden text-ellipsis whitespace-nowrap" style="font-family: var(--font-mono);">${this._esc(artwork.name || 'Opera')}</span>
      </div>

      <div class="pt-7 px-5 sm:px-8 pb-7 sm:pb-8">
        ${artwork.artwork_author ? `<div class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-2">${this._esc(artwork.artwork_author)}</div>` : ''}
        <p class="text-lg italic leading-snug mb-4" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._esc(it.marketplace_summary)}</p>

        <div class="flex flex-wrap gap-1.5 mb-6">
          <span class="${TAG_CLS} ${LICENSE_CLS[licenseKey] || LICENSE_CLS.public}">${this._esc(LICENSE_LABELS[it.license] || it.license)}</span>
          <span class="${TAG_CLS}">${this._esc(TONE_LABELS[it.tone] || it.tone)}</span>
          ${(it.tags || []).map(t => `<span class="${TAG_CLS}">${this._esc(t)}</span>`).join('')}
        </div>

        <h3 class="text-base font-semibold mb-3.5 text-slate-800 dark:text-slate-100" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">Paragrafi</h3>
        <ol class="flex flex-col gap-4">
          ${paragraphs.map((p, i) => `
          <li class="flex gap-3.5 items-start">
            <span class="text-[0.72rem] pt-[0.15rem] shrink-0" style="font-family: var(--font-mono); color: var(--color-accent);">${String(i + 1).padStart(2, '0')}</span>
            <div class="min-w-0 flex-1">
              <p class="text-[0.85rem] leading-relaxed text-slate-700 dark:text-slate-200">${this._esc(p.text)}</p>
              <span class="text-[0.68rem] text-slate-500 dark:text-slate-400">${formatDuration(p.duration_sec)}</span>
            </div>
          </li>`).join('') || '<li class="text-[0.82rem] text-slate-500 dark:text-slate-400">Nessun paragrafo.</li>'}
        </ol>
      </div>
    `;
  }

  _viewFooterHtml() {
    const btnBase = `text-[0.72rem] font-semibold tracking-[0.08em] uppercase px-6 py-3 rounded-full border border-transparent cursor-pointer whitespace-nowrap ${TRANSITION}`;
    const btnPrimary = `${btnBase} bg-slate-800 text-white dark:bg-white dark:text-slate-900 hover:opacity-90`;
    return `<button type="button" class="btn primary ${btnPrimary}" id="edit-btn">Modifica</button>`;
  }

  _bindView() {
    this.querySelector('#edit-btn')?.addEventListener('click', () => this._enterEdit());
  }

  /* ---- Form di modifica ---- */

  _editBodyHtml() {
    const it = this._item;
    const entities = this._entities || [];
    const artworkId = it.artwork?._id || it.artwork;

    return `
      <div class="pt-7 px-5 sm:px-8 pb-7 sm:pb-8">
        <form id="item-edit-form" class="create-form" style="gap: 1.4rem;">
          <div class="field">
            <label for="edit-artwork">Opera *</label>
            <select id="edit-artwork" required>
              ${entities.map(e => `<option value="${e._id}" ${String(e._id) === String(artworkId) ? 'selected' : ''}>${this._esc(e.artwork_author ? `${e.name} — ${e.artwork_author}` : e.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="edit-summary">
              Riassunto *
              <span class="char-counter" id="edit-summary-counter">${it.marketplace_summary.length}/300</span>
            </label>
            <textarea id="edit-summary" rows="3" maxlength="300" required>${this._esc(it.marketplace_summary)}</textarea>
          </div>
          <div class="field">
            <label>Tono</label>
            <div class="btn-group" id="edit-tone-group" role="radiogroup" aria-label="Tono">
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="childish">Infantile</button>
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="simple">Elementare</button>
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="medium">Medio</button>
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="technical">Avanzato</button>
            </div>
          </div>
          <div class="field">
            <label>Visibilità</label>
            <div class="btn-group" id="edit-license-group" role="radiogroup" aria-label="Visibilità">
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="Public">Pubblica</button>
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="Reserved">Riservata</button>
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="Private">Privata</button>
            </div>
          </div>
          <div class="field">
            <label for="edit-image-url">URL immagine</label>
            <input id="edit-image-url" type="text" value="${this._esc(it.image_url)}" placeholder="https://…">
          </div>
          <div class="field">
            <label for="edit-alt-text">Testo alternativo immagine</label>
            <input id="edit-alt-text" type="text" value="${this._esc(it.alt_text)}">
          </div>
          <div class="field">
            <label for="edit-tags">Tag</label>
            <input id="edit-tags" type="text" value="${this._esc((it.tags || []).join(', '))}" placeholder="Separati da virgola">
          </div>
          <div class="field">
            <label>Paragrafi</label>
            <div id="edit-paragraphs-list" class="dynamic-list"></div>
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
      <button type="submit" form="item-edit-form" class="btn primary ${btnPrimary}" id="save-edit-btn">Salva modifiche</button>
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
    const it = this._item;
    this._setupBtnGroup('edit-tone-group', it.tone);
    this._setupBtnGroup('edit-license-group', it.license || 'Public');

    const summary = this.querySelector('#edit-summary');
    const counter = this.querySelector('#edit-summary-counter');
    summary.addEventListener('input', () => { counter.textContent = `${summary.value.length}/300`; });

    this._paragraphList = setupParagraphList(
      this.querySelector('#edit-paragraphs-list'),
      (it.descriptions || []).map(d => d.text)
    );

    this.querySelector('#cancel-edit-btn')?.addEventListener('click', () => this._cancelEdit());
    this.querySelector('#item-edit-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._saveEdit();
    });
  }

  async _saveEdit() {
    const feedback = this.querySelector('#edit-feedback');
    const saveBtn = this.querySelector('#save-edit-btn');
    const cancelBtn = this.querySelector('#cancel-edit-btn');
    const descriptions = this._paragraphList.collect();

    if (!descriptions.length) {
      feedback.style.color = 'var(--color-danger)';
      feedback.textContent = 'Aggiungi almeno un paragrafo alla descrizione.';
      this._paragraphList.focusFirst();
      return;
    }

    const payload = {
      artwork:             this.querySelector('#edit-artwork').value,
      marketplace_summary: this.querySelector('#edit-summary').value.trim(),
      tone:                this.querySelector('#edit-tone-group').dataset.value,
      license:             this.querySelector('#edit-license-group').dataset.value,
      image_url:           this.querySelector('#edit-image-url').value.trim(),
      alt_text:            this.querySelector('#edit-alt-text').value.trim(),
      tags:                this.querySelector('#edit-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      descriptions,
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvataggio…';
    cancelBtn.disabled = true;
    feedback.style.color = '';
    feedback.textContent = '';

    try {
      const res = await fetch(`${API_ITEMS}/${this._item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante il salvataggio.');

      this._item = data;
      this._mode = 'view';
      this.dispatchEvent(new CustomEvent('item-updated', { detail: { item: data }, bubbles: true }));
      this._render();
    } catch (err) {
      feedback.style.color = 'var(--color-danger)';
      feedback.textContent = err.message;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salva modifiche';
      cancelBtn.disabled = false;
    }
  }

  /* ---- Struttura del popup ---- */

  _render() {
    const isOpen = this.hasAttribute('open');
    const it = this._item;
    const isEdit = this._mode === 'edit';
    const ready = !this._loading && !this._error && it;

    this.className = isOpen ? '' : 'hidden';
    this.innerHTML = isOpen ? `
      <div class="backdrop fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"></div>
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6" style="pointer-events: none;">
        <div class="panel relative w-full max-w-md min-w-0 max-h-[85vh] sm:w-[min(680px,92vw)] sm:max-w-none sm:max-h-[92vh] rounded-2xl overflow-hidden flex flex-col ${GLASS} text-slate-800 dark:text-slate-100" style="pointer-events: auto;" role="dialog" aria-modal="true" aria-label="${it ? this._esc(it.marketplace_summary) : 'Dettagli descrizione'}">
          <button class="liquid-glass-pill close-btn absolute top-3 right-3 z-10 w-9 h-9 rounded-full border border-slate-400/20 backdrop-blur-lg flex items-center justify-center text-lg leading-none hover:bg-white/20 hover:border-white/30 ${TRANSITION}" aria-label="Chiudi">×</button>
          <div class="body-scroll overflow-y-auto flex-1 min-h-0">
            ${this._loading ? '<p class="py-16 px-8 text-center text-slate-500 dark:text-slate-400 text-sm">Caricamento…</p>' : ''}
            ${this._error ? `<p class="py-16 px-8 text-center text-slate-500 dark:text-slate-400 text-sm">${this._esc(this._error)}</p>` : ''}
            ${ready ? (isEdit ? this._editBodyHtml() : this._viewBodyHtml()) : ''}
          </div>
          ${ready ? `<div class="footer shrink-0 flex items-center justify-end gap-4 px-5 py-4 sm:px-8 sm:py-[1.1rem] border-t border-slate-400/20">${isEdit ? this._editFooterHtml() : this._viewFooterHtml()}</div>` : ''}
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

customElements.define('item-modal', ItemModal);
