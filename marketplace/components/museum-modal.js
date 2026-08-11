/**
 * <museum-modal>
 * Overlay in sovraimpressione con le informazioni di un museo: nome,
 * descrizione, immagine, sito web e indirizzo. In fondo un tasto porta
 * alla lista delle visite di quel museo.
 *
 * Uso:
 *   document.querySelector('museum-modal').open(museumId);
 */

const API_MUSEUMS = '/api/museums';
const VISITS_URL  = '/marketplace/pages/visits.html';

class MuseumModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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

  _bodyHtml() {
    const m = this._museum;
    const address = this._addressLine(m.address);
    const cityLine = [m.address?.city, m.address?.country].filter(Boolean).join(' · ');

    return `
      <div class="banner ${m.image_url ? 'has-image' : ''}">
        ${m.image_url
          ? `<img class="banner-img" src="${this._esc(m.image_url)}" alt="" loading="lazy">`
          : `<svg class="museum-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
               <path d="M22 11V9L12 2 2 9v2h2v9h5v-5h6v5h5v-9h2z"/>
             </svg>`}
        <span class="ph-label">${this._esc(m.name)}</span>
      </div>

      <div class="content">
        ${cityLine ? `<div class="museum-line">${this._esc(cityLine)}</div>` : ''}
        <h2 class="title">${this._esc(m.name)}</h2>

        ${m.description ? `<p class="description">${this._esc(m.description)}</p>` : ''}

        <ul class="info-list">
          ${address ? `
          <li class="info-row">
            <svg class="info-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
            <span>${this._esc(address)}</span>
          </li>` : ''}
          ${m.website ? `
          <li class="info-row">
            <svg class="info-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.93 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a7.95 7.95 0 0 1 0-4h3.38a16.6 16.6 0 0 0 0 4H4.26zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56A8.03 8.03 0 0 1 5.07 16zm2.95-8H5.07a8.03 8.03 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.02 8zM12 19.96a15.7 15.7 0 0 1-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66a14.6 14.6 0 0 1 0-4h4.68a14.6 14.6 0 0 1 0 4zm.27 2h2.95a8.03 8.03 0 0 1-4.33 3.56c.6-1.11 1.06-2.31 1.38-3.56zm-.27-8a14.6 14.6 0 0 0 0-4h2.95a7.95 7.95 0 0 1 0 4h-2.95zM7.4 4.44A15.7 15.7 0 0 0 6.02 8H3.07a8.03 8.03 0 0 1 4.33-3.56z"/>
            </svg>
            <a class="website-link" href="${this._esc(m.website)}" target="_blank" rel="noopener noreferrer">${this._esc(m.website.replace(/^https?:\/\//, ''))}</a>
          </li>` : ''}
        </ul>
      </div>
    `;
  }

  _render() {
    const isOpen = this.hasAttribute('open');
    const m = this._museum;
    const visitsUrl = m ? `${VISITS_URL}?museum=${encodeURIComponent(m._id)}&museumName=${encodeURIComponent(m.name)}` : '#';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 1000;
        }
        :host([open]) { display: block; }

        .backdrop {
          position: absolute; inset: 0;
          background: rgba(0, 0, 0, 0.7);
          animation: fade-in 0.3s ease;
        }

        .panel {
          position: relative;
          margin: 4vh auto;
          width: min(640px, 92vw);
          max-height: 92vh;
          background: var(--color-surface, #161616);
          border: 1px solid var(--color-border, #2a2a2a);
          border-radius: var(--radius, 8px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
          animation: rise-in 0.35s ease;
        }

        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rise-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }

        .close-btn {
          position: absolute;
          top: 0.85rem; right: 0.85rem;
          z-index: 3;
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          background: var(--glass-bg, rgba(22, 22, 22, 0.85));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--color-border, #2a2a2a);
          border-radius: var(--radius-sm, 6px);
          cursor: pointer;
          font-size: 1.1rem;
          line-height: 1;
          color: var(--color-text, #f0ede8);
          transition: background 0.3s ease, color 0.3s ease;
        }
        .close-btn:hover { background: var(--color-accent, #d4a853); color: var(--color-on-accent, #0a0a0a); }

        .body-scroll { overflow-y: auto; flex: 1; min-height: 0; }

        /* ── Banner ───────────────────────────────────────── */
        .banner {
          position: relative;
          height: 190px;
          background: #101010;
          border-bottom: 1px solid var(--color-border, #2a2a2a);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .banner::before {
          content: '';
          position: absolute; inset: 0;
          background: repeating-linear-gradient(135deg, transparent 0 11px, rgba(255,255,255,0.035) 11px 12px);
        }
        .banner.has-image::before { display: none; }
        .banner-img {
          position: absolute; inset: 0;
          z-index: 0;
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .museum-icon {
          position: relative; z-index: 1;
          width: 48px; height: 48px;
          fill: var(--color-text-muted, #8a8a8a);
        }
        .ph-label {
          position: absolute;
          bottom: 0.85rem; left: 50%;
          transform: translateX(-50%);
          z-index: 1;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-text-muted, #8a8a8a);
          background: var(--glass-bg, rgba(22, 22, 22, 0.85));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: var(--radius-sm, 6px);
          padding: 0.4rem 0.85rem;
          text-align: center;
          max-width: 80%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Contenuto ────────────────────────────────────── */
        .content { padding: 1.75rem 2rem 2rem; font-family: var(--font-sans, 'Inter', sans-serif); }

        .museum-line {
          font-size: 0.66rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-accent, #9e7a46);
          margin-bottom: 0.5rem;
        }
        .title {
          font-family: var(--font-serif, 'Playfair Display', serif);
          font-size: 1.55rem;
          font-weight: 600;
          color: var(--color-text, #1c1917);
          line-height: 1.25;
          margin-bottom: 1rem;
        }

        .description {
          font-size: 0.9rem;
          line-height: 1.65;
          color: var(--color-text-muted, #8a8a8a);
          margin-bottom: 1.3rem;
        }

        .info-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          padding-top: 1.1rem;
          border-top: 1px solid var(--color-border, #e8e6e1);
        }
        .info-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.82rem;
          color: var(--color-text, #1c1917);
        }
        .info-icon {
          width: 16px; height: 16px;
          flex-shrink: 0;
          fill: var(--color-accent, #9e7a46);
        }
        .website-link {
          color: var(--color-accent, #9e7a46);
          text-decoration: none;
          word-break: break-all;
        }
        .website-link:hover { text-decoration: underline; }

        /* ── Footer ───────────────────────────────────────── */
        .footer {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: flex-end;
          gap: 1rem;
          padding: 1.1rem 2rem;
          border-top: 1px solid var(--color-border, #e8e6e1);
          background: var(--color-surface, #fff);
        }

        .btn {
          font-family: var(--font-sans, 'Nunito Sans', sans-serif);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-sm, 6px);
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          display: inline-block;
          transition: box-shadow 0.3s ease;
        }
        .btn.primary {
          background: linear-gradient(135deg, var(--color-accent, #d4a853), var(--color-accent-hover, #c49440));
          border-color: var(--color-accent, #d4a853);
          color: var(--color-on-accent, #0a0a0a);
        }
        .btn.primary:hover { box-shadow: 0 0 20px rgba(212, 168, 83, 0.35); }

        .state-msg {
          padding: 4rem 2rem;
          text-align: center;
          color: var(--color-text-muted, #78716c);
          font-size: 0.85rem;
        }

        @media (max-width: 640px) {
          .panel { width: 100vw; margin: 0; max-height: 100vh; height: 100vh; border-radius: 0; }
          .content { padding: 1.5rem 1.25rem 1.75rem; }
          .footer { padding: 1rem 1.25rem; }
        }
      </style>

      ${isOpen ? `
        <div class="backdrop"></div>
        <div class="panel" role="dialog" aria-modal="true" aria-label="${m ? this._esc(m.name) : 'Informazioni museo'}">
          <button class="close-btn" aria-label="Chiudi">×</button>
          <div class="body-scroll">
            ${this._loading ? '<p class="state-msg">Caricamento…</p>' : ''}
            ${this._error ? `<p class="state-msg">${this._esc(this._error)}</p>` : ''}
            ${(!this._loading && !this._error && m) ? this._bodyHtml() : ''}
          </div>
          ${(!this._loading && !this._error && m) ? `
          <div class="footer">
            <a class="btn primary" id="visits-btn" href="${visitsUrl}">Scopri visite</a>
          </div>` : ''}
        </div>
      ` : ''}
    `;

    if (isOpen) {
      this.shadowRoot.querySelector('.backdrop')?.addEventListener('click', () => this.close());
      this.shadowRoot.querySelector('.close-btn')?.addEventListener('click', () => this.close());
    }
  }
}

customElements.define('museum-modal', MuseumModal);
