/**
 * <visit-modal>
 * Overlay in sovraimpressione con i dettagli di una visita: informazioni
 * generali, lista delle opere contenute e tasto "Aggiungi" per acquistarla.
 *
 * Uso:
 *   document.querySelector('visit-modal').open(visitId);
 *
 * Non naviga mai a una nuova pagina: fa fetch di GET /api/visits/:id e
 * mostra tutto in sovraimpressione sopra la pagina corrente.
 */

const API_VISITS = '/api/visits';
const API_USERS  = '/api/users';

/* ---- Utente "loggato" simulato (non esiste ancora un vero login) ----
 * Viene scelto un utente visitor dal backend e il suo id viene tenuto
 * in localStorage, così la libreria (adopted_visits) resta coerente
 * tra un caricamento e l'altro della pagina. */
let _sessionUserPromise = null;
function getSessionUserId() {
  if (_sessionUserPromise) return _sessionUserPromise;
  _sessionUserPromise = (async () => {
    const stored = localStorage.getItem('artaround_user_id');
    if (stored) return stored;
    try {
      const res = await fetch(`${API_USERS}?pageSize=100`);
      const { data } = await res.json();
      const visitor = (data || []).find(u => u.role === 'visitor') || (data || [])[0];
      if (visitor) {
        localStorage.setItem('artaround_user_id', visitor._id);
        return visitor._id;
      }
    } catch (e) {
      console.error('Impossibile determinare un utente di sessione:', e);
    }
    return null;
  })();
  return _sessionUserPromise;
}

class VisitModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._visit = null;
    this._userId = null;
    this._owned = false;
    this._loading = false;
    this._error = null;
    this._confirm = false;
    this._adding = false;
    this._purchaseError = null;
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() { this._render(); }

  async open(visitId) {
    this._visit = null;
    this._loading = true;
    this._error = null;
    this._confirm = false;
    this._adding = false;
    this._purchaseError = null;

    this.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKeydown);
    this._render();

    try {
      const [visitRes, userId] = await Promise.all([
        fetch(`${API_VISITS}/${visitId}`),
        getSessionUserId(),
      ]);
      if (!visitRes.ok) throw new Error(`HTTP ${visitRes.status}`);
      this._visit = await visitRes.json();
      this._userId = userId;
      this._owned = await this._checkOwned(visitId, userId);
    } catch (e) {
      console.error('Errore nel caricamento della visita:', e);
      this._error = 'Errore nel caricamento della visita. Riprova più tardi.';
    } finally {
      this._loading = false;
      this._render();
    }
  }

  close() {
    this.removeAttribute('open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this._onKeydown);
  }

  _onKeydown(e) {
    if (e.key === 'Escape') this.close();
  }

  async _checkOwned(visitId, userId) {
    if (!userId) return false;
    try {
      const res = await fetch(`${API_USERS}/${userId}`);
      if (!res.ok) return false;
      const user = await res.json();
      return (user.adopted_visits || []).some(id => String(id) === String(visitId));
    } catch {
      return false;
    }
  }

  async _addToLibrary() {
    if (this._adding || this._owned) return;
    if (!this._userId) {
      this._purchaseError = 'Impossibile determinare l\'utente. Riprova più tardi.';
      this._renderFooter();
      return;
    }
    this._adding = true;
    this._purchaseError = null;
    this._renderFooter();
    try {
      const res = await fetch(`${API_USERS}/${this._userId}/adopt/${this._visit._id}`, { method: 'PUT' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._owned = true;
      this._confirm = false;
    } catch (e) {
      console.error('Errore durante l\'aggiunta alla libreria:', e);
      this._purchaseError = 'Errore durante l\'acquisto. Riprova.';
    } finally {
      this._adding = false;
      this._renderFooter();
    }
  }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _fmtDuration(sec) {
    if (!sec) return '—';
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60); const r = m % 60;
    return r ? `${h}h ${r}min` : `${h}h`;
  }

  _fmtPrice(p) {
    if (!p) return 'Gratis';
    return `€ ${(+p).toFixed(2).replace('.', ',')}`;
  }

  /* ---- Footer: unica parte che cambia in base allo stato d'acquisto ---- */
  _footerHtml() {
    const v = this._visit;
    const price = v.base_price || 0;
    const isFree = !price;

    let action;
    if (this._owned) {
      action = `<button class="btn owned" disabled>✓ Già in libreria</button>`;
    } else if (this._confirm) {
      action = `
        <div class="confirm">
          <span class="confirm-text">Sei sicuro di voler comprare questa visita?</span>
          <div class="confirm-actions">
            <button class="btn ghost" id="confirm-no" ${this._adding ? 'disabled' : ''}>Annulla</button>
            <button class="btn primary" id="confirm-yes" ${this._adding ? 'disabled' : ''}>${this._adding ? 'Acquisto…' : 'Sì, acquista'}</button>
          </div>
        </div>`;
    } else {
      action = `<button class="btn primary" id="add-btn" ${this._adding ? 'disabled' : ''}>${this._adding ? 'Aggiunta…' : (isFree ? 'Aggiungi alla libreria' : 'Aggiungi')}</button>`;
    }

    return `
      <div class="footer-info">
        <span class="footer-price">${this._fmtPrice(price)}</span>
        ${this._purchaseError ? `<span class="footer-error">${this._esc(this._purchaseError)}</span>` : ''}
      </div>
      <div class="footer-action">${action}</div>
    `;
  }

  _renderFooter() {
    const footer = this.shadowRoot.querySelector('.footer');
    if (!footer || !this._visit) return;
    footer.innerHTML = this._footerHtml();
    this._bindFooter();
  }

  _bindFooter() {
    const footer = this.shadowRoot.querySelector('.footer');
    if (!footer) return;
    footer.querySelector('#add-btn')?.addEventListener('click', () => {
      const isFree = !(this._visit.base_price || 0);
      if (isFree) this._addToLibrary();
      else { this._confirm = true; this._renderFooter(); }
    });
    footer.querySelector('#confirm-no')?.addEventListener('click', () => {
      this._confirm = false;
      this._purchaseError = null;
      this._renderFooter();
    });
    footer.querySelector('#confirm-yes')?.addEventListener('click', () => this._addToLibrary());
  }

  /* ---- Corpo: informazioni generali + lista delle opere ---- */
  _bodyHtml() {
    const v = this._visit;
    const museums = v.museum || [];
    const isInfra = museums.length > 1;
    const museumLine = museums.map(m => this._esc(m.name)).join(' + ');
    const museumById = new Map(museums.map(m => [String(m._id), m]));

    const steps = [...(v.steps || [])].sort((a, b) => a.order - b.order);

    const operaRows = steps.map((s, i) => {
      const entity = s.entity || {};
      const museum = museumById.get(String(s.museum));
      const desc = s.intro_note || entity.description || '';
      return `
        <li class="opera-row">
          <span class="opera-order">${String(i + 1).padStart(2, '0')}</span>
          <div class="opera-thumb">${entity.image_url
            ? `<img src="${this._esc(entity.image_url)}" alt="" loading="lazy">`
            : '<span class="opera-thumb-ph"></span>'}
          </div>
          <div class="opera-info">
            <h3>${this._esc(entity.name)}</h3>
            <div class="opera-meta">
              ${entity.artwork_author ? `<span class="opera-author">${this._esc(entity.artwork_author)}</span>` : ''}
              ${isInfra && museum ? `<span class="opera-museum">${this._esc(museum.name)}</span>` : ''}
            </div>
            ${desc ? `<p class="opera-desc">${this._esc(desc)}</p>` : ''}
          </div>
        </li>`;
    }).join('');

    const bannerImage = steps.find(s => s.entity?.image_url)?.entity?.image_url || '';

    return `
      <div class="banner ${bannerImage ? 'has-image' : ''}">
        ${bannerImage ? `<img class="banner-img" src="${this._esc(bannerImage)}" alt="" loading="lazy">` : ''}
        ${isInfra ? '<span class="infra-badge">Inframuseale</span>' : ''}
        <span class="ph-label">${this._esc(v.title)}</span>
      </div>

      <div class="content">
        ${museumLine ? `<div class="museum-line">${museumLine}</div>` : ''}
        <h2 class="title">${this._esc(v.title)}</h2>

        <div class="meta-row">
          <span><strong>${this._fmtDuration(v.estimated_duration_sec)}</strong> durata</span>
          <span class="sep"></span>
          <span><strong>${steps.length}</strong> tapp${steps.length === 1 ? 'a' : 'e'}</span>
          <span class="sep"></span>
          <span><strong>${this._fmtPrice(v.base_price)}</strong> prezzo</span>
        </div>

        ${v.description ? `<p class="description">${this._esc(v.description)}</p>` : ''}

        ${v.tags?.length ? `<div class="tags">${v.tags.map(t => `<span class="tag">${this._esc(t)}</span>`).join('')}</div>` : ''}

        <h3 class="section-title">Opere incluse</h3>
        <ul class="opera-list">${operaRows || '<li class="opera-empty">Nessuna opera disponibile.</li>'}</ul>
      </div>
    `;
  }

  _render() {
    const isOpen = this.hasAttribute('open');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 1000;
        }
        :host([open]) { display: block; }

        .backdrop {
          position: absolute; inset: 0;
          background: rgba(28, 25, 23, 0.55);
          animation: fade-in 0.3s ease;
        }

        .panel {
          position: relative;
          margin: 4vh auto;
          width: min(720px, 92vw);
          max-height: 92vh;
          background: var(--color-surface, #fff);
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
          animation: rise-in 0.35s ease;
        }

        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rise-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }

        .close-btn {
          position: absolute;
          top: 0.85rem; right: 0.85rem;
          z-index: 3;
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid var(--color-border, #e8e6e1);
          cursor: pointer;
          font-size: 1.1rem;
          line-height: 1;
          color: var(--color-text, #1c1917);
          transition: background 0.3s ease, color 0.3s ease;
        }
        .close-btn:hover { background: #1c1917; color: #fff; }

        .body-scroll { overflow-y: auto; flex: 1; min-height: 0; }

        /* ── Banner ───────────────────────────────────────── */
        .banner {
          position: relative;
          height: 190px;
          background: #f5f2ec;
          border-bottom: 1px solid var(--color-border, #e8e6e1);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .banner::before {
          content: '';
          position: absolute; inset: 0;
          background: repeating-linear-gradient(135deg, transparent 0 11px, rgba(0,0,0,0.045) 11px 12px);
        }
        .banner.has-image::before { display: none; }
        .banner-img {
          position: absolute; inset: 0;
          z-index: 0;
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .ph-label {
          position: relative; z-index: 1;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #78716c;
          background: rgba(255, 255, 255, 0.78);
          padding: 0.4rem 0.85rem;
          text-align: center;
          max-width: 80%;
        }
        .infra-badge {
          position: absolute; top: 0.85rem; left: 0.85rem; z-index: 2;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.62rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 0.35rem 0.7rem;
          background: var(--color-surface, #fff);
          color: var(--color-accent, #9e7a46);
          border: 1px solid var(--color-accent, #9e7a46);
        }

        /* ── Contenuto ────────────────────────────────────── */
        .content { padding: 1.75rem 2rem 2rem; font-family: var(--font-sans, 'Inter', sans-serif); }

        .museum-line {
          font-size: 0.66rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-accent, #9e7a46);
          margin-bottom: 0.5rem;
        }
        .title {
          font-family: var(--font-serif, 'Playfair Display', serif);
          font-size: 1.55rem;
          font-weight: 600;
          color: var(--color-text, #1c1917);
          line-height: 1.25;
          margin-bottom: 0.9rem;
        }

        .meta-row {
          display: flex; align-items: center; gap: 0.7rem;
          font-size: 0.78rem;
          color: var(--color-text-muted, #78716c);
          padding-bottom: 1.1rem;
          margin-bottom: 1.1rem;
          border-bottom: 1px solid var(--color-border, #e8e6e1);
        }
        .meta-row strong { color: var(--color-text, #1c1917); font-weight: 600; }
        .meta-row .sep { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: 0.5; }

        .description { font-size: 0.9rem; line-height: 1.65; color: #57534e; margin-bottom: 1.1rem; }

        .tags { margin-bottom: 1.6rem; }
        .tag {
          display: inline-block;
          font-size: 0.62rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-muted, #78716c);
          border: 1px solid var(--color-border, #e8e6e1);
          padding: 0.25rem 0.6rem;
          margin: 0 0.4rem 0.4rem 0;
        }

        .section-title {
          font-family: var(--font-serif, 'Playfair Display', serif);
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 0.9rem;
        }

        .opera-list { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
        .opera-row { display: flex; gap: 0.9rem; align-items: flex-start; }
        .opera-order {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.72rem;
          color: var(--color-accent, #9e7a46);
          padding-top: 0.15rem;
          flex-shrink: 0;
        }
        .opera-thumb {
          width: 56px; height: 56px;
          flex-shrink: 0;
          background: #f5f2ec;
          border: 1px solid var(--color-border, #e8e6e1);
          overflow: hidden;
        }
        .opera-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .opera-thumb-ph {
          display: block; width: 100%; height: 100%;
          background: repeating-linear-gradient(135deg, transparent 0 6px, rgba(0,0,0,0.06) 6px 7px);
        }
        .opera-info { min-width: 0; flex: 1; }
        .opera-info h3 {
          font-family: var(--font-serif, 'Playfair Display', serif);
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text, #1c1917);
          margin-bottom: 0.2rem;
        }
        .opera-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.3rem; }
        .opera-author, .opera-museum {
          font-size: 0.68rem;
          letter-spacing: 0.04em;
          color: var(--color-text-muted, #78716c);
        }
        .opera-museum { color: var(--color-accent, #9e7a46); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.62rem; }
        .opera-desc {
          font-size: 0.8rem;
          line-height: 1.5;
          color: #57534e;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .opera-empty { font-size: 0.82rem; color: var(--color-text-muted, #78716c); }

        /* ── Footer ───────────────────────────────────────── */
        .footer {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem;
          padding: 1.1rem 2rem;
          border-top: 1px solid var(--color-border, #e8e6e1);
          background: var(--color-surface, #fff);
        }
        .footer-info { display: flex; flex-direction: column; gap: 0.2rem; }
        .footer-price {
          font-family: var(--font-serif, 'Playfair Display', serif);
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text, #1c1917);
        }
        .footer-error { font-size: 0.72rem; color: #b91c1c; }

        .btn {
          font-family: var(--font-sans, 'Inter', sans-serif);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.75rem 1.5rem;
          border: 1px solid var(--color-text, #1c1917);
          background: var(--color-text, #1c1917);
          color: #fff;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, opacity 0.3s ease;
        }
        .btn.primary:hover { background: var(--color-accent, #9e7a46); border-color: var(--color-accent, #9e7a46); }
        .btn.primary:disabled { opacity: 0.55; cursor: default; }
        .btn.ghost { background: transparent; color: var(--color-text, #1c1917); }
        .btn.ghost:hover { background: var(--color-border, #e8e6e1); }
        .btn.owned {
          background: transparent;
          border-color: var(--color-border, #e8e6e1);
          color: var(--color-text-muted, #78716c);
          cursor: default;
        }

        .confirm { display: flex; align-items: center; gap: 0.9rem; }
        .confirm-text { font-size: 0.78rem; color: var(--color-text, #1c1917); max-width: 220px; }
        .confirm-actions { display: flex; gap: 0.5rem; }

        .state-msg {
          padding: 4rem 2rem;
          text-align: center;
          color: var(--color-text-muted, #78716c);
          font-size: 0.85rem;
        }

        @media (max-width: 640px) {
          .panel { width: 100vw; margin: 0; max-height: 100vh; height: 100vh; }
          .content { padding: 1.5rem 1.25rem 1.75rem; }
          .footer { padding: 1rem 1.25rem; flex-wrap: wrap; }
          .confirm { flex-direction: column; align-items: flex-start; gap: 0.6rem; }
        }
      </style>

      ${isOpen ? `
        <div class="backdrop"></div>
        <div class="panel" role="dialog" aria-modal="true" aria-label="${this._visit ? this._esc(this._visit.title) : 'Dettagli visita'}">
          <button class="close-btn" aria-label="Chiudi">×</button>
          <div class="body-scroll">
            ${this._loading ? '<p class="state-msg">Caricamento…</p>' : ''}
            ${this._error ? `<p class="state-msg">${this._esc(this._error)}</p>` : ''}
            ${(!this._loading && !this._error && this._visit) ? this._bodyHtml() : ''}
          </div>
          ${(!this._loading && !this._error && this._visit) ? `<div class="footer">${this._footerHtml()}</div>` : ''}
        </div>
      ` : ''}
    `;

    if (isOpen) {
      this.shadowRoot.querySelector('.backdrop')?.addEventListener('click', () => this.close());
      this.shadowRoot.querySelector('.close-btn')?.addEventListener('click', () => this.close());
      this._bindFooter();
    }
  }
}

customElements.define('visit-modal', VisitModal);
