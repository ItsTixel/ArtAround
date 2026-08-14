const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const controller = require('../controllers/museum');

const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');

// Le immagini delle mappe allegate in creazione museo finiscono qui, servite
// poi staticamente da /assets (vedi index.js).
const mapsUploadDir = path.join(__dirname, '../../assets/uploads/maps');
fs.mkdirSync(mapsUploadDir, { recursive: true });

const mapImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, mapsUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per immagine
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Il file di una mappa deve essere un\'immagine.'));
    }
    cb(null, true);
  }
});

// multer chiama next(err) sugli errori (file troppo grande, tipo non
// consentito): li normalizziamo nello stesso formato { error } del resto
// dell'API invece di far cadere nell'handler HTML di default di Express.
function uploadMapImages(req, res, next) {
  mapImageUpload.any()(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

// I musei sono sempre leggibili pubblicamente.
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Solo gli autori possono creare/modificare/eliminare musei.
router.post('/', verifyToken, requireRole('author'), uploadMapImages, controller.create);
router.put('/:id', verifyToken, requireRole('author'), controller.update);
router.delete('/:id', verifyToken, requireRole('author'), controller.remove);

module.exports = router;
