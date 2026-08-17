/**
 * <museum-modal>
 * Overlay in sovraimpressione con le informazioni di un museo: nome,
 * descrizione, immagine, sito web e indirizzo. In fondo un tasto porta
 * alla lista delle visite di quel museo.
 *
 * Uso:
 *   document.querySelector('museum-modal').open(museumId);
 */

import { GLASS_MODAL as GLASS, TRANSITION } from '/marketplace/js/ui-tokens.js';

const API_MUSEUMS = '/api/museums';
const VISITS_URL  = '/marketplace/pages/visits.html';

class MuseumModal extends HTMLElement {
  constructor() {
    super();
    this._museum = null;
    this._loading = false;
    this._error = null;
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() { this._render(); }

  async open(museumId) {
    this._museum = null;
    this._loading = true;
    this._error = null;

    this.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKeydown);
    this._render();

    try {
      const res = await fetch(`${API_MUSEUMS}/${museumId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._museum = await res.json();
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

  _bodyHtml() {
    const m = this._museum;
    const address = this._addressLine(m.address);
    const cityLine = [m.address?.city, m.address?.country].filter(Boolean).join(' · ');

    return `
      <div class="relative h-[190px] bg-slate-300/20 dark:bg-slate-800/40 border-b border-slate-400/20 flex items-center justify-center overflow-hidden shrink-0">
        ${m.image_url
          ? `<img class="absolute inset-0 w-full h-full object-cover" src="${this._esc(m.image_url)}" alt="" loading="lazy">`
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

  _render() {
    const isOpen = this.hasAttribute('open');
    const m = this._museum;
    const visitsUrl = m ? `${VISITS_URL}?museum=${encodeURIComponent(m._id)}&museumName=${encodeURIComponent(m.name)}` : '#';

    this.className = isOpen ? '' : 'hidden';
    this.innerHTML = isOpen ? `
      <div class="backdrop fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"></div>
      <div class="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-0 sm:p-6" style="pointer-events: none;">
        <div class="panel relative w-screen min-w-0 h-screen sm:w-[min(640px,92vw)] sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl overflow-hidden flex flex-col ${GLASS} text-slate-800 dark:text-slate-100" style="pointer-events: auto;" role="dialog" aria-modal="true" aria-label="${m ? this._esc(m.name) : 'Informazioni museo'}">
          <button class="liquid-glass-pill close-btn absolute top-3 right-3 z-10 w-9 h-9 rounded-full border border-slate-400/20 backdrop-blur-lg flex items-center justify-center text-lg leading-none hover:bg-white/20 hover:border-white/30 ${TRANSITION}" aria-label="Chiudi">×</button>
          <div class="body-scroll overflow-y-auto flex-1 min-h-0">
            ${this._loading ? '<p class="py-16 px-8 text-center text-slate-500 dark:text-slate-400 text-sm">Caricamento…</p>' : ''}
            ${this._error ? `<p class="py-16 px-8 text-center text-slate-500 dark:text-slate-400 text-sm">${this._esc(this._error)}</p>` : ''}
            ${(!this._loading && !this._error && m) ? this._bodyHtml() : ''}
          </div>
          ${(!this._loading && !this._error && m) ? `
          <div class="footer shrink-0 flex items-center justify-end gap-4 px-5 py-4 sm:px-8 sm:py-[1.1rem] border-t border-slate-400/20">
            <a class="btn primary inline-block text-[0.72rem] font-semibold tracking-[0.08em] uppercase px-6 py-3 rounded-full whitespace-nowrap bg-slate-800 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 ${TRANSITION}" id="visits-btn" href="${visitsUrl}">Scopri visite</a>
          </div>` : ''}
        </div>
      </div>
    ` : '';

    if (isOpen) {
      this.querySelector('.backdrop')?.addEventListener('click', () => this.close());
      this.querySelector('.close-btn')?.addEventListener('click', () => this.close());
    }
  }
}

customElements.define('museum-modal', MuseumModal);
