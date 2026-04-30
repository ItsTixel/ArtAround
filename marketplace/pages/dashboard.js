const API = 'http://localhost:8000/api';
const TONE_MAP   = { childish:'Infantile', simple:'Elementare', medium:'Medio', technical:'Specialistico' };
const TONE_CLASS = { childish:'tone-childish', simple:'tone-simple', medium:'tone-medium', technical:'tone-technical' };

/* ── Section switching ── */
function goTo(sectionId) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => { l.classList.remove('active'); l.removeAttribute('aria-current'); });
  const target = document.getElementById(`section-${sectionId}`);
  if (target) target.classList.add('active');
  const link = document.querySelector(`[data-section="${sectionId}"]`);
  if (link) { link.classList.add('active'); link.setAttribute('aria-current','true'); }
}

document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
  link.addEventListener('click', () => goTo(link.dataset.section));
});

/* ── Sidebar collapse (desktop) ── */
const sidebar  = document.getElementById('sidebar');
const toggle   = document.getElementById('sidebar-toggle');
const backdrop = document.getElementById('sidebar-backdrop');

toggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  const collapsed = sidebar.classList.contains('collapsed');
  toggle.setAttribute('aria-expanded', String(!collapsed));
  toggle.setAttribute('aria-label', collapsed ? 'Apri menu laterale' : 'Chiudi menu laterale');
});

/* ── Mobile sidebar drawer ── */
function closeMobileSidebar() {
  sidebar.classList.remove('open');
  backdrop.classList.remove('visible');
  document.getElementById('mobile-dash-btn').setAttribute('aria-expanded', 'false');
}

document.getElementById('mobile-dash-btn').addEventListener('click', () => {
  const isOpen = sidebar.classList.toggle('open');
  backdrop.classList.toggle('visible', isOpen);
  document.getElementById('mobile-dash-btn').setAttribute('aria-expanded', String(isOpen));
});

backdrop.addEventListener('click', closeMobileSidebar);

document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
  link.addEventListener('click', () => { if (window.innerWidth <= 1024) closeMobileSidebar(); });
});

/* ── Load user items ── */
const user = JSON.parse(localStorage.getItem('artaround_user') || 'null');
if (!user) { window.location.href = '/marketplace/pages/login.html'; }

const mockItems = [
  { _id:'i1', title:'Nascita di Venere', tone:'medium',    license:'CC-BY',    price:0.50, status:'published', adoptions:87, image:'https://picsum.photos/seed/venus/48/36' },
  { _id:'i2', title:'La Primavera',       tone:'simple',   license:'CC0',      price:0,    status:'published', adoptions:64, image:'https://picsum.photos/seed/spring/48/36' },
  { _id:'i3', title:'Annunciazione',      tone:'technical',license:'Copyright', price:0.50, status:'published', adoptions:51, image:'https://picsum.photos/seed/annun/48/36' },
  { _id:'i4', title:'Ratto di Proserpina',tone:'medium',   license:'CC-BY-NC', price:0.50, status:'published', adoptions:38, image:'https://picsum.photos/seed/proserpina/48/36' },
  { _id:'i5', title:'Bozza item nuovo',   tone:'simple',   license:'CC-BY',    price:0,    status:'draft',     adoptions:0,  image:'https://picsum.photos/seed/draft/48/36' },
];

