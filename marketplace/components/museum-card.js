class MuseumCard extends HTMLElement {
  static get observedAttributes() {
    return ['museum-id', 'name', 'city', 'country'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.innerHTML) this._render();
  }

  _escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _render() {
    const id = this.getAttribute('museum-id') || '';
    const name = this.getAttribute('name') || '';
    const city = this.getAttribute('city') || '';
    const country = this.getAttribute('country') || '';
    const location = [city, country].filter(Boolean).join(', ');
    const visitsUrl = `/marketplace/pages/visits.html?museum=${encodeURIComponent(id)}&museumName=${encodeURIComponent(name)}`;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }

        .card {
          background: #ffffff;
          border: 1px solid #e8e6e1;
          border-top: 2px solid #9e7a46;
          display: flex;
          flex-direction: column;
          height: 100%;
          cursor: pointer;
          transition: box-shadow 0.4s ease, transform 0.4s ease;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.09);
        }

        .card-banner {
          height: 168px;
          background: #f5f2ec;
          border-bottom: 1px solid #e8e6e1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .museum-icon {
          width: 44px;
          height: 44px;
          fill: #c4b49a;
          transition: fill 0.4s ease;
        }

        .card:hover .museum-icon {
          fill: #9e7a46;
        }

        .card-body {
          padding: 1.5rem 1.75rem 1.75rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        h2 {
          font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
          font-size: 1.1rem;
          font-weight: 600;
          color: #1c1917;
          line-height: 1.4;
          margin-bottom: 0.5rem;
        }

        .location {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.775rem;
          letter-spacing: 0.03em;
          color: #78716c;
          flex: 1;
          padding-bottom: 1.5rem;
        }

        .pin-icon {
          width: 11px;
          height: 11px;
          fill: #9e7a46;
          flex-shrink: 0;
        }

        .btn {
          align-self: flex-start;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #1c1917;
          text-decoration: none;
          padding-bottom: 2px;
          border-bottom: 1px solid #1c1917;
          transition: color 0.4s ease, border-color 0.4s ease;
        }

        .btn:hover {
          color: #9e7a46;
          border-color: #9e7a46;
        }
      </style>

      <article class="card">
        <div class="card-banner">
          <svg class="museum-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M22 11V9L12 2 2 9v2h2v9h5v-5h6v5h5v-9h2z"/>
          </svg>
        </div>
        <div class="card-body">
          <h2>${this._escape(name)}</h2>
          <p class="location">
            <svg class="pin-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
            ${this._escape(location) || '&mdash;'}
          </p>
          <a class="btn" href="${visitsUrl}">Esplora le visite</a>
        </div>
      </article>
    `;

    this.shadowRoot.querySelector('.card').addEventListener('click', (e) => {
      if (!e.target.closest('a')) {
        window.location.href = visitsUrl;
      }
    });
  }
}

customElements.define('museum-card', MuseumCard);
