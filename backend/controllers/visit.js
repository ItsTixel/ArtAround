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
        const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
        const page = Math.max(parseInt(req.query.page) || 0, 0);

        const filter = {};
        if (req.query.author) filter.author = req.query.author;
        if (req.query.museum) filter.museum = req.query.museum;
        
        const privacyFilter = req.user
            ? { $or: [{ isPublic: true }, { author: req.user.id }] }
            : { isPublic: true };

        const finalFilter = { $and: [filter, privacyFilter] };

        const allowedSortFields = ['title', 'base_price'];
        const rawSort = req.query.sort || 'title';
        const sortField = rawSort.replace(/^-/, '');
        const sort = allowedSortFields.includes(sortField) ? rawSort : 'title';

        const totalItems = await Visit.countDocuments(filter);
        const visits = await Visit.find(finalFilter)
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
        if (visit.public === false) {
            const authorId = visit.author.toString();
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
        // req.visit arriva dal middleware isVisitOwner, quindi la visita esiste e appartiene all'utente.
        const visit = req.visit; 

        visit.set(req.body); // Aggiorniamo i dati dell'oggetto con quelli del body

        await visit.save();

        const populatedVisit = await visit.populate(stepsPopulate);
        res.json(populatedVisit);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function remove(req, res) {
    try {
        const visit = req.visit;
        
        await visit.deleteOne();
        
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { getAll, getById, create, update, remove };
