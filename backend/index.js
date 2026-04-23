global.rootDir = __dirname;
global.startDate = null;

const express = require('express');
const cors = require('cors')
const mongoose = require("mongoose");
const credentials = {
	user: process.env.DB_USER || "site242555",
	pwd: process.env.DB_PASS || "Kahti2ho",
	site: process.env.DB_HOST || "mongo_site242555"
}

let app = express();

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())

app.use('/api/museums', require('./routes/museums'));
app.use('/api/entities', require('./routes/entities'));
app.use('/api/items', require('./routes/items'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/users', require('./routes/users'));


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
	var text = "Hello Duluzeeeee";
	res.send(
		`<!doctype html>
		<html>
			<body>
				<h1>${text}</h1>
				<p><a href="javascript:history.back()">Go back</a></p>
			</body>
		</html>
			`)
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

