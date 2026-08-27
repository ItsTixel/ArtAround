/* ============================================================
 *  museum-form-fields.js — Campi dinamici del form museo, condivisi
 *  tra la pagina "Crea Museo" (create-museum.js) e il form di
 *  modifica di <museum-modal>: orari di apertura, servizi,
 *  dettagli di accessibilità e mappe (piante con punti di interesse).
 * ============================================================ */

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
let uid = 0;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---- Orari di apertura: griglia fissa dei 7 giorni ---- */

export function setupHoursGrid(container, initialHours = {}) {
  container.className = 'hours-grid';
  container.innerHTML = '';
  DAYS.forEach(day => {
    const row = document.createElement('div');
    row.className = 'hours-row';
    const id = `hours-${day}-${uid++}`;
    row.innerHTML = `
      <label for="${id}">${day}</label>
      <input id="${id}" data-day="${day}" type="text" placeholder="9:00–19:00 oppure Chiuso" value="${esc(initialHours[day])}">
    `;
    container.appendChild(row);
  });

  return {
    collect() {
      const hours = {};
      container.querySelectorAll('input[data-day]').forEach(input => {
        const val = input.value.trim();
        if (val) hours[input.dataset.day] = val;
      });
      return hours;
    },
  };
}

/* ---- Elenco chiave/valore: usato sia per i servizi sia per i
 * dettagli di accessibilità (stessa struttura, etichette diverse). ---- */

export function setupKvList(container, addBtn, initial = {}, opts = {}) {
  const { keyPlaceholder = '', valuePlaceholder = '', removeLabel = 'Rimuovi' } = opts;

  function addRow(key = '', value = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row kv';
    row.innerHTML = `
      <input type="text" class="dynamic-key" placeholder="${esc(keyPlaceholder)}" value="${esc(key)}">
      <input type="text" class="dynamic-value" placeholder="${esc(valuePlaceholder)}" value="${esc(value)}">
      <button type="button" class="remove-row" aria-label="${esc(removeLabel)}">✕</button>
    `;
    row.querySelector('.remove-row').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  addBtn.addEventListener('click', () => addRow());

  container.innerHTML = '';
  const entries = Object.entries(initial);
  if (entries.length) entries.forEach(([k, v]) => addRow(k, v));
  else addRow();

  return {
    collect() {
      const out = {};
      container.querySelectorAll('.dynamic-row').forEach(row => {
        const key = row.querySelector('.dynamic-key').value.trim();
        const value = row.querySelector('.dynamic-value').value.trim();
        if (key && value) out[key] = value;
      });
      return out;
    },
  };
}

/* ---- Mappe: immagine (file locale o URL) + JSON di indicazioni
 * (nome pianta + punti di interesse), un file separato dall'immagine.
 * In modifica, ogni mappa esistente parte già "completa" (URL corrente +
 * nome/punti correnti): se l'utente non tocca uno slot, viene rimandato
 * al server esattamente com'era. Per sostituire nome/punti basta caricare
 * un nuovo JSON; per sostituire l'immagine, un nuovo file o un nuovo URL. ---- */

const ALLOWED_ICON_TYPES = ['service', 'entity', 'generic'];

function readFileAsJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error(`"${file.name}": il file non è un JSON valido.`));
      }
    };
    reader.onerror = () => reject(new Error(`"${file.name}": impossibile leggere il file.`));
    reader.readAsText(file);
  });
}

function validateMapIndications(data, filename) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`"${filename}": il file deve contenere un oggetto JSON.`);
  }
  if (!data.name || typeof data.name !== 'string') {
    throw new Error(`"${filename}": manca il campo "name".`);
  }
  const rawPoints = Array.isArray(data.points) ? data.points : [];
  const points = rawPoints.map((p, i) => {
    if (!p || typeof p !== 'object') throw new Error(`"${filename}": il punto ${i + 1} non è un oggetto valido.`);
    if (!p.label || typeof p.label !== 'string') throw new Error(`"${filename}": il punto ${i + 1} non ha una "label".`);
    if (typeof p.x !== 'number' || p.x < 0 || p.x > 1) throw new Error(`"${filename}": il punto ${i + 1} ha una "x" non valida (deve essere un numero tra 0 e 1).`);
    if (typeof p.y !== 'number' || p.y < 0 || p.y > 1) throw new Error(`"${filename}": il punto ${i + 1} ha una "y" non valida (deve essere un numero tra 0 e 1).`);
    return {
      label: p.label.trim(),
      icon_type: ALLOWED_ICON_TYPES.includes(p.icon_type) ? p.icon_type : 'generic',
      x: p.x,
      y: p.y,
      ...(p.service_key ? { service_key: String(p.service_key).trim() } : {}),
      ...(p.entity ? { entity: String(p.entity).trim() } : {}),
      ...(p.description ? { description: String(p.description).trim() } : {}),
    };
  });

  return { name: data.name.trim(), points };
}

function fieldLabel(text) {
  const label = document.createElement('span');
  label.textContent = text;
  label.style.cssText =
    'display:block;font-size:0.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:0.3rem;';
  return label;
}

