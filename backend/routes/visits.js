const express = require('express');
const router = express.Router();
const controller = require('../controllers/visit');

// MIDDLEWARE
const verifyToken = require('../middlewares/verifyToken');
const isVisitOwner = require('../middlewares/isVisitOwner');
const optionalAuth = require('../middlewares/optionalAuth'); // Verifica se la visita è pubblica o privata.

// ROUTES MISTE (se è pubblica chiunque può vederla, altrimenti è protetta)
router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getById);

// ROUTES PROTETTE
router.post('/', verifyToken, controller.create);
router.put('/:id', verifyToken, isVisitOwner, controller.update);
router.delete('/:id', verifyToken, isVisitOwner, controller.remove);

// Nota:
// L'ordine è fondamentale, Express esegue da sinistra a destra:
// 1. verifyToken capisce CHI sei.
// 2. isVisitOwner controlla se la visita è TUA.
// 3. controller.update/remove esegue l'azione vera e propria.

module.exports = router;