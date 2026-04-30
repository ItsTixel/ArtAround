const API = 'http://localhost:8000/api';
const TONE_MAP   = { childish:'Infantile', simple:'Elementare', medium:'Medio', technical:'Specialistico' };
const TONE_COLORS = {
  childish:  { bg:'#EFF6FF', color:'#1D4ED8' },
  simple:    { bg:'#F0FDF4', color:'#166534' },
  medium:    { bg:'#FFFBEB', color:'#92400E' },
  technical: { bg:'#F5F3FF', color:'#5B21B6' },
};
const DUR_MAP = { 3:'3 secondi', 15:'15 secondi', 40:'40 secondi', 60:'1 minuto', 240:'4 minuti+' };

let variantCount = 0;
let isDirty = false;
const tags = [];
let currentPreviewTone = 'medium';

/* ── Variant blocks ── */
function addVariant(tone = 'medium', duration = 60) {
  variantCount++;
  const id = `v${variantCount}`;
  const container = document.getElementById('variants-container');
  const block = document.createElement('div');
  block.className = 'variant-block';
  block.id = `variant-${id}`;
  block.setAttribute('role', 'group');
  block.setAttribute('aria-labelledby', `variant-title-${id}`);
  block.innerHTML = `
    <div class="variant-header">
      <div class="form-group">
        <label class="form-label" id="variant-title-${id}">Livello linguistico <span class="required" aria-label="campo obbligatorio">*</span></label>
        <select class="form-select variant-tone" data-variant="${id}" aria-describedby="variant-title-${id}" required>
          <option value="childish" ${tone==='childish'?'selected':''}>Infantile</option>
          <option value="simple"   ${tone==='simple'?'selected':''}>Elementare</option>
          <option value="medium"   ${tone==='medium'?'selected':''}>Medio</option>
          <option value="technical" ${tone==='technical'?'selected':''}>Specialistico</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Durata <span class="required" aria-label="campo obbligatorio">*</span></label>
        <select class="form-select variant-dur" data-variant="${id}" required>
          <option value="3"   ${duration===3?'selected':''}>3 secondi</option>
          <option value="15"  ${duration===15?'selected':''}>15 secondi</option>
          <option value="40"  ${duration===40?'selected':''}>40 secondi</option>
          <option value="60"  ${duration===60?'selected':''}>1 minuto</option>
          <option value="240" ${duration===240?'selected':''}>4 minuti+</option>
        </select>
      </div>
      ${variantCount > 1 ? `<button type="button" class="variant-remove" aria-label="Rimuovi variante ${variantCount}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Rimuovi
      </button>` : ''}
    </div>
    <div class="form-group">
      <label class="form-label" for="variant-text-${id}">Testo <span class="required" aria-label="campo obbligatorio">*</span></label>
      <div class="textarea-wrap">
        <textarea id="variant-text-${id}" class="form-textarea variant-text" data-variant="${id}"
                  rows="6" required aria-required="true" style="padding-bottom:28px"
                  placeholder="Scrivi il testo della descrizione…"></textarea>
        <span class="char-count" id="cnt-${id}" aria-live="polite">0 parole</span>
      </div>
      <p class="reading-time" id="rt-${id}" aria-live="polite">Tempo di lettura stimato: —</p>
    </div>`;
  container.appendChild(block);

  const textarea = block.querySelector('.variant-text');
  const durSel   = block.querySelector('.variant-dur');
  const toneSel  = block.querySelector('.variant-tone');
  const cntEl    = block.querySelector('.char-count');
  const rtEl     = block.querySelector('.reading-time');

  textarea.addEventListener('input', () => {
    const words = textarea.value.trim() ? textarea.value.trim().split(/\s+/).length : 0;
    const readMs = Math.ceil(words / 3 * 1000);
    cntEl.textContent = `${words} parole`;
    rtEl.textContent = `Tempo di lettura stimato: ~${words < 5 ? '—' : Math.ceil(readMs/1000)+'s'}`;
    isDirty = true;
    updatePreview();
  });

  toneSel.addEventListener('change', updatePreview);
  durSel.addEventListener('change', () => { isDirty = true; });

  const removeBtn = block.querySelector('.variant-remove');
  if (removeBtn) removeBtn.addEventListener('click', () => { block.remove(); updatePreview(); });

  updatePreview();
}

