class MuseumCard extends HTMLElement {
  static get observedAttributes() {
    return ['museum-id', 'name', 'city', 'country'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { if (this.shadowRoot.innerHTML) this._render(); }

  _escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _render() {
    const id      = this.getAttribute('museum-id') || '';
    const name    = this.getAttribute('name')      || '';
    const city    = this.getAttribute('city')      || '';
    const country = this.getAttribute('country')   || '';
    const location = [city, country].filter(Boolean).join(' · ');
    const visitsUrl = `/marketplace/pages/visits.html?museum=${encodeURIComponent(id)}&museumName=${encodeURIComponent(name)}`;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }

        .card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e8e6e1);
          border-top: 2px solid var(--color-accent, #9e7a46);
          display: flex;
          flex-direction: column;
          height: 100%;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          transition: box-shadow 0.4s ease, transform 0.4s ease;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.09);
        }

        /* ── Banner ───────────────────────────────────────── */
        .banner {
          position: relative;
          height: 184px;
          background: #f5f2ec;
          border-bottom: 1px solid var(--color-border, #e8e6e1);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .banner::before {
          content: '';
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            135deg,
            transparent 0 11px,
            rgba(0, 0, 0, 0.045) 11px 12px
          );
        }

        .museum-icon {
          position: relative; z-index: 1;
          width: 44px; height: 44px;
          fill: #c4b49a;
          transition: fill 0.4s ease;
        }
        .card:hover .museum-icon { fill: #9e7a46; }

        .ph-label {
          position: absolute;
          bottom: 0.85rem; left: 50%;
          transform: translateX(-50%);
          z-index: 2;
          font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 0.68rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #78716c;
          background: rgba(255, 255, 255, 0.78);
          padding: 0.4rem 0.85rem;
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          white-space: nowrap;
        }

        /* ── Body ─────────────────────────────────────────── */
        .body {
          padding: 1.3rem 1.75rem 1.6rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .location {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-text-muted, #78716c);
        }
        .pin-icon {
          width: 11px; height: 11px;
          fill: var(--color-accent, #9e7a46);
          flex-shrink: 0;
        }

        h2 {
          font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--color-text, #1c1917);
          line-height: 1.3;
          margin: 0;
          flex: 1;
          transition: color 0.3s ease;
        }
        .card:hover h2 { color: var(--color-accent, #9e7a46); }

        .foot {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border, #e8e6e1);
        }

        .cta {
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text, #1c1917);
          padding-bottom: 2px;
          border-bottom: 1px solid var(--color-text, #1c1917);
          transition: color 0.3s ease, border-color 0.3s ease;
          white-space: nowrap;
        }
        .card:hover .cta {
          color: var(--color-accent, #9e7a46);
          border-color: var(--color-accent, #9e7a46);
        }
      </style>

      <a class="card" href="${visitsUrl}" aria-label="${this._escape(name)}">
        <div class="banner">
          <svg class="museum-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M22 11V9L12 2 2 9v2h2v9h5v-5h6v5h5v-9h2z"/>
          </svg>
          <span class="ph-label">${this._escape(city || 'Museo')}</span>
        </div>
        <div class="body">
          ${location ? `
          <p class="location">
            <svg class="pin-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
            ${this._escape(location)}
          </p>` : ''}
          <h2>${this._escape(name)}</h2>
          <div class="foot">
            <span class="cta">Esplora le visite →</span>
          </div>
        </div>
      </a>
    `;
  }
}

customElements.define('museum-card', MuseumCard);
