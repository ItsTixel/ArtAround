const Visit = require('../models/visit');

const stepsPopulate = [
  { path: 'museum' },
  { path: 'author', select: '-password' },
  { path: 'steps.entity' },
  {
    path: 'steps.items',
    populate: [
      { path: 'artwork' },
      { path: 'author', select: '-password' }
    ]
  }
];

async function getAll(req, res) {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const page = Math.max(parseInt(req.query.page) || 0, 0);
    const filter = {};

    if (req.query.include_private !== 'true') filter.is_public = true;
    if (req.query.author) filter.author = req.query.author;
    if (req.query.museum) filter.museum = req.query.museum;
    if (req.query.tags)   filter.tags = { $in: req.query.tags.split(',').map(t => t.trim()) };

    const allowedSortFields = ['title', 'base_price', 'createdAt'];
    const rawSort = req.query.sort || 'title';
    const sortField = rawSort.replace(/^-/, '');
    const sort = allowedSortFields.includes(sortField) ? rawSort : 'title';

    const totalItems = await Visit.countDocuments(filter);
    const visits = await Visit.find(filter).populate(stepsPopulate).sort(sort).skip(pageSize * page).limit(pageSize);
    res.json({ totalItems, pageSize, page, data: visits });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getById(req, res) {
  try {
    const visit = await Visit.findById(req.params.id).populate(stepsPopulate);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function create(req, res) {
  try {
    const visit = new Visit(req.body);
    await visit.save();
    const populatedVisit = await visit.populate(stepsPopulate);
    res.status(201).json(populatedVisit);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function update(req, res) {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    Object.assign(visit, req.body);
    await visit.save();
    await visit.populate(stepsPopulate);
    res.json(visit);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function remove(req, res) {
  try {
    const visit = await Visit.findByIdAndDelete(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
