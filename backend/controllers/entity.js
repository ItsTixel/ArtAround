const Entity = require('../models/entity');

async function getAll(req, res) {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const page = Math.max(parseInt(req.query.page) || 0, 0);
    const filter = {};
    if (req.query.museum)      filter['placements.museum'] = req.query.museum;
    if (req.query.added_by)    filter.added_by    = req.query.added_by;
    if (req.query.wikidata_id) filter.wikidata_id = req.query.wikidata_id;
    if (req.query.is_physical !== undefined) filter.is_physical = req.query.is_physical === 'true';
    if (req.query.name)  filter.name = { $regex: req.query.name, $options: 'i' };
    if (req.query.tags)  filter.tags = { $in: req.query.tags.split(',').map(t => t.trim()) };

    const allowedSortFields = ['name', 'artwork_author', 'is_physical', 'createdAt'];
    const rawSort = req.query.sort || 'name';
    const sortField = rawSort.replace(/^-/, '');
    const sort = allowedSortFields.includes(sortField) ? rawSort : 'name';

    const totalItems = await Entity.countDocuments(filter);
    const entities = await Entity.find(filter).populate('placements.museum').sort(sort).skip(pageSize * page).limit(pageSize);
    res.json({ totalItems, pageSize, page, data: entities });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getById(req, res) {
  try {
    const entity = await Entity.findById(req.params.id).populate('placements.museum');
    if (!entity) return res.status(404).json({ error: 'Entity not found' });
    res.json(entity);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// La creazione arriva come multipart/form-data (vedi routes/entities.js):
// i campi dell'opera viaggiano come JSON nel campo "data", e l'eventuale
// immagine caricata come file arriva in req.file (campo "image"); se
// presente sostituisce l'image_url passato nel JSON.
async function create(req, res) {
  try {
    const payload = JSON.parse(req.body.data || '{}');
    if (req.file) payload.image_url = `/assets/uploads/entities/${req.file.filename}`;

    payload.added_by = req.user.id;
    if (!payload.wikidata_id) {
      payload.local_id = await Entity.generateLocalId();
    }
    const entity = new Entity(payload);
    await entity.save();
    res.status(201).json(entity);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function update(req, res) {
  try {
    const entity = await Entity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('placements.museum');
    if (!entity) return res.status(404).json({ error: 'Entity not found' });
    res.json(entity);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function remove(req, res) {
  try {
    const entity = await Entity.findByIdAndDelete(req.params.id);
    if (!entity) return res.status(404).json({ error: 'Entity not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
