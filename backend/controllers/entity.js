const Entity = require('../models/entity');

async function getAll(_req, res) {
    try {
        const entities = await Entity.find();
        res.json(entities);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getById(req, res) {
    try {
        const entity = await Entity.findById(req.params.id);
        if (!entity) return res.status(404).json({ error: 'Entity not found' });
        res.json(entity);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function create(req, res) {
    try {
        const entity = new Entity(req.body);
        await entity.save();
        res.status(201).json(entity);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function update(req, res) {
    try {
        const entity = await Entity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
