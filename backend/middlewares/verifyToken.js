const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    // Il token viaggia in un cookie httpOnly ("token"), impostato al login.
    // Non è leggibile da JavaScript lato client: il browser lo allega da solo.
    const token = req.cookies?.token;

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