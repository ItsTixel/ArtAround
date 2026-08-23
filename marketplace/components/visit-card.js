/**
 * <visit-card>
 * Card per una visita. Riprende il vocabolario di <museum-card>.
 *
 * Property `data` (preferita agli attributi, supporta l'intero oggetto):
 *   { id, title, description, durationSec, steps, basePrice,
 *     tags[], tones[], museumDetails[{id, short, name, city}], images[] }
 */

import { GLASS, GLASS_STRONG, TRANSITION, TAG_PILL } from '/marketplace/js/ui-tokens.js';
import { TONE_LABELS } from '/marketplace/js/tone-labels.js';

/* Timer globale condiviso: fa avanzare in un unico battito i caroselli
 * di tutte le <visit-card> attualmente montate, cosí si muovono assieme.
 * Ogni card in pausa (puntatore sopra) viene semplicemente saltata al tick. */
const AUTOPLAY_INTERVAL_MS = 4000;
const activeCarousels = new Set();
let globalAutoplayTimer = null;

function registerCarousel(card) {
  activeCarousels.add(card);
  if (!globalAutoplayTimer) {
    globalAutoplayTimer = setInterval(() => {
      activeCarousels.forEach(c => c._advance?.());
    }, AUTOPLAY_INTERVAL_MS);
  }
}

function unregisterCarousel(card) {
  activeCarousels.delete(card);
  if (activeCarousels.size === 0 && globalAutoplayTimer) {
    clearInterval(globalAutoplayTimer);
    globalAutoplayTimer = null;
  }
}

class VisitCard extends HTMLElement {
  constructor() {
    super();
    this._data = null;
    this._paused = false;
    this._advance = null;
  }

  set data(value) { this._data = value; this._render(); }
  get data() { return this._data; }

  connectedCallback() { this.setAttribute('role', 'listitem'); this._render(); }
  disconnectedCallback() { unregisterCarousel(this); }

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
    const favorited = !!v.favorited;
    const museums = v.museumDetails || [];
    const isInfra = museums.length > 1;
    const museumLine = this._museumLine(museums);
    const images = (Array.isArray(v.images) && v.images.length) ? v.images : (v.image ? [v.image] : []);