export function setupMapsList(container, addBtn, initialMaps = []) {
  let slots = [];

  function addSlot(existing = null) {
    slots.push({
      id: uid++,
      imageMode: 'file',
      imageFile: null,
      imageUrl: existing?.image_url || '',
      mapData: existing ? { name: existing.name, points: existing.points || [] } : null,
      mapDataLabel: existing ? `Mappa attuale: "${existing.name}" — ${(existing.points || []).length} punt${(existing.points || []).length === 1 ? 'o' : 'i'} di interesse` : '',
      mapDataError: '',
    });
    if (existing) slots[slots.length - 1].imageMode = 'url';
    render();
  }

  function buildSlotRow(slot) {
    const row = document.createElement('div');
    row.className = 'dynamic-row stack';

    row.appendChild(fieldLabel('Immagine della pianta'));

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
    if (slot.imageMode === 'file') {
      fileBtn.style.borderColor = 'var(--color-accent)';
      fileBtn.style.color = 'var(--color-text)';
    } else {
      urlBtn.style.borderColor = 'var(--color-accent)';
      urlBtn.style.color = 'var(--color-text)';
    }
    fileBtn.addEventListener('click', () => { slot.imageMode = 'file'; render(); });
    urlBtn.addEventListener('click', () => { slot.imageMode = 'url'; render(); });
    toggleWrap.append(fileBtn, urlBtn);
    row.appendChild(toggleWrap);

    if (slot.imageMode === 'file') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.addEventListener('change', (e) => {
        slot.imageFile = e.target.files[0] || null;
        render();
      });
      row.appendChild(fileInput);
      if (slot.imageFile) {
        const info = document.createElement('span');
        info.style.cssText = 'display:block;font-size:0.78rem;color:var(--color-text-muted);margin-top:0.3rem;';
        info.textContent = `Selezionato: ${slot.imageFile.name}`;
        row.appendChild(info);
      }
    } else {
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.placeholder = 'https://...';
      urlInput.value = slot.imageUrl;
      urlInput.addEventListener('input', (e) => { slot.imageUrl = e.target.value; });
      row.appendChild(urlInput);
    }

    const jsonLabel = fieldLabel('JSON indicazioni (nome pianta + punti)');
    jsonLabel.style.marginTop = '0.9rem';
    row.appendChild(jsonLabel);

    const jsonStatusId = `json-status-${slot.id}`;

    const jsonInput = document.createElement('input');
    jsonInput.type = 'file';
    jsonInput.accept = 'application/json,.json';
    jsonInput.setAttribute('aria-describedby', jsonStatusId);
    jsonInput.setAttribute('aria-invalid', String(!!slot.mapDataError));
    jsonInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const raw = await readFileAsJson(file);
        slot.mapData = validateMapIndications(raw, file.name);
        slot.mapDataLabel = `"${slot.mapData.name}" — ${slot.mapData.points.length} punt${slot.mapData.points.length === 1 ? 'o' : 'i'} di interesse (${file.name})`;
        slot.mapDataError = '';
      } catch (err) {
        slot.mapData = null;
        slot.mapDataError = err.message;
      }
      render();
    });
    row.appendChild(jsonInput);

    const jsonStatus = document.createElement('span');
    jsonStatus.id = jsonStatusId;
    jsonStatus.style.cssText = 'display:block;font-size:0.78rem;margin-top:0.3rem;';
    if (slot.mapDataError) {
      jsonStatus.style.color = 'var(--color-danger)';
      jsonStatus.setAttribute('role', 'alert');
      jsonStatus.textContent = slot.mapDataError;
      row.appendChild(jsonStatus);
    } else if (slot.mapData) {
      jsonStatus.style.color = 'var(--color-text-muted)';
      jsonStatus.textContent = slot.mapDataLabel;
      row.appendChild(jsonStatus);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-row';
    removeBtn.setAttribute('aria-label', 'Rimuovi mappa');
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      slots = slots.filter(s => s.id !== slot.id);
      render();
    });
    row.appendChild(removeBtn);

    return row;
  }

  function render() {
    container.innerHTML = '';
    slots.forEach(slot => container.appendChild(buildSlotRow(slot)));
  }

  addBtn.addEventListener('click', () => addSlot());

  initialMaps.forEach(m => addSlot(m));
  render();

  return {
    validate() {
      for (const slot of slots) {
        const hasImage = slot.imageMode === 'file' ? !!slot.imageFile : !!slot.imageUrl.trim();
        if (!hasImage || !slot.mapData) {
          return 'Ogni mappa allegata deve avere sia un\'immagine sia un JSON di indicazioni valido (o rimuovila con ✕).';
        }
      }
      return null;
    },
    appendToFormData(formData) {
      const mapsMeta = slots.map(slot => ({
        name: slot.mapData.name,
        points: slot.mapData.points,
        image_url: slot.imageMode === 'url' ? slot.imageUrl.trim() : undefined,
      }));
      formData.append('mapsMeta', JSON.stringify(mapsMeta));
      slots.forEach((slot, i) => {
        if (slot.imageMode === 'file' && slot.imageFile) {
          formData.append(`mapImage_${i}`, slot.imageFile);
        }
      });
    },
  };
}
