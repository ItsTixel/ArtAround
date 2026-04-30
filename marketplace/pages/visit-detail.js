const API = 'http://localhost:8000/api';
const TONE_MAP   = { childish:'Infantile', simple:'Elementare', medium:'Medio', technical:'Specialistico' };
const TONE_CLASS = { childish:'tone-childish', simple:'tone-simple', medium:'tone-medium', technical:'tone-technical' };

const params  = new URLSearchParams(window.location.search);
const visitId = params.get('id');

function fmt(sec) {
  if (!sec) return '—';
  const m = Math.ceil(sec / 60);
  return m >= 60 ? `${Math.floor(m/60)}h ${m%60>0?m%60+'min':''}`.trim() : `${m} min`;
}

function starsSVG(n) {
  return Array.from({length:Math.round(n)}).map(()=>`<svg width="13" height="13" viewBox="0 0 24 24" fill="#C9A84C" stroke="#C9A84C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`).join('');
}

async function loadVisit() {
  let visit;
  try {
    if (!visitId || visitId.startsWith('m')) throw new Error('mock');
    const res = await fetch(`${API}/visits/${visitId}`);
    if (!res.ok) throw new Error('not found');
    visit = await res.json();
  } catch {
    visit = getMockVisit();
  }
  renderVisit(visit);
}

function getMockVisit() {
  return {
    _id: 'mock1',
    title: 'Rinascimento Fiorentino: Botticelli e i suoi contemporanei',
    description: 'Un viaggio straordinario attraverso uno dei periodi più luminosi dell\'arte italiana. Dalla Sala della Venere alle sale degli Uffizi, scoprite i capolavori di Botticelli, Filippino Lippi e Leonardo, guidati dalle spiegazioni di Sofia Marchetti, storica dell\'arte specializzata nel Quattrocento italiano.\n\nQuesta visita è pensata per appassionati e curiosi che vogliono comprendere il contesto storico-artistico del Rinascimento fiorentino: dai Medici mecenati alle botteghe degli artisti, dalle tecniche pittoriche ai significati iconografici nascosti.',
    museum: { name: 'Galleria degli Uffizi', address: { city: 'Firenze', country: 'Italia' } },
    author: { username: 'Sofia Marchetti', role: 'author' },
    base_price: 0,
    steps: [
      { entity: { name: 'Nascita di Venere', location: { room: 'Sala 10-14', floor: 'P1' } }, items: [
        { image_url: 'https://picsum.photos/seed/venus/72/72', tone: 'medium', descriptions: [{ duration_sec: 240, text: '' }], price: 0, license: 'CC-BY' },
      ], order: 1 },
      { entity: { name: 'La Primavera', location: { room: 'Sala 10-14', floor: 'P1' } }, items: [
        { image_url: 'https://picsum.photos/seed/spring/72/72', tone: 'simple', descriptions: [{ duration_sec: 180, text: '' }], price: 0, license: 'CC-BY' },
      ], order: 2 },
      { entity: { name: 'Annunciazione (Leonardo)', location: { room: 'Sala 15', floor: 'P1' } }, items: [
        { image_url: 'https://picsum.photos/seed/annun/72/72', tone: 'technical', descriptions: [{ duration_sec: 300, text: '' }], price: 0, license: 'CC-BY' },
      ], order: 3 },
    ],
  };
}

