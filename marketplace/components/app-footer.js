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
          background: #2d3250;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
          padding: 1.5rem 2rem;
          font-size: 0.85rem;
          margin-top: auto;
        }

        .footer-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .brand {
          font-weight: 700;
          color: #c9a227;
          font-size: 0.95rem;
        }

        @media (max-width: 480px) {
          .footer-inner { flex-direction: column; text-align: center; }
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
