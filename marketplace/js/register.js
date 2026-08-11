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
