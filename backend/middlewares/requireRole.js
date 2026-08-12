// Da usare dopo verifyToken: blocca la richiesta se req.user.role non è tra quelli ammessi.
function requireRole(...allowedRoles) {
    return function (req, res, next) {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non sei autorizzato a compiere questa azione.' });
        }
        next();
    };
}

module.exports = requireRole;
