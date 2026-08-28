var log = document.getElementById('loginForm')

// Validazione lato client: stessa forma della regex del modello utente
// (backend/models/user.js), così i messaggi combaciano con quelli del server.
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Mostra/pulisce l'errore inline sotto un singolo campo. `errorId` è lo
// <small class="field-error"> aggiunto in login.html accanto all'input.
function setFieldError(field, errorId, message) {
    const el = document.getElementById(errorId);
    if (el) el.textContent = message || '';
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
}

function clearFieldErrors(fields) {
    fields.forEach(({ field, errorId }) => setFieldError(field, errorId, ''));
}

// Prima validazione utile: email malformata o campi vuoti vengono
// intercettati qui, senza chiamare il server. Ritorna true se è tutto ok.
function validateLogin({ email, password, emailField, passwordField }) {
    let firstInvalid = null;

    if (!email) {
        setFieldError(emailField, 'emailError', 'Inserisci la tua email');
        firstInvalid = firstInvalid || emailField;
    } else if (!EMAIL_RE.test(email)) {
        setFieldError(emailField, 'emailError', 'Mail non valida');
        firstInvalid = firstInvalid || emailField;
    }

    if (!password) {
        setFieldError(passwordField, 'passwordError', 'Inserisci la password');
        firstInvalid = firstInvalid || passwordField;
    }

    if (firstInvalid) {
        firstInvalid.focus();
        return false;
    }
    return true;
}

// Se si arriva qui da un redirect (es. tentativo di aggiungere una visita
// da non loggati), torniamo lì dopo il login invece che al marketplace.
// Si accettano solo path relativi interni, per evitare open-redirect.
function getSafeRedirect() {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return '/marketplace/pages/index.html';
}

// Se veniamo da un tentativo di azione che richiede il login, spieghiamolo,
// e portiamo il redirect anche sul link "Registrati" (nel caso l'utente non
// abbia ancora un account) così il giro registrazione -> login -> redirect
// non perde di vista da dove si era partiti.
const redirectParam = new URLSearchParams(window.location.search).get('redirect');
if (redirectParam) {
    const sub = document.querySelector('.auth-sub');
    if (sub) sub.textContent = 'Accedi per continuare';

    const switchLink = document.getElementById('switchLink');
    if (switchLink) switchLink.href = `/marketplace/register.html?redirect=${encodeURIComponent(redirectParam)}`;
}

log.addEventListener('submit', async (e) => {
    e.preventDefault(); // Blocca il ricaricamento della pagina

    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const email = emailField.value.trim();
    const password = passwordField.value;
    const feedbackMessage = document.getElementById('feedbackMessage'); // Il "Password o email errati" sotto il submit

    clearFieldErrors([
        { field: emailField, errorId: 'emailError' },
        { field: passwordField, errorId: 'passwordError' },
    ]);
    feedbackMessage.classList.remove('is-success', 'is-error', 'is-pending');
    feedbackMessage.textContent = "";

    // Errori di forma (email malformata, campi vuoti): li mostriamo subito
    // sotto il campo, senza disturbare il server.
    if (!validateLogin({ email, password, emailField, passwordField })) return;

    feedbackMessage.classList.add('is-pending');
    feedbackMessage.textContent = "Connessione in corso…";

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // riceve il cookie httpOnly di sessione
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            feedbackMessage.classList.remove('is-pending');
            feedbackMessage.classList.add('is-success');
            feedbackMessage.textContent = "Accesso effettuato.";

            // Il token vive in un cookie httpOnly gestito dal browser: non c'è
            // nulla da salvare qui. Torniamo al marketplace (o alla pagina di
            // provenienza), dove la navbar legge lo stato di login da /api/auth/me.
            setTimeout(() => {
                window.location.href = getSafeRedirect();
            }, 600);
        } else {
            feedbackMessage.classList.remove('is-pending');
            feedbackMessage.classList.add('is-error');
            const msg = data.message || "Credenziali non valide.";

            if (/google/i.test(msg)) {
                // Account creato con Google: la password locale non esiste,
                // l'errore riguarda il modo di accesso, non la coppia email/password.
                setFieldError(emailField, 'emailError', msg);
                feedbackMessage.textContent = "";
                feedbackMessage.classList.remove('is-error');
            } else {
                // Credenziali errate: per sicurezza non diciamo se a sbagliare
                // è l'email o la password, evidenziamo entrambi i campi.
                feedbackMessage.textContent = msg;
                emailField.setAttribute('aria-invalid', 'true');
                passwordField.setAttribute('aria-invalid', 'true');
            }
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        feedbackMessage.classList.remove('is-pending');
        feedbackMessage.classList.add('is-error');
        feedbackMessage.textContent = "Impossibile contattare il server.";
    }
});

// Appena l'utente ricomincia a scrivere, togliamo l'errore dal campo:
// resta finché non lo si corregge, non un lampo che sparisce da solo.
['email', 'password'].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.addEventListener('input', () => setFieldError(field, `${id}Error`, ''));
});

// ---- Login con Google ----
// Il pulsante è renderizzato da Google Identity Services (script caricato in
// login.html); alla pressione ci restituisce un ID token che verifichiamo
// lato server per aprire la stessa sessione (cookie httpOnly) del login normale.
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
            body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();

        if (res.ok) {
            feedbackMessage.classList.remove('is-pending');
            feedbackMessage.classList.add('is-success');
            feedbackMessage.textContent = "Accesso effettuato con Google.";
            setTimeout(() => {
                window.location.href = getSafeRedirect();
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
        { theme: 'filled_black', size: 'large', width: 320, text: 'signin_with', locale: 'it' }
    );
});