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

// Come buildSearchRegex, ma per un match ESATTO (non "contiene") su un campo
// stringa — usata dove serve trovare l'entità il cui nome coincide
// esattamente con un valore noto (es. il navigator che risolve il tag di un
// approfondimento all'opera omonima, invece di fare fuzzy-match su qualunque
// nome che contenga quella parola). Gli ancoraggi ^...$ sono aggiunti QUI,
// dopo l'escape di `input` — mai passati dal chiamante come parte della
// stringa: un chiamante che li includesse li vedrebbe semplicemente escapati
// come testo letterale, stessa garanzia di buildSearchRegex.
function buildExactRegex(input, maxLen = 100) {
  return new RegExp(`^${escapeRegex(String(input).trim().slice(0, maxLen))}$`, 'i');
}

module.exports = { escapeRegex, buildSearchRegex, buildExactRegex };
