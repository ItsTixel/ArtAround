/* ============================================================
 *  filter-sheet.js — comportamento "bottom sheet" dei pannelli filtri
 *  su mobile (≤900px).
 *
 *  Desktop: nessun effetto — <filter-sidebar> / <entity-filter-sidebar>
 *  restano la colonna sticky di sinistra.
 *
 *  Mobile:
 *    • il pannello filtri diventa un foglio che scorre dal basso, con
 *      scrim e scroll interno (regole in visits.css, gate su
 *      body.filter-sheet-open);
 *    • una barra "Filtri" flottante resta agganciata in basso: si
 *      ritrae mentre si scorre verso il basso e riappare appena ci si
 *      ferma o si risale — come sul sito Timberland.
 *
 *  Lo stato "aperto" vive su <body> (non sul componente) perché i
 *  pannelli riscrivono il proprio innerHTML a ogni cambio filtro e
 *  perderebbero una classe di stato locale.
 *
 *  Uso:  attachFilterSheet(document.querySelector('filter-sidebar'))
 * ============================================================ */

const MOBILE_MQ = window.matchMedia('(max-width: 900px)');
const OPEN_CLASS = 'filter-sheet-open';

export function attachFilterSheet(host) {
  if (!host || host._filterSheet) return;
  host._filterSheet = true;

  /* Sblocca le regole del foglio in visits.css (gate progressivo: se
     questo script non gira, il pannello resta l'accordion inline). */
  document.body.classList.add('filter-sheet-ready');

  /* --- Barra flottante "Filtri" (in <body>, sopravvive ai re-render) --- */
  const bar = document.createElement('button');
  bar.type = 'button';
  bar.className = 'filter-sheet-trigger';
  bar.setAttribute('aria-haspopup', 'dialog');
  bar.setAttribute('aria-expanded', 'false');
  bar.innerHTML = `
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path d="M3 5h18M6 12h12M10 19h4" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span>Filtri</span>
    <span class="filter-sheet-count" hidden>0</span>`;

  const scrim = document.createElement('div');
  scrim.className = 'filter-sheet-scrim';
  scrim.hidden = true;

  document.body.append(scrim, bar);

  /* --- Apertura / chiusura del foglio --------------------------- */
  const isOpen = () => document.body.classList.contains(OPEN_CLASS);

  const open = () => {
    if (!MOBILE_MQ.matches || isOpen()) return;
    document.body.classList.add(OPEN_CLASS);
    scrim.hidden = false;
    bar.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => scrim.classList.add('is-visible'));
  };

  const close = () => {
    if (!isOpen()) return;
    document.body.classList.remove(OPEN_CLASS);
    scrim.classList.remove('is-visible');
    bar.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { if (!isOpen()) scrim.hidden = true; }, 300);
  };

  bar.addEventListener('click', () => (isOpen() ? close() : open()));
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  /* La maniglia / × dell'header vive dentro host e viene ricreata a
     ogni render: deleghiamo il click qui. */
  host.addEventListener('click', (e) => {
    if (e.target.closest('[data-sheet-close]')) close();
  });

  /* --- Badge col numero di filtri attivi ----------------------- */
  const badge = bar.querySelector('.filter-sheet-count');
  host.addEventListener('filters-change', (e) => {
    const detail = e.detail || {};
    let n = 0;
    for (const v of Object.values(detail)) {
      if (Array.isArray(v)) n += v.length;
      else if (typeof v === 'boolean') n += v ? 1 : 0;
      else if (typeof v === 'string') n += (v && v !== 'all') ? 1 : 0;
      /* i number (es. durationMax) hanno sempre un valore: non contano */
    }
    badge.textContent = n;
    badge.hidden = n === 0;
  });

  /* --- Ritrai / mostra la barra durante lo scroll ------------- */
  let lastY = window.scrollY;
  let idleTimer;
  const onScroll = () => {
    const y = Math.max(0, window.scrollY);
    if (!isOpen()) {
      if (y > lastY + 6 && y > 160) bar.classList.add('is-tucked');
      else if (y < lastY - 6) bar.classList.remove('is-tucked');
    }
    lastY = y;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!isOpen()) bar.classList.remove('is-tucked');
    }, 180);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* --- Torna a desktop: chiudi tutto ------------------------- */
  MOBILE_MQ.addEventListener('change', (e) => { if (!e.matches) close(); });
}
