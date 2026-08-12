const Item = require('../models/item');

const itemPopulate = [
  { path: 'artwork', populate: { path: 'placements.museum' } },
  { path: 'author', select: '-password' }
];

async function getAll(req, res) {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const page = parseInt(req.query.page) || 0;

    const conditions = [];
    if (req.query.author)  conditions.push({ author: req.query.author });
    if (req.query.artwork) conditions.push({ artwork: req.query.artwork });
    if (req.query.license) conditions.push({ license: req.query.license });
    if (req.query.tone)    conditions.push({ tone: req.query.tone });
    if (req.query.tags)    conditions.push({ tags: { $in: req.query.tags.split(',').map(t => t.trim()) } });

    /* ── Visibilità: gli item privati sono visibili solo al creatore ── */
    if (req.user) {
      conditions.push({ $or: [{ license: { $ne: 'Private' } }, { author: req.user.id }] });
    } else {
      conditions.push({ license: { $ne: 'Private' } });
    }

    const filter = { $and: conditions };

    const allowedSortFields = ['createdAt', 'marketplace_summary', 'tone', 'license'];
    const rawSort = req.query.sort || '-createdAt';
    const sortField = rawSort.replace(/^-/, '');
    const sort = allowedSortFields.includes(sortField) ? rawSort : '-createdAt';

    const totalItems = await Item.countDocuments(filter);
    const items = await Item.find(filter).populate(itemPopulate).sort(sort).skip(pageSize * page).limit(pageSize);
    res.json({ totalItems, pageSize, page, data: items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getById(req, res) {
  try {
    const item = await Item.findById(req.params.id).populate(itemPopulate);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.license === 'Private') {
      const authorId = item.author?._id?.toString() ?? item.author?.toString();
      const userId = req.user ? req.user.id : null;
      if (authorId !== userId) {
        return res.status(403).json({ error: 'This item is private.' });
      }
    }
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function create(req, res) {
  try {
    req.body.author = req.user.id;

    // I visitatori possono creare solo descrizioni private.
    if (req.user.role === 'visitor') {
      const license = req.body.license || 'Public'; // 'Public' è il default dello schema
      if (license !== 'Private') {
        return res.status(403).json({ error: 'I visitatori possono creare solo descrizioni private.' });
      }
    }

    const item = new Item(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function update(req, res) {
  try {
    const item = req.item; // impostato da isItemOwner

    // I visitatori possono avere solo descrizioni private.
    if (req.user.role === 'visitor') {
      const license = req.body.license !== undefined ? req.body.license : item.license;
      if (license !== 'Private') {
        return res.status(403).json({ error: 'I visitatori possono avere solo descrizioni private.' });
      }
    }

    item.set(req.body);
    await item.save();
    const populatedItem = await item.populate(itemPopulate);
    res.json(populatedItem);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function remove(req, res) {
  try {
    await req.item.deleteOne(); // req.item impostato da isItemOwner
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
