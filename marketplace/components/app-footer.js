import '/marketplace/components/licenses-modal.js';

class AppFooter extends HTMLElement {
  connectedCallback() {
    this.className = 'block w-full mt-auto';
    this.innerHTML = `
      <footer class="liquid-glass w-full mt-auto backdrop-blur-lg border-t border-slate-400/20 py-8 px-6 md:px-12 text-xs tracking-wider text-slate-500 dark:text-slate-400 transition-colors duration-300">
        <div class="footer-inner max-w-[1360px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span class="brand font-serif italic text-base text-slate-800 dark:text-slate-200">ArtAround</span>
          <span>Esplora i musei e le visite guidate disponibili</span>
          <div class="flex items-center gap-4">
            <button type="button" id="licenses-btn" class="hover:underline cursor-pointer bg-transparent border-0 p-0 text-xs tracking-wider text-slate-500 dark:text-slate-400">Licenze</button>
            <span>&copy; ${new Date().getFullYear()} ArtAround</span>
          </div>
        </div>
      </footer>
    `;

    if (!document.querySelector('licenses-modal')) {
      document.body.appendChild(document.createElement('licenses-modal'));
    }
    this.querySelector('#licenses-btn')?.addEventListener('click', () => {
      document.querySelector('licenses-modal')?.open();
    });
  }
}

customElements.define('app-footer', AppFooter);
