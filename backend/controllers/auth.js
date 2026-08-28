const User = require('../models/user');

// Per criptare le password e le info
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

async function login(req, res) {
    try {
        const { email, password } = req.body;

        // Cerchiamo l'utente tramite l'email
        const user = await User.findOne({ email });

        // Verifica se l'email non esiste
        if (!user) {
            return res.status(401).json({ message: "Email o password errati" });
        }

        // Account creato via Google Sign-In: non ha una password locale da confrontare
        if (!user.password) {
            return res.status(401).json({ message: "Questo account usa l'accesso con Google. Accedi con Google." });
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
        const secretKey = process.env.JWT_SECRET;
        const maxAgeMs = 60 * 60 * 1000; // 1 ora, stesso valore di expiresIn
        const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

        // Il token viaggia in un cookie httpOnly: non leggibile da JS lato
        // client (protegge da furto via XSS), il browser lo allega da solo
        // alle richieste successive verso questa stessa origin.
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: maxAgeMs
        });

        // Restituiamo l'utente (senza password, senza il token)
        const { password: _, ...safeUser } = user.toObject();

        res.status(200).json({
            success: true,
            message: "Login effettuato con successo",
            user: safeUser
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function register(req, res) {
    try {
        const { username, email, password, role } = req.body;

        // Campi mancanti: rispondiamo subito indicando quali, così il form
        // può segnalarli sotto all'input giusto invece di un errore generico.
        const missing = {};
        if (!username || !String(username).trim()) missing.username = 'Scegli un username';
        if (!email || !String(email).trim()) missing.email = 'Inserisci la tua email';
        if (!password) missing.password = 'Scegli una password';
        if (Object.keys(missing).length) {
            return res.status(400).json({ message: 'Compila tutti i campi', fields: missing });
        }

        // Controlla se l'utente esiste già (per email o username)
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            const field = existing.email === email ? 'email' : 'username';
            const label = field === 'email' ? 'questa email' : 'questo username';
            return res.status(409).json({ message: `Esiste già un account con ${label}`, field });
        }

        // Cripta la password con bcrypt prima di salvarla
        // Il "10" indica il "salt rounds", ovvero quanto deve essere complessa la crittografia
        const hashedPassword = await bcrypt.hash(password, 10);

        // Accettiamo solo i ruoli previsti dallo schema; qualsiasi altro
        // valore (o l'assenza del campo) ricade sul default "visitor".
        const allowedRoles = ['visitor', 'author'];
        const finalRole = allowedRoles.includes(role) ? role : 'visitor';

        // Crea e salva il nuovo utente nel database
        const user = new User({
            username: username,
            email: email,
            password: hashedPassword,
            role: finalRole
        });

        await user.save();

        // Login automatico dopo la registrazione: stessa identica logica di
        // login()/googleAuth(), per evitare di far reinserire subito le
        // credenziali appena scelte (l'utente arriva già autenticato sull'home).
        const tokenPayload = { id: user._id, role: user.role };
        const secretKey = process.env.JWT_SECRET;
        const maxAgeMs = 60 * 60 * 1000;
        const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '1h' });
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: maxAgeMs
        });

        const { password: _, ...safeUser } = user.toObject();

        res.status(201).json({
            success: true,
            message: "Registrazione completata con successo!",
            user: safeUser
        });

    } catch (e) {
        // Errori di validazione dello schema (es. "Email non valida",
        // username troppo corto): li rimandiamo campo per campo.
        if (e.name === 'ValidationError' && e.errors) {
            const fields = {};
            for (const [name, err] of Object.entries(e.errors)) {
                fields[name] = err.message;
            }
            return res.status(400).json({ message: "Controlla i campi evidenziati", fields });
        }

        // Corsa critica sull'indice unique: il findOne sopra non ha visto il
        // duplicato ma il save sì. Stesso messaggio del controllo esplicito.
        if (e.code === 11000) {
            const field = Object.keys(e.keyPattern || { email: 1 })[0];
            const label = field === 'email' ? 'questa email' : 'questo username';
            return res.status(409).json({ message: `Esiste già un account con ${label}`, field });
        }

        res.status(400).json({ message: "Errore durante la registrazione", error: e.message });
    }
}

async function googleAuth(req, res) {
    try {
        const { credential, role } = req.body;
        if (!credential) {
            return res.status(400).json({ message: "Token Google mancante" });
        }

        // Come in register(): ruolo valido solo se esplicitamente 'author',
        // altrimenti 'visitor'. Si applica solo alla creazione del nuovo
        // utente più sotto, mai a un account Google già esistente.
        const allowedRoles = ['visitor', 'author'];
        const requestedRole = allowedRoles.includes(role) ? role : 'visitor';

        // Verifica la firma e la validità dell'ID token presso Google:
        // se qualcuno manda un token falso o scaduto, questa chiamata fallisce.
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name } = payload;

        if (!email) {
            return res.status(400).json({ message: "Impossibile leggere l'email dal profilo Google" });
        }

        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            // Primo accesso con questo account Google: creiamo l'utente.
            // Username derivato dalla parte locale dell'email, reso univoco se serve.
            let base = (email.split('@')[0] || 'utente').toLowerCase().replace(/[^a-z0-9_.-]/g, '');
            if (base.length < 3) base = base.padEnd(3, '0');
            base = base.slice(0, 25);

            let username = base;
            let suffix = 1;
            while (await User.findOne({ username })) {
                username = `${base}${suffix++}`;
            }

            user = new User({
                username,
                email,
                googleId,
                display_name: name,
                role: requestedRole
            });
            await user.save();
        } else if (!user.googleId) {
            // Account già esistente (registrato con email/password): colleghiamo Google.
            user.googleId = googleId;
            await user.save();
        }

        const tokenPayload = { id: user._id, role: user.role };
        const secretKey = process.env.JWT_SECRET;
        const maxAgeMs = 60 * 60 * 1000;
        const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: maxAgeMs
        });

        const { password: _, ...safeUser } = user.toObject();

        res.status(200).json({
            success: true,
            message: "Accesso con Google effettuato con successo",
            user: safeUser
        });
    } catch (e) {
        res.status(401).json({ message: "Token Google non valido", error: e.message });
    }
}

async function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logout effettuato' });
}

async function me(req, res) {
  try {
    // req.user viene popolato da optionalAuth se il cookie httpOnly è
    // presente e valido; niente utente loggato non è un errore, quindi
    // rispondiamo comunque 200 con null.
    if (!req.user) return res.json(null);

    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(401).json({ error: 'Utente non trovato' });

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { login, register, googleAuth, logout, me };
