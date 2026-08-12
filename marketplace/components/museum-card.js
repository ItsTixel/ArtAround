class MuseumCard extends HTMLElement {
  static get observedAttributes() {
    return ['museum-id', 'name', 'city', 'country', 'image', 'opening-hours'];
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

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }

        .card {
          position: relative;
          background: var(--glass-bg, rgba(255, 255, 255, 0.05));
          backdrop-filter: blur(20px) saturate(140%);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
          border-top-color: var(--glass-border-strong, rgba(255, 255, 255, 0.22));
          border-radius: var(--radius, 8px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: box-shadow 0.4s ease, transform 0.4s ease, border-color 0.4s ease, background-color 0.35s ease;
        }
        .card:hover {
          transform: translateY(-4px);
          border-color: var(--glass-border-strong, rgba(255, 255, 255, 0.18));
          box-shadow: var(--glass-shadow, 0 16px 40px rgba(0, 0, 0, 0.5)), var(--glow-accent, 0 0 24px rgba(148, 197, 253, 0.16));
        }

        .card-link {
          position: absolute;
          inset: 0;
          z-index: 3;
          text-decoration: none;
          color: inherit;
        }

        /* ── Banner ───────────────────────────────────────── */
        .banner {
          position: relative;
          height: 184px;
          background: var(--placeholder-bg, #101010);
          border-bottom: 1px solid var(--color-border, #2a2a2a);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: background-color 0.35s ease;
        }
        .banner::before {
          content: '';
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            135deg,
            transparent 0 11px,
            var(--placeholder-line, rgba(255, 255, 255, 0.035)) 11px 12px
          );
        }
        .banner.has-image::before { display: none; }

        .banner-img {
          position: absolute; inset: 0;
          z-index: 1;
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .card:hover .banner-img { transform: scale(1.04); }

        .museum-icon {
          position: relative; z-index: 1;
          width: 44px; height: 44px;
          fill: var(--color-text-muted, #8a8a8a);
          transition: fill 0.4s ease;
        }
        .card:hover .museum-icon { fill: var(--color-accent, #e7edf7); }

        .ph-label {
          position: absolute;
          bottom: 0.85rem; left: 50%;
          transform: translateX(-50%);
          z-index: 2;
          font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 0.68rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #e2e8f0;
          background: rgba(2, 6, 23, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          padding: 0.4rem 0.85rem;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
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
          fill: var(--color-text-muted, #94a3b8);
          flex-shrink: 0;
        }

        .hours {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--color-text-muted, #78716c);
        }
        .hours.is-open { color: var(--color-text, #f0ede8); font-weight: 600; }
        .hours-icon {
          width: 11px; height: 11px;
          fill: currentColor;
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

        .foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
        }

        .info-btn {
          position: relative;
          z-index: 4;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted, #94a3b8);
          background: var(--pill-bg, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
          border-radius: 9999px;
          padding: 0.42rem 0.9rem;
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.3s ease, border-color 0.3s ease, background 0.3s ease;
        }
        .info-btn:hover {
          color: var(--color-text, #f0ede8);
          border-color: var(--pill-hover-border, rgba(255, 255, 255, 0.22));
          background: var(--pill-hover-bg, rgba(255, 255, 255, 0.1));
        }

        .cta {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text, #f0ede8);
          background: var(--pill-bg, rgba(255, 255, 255, 0.08));
          border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.14));
          border-radius: 9999px;
          padding: 0.42rem 0.9rem;
          transition: color 0.3s ease, border-color 0.3s ease, background 0.3s ease;
          white-space: nowrap;
        }
        .card:hover .cta {
          border-color: var(--pill-hover-border, rgba(255, 255, 255, 0.28));
          background: var(--pill-hover-bg, rgba(255, 255, 255, 0.14));
        }
      </style>

      <div class="card">
        <a class="card-link" href="${visitsUrl}" aria-label="${this._escape(name)}"></a>
        <div class="banner ${image ? 'has-image' : ''}">
          ${image
            ? `<img class="banner-img" src="${this._escape(image)}" alt="" loading="lazy">`
            : `<svg class="museum-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                 <path d="M22 11V9L12 2 2 9v2h2v9h5v-5h6v5h5v-9h2z"/>
               </svg>`}
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
          ${todayHours ? `
          <p class="hours ${todayHours.closed ? '' : 'is-open'}">
            <svg class="hours-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.41V6h-2v7.83l5.24 3.15 1.03-1.71L13 12.41z"/>
            </svg>
            ${this._escape(todayHours.label)}
          </p>` : ''}
          <h2>${this._escape(name)}</h2>
          <div class="foot">
            <button class="info-btn" id="info-btn" aria-label="Informazioni su ${this._escape(name)}">Info museo</button>
            <span class="cta">Esplora le visite →</span>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.querySelector('#info-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-museum-info', {
        detail: { id },
        bubbles: true,
        composed: true,
      }));
    });
  }
}

customElements.define('museum-card', MuseumCard);
