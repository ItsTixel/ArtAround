/* ArtAround — Navbar Web Component */
class ArtNavbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._open = false;
  }

  connectedCallback() {
    this._render();
    this._setup();
  }

  /* ── Helpers ── */
  _user() {
    try { return JSON.parse(localStorage.getItem('artaround_user') || 'null'); } catch { return null; }
  }

  _activePage() {
    const p = window.location.pathname;
    if (p.includes('login'))        return 'login';
    if (p.includes('profile'))      return 'visite';
    if (p.includes('create-item') || p.includes('dashboard')) return 'crea';
    return 'esplora';
  }

  _navItems() {
    const active = this._activePage();
    const items = [
      { id: 'esplora',    label: 'Esplora',          href: '/marketplace/pages/index.html' },
      { id: 'visite',     label: 'Le mie visite',    href: '/marketplace/pages/profile.html' },
      { id: 'crea',       label: 'Crea contenuto',   href: '/marketplace/pages/dashboard.html' },
    ];
    return items.map(i => `
      <li>
        <a href="${i.href}" class="nav-link${active === i.id ? ' active' : ''}"
           ${active === i.id ? 'aria-current="page"' : ''}>
          ${i.label}
        </a>
      </li>`).join('');
  }

  _userSection(u) {
    if (!u) {
      return `<a href="/marketplace/pages/login.html" class="btn-login">Accedi</a>`;
    }
    const initials = (u.username || u.email || '?')[0].toUpperCase();
    return `
      <div class="user-menu">
        <button class="user-btn" aria-haspopup="true" aria-expanded="false" id="user-btn" type="button">
          <span class="avatar" aria-hidden="true">${initials}</span>
          <span class="user-name">${u.username || u.email}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <ul class="user-dropdown" role="menu" id="user-dropdown" aria-labelledby="user-btn">
          <li role="menuitem"><a href="/marketplace/pages/profile.html">Il mio profilo</a></li>
          ${u.role === 'author' ? '<li role="menuitem"><a href="/marketplace/pages/dashboard.html">Dashboard autore</a></li>' : ''}
          <li role="separator" aria-hidden="true"></li>
          <li role="menuitem"><button class="logout-btn" type="button">Esci</button></li>
        </ul>
      </div>`;
  }

  _render() {
    const u = this._user();
    const active = this._activePage();
    const mobileNavItems = [
      { id: 'esplora',    label: 'Esplora',          href: '/marketplace/pages/index.html',     icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
      { id: 'visite',     label: 'Le mie visite',    href: '/marketplace/pages/profile.html',   icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' },
      { id: 'crea',       label: 'Crea contenuto',   href: '/marketplace/pages/dashboard.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' },
    ];

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/marketplace/components/navbar/navbar.css">
      <header>
        <div class="inner">
          <a href="/marketplace/pages/index.html" class="logo" aria-label="ArtAround — Torna alla home">
            <div class="logo-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v13M7 11l5-3 5 3"/></svg>
            </div>
            <span class="logo-word">ArtAround</span>
          </a>

          <ul class="nav-links" role="list">${this._navItems()}</ul>

          <div class="nav-actions">
            <button class="icon-btn lang-btn" aria-label="Lingua: Italiano. Cambia lingua" type="button">IT</button>
            <button class="icon-btn notif-btn" aria-label="Notifiche" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
            ${this._userSection(u)}
          </div>

          <button class="hamburger-btn" aria-label="Apri menu di navigazione" aria-expanded="false" aria-controls="mobile-drawer" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </header>

      <div class="mobile-drawer" id="mobile-drawer" role="dialog" aria-label="Menu di navigazione" aria-modal="true" hidden>
        <div class="drawer-backdrop" id="drawer-backdrop"></div>
        <div class="drawer-panel">
          <div class="drawer-header">
            <a href="/marketplace/pages/index.html" class="logo" aria-label="ArtAround">
              <div class="logo-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v13M7 11l5-3 5 3"/></svg>
              </div>
              <span class="logo-word">ArtAround</span>
            </a>
            <button class="drawer-close" id="drawer-close" aria-label="Chiudi menu" type="button">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <ul class="drawer-nav" role="list">
            ${mobileNavItems.map(i => `
              <li>
                <a href="${i.href}" class="${active === i.id ? 'active' : ''}" ${active === i.id ? 'aria-current="page"' : ''}>
                  ${i.icon} ${i.label}
                </a>
              </li>`).join('')}
            ${u ? `
              <hr class="drawer-divider" aria-hidden="true">
              <li><a href="/marketplace/pages/profile.html">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profilo
              </a></li>
              ${u.role === 'author' ? '<li><a href="/marketplace/pages/dashboard.html"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></rect></svg> Dashboard</a></li>' : ''}
              <li><button class="mobile-logout" type="button" style="color:var(--aa-error,#B91C1C)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Esci
              </button></li>` : `
              <hr class="drawer-divider" aria-hidden="true">
              <li><a href="/marketplace/pages/login.html" style="color:var(--aa-primary,#8B1A1A);font-weight:600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Accedi
              </a></li>`}
          </ul>
          ${u ? `<div class="drawer-user"><strong>${u.username || u.email}</strong>${u.role === 'author' ? 'Autore' : 'Visitatore'}</div>` : ''}
        </div>
      </div>`;
  }

  _setup() {
    const sr = this.shadowRoot;
    const hamburger = sr.querySelector('.hamburger-btn');
    const drawer    = sr.querySelector('.mobile-drawer');
    const closeBtn  = sr.querySelector('#drawer-close');
    const backdrop  = sr.querySelector('#drawer-backdrop');
    const userBtn   = sr.querySelector('#user-btn');
    const dropdown  = sr.querySelector('#user-dropdown');

    const openDrawer = () => {
      drawer.removeAttribute('hidden');
      drawer.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      closeBtn && closeBtn.focus();
    };
    const closeDrawer = () => {
      drawer.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      setTimeout(() => drawer.setAttribute('hidden', ''), 300);
      hamburger && hamburger.focus();
    };

    hamburger && hamburger.addEventListener('click', openDrawer);
    closeBtn  && closeBtn.addEventListener('click', closeDrawer);
    backdrop  && backdrop.addEventListener('click', closeDrawer);

    sr.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (drawer && !drawer.hasAttribute('hidden')) closeDrawer();
        if (dropdown && !dropdown.hasAttribute('hidden')) closeDropdown();
      }
    });

    const closeDropdown = () => {
      if (!dropdown) return;
      dropdown.setAttribute('hidden', '');
      userBtn && userBtn.setAttribute('aria-expanded', 'false');
    };

    if (userBtn && dropdown) {
      userBtn.addEventListener('click', () => {
        const expanded = userBtn.getAttribute('aria-expanded') === 'true';
        if (expanded) { closeDropdown(); }
        else {
          dropdown.removeAttribute('hidden');
          userBtn.setAttribute('aria-expanded', 'true');
          dropdown.querySelector('a, button') && dropdown.querySelector('a, button').focus();
        }
      });
      document.addEventListener('click', e => {
        if (!this.shadowRoot.contains(e.target)) closeDropdown();
      });
    }

    const logoutBtns = sr.querySelectorAll('.logout-btn, .mobile-logout');
    logoutBtns.forEach(btn => btn.addEventListener('click', () => {
      localStorage.removeItem('artaround_user');
      window.location.href = '/marketplace/pages/login.html';
    }));
  }
}

customElements.define('art-navbar', ArtNavbar);
