/**
 * <visit-card>
 * Card per una visita. Riprende il vocabolario di <museum-card>.
 *
 * Property `data` (preferita agli attributi, supporta l'intero oggetto):
 *   { id, title, description, durationSec, steps, basePrice,
 *     tags[], museumDetails[{id, short, name, city}] }
 */

import { GLASS, TRANSITION } from '/marketplace/js/ui-tokens.js';

class VisitCard extends HTMLElement {
  constructor() {
    super();
    this._data = null;
  }

  set data(value) { this._data = value; this._render(); }
  get data() { return this._data; }

  connectedCallback() { this._render(); }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _fmtDuration(sec) {
    if (!sec) return '—';
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60); const r = m % 60;
    return r ? `${h}h ${r}min` : `${h}h`;
  }

  _fmtPrice(p) {
    if (!p) return 'Gratis';
    return `€ ${(+p).toFixed(2).replace('.', ',')}`;
  }

  _museumLine(details = []) {
    if (!details.length) return '';
    return details.map(m => this._esc(m.short || m.name)).join(' + ');
  }

  _render() {
    if (!this._data) return;
    const v = this._data;
    const isFree = !v.basePrice;
    const owned = !!v.owned;
    const placeholderLabel = v.placeholderTag || v.title || `Visita ${v.id}`;
    const museums = v.museumDetails || [];
    const isInfra = museums.length > 1;
    const museumLine = this._museumLine(museums);

    this.className = 'block h-full';
    this.innerHTML = `
      <div class="card group ${GLASS} overflow-hidden flex flex-col h-full cursor-pointer text-slate-800 dark:text-slate-100 ${TRANSITION} hover:-translate-y-1 hover:bg-white/20 hover:border-white/30 hover:shadow-2xl" role="button" tabindex="0" aria-label="${this._esc(v.title)}">

        <div class="relative h-44 bg-slate-300/20 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden">
          ${v.image
            ? `<img class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="${this._esc(v.image)}" alt="" loading="lazy">`
            : `<div class="absolute inset-0" style="background-image: repeating-linear-gradient(135deg, transparent 0 11px, rgba(100,116,139,0.12) 11px 12px);"></div>`
          }
          ${isInfra ? `<span class="absolute top-3 left-3 z-10 text-[0.62rem] font-medium tracking-[0.16em] uppercase px-2.5 py-1 rounded-full ${GLASS} text-slate-800 dark:text-slate-100">Inframuseale</span>` : ''}
          <span class="absolute top-3 right-3 z-10 text-[0.7rem] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded-full ${owned || isFree ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : `${GLASS} text-slate-800 dark:text-slate-100`}">${owned ? '✓ In tuo possesso' : this._fmtPrice(v.basePrice)}</span>
          <span class="relative z-[1] text-[0.68rem] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full ${GLASS} text-slate-800 dark:text-slate-100" style="font-family: var(--font-mono);">${this._esc(placeholderLabel)}</span>
        </div>

        <div class="p-6 flex-1 flex flex-col gap-2.5">
          ${museumLine ? `<div class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 pb-2.5 border-b border-slate-400/20">${museumLine}</div>` : ''}
          <div class="flex items-center gap-2 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-slate-500 dark:text-slate-400">
            ${v.steps ? `<span>${v.steps} tappe</span>` : ''}
          </div>
          <h2 class="text-lg font-semibold leading-snug" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._esc(v.title)}</h2>
          <p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">${this._esc(v.description)}</p>
          ${v.tags?.length ? `<div class="flex flex-wrap gap-x-2 text-[0.62rem] tracking-[0.12em] uppercase text-slate-500 dark:text-slate-400">${v.tags.slice(0, 3).map(t => `<span>${this._esc(t)}</span>`).join('<span class="opacity-50">·</span>')}</div>` : ''}
          <div class="flex items-end justify-between gap-4 mt-auto pt-4 border-t border-slate-400/20">
            <span class="text-sm">
              <small class="block text-[0.62rem] tracking-[0.12em] uppercase text-slate-500 dark:text-slate-400 mb-0.5">Durata</small>
              ${this._fmtDuration(v.durationSec)}
            </span>
            <span class="cta inline-flex items-center whitespace-nowrap text-[0.66rem] font-semibold tracking-[0.08em] uppercase px-3.5 py-2 rounded-full bg-slate-800 text-white dark:bg-white dark:text-slate-900 group-hover:opacity-90 ${TRANSITION}">Esplora →</span>
          </div>
        </div>
      </div>
    `;

    const card = this.querySelector('.card');
    const open = () => this.dispatchEvent(new CustomEvent('open-visit', {
      detail: { id: v.id },
      bubbles: true,
      composed: true,
    }));
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  }
}

customElements.define('visit-card', VisitCard);
