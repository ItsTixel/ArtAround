/**
 * <visit-card>
 * Card per una visita. Riprende il vocabolario di <museum-card>.
 *
 * Property `data` (preferita agli attributi, supporta l'intero oggetto):
 *   { id, title, description, durationSec, steps, basePrice,
 *     tags[], museumDetails[{id, short, name, city}] }
 */

class VisitCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }

        .card {
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
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          transition: box-shadow 0.4s ease, transform 0.4s ease, border-color 0.4s ease;
        }
        .card:hover {
          transform: translateY(-4px);
          border-color: var(--glass-border-strong, rgba(255, 255, 255, 0.18));
          box-shadow: var(--glass-shadow, 0 16px 40px rgba(0, 0, 0, 0.5)), var(--glow-accent, 0 0 24px rgba(148, 197, 253, 0.16));
        }

        /* ── Banner placeholder ───────────────────────────── */
        .banner {
          position: relative;
          height: 184px;
          background: var(--placeholder-bg, #101010);
          border-bottom: 1px solid var(--color-border, #2a2a2a);
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
            var(--placeholder-line, rgba(255, 255, 255, 0.035)) 11px 12px
          );
        }
        .banner.has-image::before { display: none; }

        .banner-img {
          position: absolute; inset: 0;
          z-index: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .card:hover .banner-img { transform: scale(1.04); }
        .ph-label {
          position: relative; z-index: 1;
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
        }
        .price-tag {
          position: absolute;
          top: 0.85rem; right: 0.85rem;
          z-index: 2;
          font-family: var(--font-sans, 'Nunito Sans', system-ui, sans-serif);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-radius: 9999px;
          padding: 0.35rem 0.7rem;
          background: rgba(2, 6, 23, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #e2e8f0;
        }
        .price-tag.free,
        .price-tag.owned {
          background: var(--color-accent, #e7edf7);
          color: var(--color-on-accent, #0a0f1e);
          border-color: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .infra-badge {
          position: absolute;
          top: 0.85rem; left: 0.85rem;
          z-index: 2;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.62rem;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          border-radius: 9999px;
          padding: 0.35rem 0.7rem;
          background: rgba(2, 6, 23, 0.55);
          color: #e2e8f0;
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* ── Body ─────────────────────────────────────────── */
        .body {
          padding: 1.3rem 1.75rem 1.6rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }

        .museum-line {
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.66rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-text-muted, #94a3b8);
          padding-bottom: 0.7rem;
          border-bottom: 1px solid var(--glass-border, #e8e6e1);
        }

        .meta-top {
          display: flex; align-items: center; gap: 0.55rem;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-text-muted, #78716c);
        }
        .meta-top .sep { width: 12px; height: 1px; background: currentColor; opacity: 0.4; }

        h2 {
          font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--color-text, #1c1917);
          line-height: 1.3;
          margin: 0;
        }

        .desc {
          font-family: var(--font-sans, 'Nunito Sans', system-ui, sans-serif);
          font-size: 0.83rem;
          line-height: 1.55;
          color: var(--color-text-muted, #8a8a8a);
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tags { font-family: var(--font-sans, 'Inter', system-ui, sans-serif); }
        .tag {
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-text-muted, #78716c);
          padding: 0.15rem 0;
        }
        .tag + .tag::before { content: '·'; margin: 0 0.45rem; opacity: 0.5; }

        .foot {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid var(--glass-border, #e8e6e1);
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
        }
        .duration {
          font-size: 0.78rem;
          font-feature-settings: 'tnum';
          color: var(--color-text, #1c1917);
        }
        .duration small {
          display: block;
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-text-muted, #78716c);
          margin-bottom: 0.15rem;
        }
        .cta {
          display: inline-flex;
          align-items: center;
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

      <div class="card" role="button" tabindex="0" aria-label="${this._esc(v.title)}">
        <div class="banner ${v.image ? 'has-image' : ''}">
          ${v.image ? `<img class="banner-img" src="${this._esc(v.image)}" alt="" loading="lazy">` : ''}
          ${isInfra ? '<span class="infra-badge">Inframuseale</span>' : ''}
          <span class="price-tag ${owned ? 'owned' : (isFree ? 'free' : '')}">${owned ? '✓ In tuo possesso' : this._fmtPrice(v.basePrice)}</span>
          <span class="ph-label">${this._esc(placeholderLabel)}</span>
        </div>
        <div class="body">
          ${museumLine ? `<div class="museum-line">${museumLine}</div>` : ''}
          <div class="meta-top">
            ${v.steps ? `<span>${v.steps} tappe</span>` : ''}
          </div>
          <h2>${this._esc(v.title)}</h2>
          <p class="desc">${this._esc(v.description)}</p>
          ${v.tags?.length ? `<div class="tags">${v.tags.slice(0, 3).map(t => `<span class="tag">${this._esc(t)}</span>`).join('')}</div>` : ''}
          <div class="foot">
            <span class="duration"><small>Durata</small>${this._fmtDuration(v.durationSec)}</span>
            <span class="cta">Esplora →</span>
          </div>
        </div>
      </div>
    `;

    const card = this.shadowRoot.querySelector('.card');
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
