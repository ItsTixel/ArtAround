/**
 * <opera-modal>
 * Overlay in sovraimpressione con i dettagli di un'opera (Entity):
 * immagine, autore, descrizione intrinseca, collocazioni nei musei
 * (se fisica) e link esterni. Il tasto "Modifica" — visibile solo a
 * chi ha creato l'opera — trasforma il corpo del popup in un form,
 * sullo stesso schema di <item-modal>.
 *
 * A differenza di <item-modal> (aperta solo sulle proprie descrizioni,
 * dal profilo) questo modal si apre anche dal catalogo pubblico su
 * opere di autori diversi dall'utente loggato: il tasto "Modifica" va
 * quindi mostrato solo quando added_by coincide con l'utente corrente
 * (il backend applica comunque lo stesso controllo via isEntityOwner).
 *
 * Uso:
 *   document.querySelector('opera-modal').open(entityId);
 *
 * Alla modifica riuscita viene emesso 'entity-updated' (bubbles) con la
 * nuova opera in detail.
 */

import { GLASS_MODAL as GLASS, TRANSITION, TAG_PILL as TAG_CLS } from '/marketplace/js/ui-tokens.js';
import { getCurrentUser } from '/marketplace/js/auth-session.js';

const API_ENTITIES = '/api/entities';
const API_MUSEUMS  = '/api/museums';

