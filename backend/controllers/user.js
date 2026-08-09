const User = require('../models/user');

// DULE: Per criptare le password e le info
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function getAll(req, res) {
    try {
        const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
        const page = Math.max(parseInt(req.query.page) || 0, 0);

        const allowedSortFields = ['username', 'email', 'role', 'createdAt'];
        const rawSort = req.query.sort || '-createdAt';
        const sortField = rawSort.replace(/^-/, '');
        const sort = allowedSortFields.includes(sortField) ? rawSort : '-createdAt';

        const totalItems = await User.countDocuments();
        const users = await User.find().select('-password').sort(sort).skip(pageSize * page).limit(pageSize);
        res.json({ totalItems, pageSize, page, data: users });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getById(req, res) {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function update(req, res) {
    try {
        const updateData = { ...req.body };

        // Criptiamo la password se è presente
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        const user = await User.findByIdAndUpdate(
            req.params.id, 
            updateData, // Usiamo i dati filtrati
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function remove(req, res) {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { getAll, getById, update, remove };
