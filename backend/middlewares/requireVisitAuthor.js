// Riusa req.visit già caricata da loadGroupVisit: zero query aggiuntive
// (a differenza di isVisitOwner.js, che fa una propria findById indipendente
// e sarebbe ridondante qui).
function requireVisitAuthor(req, res, next) {
  if (req.visit.author.toString() !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  next();
}

module.exports = requireVisitAuthor;
