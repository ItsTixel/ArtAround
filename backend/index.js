global.rootDir = __dirname;
global.startDate = null;

const path = require('path');
const express = require('express');
const cors = require('cors')
const cookieParser = require('cookie-parser');
const mongoose = require("mongoose");
const credentials = {
	user: process.env.DB_USER || "site242555",
	pwd: process.env.DB_PASS || "Kahti2ho",
	site: process.env.DB_HOST || "mongo_site242555"
}

let app = express();

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
	res.send(
		`<!doctype html>
<html lang="it">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ArtAround</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
	<style>
		:root {
			--color-primary: #2c3a4a;
			--color-accent: #9e7a46;
			--color-accent-hover: #7c5e33;
			--color-bg: #f9f8f5;
			--color-surface: #ffffff;
			--color-text: #1c1917;
			--color-text-muted: #78716c;
			--color-border: #e8e6e1;
			--font-serif: 'Playfair Display', Georgia, serif;
			--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
		}
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			background: var(--color-bg);
			color: var(--color-text);
			font-family: var(--font-sans);
		}
		main {
			text-align: center;
			padding: 2.5rem;
		}
		h1 {
			font-family: var(--font-serif);
			font-size: 2.5rem;
			font-weight: 600;
			color: var(--color-primary);
		}
		p {
			margin-top: 0.75rem;
			color: var(--color-text-muted);
		}
		.links {
			margin-top: 2.5rem;
			display: flex;
			gap: 1rem;
			justify-content: center;
			flex-wrap: wrap;
		}
		.links a {
			display: inline-block;
			padding: 0.85rem 2rem;
			text-decoration: none;
			font-weight: 500;
			border: 1px solid var(--color-border);
			background: var(--color-surface);
			color: var(--color-primary);
			transition: 0.2s ease;
		}
		.links a.primary {
			background: var(--color-accent);
			border-color: var(--color-accent);
			color: #fff;
		}
		.links a:hover {
			background: var(--color-accent-hover);
			border-color: var(--color-accent-hover);
			color: #fff;
		}
	</style>
</head>
<body>
	<main>
		<h1>ArtAround</h1>
		<p>Scopri i musei o continua la tua visita.</p>
		<div class="links">
			<a class="primary" href="/marketplace">Marketplace</a>
			<a href="/navigator">Navigator</a>
		</div>
	</main>
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

app.listen(PORT, function () {
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

