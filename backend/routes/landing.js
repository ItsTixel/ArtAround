const express = require('express');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
	res.sendFile(path.join(global.rootDir, '../marketplace/pages/landing.html'));
});

module.exports = router;