function renderItemsTable(items) {
  const tbody = document.getElementById('items-tbody');
  tbody.innerHTML = items.map(item => `
    <tr>
      <td><input type="checkbox" class="table-check row-check" aria-label="Seleziona item ${item.title}" data-id="${item._id}"></td>
      <td>
        <div style="display:flex;align-items:center;gap:var(--aa-3)">
          <img class="item-thumb" src="${item.image}" alt="">
          <div>
            <p class="item-title">${item.title}</p>
            <p class="item-sub">ID: ${item._id}</p>
          </div>
        </div>
      </td>
      <td><span class="badge ${TONE_CLASS[item.tone] || 'tone-medium'}" style="border:none">${TONE_MAP[item.tone] || '—'}</span></td>
      <td>${item.license}</td>
      <td>${item.price === 0 ? '<span style="color:var(--aa-success);font-weight:600">Gratuito</span>' : `€${item.price.toFixed(2)}`}</td>
      <td><span class="badge ${item.status === 'published' ? 'badge-success' : 'badge-draft'}">${item.status === 'published' ? 'Pubblicato' : 'Bozza'}</span></td>
      <td>${item.adoptions}</td>
      <td>
        <div class="table-actions">
          <button class="table-action-btn" type="button" aria-label="Modifica item: ${item.title}" title="Modifica" onclick="window.location.href='/marketplace/pages/create-item.html?id=${item._id}'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="table-action-btn" type="button" aria-label="Duplica item: ${item.title}" title="Duplica">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="table-action-btn danger" type="button" aria-label="Elimina item: ${item.title}" title="Elimina">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');

  const checkAll = document.getElementById('check-all');
  const bulkBar  = document.getElementById('bulk-toolbar');
  const updateBulk = () => {
    const checked = [...document.querySelectorAll('.row-check:checked')];
    if (checked.length > 0) {
      bulkBar.classList.add('visible');
      document.getElementById('bulk-count').textContent = `${checked.length} selezionati`;
    } else {
      bulkBar.classList.remove('visible');
    }
  };
  checkAll.addEventListener('change', () => {
    document.querySelectorAll('.row-check').forEach(c => { c.checked = checkAll.checked; });
    updateBulk();
  });
  document.querySelectorAll('.row-check').forEach(c => c.addEventListener('change', updateBulk));
  document.getElementById('bulk-cancel').addEventListener('click', () => {
    checkAll.checked = false;
    document.querySelectorAll('.row-check').forEach(c => { c.checked = false; });
    updateBulk();
  });
}

function renderVisitsTable() {
  const mockVisits = [
    { title:'Rinascimento Fiorentino', museum:'Galleria degli Uffizi', items:12, price:0, status:'published', adoptions:142 },
    { title:'Arte Greco-Romana', museum:'Museo Nazionale Romano', items:18, price:2.99, status:'published', adoptions:87 },
    { title:'Scultura Barocca a Roma', museum:'Galleria Borghese', items:15, price:2.49, status:'published', adoptions:38 },
    { title:'Visita bozza — Caravaggio', museum:'Galleria Nazionale', items:5, price:0, status:'draft', adoptions:0 },
  ];
  const tbody = document.getElementById('visits-tbody');
  tbody.innerHTML = mockVisits.map(v => `
    <tr>
      <td><strong>${v.title}</strong></td>
      <td style="color:var(--aa-text-muted)">${v.museum}</td>
      <td>${v.items} opere</td>
      <td>${v.price === 0 ? '<span style="color:var(--aa-success)">Gratuito</span>' : `€${v.price.toFixed(2)}`}</td>
      <td><span class="badge ${v.status === 'published' ? 'badge-success' : 'badge-draft'}">${v.status === 'published' ? 'Pubblicata' : 'Bozza'}</span></td>
      <td>${v.adoptions}</td>
      <td>
        <div class="table-actions">
          <button class="table-action-btn" type="button" aria-label="Modifica sequenza: ${v.title}" title="Modifica sequenza">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          ${v.status === 'draft'
            ? `<button class="table-action-btn" type="button" aria-label="Pubblica visita: ${v.title}" title="Pubblica"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></button>`
            : `<button class="table-action-btn" type="button" aria-label="Ritira visita: ${v.title}" title="Ritira"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></button>`}
          <button class="table-action-btn danger" type="button" aria-label="Elimina visita: ${v.title}" title="Elimina">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('btn-new-visit').addEventListener('click', () => {
  const modal = document.getElementById('visit-builder-modal');
  modal.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--aa-4)">
      <p style="color:var(--aa-text-muted);font-size:var(--aa-sm);max-width:100%">Crea una nuova visita guidata selezionando e ordinando i tuoi item già pubblicati.</p>
      <div class="form-group">
        <label class="form-label" for="visit-title-new">Titolo visita <span class="required">*</span></label>
        <input type="text" id="visit-title-new" class="form-input" placeholder="Es. Rinascimento Fiorentino">
      </div>
      <div class="form-group">
        <label class="form-label" for="visit-museum-sel">Museo <span class="required">*</span></label>
        <select id="visit-museum-sel" class="form-select"><option>Seleziona museo…</option></select>
      </div>
      <div class="form-group">
        <label class="form-label" for="visit-price-new">Prezzo base (€)</label>
        <input type="number" id="visit-price-new" class="form-input" min="0" step="0.01" value="0">
      </div>
      <div class="form-group">
        <label class="form-label">Item inclusi</label>
        <p style="font-size:var(--aa-sm);color:var(--aa-text-muted);max-width:100%">Funzionalità di ordinamento drag-and-drop disponibile nella prossima versione.</p>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:var(--aa-3);margin-top:var(--aa-2)">
        <button class="btn btn-ghost" onclick="document.getElementById('visit-builder-modal').close()" type="button">Annulla</button>
        <button class="btn btn-primary" type="button" onclick="ArtToast && ArtToast.show({type:'info',message:'Creazione visita non ancora collegata al backend.'});document.getElementById('visit-builder-modal').close();">Crea visita</button>
      </div>
    </div>`;
  modal.open();
  fetch(`${API}/museums/?pageSize=100`).then(r=>r.json()).then(d => {
    const sel = modal.querySelector('#visit-museum-sel');
    d.data.forEach(m => { sel.innerHTML += `<option value="${m._id}">${m.name}</option>`; });
  }).catch(()=>{});
});

(async function initItems() {
  if (!user) return;
  try {
    const res = await fetch(`${API}/items/?author=${user._id}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    if (data.data?.length) { renderItemsTable(data.data.map(i => ({...i, status: 'published', adoptions: 0}))); return; }
  } catch {}
  renderItemsTable(mockItems);
})();

renderVisitsTable();
