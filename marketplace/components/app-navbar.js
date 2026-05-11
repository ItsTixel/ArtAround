class AppNavbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const currentPath = window.location.pathname;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        nav {
          background: #2d3250;
          height: 64px;
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .logo {
          font-size: 1.4rem;
          font-weight: 800;
          text-decoration: none;
          color: #c9a227;
          letter-spacing: -0.5px;
        }

        .logo span {
          color: white;
          font-weight: 400;
        }

        ul {
          list-style: none;
          display: flex;
          gap: 0.25rem;
        }

        a {
          color: rgba(255, 255, 255, 0.75);
          text-decoration: none;
          font-size: 0.9rem;
          padding: 0.4rem 0.85rem;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }

        a:hover {
          color: white;
          background: rgba(255, 255, 255, 0.08);
        }

        a.active {
          color: #c9a227;
        }

        @media (max-width: 480px) {
          nav { padding: 0 1rem; height: 56px; }
          .logo { font-size: 1.2rem; }
          a { font-size: 0.8rem; padding: 0.35rem 0.6rem; }
        }
      </style>
      <nav>
        <a class="logo" href="/marketplace">Art<span>Around</span></a>
        <ul>
          <li><a href="/marketplace" class="${currentPath === '/marketplace' || currentPath.endsWith('index.html') ? 'active' : ''}">Musei</a></li>
          <li><a href="/marketplace/pages/visits.html" class="${currentPath.endsWith('visits.html') ? 'active' : ''}">Tutte le visite</a></li>
        </ul>
      </nav>
    `;
  }
}

customElements.define('app-navbar', AppNavbar);
