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
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.13);
        }

        .card-banner {
          height: 148px;
          background: linear-gradient(135deg, #2d3250 0%, #424769 60%, #2d3250 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .card-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 20px,
            rgba(255,255,255,0.02) 20px,
            rgba(255,255,255,0.02) 40px
          );
        }

        .museum-icon {
          width: 56px;
          height: 56px;
          fill: rgba(255, 255, 255, 0.25);
          position: relative;
          z-index: 1;
        }

        .card-body {
          padding: 1.2rem 1.25rem 1.25rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        h2 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.35;
          margin-bottom: 0.5rem;
        }

        .location {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          color: #777;
          font-size: 0.875rem;
          margin-bottom: 1.1rem;
          flex: 1;
        }

        .pin-icon {
          width: 13px;
          height: 13px;
          fill: #c9a227;
          flex-shrink: 0;
        }

        .btn {
          display: block;
          text-align: center;
          background: #2d3250;
          color: white;
          text-decoration: none;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .btn:hover {
          background: #c9a227;
          color: #1a1a1a;
        }
      </style>

      <article class="card">
        <div class="card-banner">
          <svg class="museum-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11V9L12 2 2 9v2h2v9h5v-5h6v5h5v-9h2z"/>
          </svg>
        </div>
        <div class="card-body">
          <h2>${this._escape(name)}</h2>
          <p class="location">
            <svg class="pin-icon" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
            ${this._escape(location) || '&mdash;'}
          </p>
          <a class="btn" href="${visitsUrl}">Vedi visite &rarr;</a>
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
