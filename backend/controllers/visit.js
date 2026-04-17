const Visit = require('../models/visit');

async function getAll(_req, res) {
    try {
        const visits = await Visit.find();
        res.json(visits);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getById(req, res) {
    try {
        const visit = await Visit.findById(req.params.id);
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
        res.status(201).json(visit);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function update(req, res) {
    try {
        const visit = await Visit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!visit) return res.status(404).json({ error: 'Visit not found' });
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
