const Visit = require('../models/visit');
const Item = require('../models/item');
const User = require('../models/user');
const Order = require('../models/order');

// I punti-opera sulle mappe dei musei mostrano una miniatura: serve popolare
// l'entity referenziata da ogni punto (sia sul museum "riassuntivo" della
// visita che su quello di ogni step, che sono la stessa collezione ma path
// Mongoose distinti).
const mapPointEntityPopulate = { path: 'maps.points.entity', select: 'name image_url alt_text' };

const stepsPopulate = [
  { path: 'museum', populate: mapPointEntityPopulate },
  { path: 'author', select: '-password' },
  { path: 'steps.entity' },
  { path: 'steps.museum', populate: mapPointEntityPopulate },
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

/* ── Paywall: le visite a pagamento mostrano solo un'anteprima (niente
   testo delle descrizioni) finché l'utente non le ha adottate ────────── */
async function getAdoptedSet(userId) {
  if (!userId) return new Set();
  const user = await User.findById(userId).select('adopted_visits').lean();
  return user ? new Set(user.adopted_visits.map(id => id.toString())) : new Set();
}

function isVisitUnlocked(visit, userId, adoptedSet) {
  if (visit.base_price === 0) return true;
  if (!userId) return false;
  const authorId = visit.author?._id?.toString() ?? visit.author?.toString();
  if (authorId === userId) return true;
  return adoptedSet.has(visit._id.toString());
}

function applyPaywall(visit, unlocked) {
  const obj = visit.toObject();
  obj.purchased = unlocked;
  for (const step of obj.steps) {
    for (const item of step.items) {
      item.locked = !unlocked;
      if (!unlocked) {
        item.descriptions = item.descriptions.map(d => ({ duration_sec: d.duration_sec, text: null }));
      }
    }
  }
  return obj;
}

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

    const [totalItems, distinctMuseums, visits] = await Promise.all([
      Visit.countDocuments(filter),
      Visit.distinct('museum', filter),
      Visit.find(filter)
        .populate(stepsPopulate)
        .sort(sort)
        .skip(pageSize * page)
        .limit(pageSize),
    ]);

    const adoptedSet = await getAdoptedSet(req.user?.id);
    const data = visits.map(v => applyPaywall(v, isVisitUnlocked(v, req.user?.id, adoptedSet)));

    res.json({ totalItems, museumCount: distinctMuseums.length, pageSize, page, data });
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

    const adoptedSet = await getAdoptedSet(req.user?.id);
    res.json(applyPaywall(visit, isVisitUnlocked(visit, req.user?.id, adoptedSet)));
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

    // L'autore adotta automaticamente la propria visita appena creata
    // (stessa meccanica di adoptVisit in controllers/user.js).
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { adopted_visits: visit._id } });
    await Order.findOneAndUpdate(
      { buyer: req.user.id, visit: visit._id },
      { buyer: req.user.id, visit: visit._id, seller: visit.author, price_paid: visit.base_price },
      { upsert: true, setDefaultsOnInsert: true }
    );

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
