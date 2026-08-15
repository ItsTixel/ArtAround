var form = document.getElementById('registerForm');

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

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const feedbackMessage = document.getElementById('feedbackMessage');

    feedbackMessage.classList.remove('is-success', 'is-error');
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
            feedbackMessage.classList.add('is-error');
            feedbackMessage.textContent = data.message || "Errore durante la registrazione.";
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        feedbackMessage.classList.remove('is-pending');
        feedbackMessage.classList.add('is-error');
        feedbackMessage.textContent = "Impossibile contattare il server.";
    }
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
