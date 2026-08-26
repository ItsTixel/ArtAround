const Museum = require('../models/museum');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Verifica che nessun altro museo abbia già lo stesso nome (case-insensitive:
// serve anche a evitare collisioni negli slug dell'URL del navigator, che
// normalizzano maiuscole/minuscole — vedi navigator/src/utils/slug.js).
// `excludeId` esclude il documento stesso durante un update.
async function findDuplicateName(name, excludeId) {
  if (!name) return null;
  const filter = { name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') };
  if (excludeId) filter._id = { $ne: excludeId };
  return Museum.findOne(filter);
}

async function getAll(req, res) {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const page = Math.max(parseInt(req.query.page) || 0, 0);
    const filter = {};
    if (req.query.city)    filter['address.city']    = req.query.city;
    if (req.query.country) filter['address.country'] = req.query.country;
    if (req.query.name)    filter.name = new RegExp(req.query.name, 'i');
    if (req.query.is_accessible !== undefined) filter.is_accessible = req.query.is_accessible === 'true';
    if (req.query.added_by) filter.added_by = req.query.added_by;

    const allowedSortFields = ['name', 'address.city', 'address.country'];
    const rawSort = req.query.sort || 'name';
    const sortField = rawSort.replace(/^-/, '');
    const sort = allowedSortFields.includes(sortField) ? rawSort : 'name';

    const totalItems = await Museum.countDocuments(filter);
    const museums = await Museum.find(filter).sort(sort).skip(pageSize * page).limit(pageSize);
    res.json({ totalItems, pageSize, page, data: museums });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getById(req, res) {
  try {
    const museum = await Museum.findById(req.params.id);
    if (!museum) return res.status(404).json({ error: 'Museum not found' });
    res.json(museum);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// La creazione e la modifica arrivano entrambe come multipart/form-data
// (vedi routes/museums.js): il client manda separatamente i campi del
// museo ("data"), i metadati di ogni mappa ("mapsMeta": [{ name, points,
// image_url? }], senza image_url per le mappe caricate come file),
// l'eventuale immagine principale del museo (campo "image") e i file
// immagine delle mappe, uno per campo "mapImage_<indice>". Questa funzione
// ricompone l'array `maps` finale abbinando ogni voce di mapsMeta al
// proprio file (se presente) o all'URL fornito (se la mappa usa
// un'immagine remota, o se in modifica si è lasciata invariata).
function parseMultipartPayload(req) {
  const payload = JSON.parse(req.body.data || '{}');
  const mapsMeta = JSON.parse(req.body.mapsMeta || '[]');
  const files = req.files || [];

  const mainImage = files.find(f => f.fieldname === 'image');
  if (mainImage) payload.image_url = `/assets/uploads/museums/${mainImage.filename}`;

  payload.maps = mapsMeta.map((m, i) => {
    const file = files.find(f => f.fieldname === `mapImage_${i}`);
    return {
      name: m.name,
      image_url: file ? `/assets/uploads/museums/${file.filename}` : m.image_url,
      points: m.points || [],
    };
  });

  return payload;
}

async function create(req, res) {
  try {
    const payload = parseMultipartPayload(req);
    payload.added_by = req.user.id;

    if (await findDuplicateName(payload.name)) {
      return res.status(409).json({ error: 'Esiste già un museo con questo nome' });
    }

    const museum = new Museum(payload);
    try {
      await museum.save();
    } catch (saveErr) {
      // Race sul nome (rarissima, ma l'unique index del db è l'ultima rete
      // di sicurezza dopo il pre-check sopra): stesso pattern di visit.js
      // per il codice duplicato.
      if (saveErr.code === 11000 && /name/.test(saveErr.message)) {
        return res.status(409).json({ error: 'Esiste già un museo con questo nome' });
      }
      throw saveErr;
    }
    res.status(201).json(museum);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function update(req, res) {
  try {
    const payload = parseMultipartPayload(req);

    if (await findDuplicateName(payload.name, req.params.id)) {
      return res.status(409).json({ error: 'Esiste già un museo con questo nome' });
    }

    let museum;
    try {
      museum = await Museum.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    } catch (saveErr) {
      if (saveErr.code === 11000 && /name/.test(saveErr.message)) {
        return res.status(409).json({ error: 'Esiste già un museo con questo nome' });
      }
      throw saveErr;
    }
    if (!museum) return res.status(404).json({ error: 'Museum not found' });
    res.json(museum);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function remove(req, res) {
  try {
    const museum = await Museum.findByIdAndDelete(req.params.id);
    if (!museum) return res.status(404).json({ error: 'Museum not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
