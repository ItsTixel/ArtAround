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

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const feedbackMessage = document.getElementById('feedbackMessage');

    feedbackMessage.style.color = "blue";
    feedbackMessage.textContent = "Registrazione in corso...";

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            feedbackMessage.style.color = "green";
            feedbackMessage.textContent = data.message || "Registrazione completata! Ora puoi fare il login.";
            setTimeout(() => {
                window.location.href = redirectParam
                    ? `/marketplace/login.html?redirect=${encodeURIComponent(redirectParam)}`
                    : '/marketplace/login.html';
            }, 2000);
        } else {
            feedbackMessage.style.color = "red";
            feedbackMessage.textContent = data.message || "Errore durante la registrazione.";
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        feedbackMessage.style.color = "red";
        feedbackMessage.textContent = "Impossibile contattare il server.";
    }
});

// ---- Registrazione/accesso con Google ----
// Stesso endpoint del login: se l'account Google non esiste ancora viene
// creato al volo, quindi qui il pulsante fa sia da "Registrati" che da "Accedi".
const GOOGLE_CLIENT_ID = '144640383709-vr6nf4q1kp0n93aih9dc2tgcu25886ua.apps.googleusercontent.com';

async function handleGoogleCredential(response) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    feedbackMessage.style.color = "blue";
    feedbackMessage.textContent = "Connessione con Google in corso...";

    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();

        if (res.ok) {
            feedbackMessage.style.color = "green";
            feedbackMessage.textContent = "Autenticazione riuscita! Benvenuto.";
            setTimeout(() => {
                window.location.href = redirectParam || '/marketplace/pages/index.html';
            }, 400);
        } else {
            feedbackMessage.style.color = "red";
            feedbackMessage.textContent = data.message || "Accesso con Google non riuscito.";
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        feedbackMessage.style.color = "red";
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
