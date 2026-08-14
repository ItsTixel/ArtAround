/* ============================================================
 *  image-field.js — Campo immagine riutilizzabile
 *  Toggle tra "File locale" e "URL", con anteprima. Stesso pattern
 *  usato per le mappe in create-museum.js, estratto qui per essere
 *  condiviso da opere, descrizioni, musei e avatar del profilo.
 * ============================================================ */

export function createImageField({ initialUrl = '' } = {}) {
  const state = { mode: 'url', file: null, url: initialUrl };

  const wrap = document.createElement('div');
  wrap.className = 'image-field';

  const toggleWrap = document.createElement('div');
  toggleWrap.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;';
  const fileBtn = document.createElement('button');
  fileBtn.type = 'button';
  fileBtn.className = 'btn-secondary';
  fileBtn.textContent = 'File locale';
  const urlBtn = document.createElement('button');
  urlBtn.type = 'button';
  urlBtn.className = 'btn-secondary';
  urlBtn.textContent = 'URL';
  toggleWrap.append(fileBtn, urlBtn);
  wrap.appendChild(toggleWrap);

  const body = document.createElement('div');
  wrap.appendChild(body);

  const preview = document.createElement('img');
  preview.style.cssText = 'display:none;max-width:120px;max-height:120px;border-radius:8px;margin-top:0.5rem;object-fit:cover;';
  preview.alt = '';
  wrap.appendChild(preview);
  let previewObjectUrl = null;

  function updatePreview(src) {
    if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); previewObjectUrl = null; }
    if (!src) { preview.style.display = 'none'; preview.src = ''; return; }
    preview.src = src;
    preview.style.display = 'block';
  }

  function highlight() {
    const active = state.mode === 'file' ? fileBtn : urlBtn;
    const inactive = state.mode === 'file' ? urlBtn : fileBtn;
    active.style.borderColor = 'var(--color-accent)';
    active.style.color = 'var(--color-text)';
    inactive.style.borderColor = '';
    inactive.style.color = '';
  }

  function render() {
    highlight();
    body.innerHTML = '';
    if (state.mode === 'file') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      body.appendChild(fileInput);

      const info = document.createElement('span');
      info.style.cssText = 'display:block;font-size:0.78rem;color:var(--color-text-muted);margin-top:0.3rem;';
      body.appendChild(info);

      // Aggiorna solo il testo dell'etichetta invece di richiamare render():
      // farlo dentro il listener di "change" del file input ricreerebbe
      // l'input stesso, interrompendo l'evento che lo sta ancora gestendo.
      function updateInfo() {
        info.textContent = state.file ? `Selezionato: ${state.file.name}` : '';
      }
      updateInfo();

      fileInput.addEventListener('change', (e) => {
        state.file = e.target.files[0] || null;
        updateInfo();
        if (state.file) {
          previewObjectUrl = URL.createObjectURL(state.file);
          updatePreview(previewObjectUrl);
        } else {
          updatePreview('');
        }
      });
    } else {
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.placeholder = 'https://...';
      urlInput.value = state.url;
      urlInput.addEventListener('input', (e) => {
        state.url = e.target.value;
        updatePreview(state.url.trim());
      });
      body.appendChild(urlInput);
      updatePreview(state.url.trim());
    }
  }

  fileBtn.addEventListener('click', () => { state.mode = 'file'; render(); });
  urlBtn.addEventListener('click', () => { state.mode = 'url'; render(); });

  render();

  return {
    el: wrap,
    getValue() {
      // "File locale" senza un file selezionato non deve azzerare un url
      // già presente (es. avatar esistente): in quel caso si ricade sul
      // valore url tenuto in stato (l'url iniziale, se non toccato).
      if (state.mode === 'file' && state.file) return { file: state.file, url: '' };
      return { file: null, url: state.url.trim() };
    },
  };
}
