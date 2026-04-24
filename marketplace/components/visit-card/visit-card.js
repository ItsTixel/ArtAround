/* ArtAround — Visit Card Web Component */
const TONE_MAP = { childish: 'Infantile', simple: 'Elementare', medium: 'Medio', technical: 'Specialistico' };
const TONE_CLASS = { childish: 'tone-childish', simple: 'tone-simple', medium: 'tone-medium', technical: 'tone-technical' };

class ArtVisitCard extends HTMLElement {
  static get observedAttributes() {
    return ['visit-id','title','museum','city','price','image','alt','duration','tone','item-count','author','rating','review-count','bookmarked'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback()  { this._render(); }
  attributeChangedCallback() { if (this.shadowRoot.innerHTML) this._render(); }

  /* attribute getters */
  get _id()          { return this.getAttribute('visit-id') || ''; }
  get _title()       { return this.getAttribute('title') || 'Visita senza titolo'; }
  get _museum()      { return this.getAttribute('museum') || '—'; }
  get _city()        { return this.getAttribute('city') || ''; }
  get _price()       { return parseFloat(this.getAttribute('price') || '0'); }
  get _image()       { return this.getAttribute('image') || ''; }
  get _alt()         { return this.getAttribute('alt') || `Immagine per ${this._title}`; }
  get _duration()    { return parseInt(this.getAttribute('duration') || '0', 10); }
  get _tone()        { return this.getAttribute('tone') || 'medium'; }
  get _itemCount()   { return this.getAttribute('item-count') || '—'; }
  get _author()      { return this.getAttribute('author') || 'Anonimo'; }
  get _rating()      { return parseFloat(this.getAttribute('rating') || '0'); }
  get _reviews()     { return parseInt(this.getAttribute('review-count') || '0', 10); }
  get _bookmarked()  { return this.hasAttribute('bookmarked'); }

  _formatDuration(sec) {
    if (!sec) return '—';
    const m = Math.ceil(sec / 60);
    return m >= 60 ? `${Math.floor(m/60)}h ${m%60 > 0 ? (m%60)+'min' : ''}`.trim() : `${m} min`;
  }

  _stars(val) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
      const filled = val >= i;
      const half   = !filled && val >= i - 0.5;
      s += `<svg width="13" height="13" viewBox="0 0 24 24" fill="${filled || half ? '#C9A84C' : 'none'}" stroke="#C9A84C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return s;
  }

  _render() {
    const priceLabel = this._price === 0 ? 'Gratuito' : `€${this._price.toFixed(2)}`;
    const priceClass = this._price === 0 ? 'badge-free' : 'badge-paid';
    const toneLabel  = TONE_MAP[this._tone] || 'Medio';
    const toneClass  = TONE_CLASS[this._tone] || 'tone-medium';
    const duration   = this._formatDuration(this._duration);
    const imgSrc     = this._image || `https://picsum.photos/seed/${this._id || 'museum'}/600/340`;
    const hasRating  = this._rating > 0;
    const initials   = (this._author[0] || '?').toUpperCase();

    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: block; }
        ul { list-style: none; }

        .card {
          background: var(--aa-surface, #fff);
          border: 1px solid var(--aa-border, #E0DBD3);
          border-radius: var(--aa-r-lg, 8px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: box-shadow var(--aa-base-t, 250ms), border-color var(--aa-base-t, 250ms), transform var(--aa-fast, 150ms);
          cursor: default;
        }
        .card:hover {
          box-shadow: 0 8px 32px rgba(139,26,26,0.10);
          border-color: var(--aa-primary, #8B1A1A);
          transform: translateY(-2px);
        }
        .card:focus-within { box-shadow: 0 0 0 3px var(--aa-primary-light, rgba(139,26,26,0.12)); }

        /* Image */
        .img-wrap {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: var(--aa-border, #E0DBD3);
          flex-shrink: 0;
        }
        .img-wrap img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
          transition: transform var(--aa-slow, 400ms);
        }
        .card:hover .img-wrap img { transform: scale(1.04); }

        .price-badge {
          position: absolute;
          top: var(--aa-3, 0.75rem);
          right: var(--aa-3, 0.75rem);
          padding: 3px var(--aa-2, 0.5rem);
          border-radius: var(--aa-r-full, 9999px);
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-family: var(--aa-font-sans, sans-serif);
        }
        .badge-free { background: var(--aa-success-bg, #F0FDF4); color: var(--aa-success, #166534); }
        .badge-paid { background: #fff; color: var(--aa-primary, #8B1A1A); }

        /* Body */
        .body {
          padding: var(--aa-5, 1.25rem);
          display: flex;
          flex-direction: column;
          gap: var(--aa-3, 0.75rem);
          flex: 1;
        }

        .title {
          font-family: var(--aa-font-serif, serif);
          font-size: 1.0625rem;
          font-weight: 600;
          color: var(--aa-text, #1A1A1A);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .museum {
          font-size: var(--aa-sm, 0.875rem);
          color: var(--aa-text-muted, #6B6B6B);
          display: flex; align-items: center; gap: 4px;
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--aa-2, 0.5rem);
          font-size: var(--aa-sm, 0.875rem);
          color: var(--aa-text-secondary, #4A4A4A);
        }
        .meta-item { display: flex; align-items: center; gap: 3px; }
        .meta-sep { color: var(--aa-border-strong, #C5BDB4); }

        .tone-chip {
          display: inline-flex; align-items: center;
          padding: 2px var(--aa-2, 0.5rem);
          border-radius: var(--aa-r-full, 9999px);
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          font-family: var(--aa-font-sans, sans-serif);
        }
        .tone-childish  { background: #EFF6FF; color: #1D4ED8; }
        .tone-simple    { background: #F0FDF4; color: #166534; }
        .tone-medium    { background: #FFFBEB; color: #92400E; }
        .tone-technical { background: #F5F3FF; color: #5B21B6; }

        /* Author */
        .author {
          display: flex; align-items: center; gap: var(--aa-2, 0.5rem);
          font-size: var(--aa-sm, 0.875rem);
          color: var(--aa-text-secondary, #4A4A4A);
        }
        .author-av {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: var(--aa-primary-light, rgba(139,26,26,0.08));
          color: var(--aa-primary, #8B1A1A);
          font-size: 0.6875rem;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-family: var(--aa-font-sans, sans-serif);
        }

        /* Rating */
        .rating-row { display: flex; align-items: center; gap: var(--aa-2, 0.5rem); font-size: var(--aa-sm, 0.875rem); color: var(--aa-text-muted, #6B6B6B); }
        .stars { display: flex; align-items: center; gap: 1px; }
        .rating-val { font-weight: 600; color: var(--aa-text, #1A1A1A); }

        /* Footer */
        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--aa-2, 0.5rem);
          padding-top: var(--aa-3, 0.75rem);
          border-top: 1px solid var(--aa-border, #E0DBD3);
          margin-top: auto;
        }

        .btn-see {
          display: inline-flex; align-items: center;
          padding: var(--aa-2, 0.5rem) var(--aa-4, 1rem);
          border: 1.5px solid var(--aa-primary, #8B1A1A);
          border-radius: var(--aa-r-md, 6px);
          color: var(--aa-primary, #8B1A1A);
          font-size: var(--aa-sm, 0.875rem);
          font-weight: 500;
          text-decoration: none;
          transition: background var(--aa-fast, 150ms), color var(--aa-fast, 150ms);
          font-family: var(--aa-font-sans, sans-serif);
          min-height: 36px;
          white-space: nowrap;
        }
        .btn-see:hover { background: var(--aa-primary, #8B1A1A); color: #fff; text-decoration: none; }
        .btn-see:focus-visible { outline: 3px solid var(--aa-primary, #8B1A1A); outline-offset: 3px; border-radius: var(--aa-r-md, 6px); }

        .btn-bookmark {
          background: none;
          border: 1.5px solid var(--aa-border, #E0DBD3);
          border-radius: var(--aa-r-md, 6px);
          cursor: pointer;
          color: var(--aa-text-muted, #6B6B6B);
          display: flex; align-items: center; justify-content: center;
          padding: var(--aa-2, 0.5rem);
          min-width: 36px; min-height: 36px;
          transition: border-color var(--aa-fast, 150ms), color var(--aa-fast, 150ms), background var(--aa-fast, 150ms);
        }
        .btn-bookmark:hover { border-color: var(--aa-primary, #8B1A1A); color: var(--aa-primary, #8B1A1A); }
        .btn-bookmark.saved { background: var(--aa-primary-light, rgba(139,26,26,0.08)); border-color: var(--aa-primary, #8B1A1A); color: var(--aa-primary, #8B1A1A); }
        .btn-bookmark:focus-visible { outline: 3px solid var(--aa-primary, #8B1A1A); outline-offset: 3px; }
      </style>

      <article class="card">
        <div class="img-wrap">
          <img src="${imgSrc}" alt="${this._alt}" loading="lazy">
          <div class="price-badge ${priceClass}" aria-label="Prezzo: ${priceLabel}">${priceLabel}</div>
        </div>
        <div class="body">
          <h3 class="title">${this._title}</h3>
          <p class="museum">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${this._museum}${this._city ? ` · ${this._city}` : ''}
          </p>
          <div class="meta" aria-label="Dettagli visita">
            ${duration !== '—' ? `<span class="meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${duration}</span>` : ''}
            <span class="meta-sep" aria-hidden="true">·</span>
            <span class="tone-chip ${toneClass}">${toneLabel}</span>
            <span class="meta-sep" aria-hidden="true">·</span>
            <span class="meta-item">${this._itemCount} opere</span>
          </div>
          <div class="author">
            <div class="author-av" aria-hidden="true">${initials}</div>
            <span>${this._author}</span>
          </div>
          ${hasRating ? `
          <div class="rating-row" role="img" aria-label="Valutazione: ${this._rating.toFixed(1)} su 5 stelle (${this._reviews} recensioni)">
            <div class="stars" aria-hidden="true">${this._stars(this._rating)}</div>
            <span class="rating-val">${this._rating.toFixed(1)}</span>
            <span>(${this._reviews})</span>
          </div>` : ''}
          <div class="footer">
            <a href="/marketplace/pages/visit-detail.html?id=${this._id}" class="btn-see">Vedi visita</a>
            <button class="btn-bookmark ${this._bookmarked ? 'saved' : ''}"
                    aria-label="${this._bookmarked ? 'Rimuovi dai salvati' : 'Salva visita'}: ${this._title}"
                    aria-pressed="${this._bookmarked}"
                    type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${this._bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
        </div>
      </article>`;

    this.shadowRoot.querySelector('.btn-bookmark').addEventListener('click', e => {
      e.preventDefault();
      const saved = this.hasAttribute('bookmarked');
      if (saved) this.removeAttribute('bookmarked');
      else this.setAttribute('bookmarked', '');
      this.dispatchEvent(new CustomEvent('bookmark-toggle', {
        bubbles: true, composed: true,
        detail: { visitId: this._id, bookmarked: !saved }
      }));
    });
  }
}

customElements.define('art-visit-card', ArtVisitCard);
