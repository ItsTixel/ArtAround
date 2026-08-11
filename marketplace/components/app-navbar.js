import { getCurrentUser, logout } from '/marketplace/js/auth-session.js';

class AppNavbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const p = window.location.pathname;
    const isMuseums = p === '/marketplace' || p.endsWith('/marketplace/') || p.endsWith('index.html');
    const isVisits  = p.endsWith('visits.html');
    const isLogin    = p.endsWith('login.html');
    const isRegister = p.endsWith('register.html');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        nav {
          background: #0a0a0a;
          height: 72px;
          padding: 0 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          /* Forza un compositing layer proprio: su iOS/Android evita che
             l'header resti agganciato al rimbalzo elastico del contenuto. */
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
          will-change: transform;
        }

        .logo {
          font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);
          font-size: 1.3rem;
          font-weight: 400;
          font-style: italic;
          text-decoration: none;
          color: #f0ede8;
          letter-spacing: 0.02em;
        }

        .logo span {
          color: #d4a853;
          font-style: normal;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 1.75rem;
        }

        ul {
          list-style: none;
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        a {
          font-family: var(--font-sans, 'Nunito Sans', system-ui, sans-serif);
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
        a.active { color: #d4a853; }

        .auth-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding-left: 1.5rem;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
        }

        .auth-actions a {
          padding: 0.45rem 1.1rem;
          border-radius: 3px;
          border: 1px solid transparent;
        }

        .btn-login {
          color: rgba(240, 237, 232, 0.7) !important;
          border-color: rgba(240, 237, 232, 0.25) !important;
        }
        .btn-login:hover {
          color: #f0ede8 !important;
          border-color: rgba(240, 237, 232, 0.6) !important;
        }
        .btn-login.active {
          color: #d4a853 !important;
          border-color: #d4a853 !important;
        }

        .btn-register {
          color: #0a0a0a !important;
          background: #d4a853;
        }
        .btn-register:hover { background: #c49440; }
        .btn-register.active { background: #c49440; }

        .user-actions {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }

        .username {
          font-family: var(--font-sans, 'Nunito Sans', system-ui, sans-serif);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: #d4a853;
        }

        .username::before { content: '👤 '; }

        .btn-logout {
          background: transparent;
          border: 1px solid transparent;
          color: rgba(240, 237, 232, 0.5);
          font-family: var(--font-sans, 'Nunito Sans', system-ui, sans-serif);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.45rem 0.9rem;
          cursor: pointer;
          transition: color 0.4s ease, border-color 0.4s ease;
        }
        .btn-logout:hover {
          color: #f0ede8;
          border-color: rgba(240, 237, 232, 0.25);
        }

        @media (max-width: 640px) {
          .auth-actions { padding-left: 0.75rem; gap: 0.4rem; }
          .auth-actions a { padding: 0.4rem 0.7rem; }
        }

        @media (max-width: 480px) {
          nav { padding: 0 1.5rem; height: 60px; }
          .logo { font-size: 1.1rem; }
          a { font-size: 0.65rem; padding: 0.35rem 0.6rem; }
          .nav-right { gap: 0.9rem; }
          .username { display: none; }
        }
      </style>
      <nav>
        <a class="logo" href="/marketplace"><span>Art</span>Around</a>
        <div class="nav-right">
          <ul>
            <li><a href="/marketplace" class="${isMuseums ? 'active' : ''}">Musei</a></li>
            <li><a href="/marketplace/pages/visits.html" class="${isVisits ? 'active' : ''}">Tutte le visite</a></li>
          </ul>
          <div class="auth-actions">
            <a href="/marketplace/login.html" class="btn-login ${isLogin ? 'active' : ''}">Login</a>
            <a href="/marketplace/register.html" class="btn-register ${isRegister ? 'active' : ''}">Registrati</a>
          </div>
        </div>
      </nav>
    `;

    this._loadUser();
  }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async _loadUser() {
    const user = await getCurrentUser();
    if (!user) return; // resta lo stato Login/Registrati già renderizzato

    const authActions = this.shadowRoot.querySelector('.auth-actions');
    if (!authActions) return;

    authActions.className = 'user-actions';
    authActions.innerHTML = `
      <span class="username">${this._esc(user.username)}</span>
      <button type="button" class="btn-logout">Esci</button>
    `;
    authActions.querySelector('.btn-logout').addEventListener('click', async () => {
      await logout();
      window.location.href = '/marketplace';
    });
  }
}

customElements.define('app-navbar', AppNavbar);
