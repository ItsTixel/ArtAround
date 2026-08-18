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

import { getCurrentUser } from '/marketplace/js/auth-session.js';
import { GLASS_MODAL as GLASS, TRANSITION } from '/marketplace/js/ui-tokens.js';
import { TONE_ORDER, TONE_LABELS } from '/marketplace/js/tone-labels.js';

const API_VISITS   = '/api/visits';
const API_USERS    = '/api/users';
const LOGIN_URL    = '/marketplace/login.html';
const NAVIGATOR_URL = '/navigator/';

class VisitModal extends HTMLElement {
  constructor() {
    super();
    this._visit = null;
    this._userId = null;
    this._owned = false;
    this._favorited = false;
    this._loading = false;
    this._error = null;
    this._confirm = false;
    this._adding = false;
    this._purchaseError = null;
    this._justAdopted = false;
    this._copying = false;
    this._copyError = null;
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
    this._justAdopted = false;
    this._copying = false;
    this._copyError = null;
    this._favorited = false;

    this.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKeydown);
    this._render();

    try {
      const [visitRes, user] = await Promise.all([
        fetch(`${API_VISITS}/${visitId}`),
        getCurrentUser(),
      ]);
      if (!visitRes.ok) throw new Error(`HTTP ${visitRes.status}`);
      this._visit = await visitRes.json();
      this._userId = user?._id || null;
      const flags = await this._loadUserFlags(visitId, this._userId);
      this._owned = flags.owned;
      this._favorited = flags.favorited;
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
    this._render();
  }

  _onKeydown(e) {
    if (e.key === 'Escape') this.close();
  }

  async _loadUserFlags(visitId, userId) {
    if (!userId) return { owned: false, favorited: false };
    try {
      const res = await fetch(`${API_USERS}/${userId}`);
      if (!res.ok) return { owned: false, favorited: false };
      const user = await res.json();
      return {
        owned:     (user.adopted_visits || []).some(id => String(id) === String(visitId)),
        favorited: (user.bookmarked_visits || []).some(id => String(id) === String(visitId)),
      };
    } catch {
      return { owned: false, favorited: false };
    }
  }

  _toggleFavorite() {
    const next = !this._favorited;
    this._favorited = next;
    this._renderFavBtn();
    this.dispatchEvent(new CustomEvent('toggle-favorite', {
      detail: {
        id: this._visit._id,
        favorited: next,
        revert: () => { this._favorited = !next; this._renderFavBtn(); },
      },
      bubbles: true,
      composed: true,
    }));
  }

  _renderFavBtn() {
    const btn = this.querySelector('.fav-btn');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(this._favorited));
    btn.setAttribute('aria-label', this._favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti');
    btn.querySelector('svg').setAttribute('class', `w-4 h-4 ${this._favorited ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-current'}`);
  }

  async _addToLibrary() {
    if (this._adding || this._owned) return;
    if (!this._userId) {
      window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
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
      this._justAdopted = true;
      setTimeout(() => {
        this._justAdopted = false;
        this._renderFooter();
      }, 1000);
    } catch (e) {
      console.error('Errore durante l\'aggiunta alla libreria:', e);
      this._purchaseError = 'Errore durante l\'acquisto. Riprova.';
    } finally {
      this._adding = false;
      this._renderFooter();
    }
  }

  /* ---- "Copia visita": duplica la visita posseduta come nuova bozza
     gratuita e privata dell'utente corrente. Non disponibile per le visite
     di gruppo (richiedono un quiz proprio e non sono mai listate qui) né
     per visite che includono opere Private/Reserved di un altro autore:
     Visit.pre('save') sul backend rifiuta il salvataggio in quel caso
     (vedi backend/models/visit.js). ---- */
  _canCopy() {
    if (!this._visit || !this._owned || this._visit.is_group) return false;
    const uid = this._userId;
    return !(this._visit.steps || []).some(step =>
      (step.items || []).some(it => {
        if (!it || it.license === 'Public') return false;
        const authorId = it.author?._id || it.author;
        return String(authorId) !== String(uid);
      })
    );
  }

