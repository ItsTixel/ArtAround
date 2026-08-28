var form = document.getElementById('registerForm');

// Regole allineate a backend/models/user.js: email con la stessa regex,
// username 3–30 caratteri. La lunghezza minima password è una scelta
// solo lato prodotto (il modello non la impone).
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 8;

function setFieldError(field, errorId, message) {
    const el = document.getElementById(errorId);
    if (el) el.textContent = message || '';
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
}

function clearFieldErrors(fields) {
    fields.forEach(({ field, errorId }) => setFieldError(field, errorId, ''));
}

// Intercetta i casi più comuni (username corto, "Mail non valida",
// password troppo corta, campi vuoti) prima di chiamare il server.
function validateRegister({ username, email, password, usernameField, emailField, passwordField }) {
    let firstInvalid = null;
    const fail = (field, errorId, msg) => {
        setFieldError(field, errorId, msg);
        firstInvalid = firstInvalid || field;
    };

    if (!username) fail(usernameField, 'usernameError', 'Scegli un username');
    else if (username.length < USERNAME_MIN) fail(usernameField, 'usernameError', `L'username deve avere almeno ${USERNAME_MIN} caratteri`);
    else if (username.length > USERNAME_MAX) fail(usernameField, 'usernameError', `L'username non può superare i ${USERNAME_MAX} caratteri`);

    if (!email) fail(emailField, 'emailError', 'Inserisci la tua email');
    else if (!EMAIL_RE.test(email)) fail(emailField, 'emailError', 'Mail non valida');

    if (!password) fail(passwordField, 'passwordError', 'Scegli una password');
    else if (password.length < PASSWORD_MIN) fail(passwordField, 'passwordError', `La password deve avere almeno ${PASSWORD_MIN} caratteri`);

    if (firstInvalid) {
        firstInvalid.focus();
        return false;
    }
    return true;
}

// Se si arriva qui da un redirect (es. il popup del Navigator che chiede di
// registrarsi), lo si porta avanti sul link "Accedi" e dopo la registrazione,
// così il login successivo può ancora riportare l'utente da dove era partito.
function getSafeRedirect() {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return null;
}

const redirectParam = getSafeRedirect();
if (redirectParam) {
    const switchLink = document.getElementById('switchLink');
    if (switchLink) switchLink.href = `/marketplace/login.html?redirect=${encodeURIComponent(redirectParam)}`;
}

// ---- Selezione del ruolo (Visitatore/Autore) ----
// Di default "Visitatore": è la scelta più sicura/comune, l'utente sceglie
// "Autore" solo se vuole poter creare musei/opere/visite.
let selectedRole = 'visitor';
const roleToggle = document.querySelector('.role-toggle');
const roleButtons = document.querySelectorAll('.role-btn');
roleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        selectedRole = btn.dataset.role;
        roleToggle.dataset.selected = selectedRole;
        roleButtons.forEach((b) => {
            const isActive = b === btn;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-checked', String(isActive));
        });
    });
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameField = document.getElementById('username');
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const username = usernameField.value.trim();
    const email = emailField.value.trim();
    const password = passwordField.value;
    const feedbackMessage = document.getElementById('feedbackMessage');

    clearFieldErrors([
        { field: usernameField, errorId: 'usernameError' },
        { field: emailField, errorId: 'emailError' },
        { field: passwordField, errorId: 'passwordError' },
    ]);
    feedbackMessage.classList.remove('is-success', 'is-error', 'is-pending');
    feedbackMessage.textContent = "";

    if (!validateRegister({ username, email, password, usernameField, emailField, passwordField })) return;

    feedbackMessage.classList.add('is-pending');
    feedbackMessage.textContent = "Registrazione in corso…";

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // riceve subito il cookie httpOnly di sessione (login automatico)
            body: JSON.stringify({ username, email, password, role: selectedRole })
        });

        const data = await response.json();

        if (response.ok) {
            feedbackMessage.classList.remove('is-pending');
            feedbackMessage.classList.add('is-success');
            feedbackMessage.textContent = data.message || "Registrazione completata.";
            // La registrazione ora logga subito dentro (stesso cookie del login):
            // stessa destinazione della callback Google, redirect se presente
            // (es. si veniva da un tentativo di acquisto visita), altrimenti l'home.
            setTimeout(() => {
                window.location.href = redirectParam || '/marketplace/pages/index.html';
            }, 600);
        } else {
            feedbackMessage.classList.remove('is-pending');

            // Il server può indicare il campo colpevole: `field` per un
            // duplicato (email/username già in uso), `fields` per gli errori
            // di validazione dello schema. In quel caso l'errore va sotto
            // al campo giusto, non un messaggio generico su tutto il form.
            const byField = {
                username: usernameField,
                email: emailField,
                password: passwordField,
            };
            let mapped = false;

            if (data.fields && typeof data.fields === 'object') {
                Object.entries(data.fields).forEach(([name, msg]) => {
                    if (byField[name]) { setFieldError(byField[name], `${name}Error`, msg); mapped = true; }
                });
            } else if (data.field && byField[data.field]) {
                setFieldError(byField[data.field], `${data.field}Error`, data.message || 'Valore già in uso');
                mapped = true;
            }

            if (mapped) {
                feedbackMessage.textContent = "";
                const first = Object.values(byField).find((f) => f.getAttribute('aria-invalid') === 'true');
                if (first) first.focus();
            } else {
                feedbackMessage.classList.add('is-error');
                feedbackMessage.textContent = data.message || "Errore durante la registrazione.";
            }
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        feedbackMessage.classList.remove('is-pending');
        feedbackMessage.classList.add('is-error');
        feedbackMessage.textContent = "Impossibile contattare il server.";
    }
});

// L'errore su un campo resta finché non lo si corregge: lo togliamo
// appena l'utente ci rimette mano.
['username', 'email', 'password'].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.addEventListener('input', () => setFieldError(field, `${id}Error`, ''));
});

// ---- Registrazione/accesso con Google ----
// Stesso endpoint del login: se l'account Google non esiste ancora viene
// creato al volo, quindi qui il pulsante fa sia da "Registrati" che da "Accedi".
const GOOGLE_CLIENT_ID = '144640383709-vr6nf4q1kp0n93aih9dc2tgcu25886ua.apps.googleusercontent.com';

async function handleGoogleCredential(response) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    feedbackMessage.classList.remove('is-success', 'is-error');
    feedbackMessage.classList.add('is-pending');
    feedbackMessage.textContent = "Connessione con Google in corso…";

    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            // Il ruolo scelto nel toggle sopra vale anche per la registrazione
            // con Google (viene usato solo se l'account Google è nuovo).
            body: JSON.stringify({ credential: response.credential, role: selectedRole })
        });
        const data = await res.json();

        if (res.ok) {
            feedbackMessage.classList.remove('is-pending');
            feedbackMessage.classList.add('is-success');
            feedbackMessage.textContent = "Registrazione completata con Google.";
            setTimeout(() => {
                window.location.href = redirectParam || '/marketplace/pages/index.html';
            }, 400);
        } else {
            feedbackMessage.classList.remove('is-pending');
            feedbackMessage.classList.add('is-error');
            feedbackMessage.textContent = data.message || "Accesso con Google non riuscito.";
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        feedbackMessage.classList.remove('is-pending');
        feedbackMessage.classList.add('is-error');
        feedbackMessage.textContent = "Impossibile contattare il server.";
    }
}

window.addEventListener('load', () => {
    if (!window.google?.accounts?.id) return;
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential
    });
    google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'filled_black', size: 'large', width: 320, text: 'signup_with', locale: 'it' }
    );
});
