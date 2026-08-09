const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    // Il frontend invia il token nell'header "Authorization"
    // Tutte le pagine in futuro dovrebbero avere questo header, 
    // così che gli utenti non possono accedere a pagine che richiedono l'accesso.
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: "Token mancante. Accesso negato." });
    }

    try {
        const secretKey = process.env.JWT_SECRET || "password";
        // Verifica e decodifica il token
        const decoded = jwt.verify(token, secretKey); // Nel caso sia falso, fa throw new error
        
        // Salviamo i dati dell'utente nella richiesta, così i controller successivi sanno chi sta facendo l'azione
        req.user = decoded; 
        
        next(); // Passa all'azione successiva (es. crea il museo)
    } catch (err) {
        return res.status(401).json({ message: "Token non valido o scaduto." });
    }
}

module.exports = verifyToken;