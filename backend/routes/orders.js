const express = require('express');
const router = express.Router();
const controller = require('../controllers/order');

const verifyToken = require('../middlewares/verifyToken');

// Sempre scoped sull'utente loggato (req.user.id): niente :userId nell'URL,
// non serve un middleware isSelf, un utente può vedere solo i propri ordini.
router.get('/purchases', verifyToken, controller.getMyPurchases);
router.get('/sales',     verifyToken, controller.getMySales);

module.exports = router;
