global.rootDir = __dirname;
global.startDate = null;

const path = require('path');
const http = require('http');
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
const server = http.createServer(app);

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(cors())

app.use('/',             require('./routes/landing'));
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

