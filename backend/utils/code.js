// Alfabeto senza caratteri ambigui (niente 0/O, 1/I/L) per codici leggibili
// a voce/lavagna dagli studenti.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(len = 6) {
  let code = '';
  for (let i = 0; i < len; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

async function generateUniqueCode(Visit, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const code = randomCode();
    const exists = await Visit.exists({ code });
    if (!exists) return code;
  }
  throw new Error('Impossibile generare un codice univoco, riprova.');
}

module.exports = { generateUniqueCode };
