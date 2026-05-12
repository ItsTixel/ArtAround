class AppFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        footer {
          background: #2c3a4a;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding: 2rem 3rem;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          font-size: 0.72rem;
          letter-spacing: 0.05em;
          color: rgba(240, 237, 232, 0.35);
          margin-top: auto;
        }

        .footer-inner {
          max-width: 1360px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .brand {
          font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
          font-style: italic;
          font-weight: 400;
          font-size: 1rem;
          letter-spacing: 0.02em;
          color: #9e7a46;
        }

        @media (max-width: 480px) {
          footer { padding: 1.75rem 1.5rem; }
          .footer-inner { flex-direction: column; text-align: center; gap: 0.75rem; }
        }
      </style>
      <footer>
        <div class="footer-inner">
          <span class="brand">ArtAround</span>
          <span>Esplora i musei e le visite guidate disponibili</span>
          <span>&copy; ${new Date().getFullYear()} ArtAround</span>
        </div>
      </footer>
    `;
  }
}

customElements.define('app-footer', AppFooter);
