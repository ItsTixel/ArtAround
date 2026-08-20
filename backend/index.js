global.rootDir = __dirname;
global.startDate = null;

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors')
const cookieParser = require('cookie-parser');
const mongoose = require("mongoose");
const Museum = require('./models/museum');
const Entity = require('./models/entity');
const Visit = require('./models/visit');

function escapeHtml(str) {
	return String(str ?? '')
		.replace(/&/g, '&amp;').replace(/</g, '&lt;')
		.replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const credentials = {
	user: process.env.DB_USER || "site242555",
	pwd: process.env.DB_PASS || "Kahti2ho",
	site: process.env.DB_HOST || "mongo_site242555"
}

let app = express();
const server = http.createServer(app);

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(cors())

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/museums',  require('./routes/museums'));
app.use('/api/entities', require('./routes/entities'));
app.use('/api/items',    require('./routes/items'));
app.use('/api/visits',   require('./routes/visits'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/dev',      require('./routes/dev'));

const { initSocketServer } = require('./sockets');
const io = initSocketServer(server);
app.set('io', io); // i controller lo raggiungono con req.app.get('io')


// https://stackoverflow.com/questions/40459511/in-express-js-req-protocol-is-not-picking-up-https-for-my-secure-link-it-alwa
app.enable('trust proxy');

(async () => {
  try {
	dbname = "artaround"
    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
	//const mongouri = `mongodb://localhost:27017/${dbname}`;
	console.log(`Connecting to MongoDB: ${mongouri}`);
	await mongoose.connect(mongouri);
    console.log("Connected to MongoDB", mongouri);
	
  } catch (e) {
    console.error("Connection failed:", e.message);
  }

})();

app.get('/', async function (req, res) {
	let museumsCount = 0;
	let entitiesCount = 0;
	let visitsCount = 0;
	let featured = [];
	let featuredVisits = [];
	try {
		[museumsCount, entitiesCount, visitsCount, featured, featuredVisits] = await Promise.all([
			Museum.countDocuments(),
			Entity.countDocuments(),
			Visit.countDocuments(),
			Entity.find({ image_url: { $exists: true, $ne: '' } })
				.sort({ createdAt: 1 })
				.limit(3)
				.populate('placements.museum', 'name address.city')
				.lean(),
			Visit.find({ is_public: true })
				.sort({ createdAt: 1 })
				.limit(3)
				.populate('museum', 'name address.city')
				.populate('steps.entity', 'image_url')
				.lean()
		]);
	} catch (e) {
		console.error('Landing page: impossibile leggere il catalogo:', e.message);
	}

	// Stessa normalizzazione di normalizeVisit() in marketplace/js/visits.js,
	// ridotta ai soli campi che <visit-card> mostra qui: nome, immagini delle
	// opere in visita (per il carosello), musei coinvolti e durata stimata.
	const toVisitCardData = (v) => {
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
			if (url && !seen.has(url)) { seen.add(url); images.push(url); }
		}
		return { id: v._id, title: v.title || '', images, museumDetails, durationSec: v.estimated_duration_sec || 0 };
	};

	// JSON dentro un <script>: sfugge '<' così un titolo o url ostile non può
	// contenere "</script>" e interrompere il tag prematuramente.
	const embedJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

	const previewItem = (e) => {
		const museum = e.placements?.[0]?.museum;
		return `
			<div class="lp-preview-item">
				<img class="lp-preview-thumb" src="${escapeHtml(e.image_url)}" alt="" loading="lazy">
				<div class="lp-preview-text">
					<div class="name">${escapeHtml(e.name)}</div>
					<div class="meta">${escapeHtml(museum?.name || '')}</div>
				</div>
			</div>`;
	};

	const modeRow = (e) => {
		const museum = e.placements?.[0]?.museum;
		return `
			<div class="lp-mode-row">
				<img class="lp-mode-thumb" src="${escapeHtml(e.image_url)}" alt="" loading="lazy">
				<div class="text">
					<div class="name">${escapeHtml(e.name)}</div>
					<div class="meta">${escapeHtml(museum?.name || '')}</div>
				</div>
			</div>`;
	};

	res.send(
		`<!doctype html>
<html lang="it">
<head>
	<script>(function(){var t=localStorage.getItem('artaround-theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();</script>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ArtAround — L'arte, illuminata</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Nunito+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="/marketplace/css/base.css">
	<link rel="stylesheet" href="/marketplace/css/landing.css">

	<script src="https://cdn.tailwindcss.com"></script>
	<script>tailwind.config = { darkMode: ['selector', '[data-theme="dark"]'] };</script>

	<script type="module" src="/marketplace/components/app-navbar.js"></script>
	<script type="module" src="/marketplace/components/app-footer.js"></script>
</head>
<body class="lp">

	<app-navbar></app-navbar>

	<main>
		<section class="lp-hero" aria-label="Presentazione">
			<div class="lp-hero-inner">
				<div class="lp-hero-copy">
					<p class="lp-kicker">Tecnologia per i beni culturali</p>
					<h1>L'arte, <em>illuminata</em>.</h1>
					<p class="lp-lead">Guide personalizzate, contenuti su più livelli e un marketplace per la cultura: due app pensate una per chi visita, una per chi cura.</p>
					<div class="lp-cta-row">
						<a class="lp-btn lp-btn-primary" href="/navigator">Esplora Navigator →</a>
						<a class="lp-btn lp-btn-ghost" href="/marketplace">Scopri il Marketplace</a>
					</div>
				</div>
				<div class="lp-hero-preview">
					<div class="lp-hero-preview-label">In catalogo</div>
					${featured.length ? featured.map(previewItem).join('') : '<p class="lp-lead">Il catalogo si popola non appena i musei pubblicano le prime opere.</p>'}
				</div>
			</div>
			<div class="lp-stats">
				<div class="lp-stat"><span class="lp-stat-num">${museumsCount}</span><span class="lp-stat-label">Musei in catalogo</span></div>
				<div class="lp-stat"><span class="lp-stat-num">${entitiesCount}</span><span class="lp-stat-label">Opere censite</span></div>
				<div class="lp-stat"><span class="lp-stat-num">4</span><span class="lp-stat-label">Livelli di racconto</span></div>
				<div class="lp-stat"><span class="lp-stat-num">${visitsCount}</span><span class="lp-stat-label">Visite guidate</span></div>
			</div>
		</section>

		${featuredVisits.length ? `
		<section class="lp-section" aria-label="Visite già in catalogo">
			<div class="lp-section-head">
				<h2>Visite già in catalogo</h2>
				<a class="lp-link" href="/marketplace/pages/visits.html">Sfoglia il marketplace →</a>
			</div>
			<div class="lp-entity-grid" id="lp-visit-grid"></div>
			<script type="application/json" id="lp-visit-data">${embedJson(featuredVisits.map(toVisitCardData))}</script>
			<script type="module">
				import '/marketplace/components/visit-card.js';
				const items = JSON.parse(document.getElementById('lp-visit-data').textContent);
				const grid = document.getElementById('lp-visit-grid');
				items.forEach((v) => {
					const card = document.createElement('visit-card');
					card.data = v;
					card.addEventListener('open-visit', () => { window.location.href = '/marketplace/pages/visits.html'; });
					grid.appendChild(card);
				});
			</script>
		</section>` : ''}

		<section class="lp-section lp-features" aria-label="Funzionalità">
			<div class="lp-section-head lp-section-head-center">
				<p class="lp-kicker">Cosa include ArtAround</p>
				<h2>Tutto ciò che serve, <em>niente di superfluo</em></h2>
				<p class="lp-lead">Funzionalità pensate per accompagnare la visita passo passo, e per chi i musei li racconta.</p>
			</div>
			<div class="lp-feature-grid">
				<div class="lp-feature-card">
					<div class="lp-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/></svg></div>
					<h3>Audio guida</h3>
					<p>Play, pausa e avanzamento automatico da opera a opera: ascolta la visita senza mai distogliere lo sguardo.</p>
				</div>
				<div class="lp-feature-card">
					<div class="lp-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h13"/><path d="M4 12h9"/><path d="M4 18h13"/><path d="M20 12h.01"/></svg></div>
					<h3>Contenuti multilivello</h3>
					<p>Dallo stile Infantile a quello Avanzato: lo stesso racconto adattato a chi ascolta, un tocco per cambiare.</p>
				</div>
				<div class="lp-feature-card">
					<div class="lp-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" stroke-linejoin="round"/><path d="M9 4v14"/><path d="M15 6v14"/></svg></div>
					<h3>Mappe indoor</h3>
					<p>Pianta interattiva sala per sala, con zoom e punti di interesse per opere e servizi del museo.</p>
				</div>
				<div class="lp-feature-card">
					<div class="lp-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="6" height="6" rx="0.5"/><rect x="14.5" y="3.5" width="6" height="6" rx="0.5"/><rect x="3.5" y="14.5" width="6" height="6" rx="0.5"/><path d="M14.5 14.5h3v3h-3z"/><path d="M20.5 14.5v3"/><path d="M14.5 20.5h3"/><path d="M20.5 20.5h.01"/></svg></div>
					<h3>Scansiona ed esplora</h3>
					<p>Inquadra il QR in sala per aprire subito un'opera o adottare la visita guidata di quel museo.</p>
				</div>
				<div class="lp-feature-card">
					<div class="lp-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V9.5L12 4l8 5.5V20" stroke-linejoin="round"/><path d="M9.5 20v-6h5v6"/></svg></div>
					<h3>Editor per curatori</h3>
					<p>Crea musei, opere e descrizioni a più livelli direttamente dal Marketplace, senza passare da un CMS esterno.</p>
				</div>
				<div class="lp-feature-card">
					<div class="lp-feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5 5 4h14l1.5 4.5" stroke-linejoin="round"/><path d="M3.5 8.5a2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0"/><path d="M5 8.5V20h14V8.5" stroke-linejoin="round"/><path d="M9.5 20v-5h5v5"/></svg></div>
					<h3>Marketplace</h3>
					<p>Pubblica e scopri le visite guidate create dai musei e dalle istituzioni della rete ArtAround.</p>
				</div>
			</div>
		</section>

		<section class="lp-section lp-modes" aria-label="Tema Giorno e Notte">
			<div class="lp-section-head lp-section-head-center">
				<p class="lp-kicker">Sempre a proprio agio</p>
				<h2>Due modalità, <em>un'identità</em></h2>
				<p class="lp-lead">Notte per la visita in sala, Giorno per la consultazione a mente fredda: cambia con un tocco, la preferenza resta salvata sul dispositivo.</p>
			</div>
			<div class="lp-modes-grid">
				<div class="lp-mode-card lp-mode-night">
					<div class="lp-mode-label">☾ Modalità Notte</div>
					${featured.length ? featured.map(modeRow).join('') : ''}
				</div>
				<div class="lp-mode-card lp-mode-day">
					<div class="lp-mode-label">☼ Modalità Giorno</div>
					${featured.length ? featured.map(modeRow).join('') : ''}
				</div>
			</div>
		</section>

		<section class="lp-cta-band" aria-label="Registrazione">
			<h2>Porta il tuo museo <em>nel futuro</em>.</h2>
			<p class="lp-lead">Registrati come curatore e pubblica il tuo primo museo in pochi minuti oppure come visitatore per goderti le visite guidate.</p>
			<div class="lp-cta-row">
				<a class="lp-btn lp-btn-primary" href="/marketplace/register.html">Crea il tuo account →</a>
				<a class="lp-btn lp-btn-ghost" href="/marketplace/login.html">Accedi</a>
			</div>
		</section>
	</main>

	<app-footer></app-footer>
</body>
</html>
			`)
});
app.get('/dev', async function (req, res) {
	res.send(
		`<!doctype html>
<html lang="it">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ArtAround - Dev</title>
	<style>
		body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; }
		button { font-size: 1rem; padding: 0.6rem 1.2rem; cursor: pointer; }
		button:disabled { cursor: default; opacity: 0.6; }
		pre { margin-top: 1rem; background: #f2f2f2; padding: 1rem; white-space: pre-wrap; min-height: 3rem; }
	</style>
</head>
<body>
	<h1>Reset database</h1>
	<button id="reset-btn">Svuota il database e reimporta i seed data</button>
	<pre id="output"></pre>
	<script>
		const btn = document.getElementById('reset-btn');
		const output = document.getElementById('output');
		btn.addEventListener('click', async () => {
			btn.disabled = true;
			output.textContent = 'In corso...';
			try {
				const res = await fetch('/api/dev/reset', { method: 'POST' });
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || 'Errore sconosciuto');
				output.textContent = data.results
					.map(r => r.category + ': eliminati ' + r.deleted + ', aggiunti ' + r.added)
					.join('\\n');
			} catch (e) {
				output.textContent = 'Errore: ' + e.message;
			} finally {
				btn.disabled = false;
			}
		});
	</script>
</body>
</html>
			`)
});
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/marketplace', express.static(path.join(__dirname, '../marketplace'), { "index": 'pages/index.html' }));
app.use('/navigator', express.static(path.join(__dirname, '../navigator/dist')));
app.get(/^\/navigator\/.*/, (req, res) => {
	res.sendFile(path.join(__dirname, '../navigator/dist/index.html'));
});


const PORT = process.env.PORT || 8000;

server.listen(PORT, function () {
	global.startDate = new Date();
	console.log(`App listening on port ${PORT} started ${global.startDate.toLocaleString()}`)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing DB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing DB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

