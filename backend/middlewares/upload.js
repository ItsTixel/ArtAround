const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Fabbrica di upload immagine su disco: ogni chiamante passa la propria
// sottocartella (es. 'maps', 'entities', 'avatars') sotto assets/uploads/,
// servita poi staticamente da /assets (vedi index.js). Stessa configurazione
// usata da tutte le rotte che accettano immagini caricate come file.
function createImageUpload(subdir) {
  const uploadDir = path.join(__dirname, '../../assets/uploads', subdir);
  fs.mkdirSync(uploadDir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per immagine
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Il file caricato deve essere un\'immagine.'));
      }
      cb(null, true);
    }
  });
}

// multer chiama next(err) sugli errori (file troppo grande, tipo non
// consentito): li normalizziamo nello stesso formato { error } del resto
// dell'API invece di far cadere nell'handler HTML di default di Express.
function handleUploadErrors(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        // multer lascia in inglese anche i messaggi dei suoi errori interni
        // (es. limite di dimensione superato): li traduciamo qui, il resto
        // (fileFilter) è già in italiano.
        const message = err.code === 'LIMIT_FILE_SIZE'
          ? 'Il file è troppo grande (massimo 10MB).'
          : err.message;
        return res.status(400).json({ error: message });
      }
      next();
    });
  };
}

module.exports = { createImageUpload, handleUploadErrors };
