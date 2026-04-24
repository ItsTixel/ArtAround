/* ArtAround — Modal Web Component */
class ArtModal extends HTMLElement {
  static get observedAttributes() { return ['title', 'size']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._onKey = this._onKey.bind(this);
  }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { if (this.shadowRoot.innerHTML) this._render(); }

  get _title() { return this.getAttribute('title') || ''; }
  get _size()  { return this.getAttribute('size') || 'md'; } /* sm | md | lg */

  _sizeWidth() { return { sm: '400px', md: '560px', lg: '720px' }[this._size] || '560px'; }

  open() {
    const backdrop = this.shadowRoot.querySelector('.backdrop');
    backdrop.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKey);
    const first = this._focusables()[0];
    if (first) setTimeout(() => first.focus(), 50);
    this.dispatchEvent(new CustomEvent('open'));
  }

  close() {
    const backdrop = this.shadowRoot.querySelector('.backdrop');
    backdrop.setAttribute('hidden', '');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this._onKey);
    this.dispatchEvent(new CustomEvent('close'));
  }

  _focusables() {
    return [...this.shadowRoot.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ), ...this.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )];
  }

  _onKey(e) {
    if (e.key === 'Escape') { this.close(); return; }
    if (e.key !== 'Tab') return;
    const els = this._focusables();
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: contents; }

        .backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 8000;
          display: flex; align-items: center; justify-content: center;
          padding: var(--aa-4, 1rem);
          animation: fadeIn 150ms ease both;
        }
        .backdrop[hidden] { display: none; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .dialog {
          background: var(--aa-surface, #fff);
          border-radius: var(--aa-r-xl, 12px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          width: 100%;
          max-width: ${this._sizeWidth()};
          max-height: 90vh;
          display: flex; flex-direction: column;
          animation: slideUp 200ms cubic-bezier(0.4,0,0.2,1) both;
          overflow: hidden;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        .dialog-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--aa-5, 1.25rem) var(--aa-6, 1.5rem);
          border-bottom: 1px solid var(--aa-border, #E0DBD3);
          flex-shrink: 0;
        }
        .dialog-title {
          font-family: var(--aa-font-serif, serif);
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--aa-text, #1A1A1A);
        }
        .close-btn {
          background: none; border: none; cursor: pointer;
          color: var(--aa-text-muted, #6B6B6B);
          padding: var(--aa-2, 0.5rem);
          border-radius: var(--aa-r-md, 6px);
          display: flex;
          min-width: 36px; min-height: 36px;
          align-items: center; justify-content: center;
          transition: background var(--aa-fast, 150ms), color var(--aa-fast, 150ms);
        }
        .close-btn:hover { background: var(--aa-border, #E0DBD3); color: var(--aa-text, #1A1A1A); }
        .close-btn:focus-visible { outline: 3px solid var(--aa-primary, #8B1A1A); outline-offset: 3px; }

        .dialog-body {
          padding: var(--aa-6, 1.5rem);
          overflow-y: auto;
          flex: 1;
        }
      </style>

      <div class="backdrop" hidden role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="dialog">
          <div class="dialog-header">
            <h2 class="dialog-title" id="modal-title">${this._title}</h2>
            <button class="close-btn" id="close-btn" aria-label="Chiudi" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="dialog-body">
            <slot></slot>
          </div>
        </div>
      </div>`;

    this.shadowRoot.querySelector('#close-btn').addEventListener('click', () => this.close());
    this.shadowRoot.querySelector('.backdrop').addEventListener('click', e => {
      if (e.target === this.shadowRoot.querySelector('.backdrop')) this.close();
    });
  }
}

customElements.define('art-modal', ArtModal);