/* ── Live preview ── */
function updatePreview() {
  const title = document.getElementById('artwork-title').value || 'Titolo opera';
  const imgUrl = document.getElementById('image-url').value;
  const previewImg = document.getElementById('preview-img');
  const previewTitle = document.getElementById('preview-title');
  const previewText = document.getElementById('preview-text');
  const toneChip = document.getElementById('preview-tone-chip');

  previewTitle.textContent = title;
  if (imgUrl) { previewImg.src = imgUrl; previewImg.alt = document.getElementById('image-alt').value || title; }
  else previewImg.src = '';

  const toneBlocks = [...document.querySelectorAll('.variant-block')];
  const match = toneBlocks.find(b => b.querySelector('.variant-tone')?.value === currentPreviewTone);
  if (match) {
    const text = match.querySelector('.variant-text')?.value || 'Inizia a scrivere il testo…';
    previewText.textContent = text || 'Inizia a scrivere il testo…';
  } else if (toneBlocks.length) {
    previewText.textContent = toneBlocks[0].querySelector('.variant-text')?.value || 'Inizia a scrivere il testo…';
  }

  const tc = TONE_COLORS[currentPreviewTone] || TONE_COLORS.medium;
  toneChip.textContent = TONE_MAP[currentPreviewTone] || 'Medio';
  toneChip.style.background = tc.bg;
  toneChip.style.color = tc.color;
}

/* ── Tags ── */
function renderTags() {
  const wrap = document.getElementById('tags-wrap');
  const input = document.getElementById('tags-input');
  wrap.querySelectorAll('.tag-chip').forEach(t => t.remove());
  tags.forEach((tag, idx) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${tag}<button type="button" aria-label="Rimuovi tag ${tag}">×</button>`;
    chip.querySelector('button').addEventListener('click', () => { tags.splice(idx, 1); renderTags(); });
    wrap.insertBefore(chip, input);
  });
  document.getElementById('tags-hidden').value = tags.join(',');
}

document.getElementById('tags-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/,$/, '');
    if (val && !tags.includes(val)) { tags.push(val); renderTags(); isDirty = true; }
    e.target.value = '';
  }
});
document.getElementById('tags-wrap').addEventListener('click', () => document.getElementById('tags-input').focus());

/* ── Wikidata lookup (demo) ── */
document.getElementById('btn-wikidata').addEventListener('click', async () => {
  const qid = document.getElementById('wikidata-id').value.trim();
  if (!qid) return;
  const btn = document.getElementById('btn-wikidata');
  btn.textContent = 'Ricerca…'; btn.disabled = true;
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
    const data = await res.json();
    const entity = data.entities[qid];
    const label = entity?.labels?.it?.value || entity?.labels?.en?.value || qid;
    const creator = entity?.claims?.P170?.[0]?.mainsnak?.datavalue?.value?.id;
    const img = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;

    document.getElementById('artwork-title').value = label;
    document.getElementById('wd-title').textContent = label;
    document.getElementById('wd-author').textContent = creator ? `Autore: ${creator}` : 'Autore non disponibile';
    if (img) {
      document.getElementById('wd-thumb').src = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(img)}?width=200`;
    }
    document.getElementById('wikidata-filled').classList.add('visible');
    updatePreview();
    ArtToast && ArtToast.show({ type:'success', message:`Opera trovata: ${label}` });
  } catch (err) {
    ArtToast && ArtToast.show({ type:'error', message:'Impossibile recuperare i dati da Wikidata. Compila i campi manualmente.' });
  }
  btn.textContent = 'Cerca su Wikidata'; btn.disabled = false;
});

document.getElementById('btn-wd-clear').addEventListener('click', () => {
  document.getElementById('wikidata-filled').classList.remove('visible');
  document.getElementById('wikidata-id').value = '';
  document.getElementById('artwork-title').value = '';
});

/* ── Form events ── */
document.getElementById('artwork-title').addEventListener('input', () => { isDirty = true; updatePreview(); });
document.getElementById('image-url').addEventListener('input', () => { isDirty = true; updatePreview(); });
document.getElementById('image-alt').addEventListener('input', () => { isDirty = true; updatePreview(); });

const summaryTA = document.getElementById('meta-summary');
summaryTA.addEventListener('input', () => {
  document.getElementById('meta-summary-count').textContent = `${summaryTA.value.length}/300`;
  isDirty = true;
});

document.getElementById('meta-license').addEventListener('change', e => {
  const priceInput = document.getElementById('meta-price');
  if (e.target.value !== 'Copyright') { priceInput.value = '0'; priceInput.disabled = true; }
  else priceInput.disabled = false;
});

document.getElementById('btn-add-variant').addEventListener('click', () => addVariant());

