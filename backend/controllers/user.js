const User = require('../models/user');

// DULE: Per criptare le password e le info
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function getAll(req, res) {
    try {
        const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
        const page = Math.max(parseInt(req.query.page) || 0, 0);

        const allowedSortFields = ['username', 'email', 'role', 'createdAt'];
        const rawSort = req.query.sort || '-createdAt';
        const sortField = rawSort.replace(/^-/, '');
        const sort = allowedSortFields.includes(sortField) ? rawSort : '-createdAt';

        const totalItems = await User.countDocuments();
        const users = await User.find().select('-password').sort(sort).skip(pageSize * page).limit(pageSize);
        res.json({ totalItems, pageSize, page, data: users });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getById(req, res) {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// DULE: utilizziamo bcrypt?
async function create(req, res) {
    try {
        const { email, username } = req.body;
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            const field = existing.email === email ? 'email' : 'username';
            return res.status(409).json({ error: `A user with this ${field} already exists` });
        }

        const user = new User(req.body);
        await user.save();
        const { password: _, ...safe } = user.toObject();
        res.status(201).json(safe);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function update(req, res) {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

async function remove(req, res) {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// DULE: funzione login del MARKETPLACE

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
            token: token, // <- Json Web Token
            user: safeUser 
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        // 1. Controlla se l'utente esiste già (per email o username)
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            const field = existing.email === email ? 'email' : 'username';
            return res.status(409).json({ message: `Un utente con questo ${field} esiste già` });
        }

        // 2. Cripta la password con bcrypt prima di salvarla
        // Il "10" indica il "salt rounds", ovvero quanto deve essere complessa la crittografia
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Crea e salva il nuovo utente nel database
        const user = new User({
            username: username,
            email: email,
            password: hashedPassword, // Inseriamo la versione illeggibile!
            role: 'visitor'           // Usiamo il default definito nel tuo modello
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

module.exports = { getAll, getById, create, update, remove, login, register };
