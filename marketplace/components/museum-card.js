import { GLASS, TRANSITION } from '/marketplace/js/ui-tokens.js';
import { slugify } from '/marketplace/js/slug.js';

class MuseumCard extends HTMLElement {
  static get observedAttributes() {
    return ['museum-id', 'name', 'city', 'country', 'image', 'opening-hours', 'is-accessible'];
  }

  connectedCallback() { this.setAttribute('role', 'listitem'); this._render(); }
  attributeChangedCallback() { if (this.innerHTML) this._render(); }

  _escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _todayHours() {
    const raw = this.getAttribute('opening-hours');
    if (!raw) return null;
    let hours;
    try { hours = JSON.parse(raw); } catch { return null; }
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const now = new Date();
    const today = dayNames[now.getDay()];
    const value = hours[today];
    if (!value) return null;
    const trimmed = value.trim();
    if (/^chiuso$/i.test(trimmed)) {
      return { closed: true, label: 'Chiuso oggi' };
    }
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
    if (match) {
      const [, h1, m1, h2, m2] = match.map(Number);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = h1 * 60 + m1;
      const closeMinutes = h2 * 60 + m2;
      const withinHours = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
      return withinHours
        ? { closed: false, label: `Aperto ora: ${trimmed}` }
        : { closed: true, label: `Chiuso ora (oggi ${trimmed})` };
    }
    return { closed: false, label: `Aperto oggi: ${trimmed}` };
  }

  _render() {
    const id      = this.getAttribute('museum-id') || '';
    const name    = this.getAttribute('name')      || '';
    const city    = this.getAttribute('city')      || '';
    const country = this.getAttribute('country')   || '';
    const image   = this.getAttribute('image')     || '';
    const isAccessible = this.hasAttribute('is-accessible');
    const location = [city, country].filter(Boolean).join(' · ');
    const slug = slugify(name);
    const visitsUrl = slug ? `/marketplace/pages/visits.html/${slug}` : '/marketplace/pages/visits.html';
    const todayHours = this._todayHours();

    this.className = 'block h-full';
    this.innerHTML = `
      <div class="card group relative ${GLASS} overflow-hidden flex flex-row sm:flex-col h-full text-slate-800 dark:text-slate-100 ${TRANSITION} hover:-translate-y-1 hover:bg-white/20 hover:border-white/30 hover:shadow-2xl">
        <a class="absolute inset-0 z-[3]" href="${visitsUrl}" aria-label="${this._escape(name)}"></a>

        <div class="relative w-32 shrink-0 self-stretch sm:self-auto sm:w-full sm:h-44 bg-slate-300/20 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden">
          ${image
            ? `<img class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="${this._escape(image)}" alt="${this._escape(name)}" loading="lazy">`
            : `<svg class="relative w-11 h-11 fill-slate-400 dark:fill-slate-500 transition-colors group-hover:fill-slate-600 dark:group-hover:fill-slate-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                 <path d="M22 11V9L12 2 2 9v2h2v9h5v-5h6v5h5v-9h2z"/>
               </svg>`}
        </div>

        <div class="min-w-0 p-3.5 sm:p-6 flex-1 flex flex-col gap-1.5 sm:gap-2.5">
          ${location ? `
          <p class="flex items-center gap-1.5 text-[0.6rem] sm:text-[0.66rem] font-medium tracking-[0.14em] uppercase text-slate-500 dark:text-slate-400">
            <svg class="w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] fill-slate-500 dark:fill-slate-400 shrink-0" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
            ${this._escape(location)}
          </p>` : ''}
          ${todayHours ? `
          <span class="inline-flex items-center gap-1.5 w-fit text-[0.62rem] sm:text-[0.68rem] font-medium leading-none px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full ${GLASS} ${todayHours.closed ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100 font-semibold'}">
            <span class="w-1.5 h-1.5 rounded-full shrink-0 ${todayHours.closed ? 'bg-red-400/80' : 'bg-green-400/80'}" aria-hidden="true"></span>
            <span>${this._escape(todayHours.label)}</span>
          </span>` : ''}
          ${isAccessible ? `
          <span class="inline-flex items-center gap-1.5 w-fit text-[0.62rem] sm:text-[0.68rem] font-medium leading-none px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full ${GLASS} text-slate-800 dark:text-slate-100">
            <svg class="w-3 h-3 shrink-0 fill-slate-600 dark:fill-slate-300" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-1 5h6v2h-4.15l3.32 6.15-1.76.95-2.16-4-2.4 3.9H7l3.05-4.95L9 9.5V15H7V9c0-1.1.9-2 2-2h2zM6.5 13a3.5 3.5 0 1 0 3.46 4h1.53a5 5 0 1 1-5-6l.01 2z"/></svg>
            <span>Accessibile</span>
          </span>` : ''}
          <h2 class="flex-1 text-base sm:text-lg font-semibold leading-snug" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._escape(name)}</h2>
          <div class="flex items-center justify-between gap-2 sm:gap-3 mt-auto pt-3 sm:pt-4 border-t border-slate-400/20">
            <button class="info-btn relative z-[4] flex items-center justify-center w-6 h-6 sm:w-auto sm:h-auto sm:inline-flex text-[0.6rem] sm:text-[0.66rem] font-medium tracking-[0.08em] uppercase text-slate-600 dark:text-slate-300 border border-slate-400/20 rounded-full px-0 sm:px-3.5 py-0 sm:py-2 shrink-0 whitespace-nowrap hover:text-slate-900 dark:hover:text-white hover:bg-white/20 hover:border-white/30 ${TRANSITION}" id="info-btn" aria-label="Info museo: ${this._escape(name)}">
              <svg class="w-3 h-3 sm:hidden fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
              <span class="hidden sm:inline">Info museo</span>
            </button>
            <span class="cta inline-flex items-center whitespace-nowrap text-[0.6rem] sm:text-[0.66rem] font-semibold tracking-[0.08em] uppercase px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-slate-800 text-white dark:bg-white dark:text-slate-900 group-hover:opacity-90 ${TRANSITION}"><span class="sm:hidden">Esplora →</span><span class="hidden sm:inline">Esplora le visite →</span></span>
          </div>
        </div>
      </div>
    `;

    this.querySelector('#info-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-museum-info', {
        detail: { id },
        bubbles: true,
        composed: true,
      }));
    });
  }
}

customElements.define('museum-card', MuseumCard);
