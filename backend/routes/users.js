const express = require('express');
const router = express.Router();
const controller = require('../controllers/user');

const verifyToken = require('../middlewares/verifyToken');
const isSelf = require('../middlewares/isSelf');
const { createImageUpload, handleUploadErrors } = require('../middlewares/upload');
const rateLimit = require('../middlewares/rateLimit');

const adoptLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

// L'avatar, se caricato come file, finisce qui (vedi controllers/user.js),
// servito poi staticamente da /assets.
const uploadAvatar = handleUploadErrors(createImageUpload('avatars').single('avatar'));

// Richiede login: prima erano pubbliche, esponendo l'email di ogni utente
// (unico campo sensibile rimasto dopo -password) a chiunque conoscesse
// l'endpoint. getAll/getById nascondono comunque l'email sulle voci che non
// sono quella di chi chiama (vedi controllers/user.js).
router.get('/',    verifyToken, controller.getAll);
router.get('/:id', verifyToken, controller.getById);
router.put('/:id', verifyToken, isSelf, uploadAvatar, controller.update);
router.delete('/:id', verifyToken, isSelf, controller.remove);
router.put('/:id/upgrade', verifyToken, isSelf, controller.upgradeToAuthor);

router.put('/:id/adopt/:visitId',       verifyToken, isSelf, adoptLimiter, controller.adoptVisit);
router.delete('/:id/adopt/:visitId',    verifyToken, isSelf, controller.removeAdoption);
router.put('/:id/bookmark/:visitId',    verifyToken, isSelf, controller.bookmarkVisit);
router.delete('/:id/bookmark/:visitId', verifyToken, isSelf, controller.removeBookmark);

router.put('/:id/bookmark-entity/:entityId',    verifyToken, isSelf, controller.bookmarkEntity);
router.delete('/:id/bookmark-entity/:entityId', verifyToken, isSelf, controller.removeEntityBookmark);

module.exports = router;
