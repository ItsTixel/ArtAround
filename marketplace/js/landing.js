/**
 * Pagina iniziale (/): tutti i dati arrivano dal client via API, la
 * pagina stessa è markup statico servito da Express (vedi backend/routes/landing.js).
 */

import { getCurrentUser } from '/marketplace/js/auth-session.js';

async function fetchJson(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

// Stessa normalizzazione di normalizeVisit() in marketplace/js/visits.js,
// ridotta ai soli campi che <visit-card> mostra qui: nome, immagini delle
// opere in visita (per il carosello), musei coinvolti e durata stimata.
function toVisitCardData(v) {
	const museumDetails = (v.museum || []).map(m => ({
		id: m._id,
		name: m.name || '',
		short: m.name || '',
		city: m.address?.city || '',
	}));
	const seen = new Set();
	const images = [];
	for (const step of [...(v.steps || [])].sort((a, b) => a.order - b.order)) {
		const url = step.entity?.image_url;
		if (url && !seen.has(url)) { seen.add(url); images.push({ url, alt: step.entity.alt_text || step.entity.name || '' }); }
	}
	return { id: v._id, title: v.title || '', images, museumDetails, durationSec: v.estimated_duration_sec || 0 };
}

function entityRow({ rowClass, thumbClass, textClass, entity }) {
	const museum = entity.placements?.[0]?.museum;
	const row = document.createElement('div');
	row.className = rowClass;
	row.innerHTML = `
		<img class="${thumbClass}" alt="" loading="lazy">
		<div class="${textClass}">
			<div class="name"></div>
			<div class="meta"></div>
		</div>`;
	row.querySelector('img').src = entity.image_url || '';
	row.querySelector('img').alt = entity.alt_text || entity.name || '';
	row.querySelector('.name').textContent = entity.name || '';
	row.querySelector('.meta').textContent = museum?.name || '';
	return row;
}

function previewItem(entity) {
	return entityRow({ rowClass: 'lp-preview-item', thumbClass: 'lp-preview-thumb', textClass: 'lp-preview-text', entity });
}

function modeRow(entity) {
	return entityRow({ rowClass: 'lp-mode-row', thumbClass: 'lp-mode-thumb', textClass: 'text', entity });
}

function renderStats({ museumsCount, entitiesCount, visitsCount }) {
	document.getElementById('lp-stat-museums').textContent = museumsCount;
	document.getElementById('lp-stat-entities').textContent = entitiesCount;
	document.getElementById('lp-stat-visits').textContent = visitsCount;
}

function renderPreview(featured) {
	const list = document.getElementById('lp-preview-list');
	list.innerHTML = '';
	if (!featured.length) {
		const p = document.createElement('p');
		p.className = 'lp-lead';
		p.textContent = 'Il catalogo si popola non appena i musei pubblicano le prime opere.';
		list.appendChild(p);
		return;
	}
	featured.forEach(e => list.appendChild(previewItem(e)));
}

function renderModes(featured) {
	const night = document.getElementById('lp-mode-night-rows');
	const day = document.getElementById('lp-mode-day-rows');
	night.innerHTML = '';
	day.innerHTML = '';
	featured.forEach(e => {
		night.appendChild(modeRow(e));
		day.appendChild(modeRow(e));
	});
}

function renderFeaturedVisits(featuredVisits) {
	const section = document.getElementById('lp-visits-section');
	if (!featuredVisits.length) {
		section.hidden = true;
		return;
	}
	section.hidden = false;
	const grid = document.getElementById('lp-visit-grid');
	grid.innerHTML = '';
	featuredVisits.forEach(v => {
		const card = document.createElement('visit-card');
		card.data = toVisitCardData(v);
		card.addEventListener('open-visit', (e) => {
			window.location.href = `/marketplace/pages/visits.html?openVisit=${encodeURIComponent(e.detail.id)}`;
		});
		grid.appendChild(card);
	});
}

// La fascia "Crea il tuo account / Accedi" ha senso solo per chi non ha
// ancora una sessione: parte nascosta (vedi hidden nel markup) e compare
// solo quando /api/auth/me conferma che non siamo autenticati.
async function toggleRegisterBand() {
	const band = document.getElementById('lp-cta-band');
	if (!band) return;
	const user = await getCurrentUser();
	band.hidden = Boolean(user);
}

async function init() {
	toggleRegisterBand();
	try {
		const [museums, entities, featuredEntities, visits] = await Promise.all([
			fetchJson('/api/museums?pageSize=1'),
			fetchJson('/api/entities?pageSize=1'),
			fetchJson('/api/entities?has_image=true&is_physical=true&sort=createdAt&pageSize=3'),
			fetchJson('/api/visits?sort=createdAt&pageSize=3&is_group=false'),
		]);

		renderStats({
			museumsCount: museums.totalItems,
			entitiesCount: entities.totalItems,
			visitsCount: visits.totalItems,
		});
		renderPreview(featuredEntities.data);
		renderModes(featuredEntities.data);
		renderFeaturedVisits(visits.data);
	} catch (e) {
		console.error('Landing page: impossibile leggere il catalogo:', e.message);
	}
}

init();
