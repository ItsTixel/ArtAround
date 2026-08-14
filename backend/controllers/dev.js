const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('mongoose/node_modules/bson');

const SEED_DIR = path.join(global.rootDir, '../scripts/seed_data');

const CATEGORIES = [
	{ name: 'museums', file: 'museums.json' },
	{ name: 'entities', file: 'entities.json' },
	{ name: 'items', file: 'items.json' },
	{ name: 'visits', file: 'visits.json' },
	{ name: 'users', file: 'users.json' },
	{ name: 'orders', file: 'orders.json' },
];

exports.reset = async (req, res) => {
	const results = [];
	try {
		for (const cat of CATEGORIES) {
			const coll = mongoose.connection.db.collection(cat.name);

			const deleteResult = await coll.deleteMany({});

			const raw = fs.readFileSync(path.join(SEED_DIR, cat.file), 'utf-8');
			const docs = EJSON.parse(raw, { relaxed: false });

			let addedCount = 0;
			if (Array.isArray(docs) && docs.length > 0) {
				const insertResult = await coll.insertMany(docs, { ordered: true });
				addedCount = insertResult.insertedCount;
			}

			results.push({
				category: cat.name,
				deleted: deleteResult.deletedCount,
				added: addedCount,
			});
		}
		res.json({ results });
	} catch (e) {
		res.status(500).json({ error: e.message, results });
	}
};
