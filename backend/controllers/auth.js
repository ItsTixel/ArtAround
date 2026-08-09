const User = require('../models/user');

// Per criptare le password e le info
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function login(req, res) {
    try {
        const { email, password } = req.body;

        // Cerchiamo l'utente tramite l'email
        const user = await User.findOne({ email });

        // Verifica se l'email non esiste
        if (!user) {
            return res.status(401).json({ message: "Email o password errati" });
        }

        // Confronta la password inserita dell'utente e quella del database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Email o password errati" });
        }

        // Creiamo il payload del Token: 
        // salviamo l'id e il ruolo così che in futuro sappiamo cosa fare (salviamo solo questi due dato che non ci interessa altro)
        const payload = {
            id: user._id,
            role: user.role
        };

        // Generiamo il JWT:
        // creiamo una password segreta e facciamo il sign del token
        const secretKey = process.env.JWT_SECRET || "password";
        const token = jwt.sign(payload, secretKey, { expiresIn: '1h' }); // Scade in 1 ore

        // Restituiamo l'utente (senza password)
        const { password: _, ...safeUser } = user.toObject();
        
        res.status(200).json({ 
            success: true, 
            message: "Login effettuato con successo", 
            token: token, // Json Web Token
            user: safeUser 
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        // Controlla se l'utente esiste già (per email o username)
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            const field = existing.email === email ? 'email' : 'username';
            return res.status(409).json({ message: `Un utente con questo ${field} esiste già` });
        }

        // Cripta la password con bcrypt prima di salvarla
        // Il "10" indica il "salt rounds", ovvero quanto deve essere complessa la crittografia
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crea e salva il nuovo utente nel database
        const user = new User({
            username: username,
            email: email,
            password: hashedPassword, 
            role: 'visitor'
        });

        await user.save();

        res.status(201).json({ 
            success: true, 
            message: "Registrazione completata con successo! Ora puoi fare il login." 
        });

    } catch (e) {
        res.status(400).json({ message: "Errore durante la registrazione", error: e.message });
    }
}

module.exports = { login, register };
