const User = require('../models/user');

// Per criptare le password e le info
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

// L'aggiornamento arriva come multipart/form-data (vedi routes/users.js): i
// campi del profilo viaggiano come JSON nel campo "data", e l'eventuale
// avatar caricato come file arriva in req.file (campo "avatar"); se
// presente sostituisce l'avatar_url passato nel JSON.
async function update(req, res) {
  try {
    const body = JSON.parse(req.body.data || '{}');
    if (req.file) body.avatar_url = `/assets/uploads/avatars/${req.file.filename}`;

    // Whitelist dei campi modificabili dall'utente stesso: esclude role,
    // adopted_visits, bookmarked_visits ecc. per evitare che un utente si
    // auto-assegni permessi o dati non suoi tramite questa rotta.
    const allowedFields = ['username', 'email', 'password', 'display_name', 'bio', 'avatar_url'];
    const updateData = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

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

async function adoptVisit(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { adopted_visits: req.params.visitId } },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function removeAdoption(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { adopted_visits: req.params.visitId } },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function bookmarkVisit(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { bookmarked_visits: req.params.visitId } },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function removeBookmark(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { bookmarked_visits: req.params.visitId } },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { getAll, getById, create, update, remove, adoptVisit, removeAdoption, bookmarkVisit, removeBookmark };
