const Museum = require('../models/museum');

async function getAll(req, res) {
    try {
        const filter = {};
        if (req.query.city) filter['address.city'] = req.query.city;
        if (req.query.country) filter['address.country'] = req.query.country;
        if (req.query.name) filter.name = new RegExp(req.query.name, 'i');
        const museums = await Museum.find(filter);
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
        const { name, address } = req.body;
        const query = address?.city
            ? { name, 'address.city': address.city }
            : { name };
        const existing = await Museum.findOne(query);
        if (existing) {
            const detail = address?.city ? `name "${name}" in ${address.city}` : `name "${name}"`;
            return res.status(409).json({ error: `A museum with ${detail} already exists` });
        }

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
