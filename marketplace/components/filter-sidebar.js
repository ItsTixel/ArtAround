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

import { GLASS } from '/marketplace/js/ui-tokens.js';

const RING_FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-300 focus-visible:ring-offset-1';

class FilterSidebar extends HTMLElement {
  constructor() {
    super();
    this._state = {
      museumIds: new Set(),
      museumQuery: '',
      price: 'all',
      durationMax: 240,
      tones: new Set(),
      tags: new Set(),
    };
    this._data = { museums: [], tones: [], tags: [], maxDurationMin: 240 };
    this._mobileOpen = false;
  }

  set data(value) {
    const prevMax = this._data.maxDurationMin;
    this._data = { ...this._data, ...value };
    if (this._data.maxDurationMin !== prevMax) {
      this._state.durationMax = this._data.maxDurationMin;
    }
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
      <label class="row flex items-center gap-2.5 cursor-pointer text-[0.85rem] text-slate-800 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} class="w-3.5 h-3.5 shrink-0 accent-slate-800 dark:accent-white cursor-pointer ${RING_FOCUS} rounded-full">
        <span class="label flex-1">${label}</span>
      </label>`;
  }

  _check(name, value, label, count, checked) {
    return `
      <label class="row flex items-center gap-2.5 cursor-pointer text-[0.85rem] text-slate-800 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <input type="checkbox" name="${name}" value="${value}" ${checked ? 'checked' : ''} class="w-3.5 h-3.5 shrink-0 rounded accent-slate-800 dark:accent-white cursor-pointer ${RING_FOCUS}">
        <span class="label flex-1">${label}</span>
        <span class="count text-[0.7rem] opacity-55 tabular-nums">${count ?? ''}</span>
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
      ${selectedMuseums.length ? `
      <div class="selected flex flex-wrap gap-1.5 mt-3.5">
        ${selectedMuseums.map(m => `
          <span class="pill inline-flex items-center gap-1.5 text-[0.72rem] font-medium tracking-[0.02em] bg-slate-400/10 border border-slate-400/20 rounded-full text-slate-800 dark:text-slate-100 pl-2.5 pr-1 py-1">
            ${this._esc(m.short || m.name)}
            <button type="button" class="x w-4 h-4 inline-flex items-center justify-center border-0 bg-transparent p-0 font-inherit text-sm leading-none text-slate-500 dark:text-slate-400 cursor-pointer rounded-full hover:text-slate-800 dark:hover:text-white hover:bg-white/20 transition-colors ${RING_FOCUS}" data-remove="${this._esc(m.id)}" aria-label="Rimuovi ${this._esc(m.short || m.name)}">×</button>
          </span>
        `).join('')}
      </div>` : ''}
      ${availableMuseums.length ? `
        <div class="options mt-3.5 flex flex-col border-t border-slate-400/20">
          ${availableMuseums.map(m => `
            <button type="button" class="option group appearance-none bg-transparent border-0 border-b border-slate-400/20 py-2.5 pr-0 text-left font-inherit text-inherit cursor-pointer flex items-baseline justify-between gap-2.5 hover:text-slate-600 dark:hover:text-slate-300 hover:pl-1.5 transition-all ${RING_FOCUS}" data-add="${this._esc(m.id)}">
              <span>
                <span class="opt-main text-[0.86rem] font-medium">${this._esc(m.name)}</span>
                <span class="opt-sub text-[0.7rem] tracking-[0.04em] text-slate-500 dark:text-slate-400"> · ${this._esc(m.city)}</span>
              </span>
              <span class="plus text-base leading-none opacity-40 group-hover:opacity-100 transition-opacity" aria-hidden="true">+</span>
            </button>
          `).join('')}
        </div>
      ` : (s.museumQuery
          ? `<p class="no-options text-[0.78rem] text-slate-500 dark:text-slate-400 italic mt-3.5 pt-3.5 border-t border-slate-400/20">Nessun museo corrisponde a "${this._esc(s.museumQuery)}".</p>`
          : (selectedMuseums.length === this._data.museums.length && this._data.museums.length > 0
              ? `<p class="no-options text-[0.78rem] text-slate-500 dark:text-slate-400 italic mt-3.5 pt-3.5 border-t border-slate-400/20">Hai selezionato tutti i musei.</p>`
              : ''))}
    `;
  }

  _selectedMuseums() {
    return this._data.museums.filter(m => this._state.museumIds.has(m.id));
  }

  _tagChipsHTML() {
    const s = this._state;
    return this._data.tags.map(t => `
      <button type="button" class="chip text-[0.66rem] font-medium tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border transition-all duration-200 ease-in-out ${RING_FOCUS} ${s.tags.has(t.value)
        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-slate-800 dark:border-white'
        : 'bg-transparent text-slate-800 dark:text-slate-100 border-slate-400/20 hover:border-white/30 hover:bg-white/20'}" data-tag="${this._esc(t.value)}">${this._esc(t.value)}</button>
    `).join('');
  }

  _render() {
    const { tones, maxDurationMin } = this._data;
    const s = this._state;
    const hasTones = tones && tones.length > 0;

    this.className = 'block';
    this.innerHTML = `
      <aside class="${GLASS} p-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto overflow-x-hidden max-[900px]:static max-[900px]:max-h-none text-slate-800 dark:text-slate-100" style="font-family: var(--font-sans, 'Inter', system-ui, sans-serif);">
        <button type="button" class="toggle hidden max-[900px]:flex w-full items-center justify-between bg-transparent border-0 p-0 font-inherit text-[0.78rem] font-semibold tracking-[0.1em] uppercase text-slate-800 dark:text-slate-100 cursor-pointer ${RING_FOCUS}" id="filters-toggle" aria-expanded="${this._mobileOpen ? 'true' : 'false'}" aria-controls="filters-body">
          <span>Filtri</span>
          <span class="chev text-[0.7rem] text-slate-500 dark:text-slate-400 transition-transform duration-300 ease-in-out ${this._mobileOpen ? 'rotate-180' : ''}" aria-hidden="true">⌄</span>
        </button>

