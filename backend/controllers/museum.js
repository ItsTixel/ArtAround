const Museum = require('../models/museum');

async function getAll(_req, res) {
    try {
        const museums = await Museum.find();
        res.json(museums);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getById(req, res) {
    try {
        const museum = await Museum.findById(req.params.id);
        if (!museum) return res.status(404).json({ error: 'Museum not found' });
        res.json(museum);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function create(req, res) {
    try {
        const museum = new Museum(req.body);
        await museum.save();
        res.status(201).json(museum);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function update(req, res) {
    try {
        const museum = await Museum.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!museum) return res.status(404).json({ error: 'Museum not found' });
        res.json(museum);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function remove(req, res) {
    try {
        const museum = await Museum.findByIdAndDelete(req.params.id);
        if (!museum) return res.status(404).json({ error: 'Museum not found' });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { getAll, getById, create, update, remove };
