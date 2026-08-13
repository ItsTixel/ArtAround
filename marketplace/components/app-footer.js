class AppFooter extends HTMLElement {
  connectedCallback() {
    this.className = 'block w-full mt-auto';
    this.innerHTML = `
      <footer class="w-full mt-auto bg-slate-400/10 backdrop-blur-lg border-t border-slate-400/20 py-8 px-6 md:px-12 text-xs tracking-wider text-slate-500 dark:text-slate-400 transition-colors duration-300">
        <div class="footer-inner max-w-[1360px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span class="brand font-serif italic text-base text-slate-800 dark:text-slate-200">ArtAround</span>
          <span>Esplora i musei e le visite guidate disponibili</span>
          <span>&copy; ${new Date().getFullYear()} ArtAround</span>
        </div>
      </footer>
    `;
  }
}

customElements.define('app-footer', AppFooter);