        <div class="filters-body ${this._mobileOpen ? 'max-[900px]:block max-[900px]:mt-6' : 'max-[900px]:hidden'}" id="filters-body">
        <!-- Filtro musei (multi-select con ricerca) -->
        <div class="group pt-6 pb-6 border-t border-slate-400/20 first:pt-0 first:border-t-0">
          <h3 class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-4">Musei</h3>
          <label class="search relative block">
            <svg class="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 fill-none stroke-slate-500 dark:stroke-slate-400 stroke-2 pointer-events-none" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 19l-4.35-4.35A7.5 7.5 0 1 0 15 16.65L19.35 21 21 19zM10.5 16a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
            </svg>
            <input id="museum-q" type="search" placeholder="Cerca un museo…" autocomplete="off" value="${this._esc(s.museumQuery)}" class="w-full pl-6 pr-2 py-2.5 border-0 border-b border-slate-400/20 bg-transparent font-inherit text-sm text-slate-800 dark:text-slate-100 placeholder:italic placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none focus:border-slate-800 dark:focus:border-white transition-colors">
          </label>

          <div id="museum-lists">
            ${this._museumListsHTML()}
          </div>
        </div>

        <!-- Prezzo -->
        <div class="group pt-6 pb-6 border-t border-slate-400/20 first:pt-0 first:border-t-0">
          <h3 class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-4">Prezzo</h3>
          <div class="rows flex flex-col gap-2.5" id="price-rows">
            ${this._radio('price', 'all', 'Tutte', s.price === 'all')}
            ${this._radio('price', 'free', 'Gratis', s.price === 'free')}
            ${this._radio('price', 'paid', 'A pagamento', s.price === 'paid')}
          </div>
        </div>

