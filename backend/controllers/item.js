const Item = require('../models/item');

const itemPopulate = [
    { path: 'artwork', populate: { path: 'museum' } },
    { path: 'author', select: '-password' }
];

async function getAll(req, res) {
    try {
        const pageSize = Math.min(parseInt(req.query.pageSize) || 10,100);
        const page = parseInt(req.query.page )|| 0;
        const filter = {};
        if (req.query.author) filter.author = req.query.author;
        if (req.query.artwork) filter.artwork = req.query.artwork;
        if (req.query.license) filter.license = req.query.license;
        if (req.query.tone) filter.tone = req.query.tone;
        

        const allowedSortFields = ['createdAt', 'price', 'marketplace_summary', 'tone', 'license'];
        const rawSort = req.query.sort || '-createdAt';
        const sortField = rawSort.replace(/^-/, '');
        const sort = allowedSortFields.includes(sortField) ? rawSort : '-createdAt';

        const totalItems = await Item.countDocuments(filter);
        const items = await Item.find(filter).populate(itemPopulate).sort(sort).skip(pageSize * page).limit(pageSize);
        res.json({ totalItems, pageSize, page, data: items});
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getById(req, res) {
    try {
        const item = await Item.findById(req.params.id).populate(itemPopulate);        
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function create(req, res) {
    try {
        const item = new Item(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function update(req, res) {
    try {
        const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(itemPopulate);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function remove(req, res) {
    try {
        const item = await Item.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { getAll, getById, create, update, remove };
