const Museum = require('../models/museum');

async function getAll(req, res) {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const page = Math.max(parseInt(req.query.page) || 0, 0);
    const filter = {};
    if (req.query.city)    filter['address.city']    = req.query.city;
    if (req.query.country) filter['address.country'] = req.query.country;
    if (req.query.name)    filter.name = new RegExp(req.query.name, 'i');
    if (req.query.is_accessible !== undefined) filter.is_accessible = req.query.is_accessible === 'true';

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

// La creazione arriva come multipart/form-data (vedi routes/museums.js):
// il client manda separatamente i campi del museo ("data"), i metadati di
// ogni mappa ("mapsMeta": [{ name, points, image_url? }], senza image_url
// per le mappe caricate come file), l'eventuale immagine principale del
// museo (campo "image") e i file immagine delle mappe, uno per campo
// "mapImage_<indice>". Qui il server ricompone l'array `maps` finale
// abbinando ogni voce di mapsMeta al proprio file (se presente) o all'URL
// fornito (se la mappa usa un'immagine remota).
async function create(req, res) {
  try {
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

    payload.added_by = req.user.id;
    const museum = new Museum(payload);
    await museum.save();
    res.status(201).json(museum);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function update(req, res) {
  try {
    const museum = await Museum.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
