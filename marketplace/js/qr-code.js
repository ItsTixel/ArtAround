/**
 * Genera il markup della miniatura QR (con tasto di download) usata dai
 * modal di opera e visita. Il testo codificato è "entity:<id>" o
 * "visit:<id>" — lo stesso formato che il navigator legge scansionando
 * (vedi navigator/src/pages/Qr.jsx, QR_PATTERN), quindi un QR generato qui
 * è già pronto per essere scansionato lì.
 */

import { qrcode } from './vendor/qrcode.mjs';

const PREVIEW_CELL_SIZE = 4;
const PREVIEW_MARGIN = 8;

// Il file scaricato è un PNG disegnato modulo per modulo su un canvas,
// non l'SVG rasterizzato dal browser: quest'ultimo introduce sfumature
// ai bordi dei quadratini quando l'immagine viene scalata, che a stampa
// peggiorano la leggibilità del codice. Un canvas con fillRect su
// coordinate intere resta invece nitido a qualunque risoluzione.
const PNG_CELL_SIZE = 12;
const PNG_QUIET_ZONE_MODULES = 4; // margine bianco richiesto dallo standard QR

function buildQr(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr;
}

function svgPreviewDataUrl(qr) {
  const svg = qr.createSvgTag(PREVIEW_CELL_SIZE, PREVIEW_MARGIN);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function pngDownloadDataUrl(qr) {
  const count = qr.getModuleCount();
  const size = (count + PNG_QUIET_ZONE_MODULES * 2) * PNG_CELL_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(
          (c + PNG_QUIET_ZONE_MODULES) * PNG_CELL_SIZE,
          (r + PNG_QUIET_ZONE_MODULES) * PNG_CELL_SIZE,
          PNG_CELL_SIZE, PNG_CELL_SIZE
        );
      }
    }
  }
  return canvas.toDataURL('image/png');
}

const DOWNLOAD_ICON = `<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`;

/**
 * @param {'entity'|'visit'} type
 * @param {string} id ObjectId Mongo (24 esadecimali)
 * @param {string} labelPrefix usato per il nome del file scaricato (es. "opera", "visita")
 */
export function qrThumbHtml(type, id, labelPrefix) {
  const qr = buildQr(`${type}:${id}`);
  const previewUrl = svgPreviewDataUrl(qr);
  const downloadUrl = pngDownloadDataUrl(qr);
  const filename = `qr-${labelPrefix}-${id}.png`;
  return `
    <div class="qr-thumb absolute bottom-3 left-3 z-[2] w-14 h-14 shrink-0">
      <div class="w-full h-full rounded-lg overflow-hidden border border-slate-400/20 shadow-lg bg-white">
        <img class="block w-full h-full object-contain" src="${previewUrl}" width="56" height="56" alt="QR Code" loading="lazy">
      </div>
      <a class="qr-download absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-400/30 shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
         href="${downloadUrl}" download="${filename}" aria-label="Scarica QR code" title="Scarica QR code">
        ${DOWNLOAD_ICON}
      </a>
    </div>
  `;
}
