const jwt = require('jsonwebtoken');

function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Se c'è un token, proviamo a decodificarlo
    if (token) {
        try {
            const secretKey = process.env.JWT_SECRET || "password";
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