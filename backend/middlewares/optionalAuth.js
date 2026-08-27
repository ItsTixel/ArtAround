const jwt = require('jsonwebtoken');

function optionalAuth(req, res, next) {
    const token = req.cookies?.token;

    // Se c'è un token, proviamo a decodificarlo
    if (token) {
        try {
            const secretKey = process.env.JWT_SECRET;
            const decoded = jwt.verify(token, secretKey);
            
            // Se il token è valido, salviamo i dati
            req.user = decoded; 
        } catch (err) {
            // Se il token è scaduto o invalido, non facciamo nulla.
            // L'utente verrà trattato come anonimo.
        }
    }

    // Indipendentemente dal token, mandiamo avanti la richiesta
    next(); 
}

module.exports = optionalAuth;  