    this.className = 'block h-full';
    this.innerHTML = `
      <div class="card group relative ${GLASS} overflow-hidden flex flex-row sm:flex-col h-full text-slate-800 dark:text-slate-100 ${TRANSITION} hover:-translate-y-1 hover:bg-white/20 hover:border-white/30 hover:shadow-2xl">
        <button type="button" class="card-open-btn absolute inset-0 z-[3] cursor-pointer" aria-label="${this._esc(v.title)}"></button>

        <div class="relative z-[4] w-32 shrink-0 self-stretch sm:self-auto sm:w-full sm:h-44 bg-slate-300/20 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden">
          ${images.length
            ? `<div class="hero-scroll absolute inset-0 flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                 ${images.map(img => `<img class="w-full h-full shrink-0 snap-center object-cover transition-transform duration-500 group-hover:scale-105" src="${this._esc(img)}" alt="" loading="lazy">`).join('')}
               </div>`
            : `<div class="absolute inset-0" style="background-image: repeating-linear-gradient(135deg, transparent 0 11px, rgba(100,116,139,0.12) 11px 12px);"></div>`
          }
          ${isInfra ? `<span class="hidden sm:inline-block absolute top-3 left-3 z-10 text-[0.62rem] font-medium tracking-[0.16em] uppercase px-2.5 py-1 rounded-full ${GLASS_STRONG} text-slate-800 dark:text-slate-100">Inframuseale</span>` : ''}
          <div class="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center gap-1.5 sm:gap-2">
            <button type="button" class="fav-btn flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${GLASS_STRONG} text-slate-800 dark:text-slate-100 ${TRANSITION}" aria-pressed="${favorited}" aria-label="${favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}">
              <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 ${favorited ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-current'}" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.6s-6.9-4.35-9.5-8.4C.9 9.1 1.7 5.4 5 4c2.2-.9 4.5 0 5.8 2l1.2 1.5L13.2 6c1.3-2 3.6-2.9 5.8-2 3.3 1.4 4.1 5.1 2.5 8.2-2.6 4.05-9.5 8.4-9.5 8.4z"/></svg>
            </button>
            <span class="hidden sm:inline-block text-[0.7rem] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded-full ${owned || isFree ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : `${GLASS_STRONG} text-slate-800 dark:text-slate-100`}">${owned ? '✓ In tuo possesso' : this._fmtPrice(v.basePrice)}</span>
          </div>
          ${images.length > 1 ? `
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 sm:gap-1.5" aria-hidden="true">
            ${images.map((_, i) => `<span class="hero-dot w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${TRANSITION} ${i === 0 ? 'bg-white' : 'bg-white/40'}"></span>`).join('')}
          </div>
          <button type="button" class="hero-prev hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-7 h-7 rounded-full ${GLASS} text-slate-800 dark:text-slate-100 opacity-0 group-hover:opacity-100 ${TRANSITION}" aria-label="Immagine precedente">
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          <button type="button" class="hero-next hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-7 h-7 rounded-full ${GLASS} text-slate-800 dark:text-slate-100 opacity-0 group-hover:opacity-100 ${TRANSITION}" aria-label="Immagine successiva">
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
          </button>` : ''}
        </div>

        <div class="min-w-0 p-3.5 sm:p-6 flex-1 flex flex-col gap-1.5 sm:gap-2.5">
          ${museumLine ? `<div class="text-[0.6rem] sm:text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 pb-1.5 sm:pb-2.5 border-b border-slate-400/20">${museumLine}</div>` : ''}
          <div class="flex items-center gap-2 text-[0.6rem] sm:text-[0.66rem] font-medium tracking-[0.14em] uppercase text-slate-500 dark:text-slate-400">
            ${v.steps ? `<span>${v.steps} tappe</span>` : ''}
            <span class="sm:hidden font-semibold ${owned || isFree ? 'text-slate-800 dark:text-slate-100' : ''}">${owned ? '✓ Posseduta' : this._fmtPrice(v.basePrice)}</span>
          </div>
          <h2 class="text-base sm:text-lg font-semibold leading-snug" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._esc(v.title)}</h2>
          <p class="hidden sm:block text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">${this._esc(v.description)}</p>
          ${v.tags?.length ? `<div class="hidden sm:flex flex-wrap gap-1.5">${v.tags.slice(0, 3).map(t => `<span class="${TAG_PILL}">${this._esc(t)}</span>`).join('')}</div>` : ''}
          ${v.tones?.length ? `
          <div class="tones hidden sm:block">
            <small class="block text-[0.58rem] sm:text-[0.62rem] tracking-[0.12em] uppercase text-slate-500 dark:text-slate-400 mb-1">Linguaggio</small>
            <div class="flex flex-wrap gap-1.5">${v.tones.map(t => `<span class="${TAG_PILL}">${this._esc(TONE_LABELS[t] || t)}</span>`).join('')}</div>
          </div>` : ''}
          <div class="flex items-end justify-between gap-4 mt-auto pt-3 sm:pt-4 border-t border-slate-400/20">
            <span class="text-xs sm:text-sm">
              <small class="block text-[0.58rem] sm:text-[0.62rem] tracking-[0.12em] uppercase text-slate-500 dark:text-slate-400 mb-0.5">Durata</small>
              ${this._fmtDuration(v.durationSec)}
            </span>
            <span class="cta inline-flex items-center whitespace-nowrap text-[0.6rem] sm:text-[0.66rem] font-semibold tracking-[0.08em] uppercase px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-slate-800 text-white dark:bg-white dark:text-slate-900 group-hover:opacity-90 ${TRANSITION}">Esplora →</span>
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
    this.querySelector('.card-open-btn').addEventListener('click', open);

    this.querySelector('.fav-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !this._data.favorited;
      this.data = { ...this._data, favorited: next };
      this.dispatchEvent(new CustomEvent('toggle-favorite', {
        detail: { id: v.id, favorited: next, revert: () => { this.data = { ...this.data, favorited: !next }; } },
        bubbles: true,
        composed: true,
      }));
    });

    unregisterCarousel(this);
    this._paused = false;
    this._advance = null;
    if (images.length > 1) {
      const track = this.querySelector('.hero-scroll');
      const dots = this.querySelectorAll('.hero-dot');
      const prevBtn = this.querySelector('.hero-prev');
      const nextBtn = this.querySelector('.hero-next');
      const currentIndex = () => Math.round(track.scrollLeft / track.clientWidth);

      const goTo = (index) => {
        const clamped = (index + images.length) % images.length;
        track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
      };

      track.addEventListener('scroll', () => {
        const active = currentIndex();
        dots.forEach((dot, i) => {
          dot.classList.toggle('bg-white', i === active);
          dot.classList.toggle('bg-white/40', i !== active);
        });
      }, { passive: true });

      prevBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        goTo(currentIndex() - 1);
      });
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        goTo(currentIndex() + 1);
      });

      card.addEventListener('mouseenter', () => { this._paused = true; });
      card.addEventListener('mouseleave', () => { this._paused = false; });

      this._advance = () => { if (!this._paused) goTo(currentIndex() + 1); };
      registerCarousel(this);
    }
  }
}

customElements.define('visit-card', VisitCard);
