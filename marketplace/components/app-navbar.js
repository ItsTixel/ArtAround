import { getCurrentUser, logout } from '/marketplace/js/auth-session.js';
import { getTheme, toggleTheme } from '/marketplace/js/theme.js';
import { GLASS_STRONG, TRANSITION } from '/marketplace/js/ui-tokens.js';

const SUN_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>`;

const NAV_LINK = `px-4 py-3 md:px-3.5 md:py-1.5 rounded-xl md:rounded-full text-sm md:text-[0.7rem] font-medium tracking-[0.06em] md:tracking-[0.1em] uppercase text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 ${TRANSITION} [&.active]:bg-slate-800 [&.active]:text-white dark:[&.active]:bg-white dark:[&.active]:text-slate-900`;

class AppNavbar extends HTMLElement {
  connectedCallback() {
    const p = window.location.pathname;
    const isMuseums = p === '/marketplace' || p.endsWith('/marketplace/') || p.endsWith('index.html');
    const isVisits  = p.endsWith('/visits.html');
    const isProfile  = p.endsWith('profile.html');
    const isLogin    = p.endsWith('login.html');
    const isRegister = p.endsWith('register.html');
    this._isProfile  = isProfile;

    // Login/Registrati devono riportare l'utente da dove è partito (es. la
    // landing page "/", o qualunque altra pagina) invece di scaricarlo
    // sempre sull'home del marketplace: ci si porta dietro il path corrente
    // come redirect (tranne quando si è già su login/register, dove questo
    // parametro lo gestiscono già login.js/register.js leggendolo dall'URL).
    const currentPath = window.location.pathname + window.location.search;
    const redirectQS = (!isLogin && !isRegister) ? `?redirect=${encodeURIComponent(currentPath)}` : '';

    this.className = 'block';
    this.innerHTML = `
      <div class="fixed top-3 inset-x-2 md:inset-x-4 z-[100]">
        <nav class="relative h-16 px-4 md:px-8 flex items-center justify-between gap-4 rounded-2xl text-slate-800 dark:text-slate-100">
          <div class="absolute inset-0 -z-10 ${GLASS_STRONG}"></div>
          <a class="logo relative z-10 shrink-0 text-lg italic tracking-wide" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);" href="/marketplace">
            <span class="not-italic text-slate-500 dark:text-slate-400">Art</span>Around
          </a>

          <div id="nav-collapsible" class="hidden md:flex md:items-center md:gap-8 absolute md:static top-full inset-x-0 md:inset-auto mt-2 md:mt-0 flex-col md:flex-row items-stretch md:items-center gap-1.5 md:gap-8 p-4 md:p-0 max-h-[calc(100vh-6rem)] md:max-h-none overflow-y-auto md:overflow-visible bg-white/90 dark:bg-[#0b1224]/90 backdrop-blur-xl md:bg-transparent md:dark:bg-transparent md:backdrop-blur-none border border-slate-400/20 md:border-0 shadow-2xl md:shadow-none rounded-2xl md:rounded-none">
            <ul id="nav-links" class="flex flex-col md:flex-row items-stretch md:items-center gap-1.5 md:gap-1">
              <li><a href="/marketplace" class="${NAV_LINK} block ${isMuseums ? 'active' : ''}">Musei</a></li>
              <li><a href="/marketplace/pages/visits.html" class="${NAV_LINK} block ${isVisits ? 'active' : ''}">Tutte le visite</a></li>
            </ul>
            <div class="auth-actions flex flex-col md:flex-row items-stretch md:items-center gap-2 pt-3 md:pt-0 mt-2 md:mt-0 border-t md:border-t-0 md:border-l border-slate-400/20 md:pl-6">
              <a href="/marketplace/login.html${redirectQS}" class="btn-login text-center px-4 py-2.5 md:py-1.5 rounded-full text-[0.75rem] md:text-[0.7rem] font-medium tracking-[0.08em] md:tracking-[0.1em] uppercase border border-slate-400/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 hover:border-white/30 ${TRANSITION} ${isLogin ? 'bg-slate-400/10 text-slate-900 dark:text-white' : ''}">Login</a>
              <a href="/marketplace/register.html${redirectQS}" class="btn-register text-center px-4 py-2.5 md:py-1.5 rounded-full text-[0.75rem] md:text-[0.7rem] font-semibold tracking-[0.08em] md:tracking-[0.1em] uppercase bg-slate-800 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 ${TRANSITION} ${isRegister ? 'ring-2 ring-offset-2 ring-offset-transparent ring-slate-800 dark:ring-white' : ''}">Registrati</a>
            </div>
          </div>

          <div class="relative z-10 flex items-center gap-2 shrink-0">
            <button type="button" class="theme-toggle w-9 h-9 rounded-full border border-slate-400/20 flex items-center justify-center hover:bg-white/20 hover:border-white/30 ${TRANSITION}" aria-label="Cambia tema chiaro/scuro" title="Cambia tema"></button>
            <button type="button" class="hamburger md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5" aria-label="Menu" aria-expanded="false">
              <span class="block w-5 h-0.5 bg-current rounded-full ${TRANSITION}"></span>
              <span class="block w-5 h-0.5 bg-current rounded-full ${TRANSITION}"></span>
              <span class="block w-5 h-0.5 bg-current rounded-full ${TRANSITION}"></span>
            </button>
          </div>
        </nav>
      </div>
    `;

    this._loadUser();
    this._setupMenuToggle();
    this._setupThemeToggle();
  }

  _setupThemeToggle() {
    const btn = this.querySelector('.theme-toggle');
    if (!btn) return;
    const paint = () => { btn.innerHTML = getTheme() === 'light' ? MOON_ICON : SUN_ICON; };
    paint();
    btn.addEventListener('click', () => {
      toggleTheme();
      paint();
    });
  }

  _setupMenuToggle() {
    const hamburger = this.querySelector('.hamburger');
    const collapsible = this.querySelector('#nav-collapsible');
    if (!hamburger || !collapsible) return;
    const spans = hamburger.querySelectorAll('span');

    const closeMenu = () => {
      collapsible.classList.remove('flex');
      collapsible.classList.add('hidden');
      document.body.classList.remove('nav-menu-open');
      hamburger.setAttribute('aria-expanded', 'false');
      spans[0].classList.remove('translate-y-2', 'rotate-45');
      spans[1].classList.remove('opacity-0');
      spans[2].classList.remove('-translate-y-2', '-rotate-45');
    };

    hamburger.addEventListener('click', () => {
      const isOpen = collapsible.classList.contains('hidden');
      collapsible.classList.toggle('hidden', !isOpen);
      collapsible.classList.toggle('flex', isOpen);
      document.body.classList.toggle('nav-menu-open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      spans[0].classList.toggle('translate-y-2', isOpen);
      spans[0].classList.toggle('rotate-45', isOpen);
      spans[1].classList.toggle('opacity-0', isOpen);
      spans[2].classList.toggle('-translate-y-2', isOpen);
      spans[2].classList.toggle('-rotate-45', isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!collapsible.classList.contains('hidden') && !e.composedPath().includes(collapsible) && !e.composedPath().includes(hamburger)) {
        closeMenu();
      }
    });

    collapsible.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) closeMenu();
    });
  }

  _buildCreateMenu() {
    const li = document.createElement('li');
    li.className = 'nav-create relative';
    li.innerHTML = `
      <button type="button" class="create-trigger w-full md:w-auto text-left block ${NAV_LINK}" aria-haspopup="true" aria-expanded="false">Crea <span class="create-caret inline-block ${TRANSITION}">&#9662;</span></button>
      <ul class="create-menu hidden flex-col gap-1 md:gap-0.5 md:absolute md:top-[calc(100%+0.625rem)] md:left-1/2 md:-translate-x-1/2 md:min-w-[210px] p-2 bg-white dark:bg-[#0b1224] border border-slate-400/20 shadow-2xl shadow-black/10 dark:shadow-black/40 rounded-2xl md:z-[110]">
        <span class="hidden md:block absolute -top-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-white dark:bg-[#0b1224] border-l border-t border-slate-400/20"></span>
        <li><a href="/marketplace/pages/create-museum.html" class="block px-4 py-3 md:px-3 md:py-2 rounded-lg text-sm md:text-xs tracking-wide text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white ${TRANSITION}">Crea Museo</a></li>
        <li><a href="/marketplace/pages/create-entity.html" class="block px-4 py-3 md:px-3 md:py-2 rounded-lg text-sm md:text-xs tracking-wide text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white ${TRANSITION}">Crea Opera</a></li>
        <li><a href="#" class="disabled flex items-center justify-between gap-2 px-4 py-3 md:px-3 md:py-2 rounded-lg text-sm md:text-xs tracking-wide text-slate-400 dark:text-slate-500 cursor-default">Crea Visita <span class="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-slate-400/20 uppercase">Presto</span></a></li>
        <li><a href="/marketplace/pages/create-item.html" class="block px-4 py-3 md:px-3 md:py-2 rounded-lg text-sm md:text-xs tracking-wide text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white ${TRANSITION}">Crea Descrizione</a></li>
      </ul>
    `;

    const trigger = li.querySelector('.create-trigger');
    const caret = li.querySelector('.create-caret');
    const menu = li.querySelector('.create-menu');
    const closeMenu = () => {
      li.classList.remove('open');
      menu.classList.remove('flex');
      menu.classList.add('hidden');
      caret.classList.remove('rotate-180');
      trigger.setAttribute('aria-expanded', 'false');
    };
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !isOpen);
      menu.classList.toggle('flex', isOpen);
      caret.classList.toggle('rotate-180', isOpen);
      trigger.setAttribute('aria-expanded', String(isOpen));
    });
    li.querySelectorAll('a.disabled').forEach(a => a.addEventListener('click', (e) => e.preventDefault()));
    document.addEventListener('click', (e) => {
      if (!e.composedPath().includes(li)) closeMenu();
    });

    return li;
  }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async _loadUser() {
    const user = await getCurrentUser();
    if (!user) return; // resta lo stato Login/Registrati già renderizzato

    const navLinks = this.querySelector('#nav-links');
    if (navLinks) {
      if (user.role === 'author') navLinks.appendChild(this._buildCreateMenu());

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '/marketplace/pages/profile.html#visite:adopted';
      a.className = `${NAV_LINK} block`;
      a.textContent = 'Le tue visite';
      li.appendChild(a);
      navLinks.appendChild(li);
    }

    const authActions = this.querySelector('.auth-actions');
    if (!authActions) return;

    authActions.innerHTML = `
      <a href="/marketplace/pages/profile.html" class="username block text-center md:text-left px-4 py-2.5 md:px-3 md:py-1.5 rounded-full text-sm md:text-[0.72rem] font-semibold tracking-[0.04em] md:tracking-[0.06em] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 ${TRANSITION} [&.active]:text-slate-900 dark:[&.active]:text-white ${this._isProfile ? 'active' : ''}">&#128100; ${this._esc(user.username)}</a>
      <button type="button" class="btn-logout px-4 py-2.5 md:py-1.5 rounded-full text-sm md:text-[0.7rem] font-medium tracking-[0.06em] md:tracking-[0.1em] uppercase text-slate-600 dark:text-slate-300 border border-transparent hover:border-white/30 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white ${TRANSITION}">Esci</button>
    `;
    authActions.querySelector('.btn-logout').addEventListener('click', async () => {
      await logout();
      window.location.href = '/marketplace';
    });
  }
}

customElements.define('app-navbar', AppNavbar);
