const API = 'http://localhost:8000/api';

const user = JSON.parse(localStorage.getItem('artaround_user') || 'null');
if (!user) { window.location.href = '/marketplace/pages/login.html'; }

function initProfile() {
  if (!user) return;
  const name = user.username || user.email || 'Utente';
  document.title = `${name} — ArtAround`;
  document.getElementById('profile-name').textContent = name;
  document.getElementById('avatar-lg').textContent   = name[0].toUpperCase();
  const roleEl = document.getElementById('profile-role');
  if (user.role === 'author') {
    roleEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Autore di contenuti`;
  }
  document.getElementById('set-username').value = user.username || '';
  document.getElementById('set-email').value    = user.email    || '';

  const bookmarks = JSON.parse(localStorage.getItem('artaround_bookmarks') || '[]');
  document.getElementById('pstat-saved').textContent = String(bookmarks.length);

  const mockAdopted = [
    { id:'a1', title:'Rinascimento Fiorentino', museum:'Galleria degli Uffizi', city:'Firenze', price:0, image:'https://picsum.photos/seed/florence/600/340', duration:2700, tone:'simple', itemCount:12, author:'Sofia Marchetti' },
    { id:'a2', title:'Scultura Barocca a Roma', museum:'Galleria Borghese', city:'Roma', price:0, image:'https://picsum.photos/seed/borghese/600/340', duration:3000, tone:'medium', itemCount:15, author:'Dr. Lucia Barbieri' },
  ];
  document.getElementById('pstat-adopted').textContent = String(mockAdopted.length);

  const adoptedGrid = document.getElementById('adopted-grid');
  if (mockAdopted.length) {
    adoptedGrid.innerHTML = '';
    mockAdopted.forEach(v => {
      const card = document.createElement('art-visit-card');
      card.setAttribute('visit-id', v.id);
      card.setAttribute('title', v.title);
      card.setAttribute('museum', v.museum);
      card.setAttribute('city', v.city);
      card.setAttribute('price', String(v.price));
      card.setAttribute('image', v.image);
      card.setAttribute('duration', String(v.duration));
      card.setAttribute('tone', v.tone);
      card.setAttribute('item-count', String(v.itemCount));
      card.setAttribute('author', v.author);
      adoptedGrid.appendChild(card);
    });
  }

  const mockHistory = [
    { title:'L\'Arte Greco-Romana', museum:'Museo Nazionale Romano', date:'Oggi, 14:23', img:'https://picsum.photos/seed/rome/72/54' },
    { title:'Impressionismo e Post-Impressionismo', museum:'Pinacoteca di Brera', date:'Ieri, 10:15', img:'https://picsum.photos/seed/milan/72/54' },
    { title:'I Segreti del Louvre', museum:'Musée du Louvre', date:'2 giorni fa', img:'https://picsum.photos/seed/louvre/72/54' },
  ];
  const histList = document.getElementById('history-list');
  if (mockHistory.length) {
    histList.innerHTML = '';
    mockHistory.forEach(h => {
      histList.innerHTML += `
        <div class="history-item">
          <img class="history-img" src="${h.img}" alt="" loading="lazy">
          <div class="history-body">
            <p class="history-title">${h.title}</p>
            <p class="history-museum">${h.museum}</p>
          </div>
          <time class="history-date">${h.date}</time>
        </div>`;
    });
  }
}

/* ── Tabs ── */
document.querySelectorAll('[role="tab"]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[role="tab"]').forEach(t => t.setAttribute('aria-selected','false'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.setAttribute('aria-selected','true');
    document.getElementById(tab.getAttribute('aria-controls')).classList.add('active');
  });
  tab.addEventListener('keydown', e => {
    const all = [...document.querySelectorAll('[role="tab"]')];
    const i = all.indexOf(tab);
    if (e.key === 'ArrowRight') { all[(i+1)%all.length].focus(); all[(i+1)%all.length].click(); }
    if (e.key === 'ArrowLeft')  { all[(i-1+all.length)%all.length].focus(); all[(i-1+all.length)%all.length].click(); }
  });
});

/* ── Save settings ── */
document.getElementById('btn-save-profile').addEventListener('click', async () => {
  const newUsername = document.getElementById('set-username').value.trim();
  const newEmail    = document.getElementById('set-email').value.trim();
  if (!newUsername || !newEmail) {
    ArtToast && ArtToast.show({ type:'error', message:'Username ed email sono obbligatori.' });
    return;
  }
  const updated = { ...user, username: newUsername, email: newEmail };
  localStorage.setItem('artaround_user', JSON.stringify(updated));
  document.getElementById('profile-name').textContent = newUsername;
  document.getElementById('avatar-lg').textContent   = newUsername[0].toUpperCase();
  ArtToast && ArtToast.show({ type:'success', message:'Profilo aggiornato.' });
});

/* ── Delete account ── */
document.getElementById('btn-delete').addEventListener('click', () => {
  const modal = document.getElementById('delete-modal');
  modal.innerHTML = `<div style="text-align:center;padding:var(--aa-2)">
    <div style="font-size:2.5rem;margin-bottom:var(--aa-4)" aria-hidden="true">⚠️</div>
    <p style="color:var(--aa-text-muted);margin-bottom:var(--aa-6);max-width:100%">Sei sicuro di voler eliminare definitivamente il tuo account? Questa azione non può essere annullata.</p>
    <div style="display:flex;gap:var(--aa-3)">
      <button class="btn btn-ghost" style="flex:1" onclick="document.getElementById('delete-modal').close()">Annulla</button>
      <button class="btn btn-danger" style="flex:1" id="confirm-delete">Sì, elimina</button>
    </div>
  </div>`;
  modal.open();
  modal.querySelector('#confirm-delete').addEventListener('click', () => {
    localStorage.removeItem('artaround_user');
    localStorage.removeItem('artaround_bookmarks');
    window.location.href = '/marketplace/pages/login.html';
  });
});

/* ── Edit profile ── */
document.getElementById('btn-edit-profile').addEventListener('click', () => {
  document.querySelector('[aria-controls="panel-settings"]').click();
  document.getElementById('set-username').focus();
});

initProfile();
