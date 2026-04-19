const User = require('../models/user');

async function getAll(_req, res) {
    try {
        const users = await User.find().select('-password');
        res.json(users);
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

async function create(req, res) {
    try {
        const { email, username } = req.body;
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            const field = existing.email === email ? 'email' : 'username';
            return res.status(409).json({ error: `A user with this ${field} already exists` });
        }

        const user = new User(req.body);
        await user.save();
        const { password: _, ...safe } = user.toObject();
        res.status(201).json(safe);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function update(req, res) {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
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

module.exports = { getAll, getById, create, update, remove };
