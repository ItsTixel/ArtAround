/* ArtAround — Footer Web Component */
class ArtFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: block; }
        ul { list-style: none; }
        a { text-decoration: none; }

        footer {
          background: var(--aa-footer-bg, #160808);
          color: rgba(255,255,255,0.75);
          padding: var(--aa-16, 4rem) 0 var(--aa-8, 2rem);
          font-family: var(--aa-font-sans, sans-serif);
          font-size: var(--aa-sm, 0.875rem);
        }

        .inner {
          max-width: var(--aa-max-w, 1280px);
          margin-inline: auto;
          padding-inline: var(--aa-8, 2rem);
        }

        .grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: var(--aa-16, 4rem);
          padding-bottom: var(--aa-12, 3rem);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .brand { display: flex; flex-direction: column; gap: var(--aa-4, 1rem); }
        .logo {
          display: flex; align-items: center; gap: var(--aa-2, 0.5rem);
          text-decoration: none;
        }
        .logo-icon {
          width: 32px; height: 32px;
          background: var(--aa-primary, #8B1A1A);
          border-radius: 5px;
          display: flex; align-items: center; justify-content: center;
        }
        .logo-word {
          font-family: var(--aa-font-serif, serif);
          font-size: 1.125rem;
          font-weight: 700;
          color: #fff;
        }
        .brand-desc {
          line-height: 1.7;
          max-width: 320px;
          color: rgba(255,255,255,0.6);
        }
        .brand-tagline {
          font-family: var(--aa-font-serif, serif);
          font-style: italic;
          color: var(--aa-gold, #C9A84C);
          font-size: var(--aa-base, 1rem);
        }

        .col-title {
          font-family: var(--aa-font-sans, sans-serif);
          font-size: var(--aa-xs, 0.75rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.45);
          margin-bottom: var(--aa-5, 1.25rem);
        }
        .col-links { display: flex; flex-direction: column; gap: var(--aa-3, 0.75rem); }
        .col-links a {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          transition: color 150ms;
          line-height: 1.5;
        }
        .col-links a:hover { color: #fff; }
        .col-links a:focus-visible {
          outline: 2px solid var(--aa-gold, #C9A84C);
          outline-offset: 3px;
          border-radius: 3px;
        }

        .contact-item {
          display: flex; align-items: center; gap: var(--aa-2, 0.5rem);
          color: rgba(255,255,255,0.7);
          margin-bottom: var(--aa-3, 0.75rem);
        }
        .contact-item svg { flex-shrink: 0; opacity: 0.6; }

        .bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: var(--aa-6, 1.5rem);
          gap: var(--aa-4, 1rem);
          flex-wrap: wrap;
          color: rgba(255,255,255,0.4);
          font-size: var(--aa-xs, 0.75rem);
        }
        .bottom-links { display: flex; gap: var(--aa-6, 1.5rem); }
        .bottom-links a {
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: color 150ms;
        }
        .bottom-links a:hover { color: rgba(255,255,255,0.85); }
        .bottom-links a:focus-visible { outline: 2px solid var(--aa-gold, #C9A84C); outline-offset: 3px; border-radius: 3px; }

        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
            gap: var(--aa-8, 2rem);
          }
          .inner { padding-inline: var(--aa-4, 1rem); }
          .bottom { flex-direction: column; align-items: flex-start; }
        }
      </style>
      <footer>
        <div class="inner">
          <div class="grid">
            <div class="brand">
              <a href="/marketplace/pages/index.html" class="logo" aria-label="ArtAround — Home">
                <div class="logo-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v13M7 11l5-3 5 3"/></svg>
                </div>
                <span class="logo-word">ArtAround</span>
              </a>
              <p class="brand-tagline">"Scopri i musei come non hai mai fatto"</p>
              <p class="brand-desc">ArtAround è la piattaforma marketplace dedicata alle visite guidate multimediali per musei. Esplora, adotta e crea esperienze culturali uniche.</p>
            </div>

            <nav aria-label="Link utili">
              <p class="col-title">Piattaforma</p>
              <ul class="col-links">
                <li><a href="/marketplace/pages/index.html">Esplora le visite</a></li>
                <li><a href="/marketplace/pages/login.html">Accedi o registrati</a></li>
                <li><a href="/marketplace/pages/create-item.html">Crea un item</a></li>
                <li><a href="/marketplace/pages/dashboard.html">Dashboard autore</a></li>
              </ul>
            </nav>

            <div>
              <p class="col-title">Contatti &amp; Supporto</p>
              <div class="contact-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>info@artaround.it</span>
              </div>
              <div class="contact-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Via Roma 42, 00100 Roma</span>
              </div>
              <ul class="col-links" style="margin-top:1rem">
                <li><a href="#">Centro assistenza</a></li>
                <li><a href="#">Linee guida contenuti</a></li>
                <li><a href="#">Diventa autore</a></li>
              </ul>
            </div>
          </div>

          <div class="bottom">
            <span>© ${new Date().getFullYear()} ArtAround. Tutti i diritti riservati.</span>
            <div class="bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Termini di servizio</a>
              <a href="#">Dichiarazione di accessibilità</a>
            </div>
          </div>
        </div>
      </footer>`;
  }
}

customElements.define('art-footer', ArtFooter);