        <!-- Durata -->
        <div class="group pt-6 pb-6 border-t border-slate-400/20 first:pt-0 first:border-t-0">
          <h3 class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-4">Durata massima</h3>
          <div class="slider-wrap flex flex-col gap-2.5">
            <div class="slider-value flex justify-between text-[0.78rem] text-slate-500 dark:text-slate-400 tabular-nums">
              <span>5 min</span>
              <strong id="dur-out" class="text-slate-800 dark:text-slate-100 font-semibold">${s.durationMax} min</strong>
            </div>
            <input id="dur" type="range" min="5" max="${maxDurationMin}" step="5" value="${s.durationMax}" class="w-full h-1 accent-slate-800 dark:accent-white cursor-pointer ${RING_FOCUS} rounded-full">
          </div>
        </div>

        ${hasTones ? `
        <!-- Linguaggio -->
        <div class="group pt-6 pb-6 border-t border-slate-400/20 first:pt-0 first:border-t-0">
          <h3 class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-4">Linguaggio</h3>
          <div class="rows flex flex-col gap-2.5" id="tone-rows">
            ${tones.map(t => this._check('tone', t.value, t.label, t.count, s.tones.has(t.value))).join('')}
          </div>
        </div>
        ` : '<div id="tone-rows" class="hidden"></div>'}

        <!-- Temi -->
        <div class="group pt-6 pb-6 border-t border-slate-400/20 first:pt-0 first:border-t-0">
          <h3 class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-4">Temi</h3>
          <div class="chips flex flex-wrap gap-1.5" id="tag-chips">
            ${this._tagChipsHTML()}
          </div>
        </div>

        <button class="reset mt-7 bg-transparent border-0 border-b border-slate-500 dark:border-slate-400 p-0 pb-0.5 font-inherit text-[0.7rem] font-medium tracking-[0.1em] uppercase text-slate-500 dark:text-slate-400 cursor-pointer self-start hover:text-slate-800 dark:hover:text-white hover:border-slate-800 dark:hover:border-white transition-colors ${RING_FOCUS}" id="reset" type="button">Azzera filtri</button>
        </div>
      </aside>
    `;

    this._wire();
  }

  _wire() {
    /* Toggle mobile (menu a tendina) */
    this.querySelector('#filters-toggle').addEventListener('click', () => {
      this._mobileOpen = !this._mobileOpen;
      this._render();
    });

    /* Museum search */
    const museumQ = this.querySelector('#museum-q');
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
    const museumLists = this.querySelector('#museum-lists');
    if (museumLists) {
      museumLists.addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-add]');
        if (addBtn) {
          this._state.museumIds.add(addBtn.dataset.add);
          this._state.museumQuery = '';
          this._renderMuseumLists();
          this._emit();
          const input = this.querySelector('#museum-q');
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
    this.querySelector('#price-rows').addEventListener('change', (e) => {
      if (e.target.name === 'price') {
        this._state.price = e.target.value;
        this._emit();
      }
    });

    /* Duration */
    const durInput = this.querySelector('#dur');
    const durOut = this.querySelector('#dur-out');
    durInput.addEventListener('input', (e) => {
      durOut.textContent = e.target.value + ' min';
    });
    durInput.addEventListener('change', (e) => {
      this._state.durationMax = +e.target.value;
      this._emit();
    });

    /* Tone (opzionale) */
    const toneRows = this.querySelector('#tone-rows');
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
    this.querySelector('#tag-chips').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      const tag = btn.dataset.tag;
      if (this._state.tags.has(tag)) this._state.tags.delete(tag);
      else this._state.tags.add(tag);
      this._renderTagChips();
      this._emit();
    });

    /* Reset */
    this.querySelector('#reset').addEventListener('click', () => this.reset());
  }

  _renderMuseumLists() {
    const lists = this.querySelector('#museum-lists');
    if (lists) lists.innerHTML = this._museumListsHTML();
  }

  _renderTagChips() {
    const chips = this.querySelector('#tag-chips');
    if (chips) chips.innerHTML = this._tagChipsHTML();
  }
}

customElements.define('filter-sidebar', FilterSidebar);
