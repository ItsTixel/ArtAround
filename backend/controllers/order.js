const Order = require('../models/order');

// Storico acquisti dell'utente loggato: le visite che ha adottato, con
// prezzo pagato e data, più i dati del venditore (l'autore della visita).
async function getMyPurchases(req, res) {
  try {
    const orders = await Order.find({ buyer: req.user.id })
      .sort('-createdAt')
      .populate('visit', 'title image_url base_price estimated_duration_sec')
      .populate('seller', 'username display_name avatar_url');
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Storico vendite dell'utente loggato: le visite (di cui è autore) che
// altri utenti hanno adottato, più i dati dell'acquirente.
async function getMySales(req, res) {
  try {
    const orders = await Order.find({ seller: req.user.id })
      .sort('-createdAt')
      .populate('visit', 'title image_url base_price estimated_duration_sec')
      .populate('buyer', 'username display_name avatar_url');
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getMyPurchases, getMySales };
