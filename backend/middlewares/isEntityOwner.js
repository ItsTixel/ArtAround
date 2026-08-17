const Entity = require('../models/entity');

async function isEntityOwner(req, res, next) {
    try {
        const entity = await Entity.findById(req.params.id);

        if (!entity) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        if (!entity.added_by || entity.added_by.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non sei autorizzato a modificare questa opera.' });
        }

        req.entity = entity;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = isEntityOwner;
