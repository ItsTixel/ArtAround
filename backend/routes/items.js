const express = require('express');
const router = express.Router();
const controller = require('../controllers/item');

const verifyToken = require('../middlewares/verifyToken');
const isItemOwner = require('../middlewares/isItemOwner');
const optionalAuth = require('../middlewares/optionalAuth'); // Verifica se l'item è privato.

// ROUTES MISTE (se privato, solo il creatore può vederlo)
router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getById);

// ROUTES PROTETTE
router.post('/', verifyToken, controller.create);
router.put('/:id', verifyToken, isItemOwner, controller.update);
router.delete('/:id', verifyToken, isItemOwner, controller.remove);

module.exports = router;
