const Visit = require('../models/visit');

async function isVisitOwner(req, res, next) {
    try {
        const visitId = req.params.id;
        const userId = req.user.id; // L'ID dell'utente loggato

        const visit = await Visit.findById(visitId);

        if (!visit) {
            return res.status(404).json({ message: "Visita non trovata." });
        }

        if (visit.author.toString() !== userId) {
            return res.status(403).json({ message: "Non sei autorizzato a modificare questa visita." });
        }

        // Passiamo la visita al controller successivo
        req.visit = visit; 
        console.log(`Utente ${userId} è il proprietario della visita ${visitId}. Accesso consentito.`);
        
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = isVisitOwner;