const API = 'http://localhost:8000/api';

/* ── Tab switching ── */
const tabs = document.querySelectorAll('.auth-tab');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.setAttribute('aria-selected', 'false'); });
    panels.forEach(p => p.classList.remove('active'));
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.getAttribute('aria-controls')).classList.add('active');
  });
  tab.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const idx = [...tabs].indexOf(tab);
      const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); next.click();
    }
  });
});

/* ── Password toggle ── */
document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.setAttribute('aria-pressed', String(!showing));
    btn.setAttribute('aria-label', showing ? 'Mostra password' : 'Nascondi password');
    btn.querySelector('svg').innerHTML = showing
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  });
});

/* ── Field validation helpers ── */
function setError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.style.display = msg ? 'flex' : 'none';
  const input = el.previousElementSibling?.tagName === 'DIV'
    ? el.previousElementSibling.querySelector('input')
    : el.previousElementSibling;
  if (input) { if (msg) input.classList.add('error'); else { input.classList.remove('error'); input.classList.add('valid'); } }
}
function clearErrors(...ids) { ids.forEach(id => setError(id, '')); }

/* ── Login form ── */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearErrors('login-email-err', 'login-pw-err');
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-pw').value;
  let valid = true;
  if (!email) { setError('login-email-err', 'Inserisci la tua email.'); valid = false; }
  if (!pw)    { setError('login-pw-err', 'Inserisci la password.'); valid = false; }
  if (!valid) return;

  const msg = document.getElementById('login-msg');
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Accesso in corso…';

  try {
    const res = await fetch(`${API}/users/?pageSize=100`);
    const data = await res.json();
    const user = data.data.find(u => u.email === email);
    if (!user) throw new Error('Utente non trovato.');
    localStorage.setItem('artaround_user', JSON.stringify(user));
    msg.className = 'form-msg success';
    msg.textContent = `Benvenuto, ${user.username}! Reindirizzamento…`;
    setTimeout(() => { window.location.href = '/marketplace/pages/index.html'; }, 1000);
  } catch (err) {
    msg.className = 'form-msg error';
    msg.textContent = err.message.includes('fetch') ? 'Servizio non disponibile. Riprova più tardi.' : err.message;
    btn.disabled = false; btn.textContent = 'Accedi';
  }
});

/* ── Register form ── */
document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearErrors('reg-fname-err','reg-username-err','reg-email-err','reg-pw-err','reg-pw2-err','reg-terms-err');
  const fname    = document.getElementById('reg-fname').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const pw       = document.getElementById('reg-pw').value;
  const pw2      = document.getElementById('reg-pw2').value;
  const role     = document.querySelector('[name="role"]:checked').value;
  const terms    = document.getElementById('reg-terms').checked;
  let valid = true;

  if (!fname)              { setError('reg-fname-err', 'Il nome è obbligatorio.'); valid = false; }
  if (!username || username.length < 3) { setError('reg-username-err', 'Username minimo 3 caratteri.'); valid = false; }
  if (!email || !/\S+@\S+\.\S+/.test(email)) { setError('reg-email-err', 'Inserisci un\'email valida.'); valid = false; }
  if (!pw || pw.length < 8) { setError('reg-pw-err', 'La password deve avere almeno 8 caratteri.'); valid = false; }
  if (pw !== pw2) { setError('reg-pw2-err', 'Le password non coincidono.'); valid = false; }
  if (!terms) { setError('reg-terms-err', 'Devi accettare i termini per continuare.'); valid = false; }
  if (!valid) return;

  const msg = document.getElementById('reg-msg');
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Creazione account…';

  try {
    const res = await fetch(`${API}/users/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: pw, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore durante la registrazione.');
    localStorage.setItem('artaround_user', JSON.stringify(data));
    msg.className = 'form-msg success';
    msg.textContent = 'Account creato con successo! Reindirizzamento…';
    setTimeout(() => { window.location.href = '/marketplace/pages/index.html'; }, 1200);
  } catch (err) {
    msg.className = 'form-msg error';
    msg.textContent = err.message.includes('fetch') ? 'Servizio non disponibile. Riprova più tardi.' : err.message;
    btn.disabled = false; btn.textContent = 'Crea account';
  }
});

if (localStorage.getItem('artaround_user')) {
  window.location.href = '/marketplace/pages/index.html';
}
