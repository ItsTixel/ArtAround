/**
 * <filter-sidebar>
 * Pannello filtri editoriale sulla colonna sinistra della lista visite.
 * Emette `filters-change` con il nuovo stato a ogni modifica.
 *
 * Property `data`:
 *   {
 *     museums: [{id, name, short, city}],
 *     tones:   [{value, label, count}],   // opzionale
 *     tags:    [{value, count}],
 *     maxDurationMin
 *   }
 *
 * Detail di `filters-change`:
 *   { museumIds[], price, durationMax, tones[], tags[] }
 */

class FilterSidebar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = {
      museumIds: new Set(),
      museumQuery: '',
      price: 'all',
      durationMax: 240,
      tones: new Set(),
      tags: new Set(),
    };
    this._data = { museums: [], tones: [], tags: [], maxDurationMin: 240 };
  }

  set data(value) {
    this._data = { ...this._data, ...value };
    this._state.durationMax = this._data.maxDurationMin;
    this._render();
  }
  get data() { return this._data; }
  get state() { return this._state; }

  setMuseumSelection(ids = []) {
    this._state.museumIds = new Set(ids);
    this._render();
    this._emit();
  }

  connectedCallback() { this._render(); }

  _emit() {
    this.dispatchEvent(new CustomEvent('filters-change', {
      detail: {
        museumIds: [...this._state.museumIds],
        price: this._state.price,
        durationMax: this._state.durationMax,
        tones: [...this._state.tones],
        tags: [...this._state.tags],
      },
      bubbles: true, composed: true,
    }));
  }

  reset() {
    this._state = {
      price: 'all',
      museumIds: new Set(),
      museumQuery: '',
      durationMax: this._data.maxDurationMin,
      tones: new Set(),
      tags: new Set(),
    };
    this._render();
    this._emit();
  }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _radio(name, value, label, checked) {
    return `
      <label class="row radio">
        <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
        <span class="dot"></span>
        <span class="label">${label}</span>
      </label>`;
  }

  _check(name, value, label, count, checked) {
    return `
      <label class="row check">
        <input type="checkbox" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
        <span class="dot"></span>
        <span class="label">${label}</span>
        <span class="count">${count ?? ''}</span>
      </label>`;
  }

  _museumList() {
    const q = this._state.museumQuery.trim().toLowerCase();
    return this._data.museums
      .filter(m => !this._state.museumIds.has(m.id))
      .filter(m => !q || (m.name + ' ' + (m.short || '') + ' ' + m.city).toLowerCase().includes(q));
  }

  _museumListsHTML() {
    const s = this._state;
    const availableMuseums = this._museumList();
    const selectedMuseums = this._selectedMuseums();
    return `
      <div class="selected" id="selected">
        ${selectedMuseums.map(m => `
          <span class="pill">
            ${this._esc(m.short || m.name)}
            <button type="button" class="x" data-remove="${this._esc(m.id)}" aria-label="Rimuovi ${this._esc(m.short || m.name)}">×</button>
          </span>
        `).join('')}
      </div>
      ${availableMuseums.length ? `
        <div class="options" id="options">
          ${availableMuseums.map(m => `
            <button type="button" class="option" data-add="${this._esc(m.id)}">
              <span>
                <span class="opt-main">${this._esc(m.name)}</span>
                <span class="opt-sub"> · ${this._esc(m.city)}</span>
              </span>
              <span class="plus" aria-hidden="true">+</span>
            </button>
          `).join('')}
        </div>
      ` : (s.museumQuery
          ? `<p class="no-options">Nessun museo corrisponde a "${this._esc(s.museumQuery)}".</p>`
          : (selectedMuseums.length === this._data.museums.length && this._data.museums.length > 0
              ? `<p class="no-options">Hai selezionato tutti i musei.</p>`
              : ''))}
    `;
  }

  _selectedMuseums() {
    return this._data.museums.filter(m => this._state.museumIds.has(m.id));
  }

  _render() {
    const { tones, tags, maxDurationMin } = this._data;
    const s = this._state;
    const hasTones = tones && tones.length > 0;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          color: var(--color-text, #1c1917);
          background: transparent;
          position: sticky;
          top: 73px;
          align-self: start;
          max-height: calc(100vh - 73px);
          overflow-y: auto;
          overflow-x: hidden;
          /* !important: la reset globale "* { padding: 0 }" del documento ospitante
             altrimenti vince sul padding di :host nonostante la specificità inferiore. */
          padding: 3.5rem 2.75rem 2.5rem 3rem !important;
          border-right: 1px solid var(--color-border, #e8e6e1);
        }

        .group {
          padding: 1.5rem 0;
          border-top: 1px solid var(--color-border, #e8e6e1);
        }
        .group:first-of-type { padding-top: 0; border-top: 0; }

        h3 {
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.66rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-text-muted, #78716c);
          margin: 0 0 1rem;
        }

        /* ── Search input ─────────────────────────────────── */
        .search { position: relative; }
        .search input {
          width: 100%;
          padding: 0.55rem 0.5rem 0.55rem 1.6rem;
          border: 0;
          border-bottom: 1px solid var(--color-border, #e8e6e1);
          background: transparent;
          font: inherit;
          font-size: 0.88rem;
          color: inherit;
          outline: 0;
          transition: border-color 0.3s ease;
        }
        .search input::placeholder {
          color: var(--color-text-muted, #78716c);
          font-style: italic;
        }
        .search input:focus { border-bottom-color: var(--color-accent, #9e7a46); }
        .search::before {
          content: '';
          position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          width: 13px; height: 13px;
          background: var(--color-text-muted, #78716c);
          mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M21 19l-4.35-4.35A7.5 7.5 0 1 0 15 16.65L19.35 21 21 19zM10.5 16a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z'/></svg>") center/contain no-repeat;
          -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M21 19l-4.35-4.35A7.5 7.5 0 1 0 15 16.65L19.35 21 21 19zM10.5 16a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z'/></svg>") center/contain no-repeat;
        }

        /* ── Museum selected chips ────────────────────────── */
        .selected {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin: 0.9rem 0 0;
        }
        .selected:empty { display: none; }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          background: #1c1917;
          color: #ffffff;
          padding: 0.3rem 0.35rem 0.3rem 0.65rem;
        }
        .pill .x {
          width: 16px; height: 16px;
          display: inline-flex;
          align-items: center; justify-content: center;
          border: 0;
          background: transparent;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          padding: 0;
          font: inherit;
          font-size: 0.95rem;
          line-height: 1;
          transition: color 0.2s ease, background 0.2s ease;
        }
        .pill .x:hover {
          color: #ffffff;
          background: rgba(255,255,255,0.12);
        }

        /* ── Museum option list ───────────────────────────── */
        .options {
          margin-top: 0.9rem;
          display: flex; flex-direction: column;
          border-top: 1px solid var(--color-border, #e8e6e1);
        }
        .options:empty { display: none; }
        .option {
          appearance: none;
          background: transparent;
          border: 0;
          border-bottom: 1px solid var(--color-border, #e8e6e1);
          padding: 0.65rem 0.25rem 0.65rem 0;
          text-align: left;
          font: inherit;
          color: inherit;
          cursor: pointer;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.6rem;
          transition: color 0.2s ease, padding 0.2s ease;
        }
        .option:hover {
          color: var(--color-accent, #9e7a46);
          padding-left: 0.35rem;
        }
        .option .opt-main { font-size: 0.86rem; font-weight: 500; }
        .option .opt-sub {
          font-size: 0.7rem;
          letter-spacing: 0.04em;
          color: var(--color-text-muted, #78716c);
        }
        .option .plus { font-size: 1rem; line-height: 1; opacity: 0.4; margin-left: auto; }
        .option:hover .plus { opacity: 1; }

        .no-options {
          font-size: 0.78rem;
          color: var(--color-text-muted, #78716c);
          font-style: italic;
          margin-top: 0.9rem;
          padding-top: 0.9rem;
          border-top: 1px solid var(--color-border, #e8e6e1);
        }

        /* ── Rows (radio + checkbox) ──────────────────────── */
        .rows { display: flex; flex-direction: column; gap: 0.6rem; }
        .row {
          display: flex; align-items: center; gap: 0.7rem;
          cursor: pointer;
          font-size: 0.85rem;
          color: var(--color-text, #1c1917);
          transition: color 0.2s ease;
        }
        .row input { position: absolute; opacity: 0; pointer-events: none; }
        .row .dot {
          width: 14px; height: 14px;
          border: 1px solid var(--color-border, #ccc);
          background: transparent;
          flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .row.radio .dot { border-radius: 50%; }
        .row input:checked + .dot { border-color: var(--color-accent, #9e7a46); }
        .row.radio input:checked + .dot::after {
          content: ''; width: 6px; height: 6px;
          background: var(--color-accent, #9e7a46); border-radius: 50%;
        }
        .row.check input:checked + .dot { background: var(--color-accent, #9e7a46); }
        .row.check input:checked + .dot::after {
          content: '';
          width: 4px; height: 7px;
          border-right: 1.5px solid #fff;
          border-bottom: 1.5px solid #fff;
          transform: rotate(45deg) translate(-1px, -1px);
        }
        .row .label { flex: 1; }
        .row .count { font-size: 0.7rem; opacity: 0.55; font-variant-numeric: tabular-nums; }
        .row:hover { color: var(--color-accent, #9e7a46); }

        /* ── Range slider ─────────────────────────────────── */
        .slider-wrap { display: flex; flex-direction: column; gap: 0.6rem; }
        .slider-value {
          display: flex; justify-content: space-between;
          font-size: 0.78rem;
          font-feature-settings: 'tnum';
          color: var(--color-text-muted, #78716c);
        }
        .slider-value strong { color: var(--color-accent, #9e7a46); font-weight: 600; }
        input[type=range] {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 1px;
          background: var(--color-border, #e8e6e1);
          outline: none; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px;
          background: var(--color-accent, #9e7a46);
          border: 2px solid var(--color-surface, #fff);
          border-radius: 50%; cursor: grab;
          box-shadow: 0 0 0 1px var(--color-accent, #9e7a46);
        }
        input[type=range]::-moz-range-thumb {
          width: 14px; height: 14px;
          background: var(--color-accent, #9e7a46);
          border: 2px solid var(--color-surface, #fff);
          border-radius: 50%; cursor: grab;
        }

        /* ── Tag chips ────────────────────────────────────── */
        .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .chip {
          font: inherit;
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.35rem 0.7rem;
          border: 1px solid var(--color-border, #e8e6e1);
          background: transparent;
          color: var(--color-text, #1c1917);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .chip:hover { border-color: var(--color-accent, #9e7a46); color: var(--color-accent, #9e7a46); }
        .chip.active { background: var(--color-accent, #9e7a46); color: #fff; border-color: var(--color-accent, #9e7a46); }

        .reset {
          margin-top: 1.75rem;
          background: transparent;
          border: 0;
          border-bottom: 1px solid var(--color-text-muted, #78716c);
          padding: 0 0 2px;
          font: inherit;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-muted, #78716c);
          cursor: pointer;
          align-self: flex-start;
          transition: color 0.2s ease, border-color 0.2s ease;
        }
        .reset:hover { color: var(--color-accent, #9e7a46); border-color: var(--color-accent, #9e7a46); }

        @media (max-width: 900px) {
          :host {
            position: static;
            max-height: none;
            border-right: 0;
            border-bottom: 1px solid var(--color-border, #e8e6e1);
            padding: 2.5rem 2.25rem 1.75rem 1.5rem !important;
          }
        }
      </style>

      <aside>
        <!-- Filtro musei (multi-select con ricerca) -->
        <div class="group">
          <h3>Musei</h3>
          <label class="search">
            <input id="museum-q" type="search" placeholder="Cerca un museo…" autocomplete="off" value="${this._esc(s.museumQuery)}">
          </label>

          <div id="museum-lists">
            ${this._museumListsHTML()}
          </div>
        </div>

        <!-- Prezzo -->
        <div class="group">
          <h3>Prezzo</h3>
          <div class="rows" id="price-rows">
            ${this._radio('price', 'all', 'Tutte', s.price === 'all')}
            ${this._radio('price', 'free', 'Gratis', s.price === 'free')}
            ${this._radio('price', 'paid', 'A pagamento', s.price === 'paid')}
          </div>
        </div>

        <!-- Durata -->
        <div class="group">
          <h3>Durata massima</h3>
          <div class="slider-wrap">
            <div class="slider-value">
              <span>5 min</span>
              <strong id="dur-out">${s.durationMax} min</strong>
            </div>
            <input id="dur" type="range" min="5" max="${maxDurationMin}" step="5" value="${s.durationMax}">
          </div>
        </div>

        ${hasTones ? `
        <!-- Linguaggio -->
        <div class="group">
          <h3>Linguaggio</h3>
          <div class="rows" id="tone-rows">
            ${tones.map(t => this._check('tone', t.value, t.label, t.count, s.tones.has(t.value))).join('')}
          </div>
        </div>
        ` : '<div id="tone-rows" style="display:none"></div>'}

        <!-- Temi -->
        <div class="group">
          <h3>Temi</h3>
          <div class="chips" id="tag-chips">
            ${tags.map(t => `<button class="chip ${s.tags.has(t.value) ? 'active' : ''}" data-tag="${this._esc(t.value)}" type="button">${this._esc(t.value)}</button>`).join('')}
          </div>
        </div>

        <button class="reset" id="reset" type="button">Azzera filtri</button>
      </aside>
    `;

    this._wire();
  }

  _wire() {
    const root = this.shadowRoot;

    /* Museum search */
    const museumQ = root.getElementById('museum-q');
    clearTimeout(this._museumTimer);
    museumQ.addEventListener('input', (e) => {
      const value = e.target.value;
      clearTimeout(this._museumTimer);
      this._museumTimer = setTimeout(() => {
        this._state.museumQuery = value;
        this._renderMuseumLists();
      }, 120);
    });

    /* Add / remove museum */
    const museumLists = root.getElementById('museum-lists');
    if (museumLists) {
      museumLists.addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-add]');
        if (addBtn) {
          this._state.museumIds.add(addBtn.dataset.add);
          this._state.museumQuery = '';
          this._renderMuseumLists();
          this._emit();
          const input = this.shadowRoot.getElementById('museum-q');
          if (input) { input.value = ''; input.focus(); }
          return;
        }
        const removeBtn = e.target.closest('[data-remove]');
        if (removeBtn) {
          this._state.museumIds.delete(removeBtn.dataset.remove);
          this._renderMuseumLists();
          this._emit();
        }
      });
    }

    /* Price */
    root.getElementById('price-rows').addEventListener('change', (e) => {
      if (e.target.name === 'price') {
        this._state.price = e.target.value;
        this._emit();
      }
    });

    /* Duration */
    const durInput = root.getElementById('dur');
    const durOut = root.getElementById('dur-out');
    durInput.addEventListener('input', (e) => {
      durOut.textContent = e.target.value + ' min';
    });
    durInput.addEventListener('change', (e) => {
      this._state.durationMax = +e.target.value;
      this._emit();
    });

    /* Tone (opzionale) */
    const toneRows = root.getElementById('tone-rows');
    if (toneRows) {
      toneRows.addEventListener('change', (e) => {
        if (e.target.name === 'tone') {
          if (e.target.checked) this._state.tones.add(e.target.value);
          else this._state.tones.delete(e.target.value);
          this._emit();
        }
      });
    }

    /* Tags */
    root.getElementById('tag-chips').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      const tag = btn.dataset.tag;
      if (this._state.tags.has(tag)) this._state.tags.delete(tag);
      else this._state.tags.add(tag);
      btn.classList.toggle('active');
      this._emit();
    });

    /* Reset */
    root.getElementById('reset').addEventListener('click', () => this.reset());
  }

  _renderMuseumLists() {
    const lists = this.shadowRoot.getElementById('museum-lists');
    if (lists) lists.innerHTML = this._museumListsHTML();
  }
}

customElements.define('filter-sidebar', FilterSidebar);