  async _copyVisit() {
    if (this._copying || !this._visit) return;
    this._copying = true;
    this._copyError = null;
    this._renderFooter();
    try {
      const v = this._visit;
      const payload = {
        title: `Copia - ${v.title}`,
        description: v.description || '',
        image_url: v.image_url || '',
        tags: v.tags || [],
        is_group: false,
        base_price: 0,
        is_public: false,
        steps: (v.steps || []).map(s => ({
          entity: s.entity?._id || s.entity,
          museum: s.museum?._id || s.museum,
          items: (s.items || []).map(it => it._id || it),
          order: s.order,
          intro_note: s.intro_note || undefined,
          logistic_note: s.logistic_note || undefined,
        })),
      };
      const res = await fetch(API_VISITS, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      this.close();
      window.location.href = '/marketplace/pages/profile.html#visite:create';
    } catch (e) {
      console.error('Errore durante la copia della visita:', e);
      this._copyError = 'Errore durante la copia della visita. Riprova.';
    } finally {
      this._copying = false;
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

    const btnBase = `text-[0.72rem] font-semibold tracking-[0.08em] uppercase px-6 py-3 rounded-full border border-transparent cursor-pointer whitespace-nowrap ${TRANSITION}`;
    const btnPrimary = `${btnBase} bg-slate-800 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 disabled:cursor-default disabled:hover:opacity-50`;
    const btnGhost = `${btnBase} bg-transparent border-slate-400/20 text-slate-800 dark:text-slate-100 hover:bg-white/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-default`;
    const btnOwned = `${btnBase} bg-transparent border-slate-400/20 text-slate-500 dark:text-slate-400 cursor-default`;

    let action;
    if (this._owned) {
      if (this._justAdopted) {
        action = `<button class="btn owned ${btnOwned}" disabled>✓ Aggiunta alla libreria!</button>`;
      } else {
        const copyBtn = this._canCopy()
          ? `<button class="btn ghost ${btnGhost}" id="copy-btn" ${this._copying ? 'disabled' : ''}>${this._copying ? 'Copia in corso…' : 'Copia visita'}</button>`
          : '';
        action = `
          <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            ${copyBtn}
            <button class="btn primary ${btnPrimary}" id="start-btn">Comincia visita</button>
          </div>`;
      }
    } else if (this._confirm) {
      action = `
        <div class="confirm flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-4">
          <span class="confirm-text text-[0.78rem] text-slate-800 dark:text-slate-100 max-w-[220px]">Sei sicuro di voler comprare questa visita?</span>
          <div class="confirm-actions flex gap-2">
            <button class="btn ghost ${btnGhost}" id="confirm-no" ${this._adding ? 'disabled' : ''}>Annulla</button>
            <button class="btn primary ${btnPrimary}" id="confirm-yes" ${this._adding ? 'disabled' : ''}>${this._adding ? 'Acquisto…' : 'Sì, acquista'}</button>
          </div>
        </div>`;
    } else {
      action = `<button class="btn primary ${btnPrimary}" id="add-btn" ${this._adding ? 'disabled' : ''}>${this._adding ? 'Aggiunta…' : (isFree ? 'Aggiungi alla libreria' : 'Aggiungi')}</button>`;
    }

    return `
      <div class="footer-info flex flex-col gap-0.5">
        <span class="footer-price text-lg font-semibold text-slate-800 dark:text-slate-100" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._fmtPrice(price)}</span>
        ${(this._purchaseError || this._copyError) ? `<span class="footer-error text-[0.72rem]" style="color:#f38b7f;">${this._esc(this._purchaseError || this._copyError)}</span>` : ''}
      </div>
      <div class="footer-action">${action}</div>
    `;
  }

  _renderFooter() {
    const footer = this.querySelector('.footer');
    if (!footer || !this._visit) return;
    footer.innerHTML = this._footerHtml();
    this._bindFooter();
  }

  _bindFooter() {
    const footer = this.querySelector('.footer');
    if (!footer) return;
    footer.querySelector('#add-btn')?.addEventListener('click', () => {
      if (!this._userId) { this._addToLibrary(); return; } // reindirizza al login
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
    footer.querySelector('#start-btn')?.addEventListener('click', () => {
      window.location.href = `${NAVIGATOR_URL}?openVisit=${encodeURIComponent(this._visit._id)}`;
    });
    footer.querySelector('#copy-btn')?.addEventListener('click', () => this._copyVisit());
  }

  /* ---- Corpo: informazioni generali + lista delle opere ---- */
  _bodyHtml() {
    const v = this._visit;
    const museums = v.museum || [];
    const isInfra = museums.length > 1;
    const museumLine = museums.map(m => this._esc(m.name)).join(' + ');
    const museumById = new Map(museums.map(m => [String(m._id), m]));

    const steps = [...(v.steps || [])].sort((a, b) => a.order - b.order);

    const toneSet = new Set();
    steps.forEach(s => (s.items || []).forEach(it => { if (it?.tone) toneSet.add(it.tone); }));
    const tones = TONE_ORDER.filter(t => toneSet.has(t));

    const operaRows = steps.map((s, i) => {
      const entity = s.entity || {};
      const museum = museumById.get(String(s.museum));
      const desc = s.intro_note || entity.description || '';
      return `
        <li class="flex gap-3.5 items-start">
          <span class="text-[0.72rem] pt-[0.15rem] shrink-0" style="font-family: var(--font-mono); color: var(--color-accent, #9e7a46);">${String(i + 1).padStart(2, '0')}</span>
          <div class="w-14 h-14 shrink-0 bg-slate-300/20 dark:bg-slate-800/40 border border-slate-400/20 rounded-md overflow-hidden">${entity.image_url
            ? `<img class="w-full h-full object-cover" src="${this._esc(entity.image_url)}" alt="" loading="lazy">`
            : `<span class="block w-full h-full" style="background-image: repeating-linear-gradient(135deg, transparent 0 6px, rgba(100,116,139,0.12) 6px 7px);"></span>`}
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-[0.95rem] font-semibold text-slate-800 dark:text-slate-100 mb-0.5" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._esc(entity.name)}</h3>
            <div class="flex flex-wrap gap-2 mb-1">
              ${entity.artwork_author ? `<span class="text-[0.68rem] tracking-[0.04em] text-slate-500 dark:text-slate-400">${this._esc(entity.artwork_author)}</span>` : ''}
              ${isInfra && museum ? `<span class="text-[0.62rem] uppercase tracking-[0.1em]" style="color: var(--color-accent, #9e7a46);">${this._esc(museum.name)}</span>` : ''}
            </div>
            ${desc ? `<p class="text-[0.8rem] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">${this._esc(desc)}</p>` : ''}
          </div>
        </li>`;
    }).join('');

    const bannerImage = steps.find(s => s.entity?.image_url)?.entity?.image_url || '';

    return `
      <div class="relative h-[190px] bg-slate-300/20 dark:bg-slate-800/40 border-b border-slate-400/20 flex items-center justify-center overflow-hidden shrink-0">
        ${bannerImage
          ? `<img class="absolute inset-0 w-full h-full object-cover" src="${this._esc(bannerImage)}" alt="" loading="lazy">`
          : `<div class="absolute inset-0" style="background-image: repeating-linear-gradient(135deg, transparent 0 11px, rgba(100,116,139,0.12) 11px 12px);"></div>`}
        ${isInfra ? `<span class="absolute top-3 left-3 z-[2] text-[0.62rem] tracking-[0.16em] uppercase rounded-full px-2.5 py-1.5 ${GLASS} text-slate-800 dark:text-slate-100" style="font-family: var(--font-mono);">Inframuseale</span>` : ''}
        <span class="relative z-[1] text-[0.68rem] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full ${GLASS} text-slate-800 dark:text-slate-100 text-center max-w-[80%]" style="font-family: var(--font-mono);">${this._esc(v.title)}</span>
      </div>

      <div class="pt-7 px-5 sm:px-8 pb-7 sm:pb-8">
        ${museumLine ? `<div class="text-[0.66rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-2">${museumLine}</div>` : ''}
        <h2 class="text-2xl font-semibold leading-tight text-slate-800 dark:text-slate-100 mb-3.5" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">${this._esc(v.title)}</h2>

        <div class="flex items-center gap-3 text-[0.78rem] text-slate-500 dark:text-slate-400 pb-4 mb-4 border-b border-slate-400/20">
          <span><strong class="text-slate-800 dark:text-slate-100 font-semibold">${this._fmtDuration(v.estimated_duration_sec)}</strong> durata</span>
          <span class="inline-block w-[3px] h-[3px] rounded-full bg-current opacity-50"></span>
          <span><strong class="text-slate-800 dark:text-slate-100 font-semibold">${steps.length}</strong> tapp${steps.length === 1 ? 'a' : 'e'}</span>
          <span class="inline-block w-[3px] h-[3px] rounded-full bg-current opacity-50"></span>
          <span><strong class="text-slate-800 dark:text-slate-100 font-semibold">${this._fmtPrice(v.base_price)}</strong> prezzo</span>
        </div>

        ${v.description ? `<p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400 mb-4">${this._esc(v.description)}</p>` : ''}

        ${v.tags?.length ? `
        <div class="mb-5">
          <h4 class="text-[0.62rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-2">Temi</h4>
          ${v.tags.map(t => `<span class="liquid-glass-pill inline-block text-[0.62rem] tracking-[0.1em] uppercase text-slate-500 dark:text-slate-400 border border-slate-400/20 rounded-full px-2.5 py-1 mr-1.5 mb-1.5">${this._esc(t)}</span>`).join('')}
        </div>` : ''}
        ${tones.length ? `
        <div class="mb-6">
          <h4 class="text-[0.62rem] font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-2">Linguaggio</h4>
          ${tones.map(t => `<span class="liquid-glass-pill inline-block text-[0.62rem] tracking-[0.1em] uppercase text-slate-500 dark:text-slate-400 border border-slate-400/20 rounded-full px-2.5 py-1 mr-1.5 mb-1.5">${this._esc(TONE_LABELS[t] || t)}</span>`).join('')}
        </div>` : ''}

        <h3 class="text-base font-semibold mb-3.5 text-slate-800 dark:text-slate-100" style="font-family: var(--font-serif, 'Libre Baskerville', Georgia, serif);">Opere incluse</h3>
        <ul class="flex flex-col gap-4">${operaRows || '<li class="text-[0.82rem] text-slate-500 dark:text-slate-400">Nessuna opera disponibile.</li>'}</ul>
      </div>
    `;
  }

  _render() {
    const isOpen = this.hasAttribute('open');

    this.className = isOpen ? '' : 'hidden';
    this.innerHTML = isOpen ? `
      <div class="backdrop fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"></div>
      <div class="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-0 sm:p-6" style="pointer-events: none;">
        <div class="panel relative w-screen min-w-0 h-screen sm:w-[min(720px,92vw)] sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl overflow-hidden flex flex-col ${GLASS} text-slate-800 dark:text-slate-100" style="pointer-events: auto;" role="dialog" aria-modal="true" aria-label="${this._visit ? this._esc(this._visit.title) : 'Dettagli visita'}">
          <button class="liquid-glass-pill close-btn absolute top-3 right-3 z-10 w-9 h-9 rounded-full border border-slate-400/20 backdrop-blur-lg flex items-center justify-center text-lg leading-none hover:bg-white/20 hover:border-white/30 ${TRANSITION}" aria-label="Chiudi">×</button>
          ${(!this._loading && !this._error && this._visit) ? `
          <button class="liquid-glass-pill fav-btn absolute top-3 right-14 z-10 w-9 h-9 rounded-full border border-slate-400/20 backdrop-blur-lg flex items-center justify-center hover:bg-white/20 hover:border-white/30 ${TRANSITION}" aria-pressed="${this._favorited}" aria-label="${this._favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}">
            <svg class="w-4 h-4 ${this._favorited ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-current'}" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.6s-6.9-4.35-9.5-8.4C.9 9.1 1.7 5.4 5 4c2.2-.9 4.5 0 5.8 2l1.2 1.5L13.2 6c1.3-2 3.6-2.9 5.8-2 3.3 1.4 4.1 5.1 2.5 8.2-2.6 4.05-9.5 8.4-9.5 8.4z"/></svg>
          </button>` : ''}
          <div class="body-scroll overflow-y-auto flex-1 min-h-0">
            ${this._loading ? '<p class="py-16 px-8 text-center text-slate-500 dark:text-slate-400 text-sm">Caricamento…</p>' : ''}
            ${this._error ? `<p class="py-16 px-8 text-center text-slate-500 dark:text-slate-400 text-sm">${this._esc(this._error)}</p>` : ''}
            ${(!this._loading && !this._error && this._visit) ? this._bodyHtml() : ''}
          </div>
          ${(!this._loading && !this._error && this._visit) ? `<div class="footer shrink-0 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 px-5 py-4 sm:px-8 sm:py-[1.1rem] border-t border-slate-400/20">${this._footerHtml()}</div>` : ''}
        </div>
      </div>
    ` : '';

    if (isOpen) {
      this.querySelector('.backdrop')?.addEventListener('click', () => this.close());
      this.querySelector('.close-btn')?.addEventListener('click', () => this.close());
      this.querySelector('.fav-btn')?.addEventListener('click', () => this._toggleFavorite());
      this._bindFooter();
    }
  }
}

customElements.define('visit-modal', VisitModal);
