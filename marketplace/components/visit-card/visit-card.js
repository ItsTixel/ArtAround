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
      <link rel="stylesheet" href="/marketplace/components/visit-card/visit-card.css">

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
