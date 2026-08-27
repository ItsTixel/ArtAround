const User = require('../models/user');
const Visit = require('../models/visit');
const Entity = require('../models/entity');
const Order = require('../models/order');

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

// L'upgrade è un'azione separata da update(): role non è nella whitelist di
// quella rotta apposta, e qui va anche ri-emesso il cookie JWT (role viaggia
// nel payload firmato al login, quindi un semplice update nel DB non
// basterebbe: il vecchio cookie continuerebbe a valere 'visitor' finché
// l'utente non rifà login).
async function upgradeToAuthor(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'author') {
      return res.status(400).json({ error: 'Sei già un autore.' });
    }

    user.role = 'author';
    await user.save();

    const payload = { id: user._id, role: user.role };
    const secretKey = process.env.JWT_SECRET;
    const maxAgeMs = 60 * 60 * 1000; // stesso valore di login()/register()
    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: maxAgeMs
    });

    const { password: _, ...safeUser } = user.toObject();
    res.json(safeUser);
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
    const visit = await Visit.findById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Le visite di gruppo non si adottano tramite questa rotta: ci si
    // unisce con un codice. L'autore fa eccezione — è già adottata
    // automaticamente alla creazione (vedi create() in controllers/visit.js),
    // ma questo gli permette di riadottarla se l'avesse rimossa.
    if (visit.is_group && visit.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Group visits cannot be adopted — join with a code instead.' });
    }

    // Stesso controllo di visibilità di GET /api/visits/:id: una visita
    // privata è adottabile solo dal suo autore, anche conoscendone l'ID.
    if (!visit.is_public && visit.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'This visit is private.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { adopted_visits: req.params.visitId } },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Registra l'ordine (storico acquisti/vendite): idempotente, se
    // l'utente ha già adottato questa visita l'ordine esiste già.
    await Order.findOneAndUpdate(
      { buyer: req.params.id, visit: req.params.visitId },
      { buyer: req.params.id, visit: req.params.visitId, seller: visit.author, price_paid: visit.base_price },
      { upsert: true, setDefaultsOnInsert: true }
    );

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

    await Order.deleteOne({ buyer: req.params.id, visit: req.params.visitId });

    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function bookmarkVisit(req, res) {
  try {
    // A differenza di adoptVisit, questa rotta non aveva finora nessun
    // controllo di visibilità: chiunque conoscesse l'id poteva salvare nei
    // preferiti una visita di gruppo altrui. L'autore fa eccezione e può
    // sempre mettere/togliere tra i preferiti le proprie visite di gruppo.
    const visit = await Visit.findById(req.params.visitId).select('is_group author');
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    if (visit.is_group && visit.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Group visits cannot be bookmarked — join with a code instead.' });
    }

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

async function bookmarkEntity(req, res) {
  try {
    const entity = await Entity.findById(req.params.entityId).select('_id');
    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { bookmarked_entities: req.params.entityId } },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function removeEntityBookmark(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { bookmarked_entities: req.params.entityId } },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { getAll, getById, create, update, remove, upgradeToAuthor, adoptVisit, removeAdoption, bookmarkVisit, removeBookmark, bookmarkEntity, removeEntityBookmark };
