var form = document.getElementById('registerForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const feedbackMessage = document.getElementById('feedbackMessage');

    feedbackMessage.style.color = "blue";
    feedbackMessage.textContent = "Registrazione in corso...";

    try {
        const response = await fetch('http://localhost:8000/api/auth/register', {
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
                window.location.href = 'index.html';
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
