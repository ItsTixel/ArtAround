const Visit = require('../models/visit');
const Item = require('../models/item');

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

    const conditions = [];

    /* ── Visibilità ─────────────────────────────────────────── */
    if (req.user) {
      conditions.push({ $or: [{ is_public: true }, { author: req.user.id }] });
    } else {
      conditions.push({ is_public: true });
    }

    /* ── Autore ─────────────────────────────────────────────── */
    if (req.query.author) conditions.push({ author: req.query.author });

    /* ── Musei (uno o più ID separati da virgola) ────────────── */
    if (req.query.museum) {
      const ids = req.query.museum.split(',').map(s => s.trim()).filter(Boolean);
      conditions.push({ museum: ids.length === 1 ? ids[0] : { $in: ids } });
    }

    /* ── Tag ($in: almeno un tag presente) ──────────────────── */
    if (req.query.tags) {
      conditions.push({ tags: { $in: req.query.tags.split(',').map(t => t.trim()) } });
    }

    /* ── Tono (almeno un'opera di uno step con quel tono) ────── */
    if (req.query.tones) {
      const tones = req.query.tones.split(',').map(t => t.trim()).filter(Boolean);
      const toneItems = await Item.find({ tone: { $in: tones } }).select('_id');
      conditions.push({ 'steps.items': { $in: toneItems.map(i => i._id) } });
    }

    /* ── Ricerca testuale sul titolo ─────────────────────────── */
    if (req.query.title) {
      conditions.push({ title: new RegExp(req.query.title, 'i') });
    }

    /* ── Prezzo ─────────────────────────────────────────────── */
    if (req.query.price === 'free') conditions.push({ base_price: 0 });
    if (req.query.price === 'paid') conditions.push({ base_price: { $gt: 0 } });

    /* ── Durata massima (durationMax in minuti) ──────────────── */
    if (req.query.durationMax) {
      const maxSec = parseInt(req.query.durationMax) * 60;
      conditions.push({
        $or: [
          { estimated_duration_sec: { $lte: maxSec } },
          { estimated_duration_sec: null },
          { estimated_duration_sec: { $exists: false } },
        ]
      });
    }

    const filter = { $and: conditions };

    /* ── Ordinamento ─────────────────────────────────────────── */
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
    if (!visit.is_public) {
      const authorId = visit.author?._id?.toString() ?? visit.author?.toString();
      const userId = req.user ? req.user.id : null;
      if (authorId !== userId) {
        return res.status(403).json({ error: 'This visit is private.' });
      }
    }
    res.json(visit);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function create(req, res) {
  try {
    req.body.author = req.user.id;

    // I visitatori possono creare solo visite private.
    if (req.user.role === 'visitor') {
      const isPublic = req.body.is_public !== undefined ? req.body.is_public : true; // 'true' è il default dello schema
      if (isPublic !== false) {
        return res.status(403).json({ error: 'I visitatori possono creare solo visite private.' });
      }
    }

    const existingVisit = await Visit.findOne({ title: req.body.title, museum: req.body.museum });
    if (existingVisit) {
      return res.status(409).json({ error: 'A visit with the same title already exists for this museum' });
    }
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
    if (req.user.role !== 'admin' && visit.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // I visitatori possono avere solo visite private.
    if (req.user.role === 'visitor' && req.body.is_public === true) {
      return res.status(403).json({ error: 'I visitatori possono avere solo visite private.' });
    }

    visit.set(req.body);
    await visit.save();
    const populatedVisit = await visit.populate(stepsPopulate);
    res.json(populatedVisit);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function remove(req, res) {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    if (req.user.role !== 'admin' && visit.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await visit.deleteOne();
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
