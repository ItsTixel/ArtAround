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
  get _size()  { return this.getAttribute('size') || 'md'; }

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
      <link rel="stylesheet" href="/marketplace/components/modal/modal.css">

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
