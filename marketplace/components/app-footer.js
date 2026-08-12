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
          background: var(--nav-bg, rgba(2, 6, 23, 0.7));
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          border-top: 1px solid var(--nav-border, rgba(255, 255, 255, 0.08));
          padding: 2rem 3rem;
          font-family: var(--font-sans, 'Nunito Sans', system-ui, sans-serif);
          font-size: 0.72rem;
          letter-spacing: 0.05em;
          color: var(--color-text-muted, #94a3b8);
          margin-top: auto;
          transition: background-color 0.35s ease, border-color 0.35s ease, color 0.35s ease;
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
          font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);
          font-style: italic;
          font-weight: 400;
          font-size: 1rem;
          letter-spacing: 0.02em;
          color: var(--color-text, #f0ede8);
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
