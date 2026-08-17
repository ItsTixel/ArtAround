const express = require('express');
const router = express.Router();
const controller = require('../controllers/entity');

const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');
const isEntityOwner = require('../middlewares/isEntityOwner');
const { createImageUpload, handleUploadErrors } = require('../middlewares/upload');

// L'immagine dell'opera, se caricata come file, finisce qui (vedi
// controllers/entity.js), servita poi staticamente da /assets.
const uploadEntityImage = handleUploadErrors(createImageUpload('entities').single('image'));

// Le opere sono sempre leggibili pubblicamente.
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Solo gli autori possono creare opere; modifica/eliminazione sono
// riservate a chi le ha create (come per gli item, vedi isItemOwner).
router.post('/', verifyToken, requireRole('author'), uploadEntityImage, controller.create);
router.put('/:id', verifyToken, isEntityOwner, controller.update);
router.delete('/:id', verifyToken, isEntityOwner, controller.remove);

module.exports = router;
