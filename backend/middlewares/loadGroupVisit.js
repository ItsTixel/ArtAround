const Visit = require('../models/visit');

// Carica la visita una sola volta e verifica che sia di gruppo, così le
// rotte di sessione (open/join/start/...) non devono ripetere questo check.
async function loadGroupVisit(req, res, next) {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    if (!visit.is_group) return res.status(400).json({ error: 'This is not a group visit.' });
    req.visit = visit;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = loadGroupVisit;
