const User = require('../models/user');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password obbligatori' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Credenziali non valide' });

    // TODO: usare bcrypt in produzione
    if (req.body.password !== user.password) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    res.json({
      user: {
        _id:          user._id,
        username:     user.username,
        email:        user.email,
        role:         user.role,
        display_name: user.display_name,
        avatar_url:   user.avatar_url
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function logout(req, res) {
  res.json({ message: 'Logout effettuato' });
}

async function me(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    const userId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!userId) return res.status(401).json({ error: 'Non autenticato' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(401).json({ error: 'Utente non trovato' });

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { login, logout, me };