document.querySelectorAll('.preview-level-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preview-level-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPreviewTone = btn.dataset.tone;
    updatePreview();
  });
});

/* ── Save / Publish ── */
async function collectFormData() {
  const user = JSON.parse(localStorage.getItem('artaround_user') || 'null');
  const variants = [...document.querySelectorAll('.variant-block')].map(block => ({
    text: block.querySelector('.variant-text')?.value || '',
    duration_sec: parseInt(block.querySelector('.variant-dur')?.value || '60', 10),
    tone: block.querySelector('.variant-tone')?.value || 'medium',
  })).filter(v => v.text.trim());

  if (!variants.length) {
    ArtToast && ArtToast.show({ type:'error', message:'Aggiungi almeno una variante testo.' });
    return null;
  }

  return {
    marketplace_summary: document.getElementById('meta-summary').value,
    image_url: document.getElementById('image-url').value,
    license: document.getElementById('meta-license').value,
    tone: variants[0]?.tone || 'medium',
    descriptions: variants.map(v => ({ duration_sec: v.duration_sec, text: v.text })),
    price: parseFloat(document.getElementById('meta-price').value || '0'),
    author: user?._id,
    artwork: 'placeholder',
  };
}

document.getElementById('btn-save-draft').addEventListener('click', async () => {
  isDirty = false;
  const badge = document.getElementById('status-badge');
  badge.textContent = 'Bozza salvata';
  badge.className = 'status-badge badge-draft';
  ArtToast && ArtToast.show({ type:'success', message:'Bozza salvata.', duration: 3000 });
});

document.getElementById('btn-publish').addEventListener('click', async () => {
  const payload = await collectFormData();
  if (!payload) return;

  const titleVal   = document.getElementById('artwork-title').value.trim();
  const summaryVal = document.getElementById('meta-summary').value.trim();
  const imageVal   = document.getElementById('image-url').value.trim();

  let valid = true;
  if (!titleVal)   { document.getElementById('artwork-title-err').textContent = 'Il titolo è obbligatorio.'; document.getElementById('artwork-title-err').style.display='flex'; document.getElementById('artwork-title').classList.add('error'); valid=false; }
  if (!summaryVal) { document.getElementById('meta-summary-err').textContent = 'La descrizione marketplace è obbligatoria.'; document.getElementById('meta-summary-err').style.display='flex'; valid=false; }
  if (!imageVal)   { document.getElementById('image-url-err').textContent = 'L\'URL immagine è obbligatorio.'; document.getElementById('image-url-err').style.display='flex'; valid=false; }
  if (!valid) { ArtToast && ArtToast.show({ type:'error', message:'Correggi i campi evidenziati prima di pubblicare.' }); return; }

  const modal = document.getElementById('publish-modal');
  modal.innerHTML = `<div style="text-align:center;padding:var(--aa-4)">
    <div style="font-size:3rem;margin-bottom:var(--aa-4)" aria-hidden="true">🚀</div>
    <h3 style="font-family:var(--aa-font-serif);font-size:1.25rem;margin-bottom:var(--aa-3)">Pubblica «${titleVal}»?</h3>
    <p style="color:var(--aa-text-muted);margin-bottom:var(--aa-6);max-width:100%">L'item sarà visibile nel marketplace e potrà essere incluso nelle visite da altri autori.</p>
    <div style="display:flex;gap:var(--aa-3)">
      <button class="btn btn-ghost" style="flex:1" onclick="document.getElementById('publish-modal').close()">Annulla</button>
      <button class="btn btn-primary" style="flex:1" id="confirm-publish">Pubblica ora</button>
    </div>
  </div>`;
  modal.open();
  modal.querySelector('#confirm-publish').addEventListener('click', async () => {
    modal.close();
    try {
      const res = await fetch(`${API}/items/`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      const badge = document.getElementById('status-badge');
      badge.textContent = 'Pubblicato';
      badge.className = 'status-badge status-published';
      ArtToast && ArtToast.show({ type:'success', message:'Item pubblicato con successo!' });
      isDirty = false;
      setTimeout(() => { window.location.href = '/marketplace/pages/dashboard.html'; }, 2000);
    } catch (err) {
      ArtToast && ArtToast.show({ type:'error', message: err.message });
    }
  });
});

window.addEventListener('beforeunload', e => {
  if (isDirty) { e.preventDefault(); e.returnValue = ''; }
});

/* ── Init ── */
addVariant('medium', 60);
updatePreview();
