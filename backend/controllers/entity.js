const Entity = require('../models/entity');

async function getAll(req, res) {
    try {
        const filter = {};
        if (req.query.museum) filter.museum = req.query.museum;
        if (req.query.author) filter.author = req.query.author;
        if (req.query.is_physical !== undefined) filter.is_physical = req.query.is_physical === 'true';
        if (req.query.name) filter.name = { $regex: req.query.name, $options: 'i' };
        const entities = await Entity.find(filter).populate('museum');
        res.json(entities);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getById(req, res) {
    try {
        const entity = await Entity.findById(req.params.id).populate('museum');
        if (!entity) return res.status(404).json({ error: 'Entity not found' });
        res.json(entity);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function create(req, res) {
    try {
        const existingEntity = await Entity.findOne({
            name: req.body.name,
            museum: req.body.museum
        });

        if (existingEntity) {
            return res.status(409).json({ error: 'Entity with this name already exists in the museum' });
        }

        const entity = new Entity(req.body);
        await entity.save();
        res.status(201).json(entity);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function update(req, res) {
    try {
        const entity = await Entity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('museum');
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
