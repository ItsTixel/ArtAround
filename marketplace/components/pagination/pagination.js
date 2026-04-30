/* ArtAround — Pagination Web Component */
class ArtPagination extends HTMLElement {
  static get observedAttributes() { return ['current', 'total', 'per-page']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback()  { this._render(); }
  attributeChangedCallback() { if (this.shadowRoot.innerHTML) this._render(); }

  get _current()  { return parseInt(this.getAttribute('current') || '0', 10); }
  get _total()    { return parseInt(this.getAttribute('total') || '0', 10); }
  get _perPage()  { return parseInt(this.getAttribute('per-page') || '10', 10); }

  get _totalPages() { return Math.ceil(this._total / this._perPage); }

  _pages() {
    const cur = this._current, tp = this._totalPages;
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i);
    const pages = [];
    pages.push(0);
    if (cur > 2) pages.push('…');
    for (let i = Math.max(1, cur - 1); i <= Math.min(tp - 2, cur + 1); i++) pages.push(i);
    if (cur < tp - 3) pages.push('…');
    pages.push(tp - 1);
    return pages;
  }

  _go(page) {
    if (page < 0 || page >= this._totalPages) return;
    this.setAttribute('current', String(page));
    this.dispatchEvent(new CustomEvent('page-change', { bubbles: true, composed: true, detail: { page } }));
  }

  _render() {
    const cur = this._current, tp = this._totalPages;
    if (tp <= 1) { this.shadowRoot.innerHTML = ''; return; }

    const pages = this._pages();

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/marketplace/components/pagination/pagination.css">
      <nav aria-label="Paginazione risultati">
        <button id="prev" aria-label="Pagina precedente" ${cur === 0 ? 'disabled' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        ${pages.map(p => p === '…'
          ? `<span class="ellipsis" aria-hidden="true">…</span>`
          : `<button ${p === cur ? 'aria-current="page"' : ''} data-page="${p}" aria-label="Pagina ${p + 1}">${p + 1}</button>`
        ).join('')}
        <button id="next" aria-label="Pagina successiva" ${cur >= tp - 1 ? 'disabled' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </nav>`;

    this.shadowRoot.querySelector('#prev').addEventListener('click', () => this._go(cur - 1));
    this.shadowRoot.querySelector('#next').addEventListener('click', () => this._go(cur + 1));
    this.shadowRoot.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => this._go(parseInt(btn.dataset.page, 10)));
    });
  }
}

customElements.define('art-pagination', ArtPagination);
