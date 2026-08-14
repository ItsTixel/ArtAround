const express = require('express');
const router = express.Router();
const controller = require('../controllers/museum');

const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');
const { createImageUpload, handleUploadErrors } = require('../middlewares/upload');

// L'immagine principale del museo e le immagini delle mappe allegate
// finiscono qui, servite poi staticamente da /assets (vedi index.js).
// .any() perché i campi sono a numero variabile: "image" più un
// "mapImage_<indice>" per ogni mappa caricata come file.
const uploadMapImages = handleUploadErrors(createImageUpload('museums').any());

// I musei sono sempre leggibili pubblicamente.
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Solo gli autori possono creare/modificare/eliminare musei.
router.post('/', verifyToken, requireRole('author'), uploadMapImages, controller.create);
router.put('/:id', verifyToken, requireRole('author'), controller.update);
router.delete('/:id', verifyToken, requireRole('author'), controller.remove);

module.exports = router;