function renderVisit(v) {
  const allItems = (v.steps || []).flatMap(s => s.items || []);
  const totalSec = allItems.reduce((s, i) => s + ((i?.descriptions?.[0]?.duration_sec) || 0), 0);
  const tones    = allItems.map(i => i?.tone).filter(Boolean);
  const pTone    = tones.length
    ? Object.entries(tones.reduce((a,t)=>{a[t]=(a[t]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1])[0][0]
    : 'medium';
  const price = v.base_price ?? 0;
  const firstImg = allItems.find(i=>i?.image_url)?.image_url || `https://picsum.photos/seed/${v._id}/1200/500`;

  document.title = `${v.title} — ArtAround`;
  document.getElementById('bc-title').textContent      = v.title;
  document.getElementById('visit-title').textContent   = v.title;
  document.getElementById('hero-img').src              = firstImg;
  document.getElementById('hero-img').alt              = `Immagine per la visita: ${v.title}`;

  document.getElementById('meta-duration').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${fmt(totalSec)}`;
  const tonePill = document.getElementById('meta-tone');
  tonePill.textContent = TONE_MAP[pTone] || 'Medio';
  tonePill.className = `meta-pill tone-pill ${TONE_CLASS[pTone] || 'tone-medium'}`;
  document.getElementById('meta-items').innerHTML  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></rect></svg>${allItems.length} opere`;
  document.getElementById('meta-museum').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${v.museum?.name || '—'}`;

  const uname = v.author?.username || 'Anonimo';
  document.getElementById('author-name').textContent = uname;
  document.getElementById('author-av').textContent   = uname[0].toUpperCase();

  const descText = (v.description || 'Nessuna descrizione disponibile.')
    .split('\n\n').map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  document.getElementById('desc-text').innerHTML = descText;

  const tagsRow = document.getElementById('tags-row');
  const tags = [v.museum?.name, v.museum?.address?.city, TONE_MAP[pTone], 'Arte rinascimentale'].filter(Boolean);
  tagsRow.innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');

  const list = document.getElementById('artwork-list');
  list.innerHTML = (v.steps || []).sort((a,b)=>a.order-b.order).map((step, si) => {
    const entity = step.entity || {};
    const item   = step.items?.[0] || {};
    const dur    = item?.descriptions?.[0]?.duration_sec || 0;
    const tone   = item?.tone || 'medium';
    return `
      <div class="artwork-item">
        <div class="artwork-num" aria-hidden="true">${si+1}</div>
        <img class="artwork-img" src="${item.image_url || `https://picsum.photos/seed/art${si}/72/72`}" alt="${entity.name || 'Opera d\'arte'}">
        <div class="artwork-body">
          <p class="artwork-title">${entity.name || 'Opera senza titolo'}</p>
          <p class="artwork-location">${[entity.location?.room, entity.location?.floor].filter(Boolean).join(' — ') || 'Posizione non disponibile'}</p>
          <div class="artwork-chips">
            <span class="badge tone-pill ${TONE_CLASS[tone] || 'tone-medium'}">${TONE_MAP[tone] || '—'}</span>
            ${dur ? `<span class="dur-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${fmt(dur)}</span>` : ''}
            ${step.logistic_note ? `<span class="dur-badge" style="color:var(--aa-gold-text)">📍 ${step.logistic_note}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  const priceEl   = document.getElementById('price-main');
  const mPriceEl  = document.getElementById('mobile-price');
  const priceSub  = document.getElementById('price-sub');
  const licenseEl = document.getElementById('license-label');

  const priceStr = price === 0 ? 'Gratuito' : `€${price.toFixed(2)}`;
  const priceClass = price === 0 ? 'free' : '';
  priceEl.textContent  = priceStr;
  priceEl.className    = `price-main ${priceClass}`;
  mPriceEl.textContent = priceStr;
  mPriceEl.className   = `mobile-price ${priceClass}`;
  priceSub.textContent = price === 0 ? 'Accesso gratuito e permanente' : 'Acquisto una tantum';
  licenseEl.textContent= `Licenza ${allItems[0]?.license || 'CC-BY'}`;

  document.getElementById('stat-adoptions').textContent = String(Math.floor(Math.random()*200+20));
  document.getElementById('stat-updated').textContent   = 'Apr 2025';
}

/* ── Tab switching ── */
document.querySelectorAll('[role="tab"]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[role="tab"]').forEach(t => t.setAttribute('aria-selected','false'));
    document.querySelectorAll('.detail-tab-content').forEach(p => p.classList.remove('active'));
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

/* ── Adopt ── */
function handleAdopt() {
  const user = JSON.parse(localStorage.getItem('artaround_user') || 'null');
  if (!user) { window.location.href = '/marketplace/pages/login.html'; return; }
  const modal = document.getElementById('adopt-modal');
  modal.innerHTML = `
    <div style="text-align:center;padding:var(--aa-4)">
      <div style="font-size:3rem;margin-bottom:var(--aa-4)" aria-hidden="true">🎉</div>
      <h3 style="font-family:var(--aa-font-serif);font-size:1.25rem;margin-bottom:var(--aa-3)">Visita adottata!</h3>
      <p style="color:var(--aa-text-muted);margin-bottom:var(--aa-6);max-width:100%">La visita è stata aggiunta al tuo profilo e puoi aprirla in qualsiasi momento nel Navigator.</p>
      <div style="display:flex;gap:var(--aa-3)">
        <button class="btn btn-primary" style="flex:1" onclick="document.getElementById('adopt-modal').close()">Continua a esplorare</button>
        <a href="/marketplace/pages/profile.html" class="btn btn-secondary" style="flex:1">Vai al profilo</a>
      </div>
    </div>`;
  modal.open();
  if (window.ArtToast) ArtToast.show({ type:'success', message:'Visita adottata con successo!' });
}

document.getElementById('btn-adopt').addEventListener('click', handleAdopt);
document.getElementById('btn-adopt-mobile').addEventListener('click', handleAdopt);
document.getElementById('btn-navigator').addEventListener('click', () => {
  ArtToast && ArtToast.show({ type:'info', message:'Apertura Navigator non ancora disponibile in questa versione.' });
});
document.getElementById('btn-follow').addEventListener('click', e => {
  const btn = e.currentTarget;
  const following = btn.textContent.trim() === 'Segui' ? false : true;
  btn.textContent = following ? 'Segui' : 'Seguito';
  btn.classList.toggle('btn-primary', !following);
  btn.classList.toggle('btn-secondary', following);
});

document.querySelectorAll('.share-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    navigator.clipboard && navigator.clipboard.writeText(window.location.href);
    ArtToast && ArtToast.show({ type:'success', message:'Link copiato negli appunti!' });
  });
});

loadVisit();
