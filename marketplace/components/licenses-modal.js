/**
 * <licenses-modal>
 * Overlay con l'elenco delle attribuzioni Creative Commons delle
 * immagini hero (Wikimedia Commons), lette da js/license-data.js.
 *
 * Uso:
 *   document.querySelector('licenses-modal').open();
 */

import { GLASS_MODAL as GLASS, TRANSITION } from '/marketplace/js/ui-tokens.js';
import { trapTabKey, focusDialog } from '/marketplace/js/focus-trap.js';
import { LICENSES } from '/marketplace/js/license-data.js';

class LicensesModal extends HTMLElement {
  constructor() {
    super();
    this._previouslyFocused = null;
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() { this._render(); }

  open() {
    this._previouslyFocused = document.activeElement;
    this.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKeydown);
    this._render();
    focusDialog(this.querySelector('.panel'));
  }

  close() {
    this.removeAttribute('open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this._onKeydown);
    this._render();
    this._previouslyFocused?.focus?.();
    this._previouslyFocused = null;
  }

  _onKeydown(e) {
    if (e.key === 'Escape') { this.close(); return; }
    trapTabKey(e, () => this.querySelector('.panel'));
  }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _linkHtml(label, href) {
    return `<a class="hover:underline break-all" style="color: var(--link-color, #93c5fd);" href="${this._esc(href)}" target="_blank" rel="noopener noreferrer">${this._esc(label)}</a>`;
  }

  _bodyHtml() {
    if (!LICENSES.length) {
      return `<p class="py-16 px-8 text-center text-slate-500 dark:text-slate-400 text-sm">Nessuna attribuzione registrata.</p>`;
    }
    return `
      <div class="pt-7 px-5 sm:px-8 pb-7 sm:pb-8">
        <ul class="flex flex-col gap-4">
          ${LICENSES.map((l) => `
          <li class="text-sm leading-relaxed text-slate-500 dark:text-slate-400 pb-4 border-b border-slate-400/20 last:border-0 last:pb-0">
            "${this._linkHtml(l.title, l.sourceUrl)}"
            di ${this._linkHtml(l.author, l.authorUrl)}
            è concessa in licenza ${this._linkHtml(l.license, l.licenseUrl)}.
          </li>`).join('')}
        </ul>
      </div>
    `;
  }

  _render() {
    const isOpen = this.hasAttribute('open');
    this.className = isOpen ? '' : 'hidden';
    this.innerHTML = isOpen ? `
      <div class="backdrop fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"></div>
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6" style="pointer-events: none;">
        <div class="panel relative w-full max-w-md min-w-0 max-h-[85vh] sm:w-[min(640px,92vw)] sm:max-w-none sm:max-h-[80vh] rounded-2xl overflow-hidden flex flex-col ${GLASS} text-slate-800 dark:text-slate-100" style="pointer-events: auto;" role="dialog" aria-modal="true" aria-label="Licenze">
          <button class="liquid-glass-pill close-btn absolute top-3 right-3 z-10 w-9 h-9 rounded-full border border-slate-400/20 backdrop-blur-lg flex items-center justify-center text-lg leading-none hover:bg-white/20 hover:border-white/30 ${TRANSITION}" aria-label="Chiudi">×</button>
          <div class="body-scroll overflow-y-auto flex-1 min-h-0">
            <div class="pt-7 px-5 sm:px-8">
              <h2 class="text-2xl font-semibold leading-tight text-slate-800 dark:text-slate-100 mb-1" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">Licenze</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-2">Attribuzioni delle immagini da Wikimedia Commons usate nel sito.</p>
            </div>
            ${this._bodyHtml()}
          </div>
        </div>
      </div>
    ` : '';

    if (isOpen) {
      this.querySelector('.backdrop')?.addEventListener('click', () => this.close());
      this.querySelector('.close-btn')?.addEventListener('click', () => this.close());
    }
  }
}

customElements.define('licenses-modal', LicensesModal);
