import { GLASS, TRANSITION } from '/marketplace/js/ui-tokens.js';

class MuseumCard extends HTMLElement {
  static get observedAttributes() {
    return ['museum-id', 'name', 'city', 'country', 'image', 'opening-hours'];
  }

  connectedCallback() { this._render(); }
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
    const today = dayNames[new Date().getDay()];
    const value = hours[today];
    if (!value) return null;
    const closed = /^chiuso$/i.test(value.trim());
    return { closed, label: closed ? 'Chiuso oggi' : `Aperto oggi: ${value}` };
  }

  _render() {
    const id      = this.getAttribute('museum-id') || '';
    const name    = this.getAttribute('name')      || '';
    const city    = this.getAttribute('city')      || '';
    const country = this.getAttribute('country')   || '';
    const image   = this.getAttribute('image')     || '';
    const location = [city, country].filter(Boolean).join(' · ');
    const visitsUrl = `/marketplace/pages/visits.html?museum=${encodeURIComponent(id)}&museumName=${encodeURIComponent(name)}`;
    const todayHours = this._todayHours();

    this.className = 'block h-full';
    this.innerHTML = `
      <div class="card group relative ${GLASS} overflow-hidden flex flex-col h-full text-slate-800 dark:text-slate-100 ${TRANSITION} hover:-translate-y-1 hover:bg-white/20 hover:border-white/30 hover:shadow-2xl">
        <a class="absolute inset-0 z-[3]" href="${visitsUrl}" aria-label="${this._escape(name)}"></a>

        <div class="relative h-44 bg-slate-300/20 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden">
          ${image
            ? `<img class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="${this._escape(image)}" alt="" loading="lazy">`
            : `<svg class="relative w-11 h-11 fill-slate-400 dark:fill-slate-500 transition-colors group-hover:fill-slate-600 dark:group-hover:fill-slate-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                 <path d="M22 11V9L12 2 2 9v2h2v9h5v-5h6v5h5v-9h2z"/>
               </svg>`}
          <span class="absolute bottom-3 left-1/2 -translate-x-1/2 z-[2] text-[0.68rem] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full ${GLASS} text-slate-800 dark:text-slate-100 whitespace-nowrap" style="font-family: var(--font-mono);">${this._escape(city || 'Museo')}</span>
        </div>

        <div class="p-6 flex-1 flex flex-col gap-2">
          ${location ? `
          <p class="flex items-center gap-1.5 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-slate-500 dark:text-slate-400">
            <svg class="w-[11px] h-[11px] fill-slate-500 dark:fill-slate-400 shrink-0" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
            ${this._escape(location)}
          </p>` : ''}
          ${todayHours ? `
          <span class="inline-flex items-center gap-1.5 w-fit text-[0.68rem] font-medium leading-none px-3 py-1.5 rounded-full ${GLASS} ${todayHours.closed ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100 font-semibold'}">
            <span class="w-1.5 h-1.5 rounded-full shrink-0 ${todayHours.closed ? 'bg-slate-400/70' : 'bg-green-400/80'}" aria-hidden="true"></span>
            <span>${this._escape(todayHours.label)}</span>
          </span>` : ''}
          <h2 class="flex-1 text-lg font-semibold leading-snug" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._escape(name)}</h2>
          <div class="flex items-center justify-between gap-3 mt-auto pt-4 border-t border-slate-400/20">
            <button class="info-btn relative z-[4] text-[0.66rem] font-medium tracking-[0.08em] uppercase text-slate-600 dark:text-slate-300 border border-slate-400/20 rounded-full px-3.5 py-2 whitespace-nowrap hover:text-slate-900 dark:hover:text-white hover:bg-white/20 hover:border-white/30 ${TRANSITION}" id="info-btn" aria-label="Informazioni su ${this._escape(name)}">Info museo</button>
            <span class="cta inline-flex items-center whitespace-nowrap text-[0.66rem] font-semibold tracking-[0.08em] uppercase px-3.5 py-2 rounded-full bg-slate-800 text-white dark:bg-white dark:text-slate-900 group-hover:opacity-90 ${TRANSITION}">Esplora le visite →</span>
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
