var log = document.getElementById('loginForm')

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

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const feedbackMessage = document.getElementById('feedbackMessage'); // Il "Password o email errati" sotto il submit 

    feedbackMessage.style.color = "blue";
    feedbackMessage.textContent = "Connessione in corso...";

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
            feedbackMessage.style.color = "green";
            feedbackMessage.textContent = "Autenticazione riuscita! Benvenuto.";

            // Il token vive in un cookie httpOnly gestito dal browser: non c'è
            // nulla da salvare qui. Torniamo al marketplace (o alla pagina di
            // provenienza), dove la navbar legge lo stato di login da /api/auth/me.
            setTimeout(() => {
                window.location.href = getSafeRedirect();
            }, 600);
        } else {
            feedbackMessage.style.color = "red";
            feedbackMessage.textContent = data.message || "Credenziali non valide.";
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        feedbackMessage.style.color = "red";
        feedbackMessage.textContent = "Impossibile contattare il server.";
    }
});