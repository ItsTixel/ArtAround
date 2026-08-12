const Item = require('../models/item');

async function isItemOwner(req, res, next) {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        if (item.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non sei autorizzato a modificare questo item.' });
        }

        req.item = item;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = isItemOwner;