class OperaModal extends HTMLElement {
  constructor() {
    super();
    this._entity = null;
    this._loading = false;
    this._error = null;
    this._mode = 'view'; // 'view' | 'edit'
    this._museums = null;
    this._currentUser = undefined; // undefined = non ancora caricato
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() { this._render(); }

  async open(entityId) {
    this._entity = null;
    this._loading = true;
    this._error = null;
    this._mode = 'view';

    this.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKeydown);
    this._render();

    try {
      const [entity] = await Promise.all([
        fetch(`${API_ENTITIES}/${entityId}`).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        this._loadCurrentUserOnce(),
      ]);
      this._entity = entity;
    } catch (e) {
      console.error("Errore nel caricamento dell'opera:", e);
      this._error = "Errore nel caricamento dell'opera. Riprova più tardi.";
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
  }

  _onKeydown(e) {
    if (e.key === 'Escape') this.close();
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

  async _loadMuseumsOnce() {
    if (this._museums) return this._museums;
    try {
      const res = await fetch(`${API_MUSEUMS}?pageSize=200&sort=name`);
      const { data } = await res.json();
      this._museums = data || [];
    } catch {
      this._museums = [];
    }
    return this._museums;
  }

  _isOwner() {
    const u = this._currentUser;
    const it = this._entity;
    if (!u || !it) return false;
    const ownerId = it.added_by?._id || it.added_by;
    return ownerId && String(ownerId) === String(u._id);
  }

  async _enterEdit() {
    await this._loadMuseumsOnce();
    this._mode = 'edit';
    this._render();
  }

  _cancelEdit() {
    this._mode = 'view';
    this._render();
  }

  /* ---- Vista di sola lettura ---- */

  _viewBodyHtml() {
    const it = this._entity;
    const placements = it.placements || [];
    const links = it.external_links || [];
    const typeLabel = it.is_physical ? 'Fisica' : 'Non fisica';
    const typeCls = it.is_physical
      ? 'text-slate-600 dark:text-slate-300 border-slate-400/30'
      : 'text-sky-600 dark:text-sky-400 border-sky-400/40';

    return `
      <div class="relative h-[190px] bg-slate-300/20 dark:bg-slate-800/40 border-b border-slate-400/20 flex items-center justify-center overflow-hidden shrink-0">
        ${it.image_url
          ? `<img class="absolute inset-0 w-full h-full object-cover" src="${this._esc(it.image_url)}" alt="" loading="lazy">`
          : `<div class="absolute inset-0" style="background-image: repeating-linear-gradient(135deg, transparent 0 11px, rgba(100,116,139,0.12) 11px 12px);"></div>`}
      </div>

      <div class="pt-7 px-5 sm:px-8 pb-7 sm:pb-8">
        <div class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-2">${this._esc(it.artwork_author || 'Autore sconosciuto')}</div>
        <p class="text-lg italic leading-snug mb-4" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._esc(it.name)}</p>

        <div class="flex flex-wrap gap-1.5 mb-6">
          <span class="${TAG_CLS} ${typeCls}">${typeLabel}</span>
          ${(it.tags || []).map(t => `<span class="${TAG_CLS}">${this._esc(t)}</span>`).join('')}
        </div>

        <p class="text-[0.85rem] leading-relaxed text-slate-700 dark:text-slate-200 mb-6">${it.description ? this._esc(it.description) : '<span class="italic text-slate-500 dark:text-slate-400">Nessuna descrizione disponibile.</span>'}</p>

        ${it.is_physical ? `
        <h3 class="text-base font-semibold mb-3.5 text-slate-800 dark:text-slate-100" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">Collocazioni</h3>
        <ul class="flex flex-col gap-3 mb-6">
          ${placements.map(p => {
            const museum = p.museum || {};
            const loc = [p.location?.room, p.location?.floor].filter(Boolean).join(' · ');
            return `
          <li class="text-[0.85rem] text-slate-700 dark:text-slate-200">
            <span class="font-medium">${this._esc(museum.name || 'Museo')}</span>
            ${loc ? `<span class="text-slate-500 dark:text-slate-400"> — ${this._esc(loc)}</span>` : ''}
            ${p.location?.note ? `<div class="text-[0.78rem] text-slate-500 dark:text-slate-400">${this._esc(p.location.note)}</div>` : ''}
          </li>`;
          }).join('') || '<li class="text-[0.82rem] text-slate-500 dark:text-slate-400">Nessuna collocazione indicata.</li>'}
        </ul>` : ''}

        ${links.length ? `
        <h3 class="text-base font-semibold mb-3.5 text-slate-800 dark:text-slate-100" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">Link esterni</h3>
        <ul class="flex flex-col gap-1.5">
          ${links.map(l => `<li><a class="text-[0.85rem] underline text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white" href="${this._esc(l.url)}" target="_blank" rel="noopener noreferrer">${this._esc(l.label || l.url)}</a></li>`).join('')}
        </ul>` : ''}
      </div>
    `;
  }

  _viewFooterHtml() {
    if (!this._isOwner()) return '';
    const btnBase = `text-[0.72rem] font-semibold tracking-[0.08em] uppercase px-6 py-3 rounded-full border border-transparent cursor-pointer whitespace-nowrap ${TRANSITION}`;
    const btnPrimary = `${btnBase} bg-slate-800 text-white dark:bg-white dark:text-slate-900 hover:opacity-90`;
    return `<button type="button" class="btn primary ${btnPrimary}" id="edit-btn">Modifica</button>`;
  }

  _bindView() {
    this.querySelector('#edit-btn')?.addEventListener('click', () => this._enterEdit());
  }

  /* ---- Form di modifica ---- */

  _placementRowHtml(museums, p = {}) {
    const museumId = p.museum?._id || p.museum || '';
    return `
      <div class="dynamic-row stack">
        <div class="field">
          <label>Museo</label>
          <select class="placement-museum">
            <option value="">Seleziona un museo…</option>
            ${museums.map(m => `<option value="${m._id}" ${String(m._id) === String(museumId) ? 'selected' : ''}>${this._esc(m.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field-row-2">
          <div class="field">
            <label>Stanza</label>
            <input type="text" class="placement-room" value="${this._esc(p.location?.room)}" placeholder="Es. Sala 12">
          </div>
          <div class="field">
            <label>Piano</label>
            <input type="text" class="placement-floor" value="${this._esc(p.location?.floor)}" placeholder="Es. Primo piano">
          </div>
        </div>
        <div class="field">
          <label>Note</label>
          <input type="text" class="placement-note" value="${this._esc(p.location?.note)}" placeholder="Es. Accanto all'ingresso della sala">
        </div>
        <button type="button" class="remove-row" aria-label="Rimuovi collocazione">✕</button>
      </div>
    `;
  }

  _linkRowHtml(l = {}) {
    return `
      <div class="dynamic-row kv">
        <input type="text" class="dynamic-key" value="${this._esc(l.label)}" placeholder="Es. Wikipedia">
        <input type="text" class="dynamic-value" value="${this._esc(l.url)}" placeholder="https://...">
        <button type="button" class="remove-row" aria-label="Rimuovi link">✕</button>
      </div>
    `;
  }

  _editBodyHtml() {
    const it = this._entity;
    const museums = this._museums || [];
    const placements = it.placements?.length ? it.placements : [{}];
    const links = it.external_links?.length ? it.external_links : [];

    return `
      <div class="pt-7 px-5 sm:px-8 pb-7 sm:pb-8">
        <form id="entity-edit-form" class="create-form" style="gap: 1.4rem;">
          <div class="field">
            <label for="edit-name">Nome *</label>
            <input id="edit-name" type="text" value="${this._esc(it.name)}" required>
          </div>
          <div class="field">
            <label for="edit-artwork-author">Autore</label>
            <input id="edit-artwork-author" type="text" value="${this._esc(it.artwork_author)}">
          </div>
          <div class="field">
            <label>Tipo</label>
            <div class="btn-group" id="edit-physical-group" role="radiogroup" aria-label="Tipo opera">
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="true">Fisica</button>
              <button type="button" class="btn-option" role="radio" aria-checked="false" data-value="false">Non fisica</button>
            </div>
          </div>
          <div class="field">
            <label for="edit-description">Descrizione</label>
            <textarea id="edit-description" rows="4">${this._esc(it.description)}</textarea>
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
          <div class="field" id="edit-placements-section">
            <label>Collocazioni</label>
            <div id="edit-placements-list" class="dynamic-list">
              ${placements.map(p => this._placementRowHtml(museums, p)).join('')}
            </div>
            <button type="button" id="edit-add-placement" class="btn-secondary">+ Aggiungi collocazione</button>
          </div>
          <div class="field">
            <label>Link esterni</label>
            <div id="edit-links-list" class="dynamic-list">
              ${links.map(l => this._linkRowHtml(l)).join('')}
            </div>
            <button type="button" id="edit-add-link" class="btn-secondary">+ Aggiungi link</button>
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
      <button type="submit" form="entity-edit-form" class="btn primary ${btnPrimary}" id="save-edit-btn">Salva modifiche</button>
    `;
  }

  _setupBtnGroup(groupId, defaultValue, onChange) {
    const group = this.querySelector(`#${groupId}`);
    group.dataset.value = defaultValue;
    group.querySelectorAll('.btn-option').forEach(btn => {
      const isDefault = btn.dataset.value === defaultValue;
      btn.setAttribute('aria-checked', String(isDefault));
      btn.addEventListener('click', () => {
        group.querySelectorAll('.btn-option').forEach(b => b.setAttribute('aria-checked', 'false'));
        btn.setAttribute('aria-checked', 'true');
        group.dataset.value = btn.dataset.value;
        onChange?.(btn.dataset.value);
      });
    });
  }

  _togglePlacementsSection(isPhysical) {
    const section = this.querySelector('#edit-placements-section');
    if (section) section.hidden = isPhysical !== 'true';
  }

  _wireDynamicRows(listId, addBtnId, rowFactory) {
    const list = this.querySelector(`#${listId}`);
    const addBtn = this.querySelector(`#${addBtnId}`);
    const addRow = () => {
      const wrap = document.createElement('div');
      wrap.innerHTML = rowFactory();
      const row = wrap.firstElementChild;
      row.querySelector('.remove-row').addEventListener('click', () => row.remove());
      list.appendChild(row);
    };
    addBtn?.addEventListener('click', addRow);
    list?.querySelectorAll('.dynamic-row').forEach(row => {
      row.querySelector('.remove-row')?.addEventListener('click', () => row.remove());
    });
  }

  _bindEdit() {
    const it = this._entity;
    this._setupBtnGroup('edit-physical-group', String(!!it.is_physical), (value) => this._togglePlacementsSection(value));
    this._togglePlacementsSection(String(!!it.is_physical));

    this._wireDynamicRows('edit-placements-list', 'edit-add-placement', () => this._placementRowHtml(this._museums || []));
    this._wireDynamicRows('edit-links-list', 'edit-add-link', () => this._linkRowHtml());

    this.querySelector('#cancel-edit-btn')?.addEventListener('click', () => this._cancelEdit());
    this.querySelector('#entity-edit-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._saveEdit();
    });
  }

  _collectPlacements() {
    const placements = [];
    this.querySelectorAll('#edit-placements-list .dynamic-row').forEach(row => {
      const museum = row.querySelector('.placement-museum').value;
      if (!museum) return;
      const room  = row.querySelector('.placement-room').value.trim();
      const floor = row.querySelector('.placement-floor').value.trim();
      const note  = row.querySelector('.placement-note').value.trim();
      const placement = { museum };
      if (room || floor || note) placement.location = { room, floor, note };
      placements.push(placement);
    });
    return placements;
  }

  _collectExternalLinks() {
    const links = [];
    this.querySelectorAll('#edit-links-list .dynamic-row').forEach(row => {
      const label = row.querySelector('.dynamic-key').value.trim();
      const url   = row.querySelector('.dynamic-value').value.trim();
      if (url) links.push({ label, url });
    });
    return links;
  }

  async _saveEdit() {
    const feedback = this.querySelector('#edit-feedback');
    const saveBtn = this.querySelector('#save-edit-btn');
    const cancelBtn = this.querySelector('#cancel-edit-btn');
    const isPhysical = this.querySelector('#edit-physical-group').dataset.value === 'true';

    const name = this.querySelector('#edit-name').value.trim();
    if (!name) {
      feedback.style.color = 'red';
      feedback.textContent = 'Il nome è obbligatorio.';
      return;
    }

    const payload = {
      name,
      artwork_author: this.querySelector('#edit-artwork-author').value.trim(),
      is_physical:    isPhysical,
      description:    this.querySelector('#edit-description').value.trim(),
      image_url:      this.querySelector('#edit-image-url').value.trim(),
      alt_text:       this.querySelector('#edit-alt-text').value.trim(),
      tags:           this.querySelector('#edit-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      placements:     isPhysical ? this._collectPlacements() : [],
      external_links: this._collectExternalLinks(),
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvataggio…';
    cancelBtn.disabled = true;
    feedback.style.color = '';
    feedback.textContent = '';

    try {
      const res = await fetch(`${API_ENTITIES}/${this._entity._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante il salvataggio.');

      this._entity = data;
      this._mode = 'view';
      this.dispatchEvent(new CustomEvent('entity-updated', { detail: { entity: data }, bubbles: true }));
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
    const it = this._entity;
    const isEdit = this._mode === 'edit';
    const ready = !this._loading && !this._error && it;
    const footerHtml = ready ? (isEdit ? this._editFooterHtml() : this._viewFooterHtml()) : '';

    this.className = isOpen ? '' : 'hidden';
    this.innerHTML = isOpen ? `
      <div class="backdrop fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"></div>
      <div class="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-0 sm:p-6" style="pointer-events: none;">
        <div class="panel relative w-screen min-w-0 h-screen sm:w-[min(680px,92vw)] sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl overflow-hidden flex flex-col ${GLASS} text-slate-800 dark:text-slate-100" style="pointer-events: auto;" role="dialog" aria-modal="true" aria-label="${it ? this._esc(it.name) : "Dettagli opera"}">
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

customElements.define('opera-modal', OperaModal);
