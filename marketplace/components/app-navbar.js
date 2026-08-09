class AppNavbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const p = window.location.pathname;
    const isMuseums = p === '/marketplace' || p.endsWith('/marketplace/') || p.endsWith('index.html');
    const isVisits  = p.endsWith('visits.html');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        nav {
          background: #2c3a4a;
          height: 72px;
          padding: 0 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .logo {
          font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
          font-size: 1.3rem;
          font-weight: 400;
          font-style: italic;
          text-decoration: none;
          color: #f0ede8;
          letter-spacing: 0.02em;
        }

        .logo span {
          color: #9e7a46;
          font-style: normal;
        }

        ul {
          list-style: none;
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        a {
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          color: rgba(240, 237, 232, 0.5);
          text-decoration: none;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.4rem 0.9rem;
          transition: color 0.4s ease;
        }

        a:hover { color: #f0ede8; }
        a.active { color: #9e7a46; }

        @media (max-width: 480px) {
          nav { padding: 0 1.5rem; height: 60px; }
          .logo { font-size: 1.1rem; }
          a { font-size: 0.65rem; padding: 0.35rem 0.6rem; }
        }
      </style>
      <nav>
        <a class="logo" href="/marketplace"><span>Art</span>Around</a>
        <ul>
          <li><a href="/marketplace" class="${isMuseums ? 'active' : ''}">Musei</a></li>
          <li><a href="/marketplace/pages/visits.html" class="${isVisits ? 'active' : ''}">Tutte le visite</a></li>
        </ul>
      </nav>
    `;
  }
}

customElements.define('app-navbar', AppNavbar);
