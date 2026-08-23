/* ============================================================
 *  paragraph-list.js — Elenco dinamico dei paragrafi di una
 *  descrizione, condiviso tra il form di creazione e il popup di
 *  modifica nel profilo.
 *
 *  Comportamento: l'ultimo paragrafo resta sempre vuoto pronto per
 *  scrivere; appena ci si scrive dentro, ne viene aggiunto uno nuovo
 *  in coda. Se invece si lascia vuoto un paragrafo e si passa a
 *  un altro (blur), quel paragrafo vuoto viene rimosso. L'ordine dei
 *  paragrafi si può cambiare trascinandoli dalla maniglia, o su
 *  mobile con le frecce su/giù (l'ultimo paragrafo vuoto, essendo
 *  solo il posto per scriverne uno nuovo, resta sempre in fondo e
 *  non si può spostare).
 * ============================================================ */

// Velocità media di lettura della sintesi vocale (window.speechSynthesis a
// rate 1.0), usata per calcolare la durata dei paragrafi dal loro testo
// invece di chiederla manualmente.
const TTS_WORDS_PER_MINUTE = 150;

export function estimateDurationSec(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 0;
  return Math.max(1, Math.round((words / TTS_WORDS_PER_MINUTE) * 60));
}

export function formatDuration(sec) {
  if (sec < 60) return `~${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `~${m}m ${s}s`;
}

/**
 * Inizializza l'elenco dinamico dentro `container` (un elemento vuoto che
 * farà da lista) con eventuali testi iniziali, e restituisce dei metodi
 * per leggerne il contenuto.
 */
export function setupParagraphList(container, initialTexts = []) {
  function rows() {
    return container.querySelectorAll('.paragraph-row');
  }

  function lastRow() {
    const r = rows();
    return r[r.length - 1] || null;
  }

  function renumber() {
    const r = rows();
    r.forEach((row, i) => {
      const isPlaceholder = row === r[r.length - 1];
      row.querySelector('.paragraph-index').textContent = `Paragrafo ${i + 1}`;
      row.querySelector('.remove-row').hidden = r.length <= 1;
      const handle = row.querySelector('.paragraph-drag-handle');
      handle.classList.toggle('is-disabled', isPlaceholder);
      handle.setAttribute('aria-hidden', String(isPlaceholder));
      handle.tabIndex = isPlaceholder ? -1 : 0;

      const upBtn = row.querySelector('.paragraph-up');
      const downBtn = row.querySelector('.paragraph-down');
      upBtn.hidden = isPlaceholder;
      downBtn.hidden = isPlaceholder;
      upBtn.disabled = i === 0;
      downBtn.disabled = i === r.length - 2;
    });
  }

  /* Spostamento via frecce (alternativa al trascinamento, usata su
   * mobile dove il drag non è comodo): sposta il nodo riga stesso,
   * come il drag, così il testo scritto segue senza perdite. */
  function moveRow(row, direction) {
    const r = [...rows()];
    const idx = r.indexOf(row);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= r.length - 1) return;
    if (direction < 0) {
      container.insertBefore(row, r[targetIdx]);
    } else {
      container.insertBefore(r[targetIdx], row);
    }
    renumber();
  }

  function ensureTrailingEmpty() {
    const last = lastRow();
    if (last && last.querySelector('.paragraph-text').value.trim()) addRow();
  }

  function addRow(text = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row paragraph-row';
    row.innerHTML = `
      <div class="paragraph-row-head">
        <div class="paragraph-row-head-left">
          <span class="paragraph-drag-handle" draggable="true" aria-label="Trascina per riordinare" title="Trascina per riordinare">⠿</span>
          <span class="paragraph-row-arrows">
            <button type="button" class="paragraph-up" title="Sposta su" aria-label="Sposta su">↑</button>
            <button type="button" class="paragraph-down" title="Sposta giù" aria-label="Sposta giù">↓</button>
          </span>
          <span class="paragraph-index"></span>
        </div>
        <div class="paragraph-row-meta">
          <span class="paragraph-duration-estimate">~0s</span>
          <button type="button" class="remove-row" aria-label="Rimuovi paragrafo">✕</button>
        </div>
      </div>
      <textarea class="paragraph-text" rows="3" placeholder="Testo del paragrafo…"></textarea>
    `;

    const textarea = row.querySelector('.paragraph-text');
    const estimateEl = row.querySelector('.paragraph-duration-estimate');
    textarea.value = text;
    estimateEl.textContent = formatDuration(estimateDurationSec(text));

    textarea.addEventListener('input', (e) => {
      estimateEl.textContent = formatDuration(estimateDurationSec(e.target.value));
      if (row === lastRow() && e.target.value.trim()) addRow();
    });
    textarea.addEventListener('blur', () => {
      if (!textarea.value.trim() && row !== lastRow() && rows().length > 1) {
        row.remove();
        renumber();
      }
    });
    row.querySelector('.remove-row').addEventListener('click', () => {
      if (rows().length <= 1) return;
      row.remove();
      renumber();
      ensureTrailingEmpty();
    });
    row.querySelector('.paragraph-up').addEventListener('click', () => moveRow(row, -1));
    row.querySelector('.paragraph-down').addEventListener('click', () => moveRow(row, 1));

    container.appendChild(row);
    renumber();
    return row;
  }

  /* Trascinamento dalla maniglia: il paragrafo trascinato segue il
   * puntatore tra i paragrafi già scritti, ma non può mai superare
   * l'ultimo (il posto vuoto pronto per il prossimo testo). */
  function setupDragReorder() {
    let draggingRow = null;

    container.addEventListener('dragstart', (e) => {
      const handle = e.target.closest('.paragraph-drag-handle');
      const row = handle?.closest('.paragraph-row');
      if (!row || row === lastRow()) { e.preventDefault(); return; }
      draggingRow = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      e.dataTransfer.setDragImage(row, 20, 20);
    });

    container.addEventListener('dragover', (e) => {
      if (!draggingRow) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const placeholder = lastRow();
      const others = [...rows()].filter(r => r !== draggingRow && r !== placeholder);
      let target = placeholder; // di default va appena prima del posto vuoto in fondo
      for (const row of others) {
        const box = row.getBoundingClientRect();
        if (e.clientY < box.top + box.height / 2) {
          target = row;
          break;
        }
      }
      if (target !== draggingRow) container.insertBefore(draggingRow, target);
    });

    container.addEventListener('drop', (e) => e.preventDefault());

    container.addEventListener('dragend', () => {
      if (!draggingRow) return;
      draggingRow.classList.remove('dragging');
      draggingRow = null;
      renumber();
    });
  }

  container.innerHTML = '';
  if (initialTexts.length) {
    initialTexts.forEach(t => addRow(t));
    ensureTrailingEmpty();
  } else {
    addRow();
  }
  setupDragReorder();

  return {
    collect() {
      const out = [];
      rows().forEach(row => {
        const text = row.querySelector('.paragraph-text').value.trim();
        if (!text) return;
        out.push({ text, duration_sec: estimateDurationSec(text) });
      });
      return out;
    },
    focusFirst() {
      container.querySelector('.paragraph-text')?.focus();
    },
  };
}
