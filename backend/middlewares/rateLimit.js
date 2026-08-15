// Rate limiter in memory, per IP. Pensato per pochi endpoint sensibili
// (login, register, google-auth, adopt): non serve un backend esterno
// per questi volumi, un Map basta.
function rateLimit({ windowMs, max, message }) {
    const hits = new Map();

    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        const entry = hits.get(key);

        if (!entry || now - entry.start > windowMs) {
            hits.set(key, { start: now, count: 1 });
            return next();
        }

        if (entry.count >= max) {
            return res.status(429).json({ error: message || 'Troppe richieste, riprova più tardi.' });
        }

        entry.count++;
        next();
    };
}

module.exports = rateLimit;
