const express = require('express');
const router = express.Router();
const controller = require('../controllers/dev');

router.post('/reset', controller.reset);

module.exports = router;
