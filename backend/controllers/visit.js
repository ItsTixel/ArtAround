const Visit = require('../models/visit');

const stepsPopulate = [
    { path: 'museum' },
    { path: 'author', select: '-password' },
    { path: 'steps.entity' },
    {
        path: 'steps.items',
        populate: [
            { path: 'artwork' },
            { path: 'author', select: '-password' }
        ]
    }
];

async function getAll(req, res) {
    try {
        const filter = {};
        if (req.query.author) filter.author = req.query.author;
        if (req.query.museum) filter.museum = req.query.museum;
        const visits = await Visit.find(filter).populate(stepsPopulate);
        res.json(visits);
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
        const visit = await Visit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(stepsPopulate);

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
