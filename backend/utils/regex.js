// Trasforma una stringa arbitraria (tipicamente input utente da un campo di
// ricerca) in un pattern che la cerca *alla lettera*: ogni metacarattere di
// regex (. * + ? ^ $ { } ( ) | [ ] \) viene preceduto da backslash.
//
// Senza questo escape, `new RegExp(req.query.name, 'i')` interpreta l'input
// come espressione regolare:
//   - un input non valido (es. "(" o "[") fa throw → risposta 500 su una
//     ricerca banale;
//   - ".*" o "." matchano qualunque cosa, svuotando di senso il filtro;
//   - pattern come "(a+)+$" causano backtracking catastrofico nel motore
//     regex di MongoDB (ReDoS): una singola richiesta pubblica e senza
//     autenticazione può saturare la CPU del server.
// Con l'escape il pattern resta una ricerca di sottostringa letterale:
// tempo lineare, nessuna sorpresa.
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Costruisce la RegExp case-insensitive da usare come filtro "contiene" su un
// campo stringa (Museum.name, Visit.title, Entity.name...). L'input viene
// ripulito, troncato a `maxLen` (una barra di ricerca non ha bisogno di più)
// ed emesso come pattern letterale.
function buildSearchRegex(input, maxLen = 100) {
  return new RegExp(escapeRegex(String(input).trim().slice(0, maxLen)), 'i');
}

module.exports = { escapeRegex, buildSearchRegex };
