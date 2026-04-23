var log = document.getElementById('loginForm')

log.addEventListener('submit', async (e) => {
    e.preventDefault(); // Blocca il ricaricamento della pagina

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const feedbackMessage = document.getElementById('feedbackMessage'); // Il "Password o email errati" sotto il submit 

    feedbackMessage.style.color = "blue";
    feedbackMessage.textContent = "Connessione in corso...";

    try {
        const response = await fetch('http://localhost:8000/api/users/login', { // Da cambiare in url sito...
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            feedbackMessage.style.color = "green";
            feedbackMessage.textContent = "Autenticazione riuscita! Benvenuto.";
            
            // SALVA IL TOKEN NEL BROWSER
            localStorage.setItem('jwt_token', data.token);
            
            // Salva i dati dell'utente (in caso ci servano per altro)
            localStorage.setItem('user_data', JSON.stringify(data.user));
        } else {
            feedbackMessage.style.color = "red";
            feedbackMessage.textContent = data.message || "Credenziali non valide.";
        }
    } catch (error) {
        console.error("Errore di rete:", error); // nessun throw?
        feedbackMessage.style.color = "red";
        feedbackMessage.textContent = "Impossibile contattare il server.";
    }
});