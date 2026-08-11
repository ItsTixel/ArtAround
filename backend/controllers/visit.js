const Visit = require('../models/visit');

const stepsPopulate = [
  { path: 'museum' },
  { path: 'author', select: '-password' },
  { path: 'steps.entity' },
  { path: 'steps.museum' },
  {
    path: 'steps.items',
    populate: [
      { path: 'artwork' },
      { path: 'author', select: '-password' }
    ]
  }
];

/* Alias frontend → campo Mongoose (per i sort inviati dalla UI) */
const SORT_ALIASES = {
  'duration-asc': 'estimated_duration_sec',
  'duration-desc': '-estimated_duration_sec',
  'price-asc': 'base_price',
  'price-desc': '-base_price',
  'recommended': '-createdAt',
};

const ALLOWED_SORT_FIELDS = ['title', 'base_price', 'createdAt', 'estimated_duration_sec'];

async function getAll(req, res) {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const page = Math.max(parseInt(req.query.page) || 0, 0);
    const filter = {};

    /* ── Visibilità ────────────────────────────────────────── */
    if (req.query.include_private !== 'true') filter.is_public = true;

    /* ── Autore ────────────────────────────────────────────── */
    if (req.query.author) filter.author = req.query.author;

    /* ── Musei (uno o più ID separati da virgola) ──────────── */
    if (req.query.museum) {
      const ids = req.query.museum.split(',').map(s => s.trim()).filter(Boolean);
      filter.museum = ids.length === 1 ? ids[0] : { $in: ids };
    }

    /* ── Tag ($in: almeno un tag presente) ─────────────────── */
    if (req.query.tags) {
      filter.tags = { $in: req.query.tags.split(',').map(t => t.trim()) };
    }

    /* ── Ricerca testuale sul titolo ────────────────────────── */
    if (req.query.title) {
      filter.title = new RegExp(req.query.title, 'i');
    }

    /* ── Prezzo ─────────────────────────────────────────────── */
    if (req.query.price === 'free') filter.base_price = 0;
    if (req.query.price === 'paid') filter.base_price = { $gt: 0 };

    /* ── Durata massima (durationMax in minuti) ─────────────── */
    if (req.query.durationMax) {
      const maxSec = parseInt(req.query.durationMax) * 60;
      /* Include visite con durata <= maxSec e visite senza durata (null/0) */
      filter.$or = [
        { estimated_duration_sec: { $lte: maxSec } },
        { estimated_duration_sec: null },
        { estimated_duration_sec: { $exists: false } },
      ];
    }

    /* ── Ordinamento ────────────────────────────────────────── */
    const rawSort = req.query.sort || 'title';
    let sort;
    if (SORT_ALIASES[rawSort]) {
      sort = SORT_ALIASES[rawSort];
    } else {
      const field = rawSort.replace(/^-/, '');
      sort = ALLOWED_SORT_FIELDS.includes(field) ? rawSort : 'title';
    }

    const totalItems = await Visit.countDocuments(filter);
    const visits = await Visit.find(filter)
      .populate(stepsPopulate)
      .sort(sort)
      .skip(pageSize * page)
      .limit(pageSize);

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
