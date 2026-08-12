const express = require('express');
const router = express.Router();
const controller = require('../controllers/museum');

const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');

// I musei sono sempre leggibili pubblicamente.
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Solo gli autori possono creare/modificare/eliminare musei.
router.post('/', verifyToken, requireRole('author'), controller.create);
router.put('/:id', verifyToken, requireRole('author'), controller.update);
router.delete('/:id', verifyToken, requireRole('author'), controller.remove);

module.exports = router;
