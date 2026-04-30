/* ArtAround — Footer Web Component */
class ArtFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/marketplace/components/footer/footer.css">
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
