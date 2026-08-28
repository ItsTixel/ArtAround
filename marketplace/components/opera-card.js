/**
 * <opera-card>
 * Card per un'opera (Entity) nella pagina "Opere" e nel pannello Opere
 * del profilo. Riprende il markup delle card "Descrizioni" del profilo
 * (js/profile.js renderDescriptions), adattato a un'opera: qui il corpo
 * è la descrizione intrinseca dell'opera (Entity.description, che può
 * mancare), non il riassunto di un item.
 *
 * Property `data`:
 *   { id, name, artworkAuthor, description, imageUrl, altText, isPhysical,
 *     tags[], museums[{id, name, city}], favorited }
 *
 * Eventi emessi (bubbles, composed):
 *   'open-opera'             { id }
 *   'toggle-favorite-entity' { id, favorited, revert }
 */

import { GLASS, GLASS_STRONG, TRANSITION, TAG_PILL } from '/marketplace/js/ui-tokens.js';

class OperaCard extends HTMLElement {
  constructor() {
    super();
    this._data = null;
  }

  set data(value) { this._data = value; this._render(); }
  get data() { return this._data; }

  connectedCallback() { this.setAttribute('role', 'listitem'); this._render(); }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _museumLine(museums = []) {
    if (!museums.length) return '';
    const first = this._esc(museums[0].name);
    return museums.length > 1 ? `${first} +${museums.length - 1} altri` : first;
  }

  _render() {
    if (!this._data) return;
    const o = this._data;
    const favorited = !!o.favorited;
    const museumLine = this._museumLine(o.museums);
    const typeLabel = o.isPhysical ? 'Fisica' : 'Non fisica';
    const typeCls = o.isPhysical
      ? 'text-slate-600 dark:text-slate-300 border-slate-400/30'
      : 'text-sky-600 dark:text-sky-400 border-sky-400/40';

    this.className = 'block h-full';
    this.innerHTML = `
      <div class="card group opera-card-inner relative ${GLASS} overflow-hidden flex flex-row sm:flex-col h-full text-slate-800 dark:text-slate-100 ${TRANSITION} hover:-translate-y-1 hover:bg-white/20 hover:border-white/30 hover:shadow-2xl">
        <button type="button" class="card-open-btn absolute inset-0 z-[3] cursor-pointer" aria-label="${this._esc(o.name)}"></button>
        <div class="relative w-32 shrink-0 self-stretch sm:self-auto sm:w-full sm:h-44 bg-slate-300/20 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden">
          ${o.imageUrl
            ? `<img class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="${this._esc(o.imageUrl)}" alt="${this._esc(o.altText || o.name)}" loading="lazy">`
            : `<div class="absolute inset-0 img-placeholder"></div>`}
          <button type="button" class="fav-btn absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${GLASS_STRONG} text-slate-800 dark:text-slate-100 ${TRANSITION}" aria-pressed="${favorited}" aria-label="${favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}">
            <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 ${favorited ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-current'}" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.6s-6.9-4.35-9.5-8.4C.9 9.1 1.7 5.4 5 4c2.2-.9 4.5 0 5.8 2l1.2 1.5L13.2 6c1.3-2 3.6-2.9 5.8-2 3.3 1.4 4.1 5.1 2.5 8.2-2.6 4.05-9.5 8.4-9.5 8.4z"/></svg>
          </button>
        </div>
        <div class="min-w-0 p-3.5 sm:p-6 flex-1 flex flex-col gap-1.5 sm:gap-2.5">
          <div class="text-[0.6rem] sm:text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-slate-500 dark:text-slate-400">${this._esc(o.artworkAuthor || 'Autore sconosciuto')}</div>
          <h2 class="text-base sm:text-lg font-semibold leading-snug font-serif">${this._esc(o.name)}</h2>
          ${museumLine ? `
          <p class="flex items-center gap-1.5 text-[0.6rem] sm:text-[0.66rem] font-medium tracking-[0.1em] uppercase text-slate-500 dark:text-slate-400">
            <svg class="w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] fill-slate-500 dark:fill-slate-400 shrink-0" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
            ${museumLine}
          </p>` : ''}
          <div class="hidden sm:flex flex-wrap gap-1.5 mt-auto pt-1">
            <span class="${TAG_PILL} ${typeCls}">${typeLabel}</span>
            ${(o.tags || []).slice(0, 3).map(t => `<span class="${TAG_PILL}">${this._esc(t)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;

    const open = () => this.dispatchEvent(new CustomEvent('open-opera', {
      detail: { id: o.id },
      bubbles: true,
      composed: true,
    }));
    this.querySelector('.card-open-btn').addEventListener('click', open);

    this.querySelector('.fav-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !this._data.favorited;
      this.data = { ...this._data, favorited: next };
      this.dispatchEvent(new CustomEvent('toggle-favorite-entity', {
        detail: { id: o.id, favorited: next, revert: () => { this.data = { ...this.data, favorited: !next }; } },
        bubbles: true,
        composed: true,
      }));
    });
  }
}

customElements.define('opera-card', OperaCard);
