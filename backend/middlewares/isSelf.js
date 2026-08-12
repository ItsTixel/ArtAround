// Da usare dopo verifyToken: blocca la richiesta se l'utente loggato non è
// quello indicato in req.params.id (nessuno può modificare il profilo altrui).
function isSelf(req, res, next) {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: 'Non sei autorizzato a modificare questo profilo.' });
    }
    next();
}

module.exports = isSelf;
