import { getCurrentUser, logout } from '/marketplace/js/auth-session.js';

class AppNavbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const p = window.location.pathname;
    const isMuseums = p === '/marketplace' || p.endsWith('/marketplace/') || p.endsWith('index.html');
    const isVisits  = p.endsWith('/visits.html');
    const isMyVisits = p.endsWith('my-visits.html');
    const isLogin    = p.endsWith('login.html');
    const isRegister = p.endsWith('register.html');
    this._isMyVisits = isMyVisits;

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

        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 34px;
          height: 34px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          z-index: 101;
        }

        .hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: #f0ede8;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        @media (max-width: 768px) {
          nav { justify-content: flex-end; position: relative; }
          .hamburger { display: flex; }

          .logo {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }

          .nav-right {
            position: fixed;
            top: 72px; left: 0; right: 0;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            background: #0a0a0a;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.35s ease;
          }

          .nav-right.open { max-height: calc(100vh - 72px); overflow-y: auto; }

          ul { flex-direction: column; align-items: stretch; width: 100%; gap: 0; padding: 0.5rem 0; }
          li { width: 100%; }
          a { display: block; padding: 1rem 1.5rem; }

          .auth-actions, .user-actions {
            flex-direction: column;
            align-items: stretch;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding: 1rem 1.5rem;
            gap: 0.6rem;
          }

          .auth-actions a { text-align: center; padding: 0.75rem 1.1rem; }
          .username { padding: 0.4rem 0; }
          .btn-logout {
            width: 100%;
            text-align: center;
            padding: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.15);
          }
        }

        @media (max-width: 480px) {
          nav { padding: 0 1.5rem; height: 60px; }
          .logo { font-size: 1.1rem; }
          .nav-right { top: 60px; }
          .hamburger { width: 30px; height: 30px; }
        }
      </style>
      <nav>
        <a class="logo" href="/marketplace"><span>Art</span>Around</a>
        <div class="nav-right">
          <ul id="nav-links">
            <li><a href="/marketplace" class="${isMuseums ? 'active' : ''}">Musei</a></li>
            <li><a href="/marketplace/pages/visits.html" class="${isVisits ? 'active' : ''}">Tutte le visite</a></li>
          </ul>
          <div class="auth-actions">
            <a href="/marketplace/login.html" class="btn-login ${isLogin ? 'active' : ''}">Login</a>
            <a href="/marketplace/register.html" class="btn-register ${isRegister ? 'active' : ''}">Registrati</a>
          </div>
        </div>
        <button type="button" class="hamburger" aria-label="Menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </nav>
    `;

    this._loadUser();
    this._setupMenuToggle();
  }

  _setupMenuToggle() {
    const hamburger = this.shadowRoot.querySelector('.hamburger');
    const navRight = this.shadowRoot.querySelector('.nav-right');
    if (!hamburger || !navRight) return;

    const closeMenu = () => {
      hamburger.classList.remove('open');
      navRight.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    };

    hamburger.addEventListener('click', () => {
      const isOpen = navRight.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    navRight.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) closeMenu();
    });
  }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async _loadUser() {
    const user = await getCurrentUser();
    if (!user) return; // resta lo stato Login/Registrati già renderizzato

    const navLinks = this.shadowRoot.querySelector('#nav-links');
    if (navLinks) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '/marketplace/pages/my-visits.html';
      a.textContent = 'Le tue visite';
      if (this._isMyVisits) a.classList.add('active');
      li.appendChild(a);
      navLinks.appendChild(li);
    }

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
