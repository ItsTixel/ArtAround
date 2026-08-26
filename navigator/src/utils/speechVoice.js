// Safari non segue in modo affidabile utterance.lang per scegliere la voce
// (usa il default di sistema, spesso inglese) a meno di assegnare
// esplicitamente utterance.voice; getVoices() inoltre può tornare vuoto al
// primo giro, popolandosi solo dopo l'evento 'voiceschanged'.
let cachedItalianVoice = null
let listenerAttached = false

function findItalianVoice() {
  return window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('it')) || null
}

// Da chiamare su ogni utterance dopo aver impostato lang = 'it-IT'. Se
// nessuna voce italiana è ancora disponibile non tocca voice, lasciando che
// il browser usi lang come può.
export function applyItalianVoice(utterance) {
  if (!cachedItalianVoice) cachedItalianVoice = findItalianVoice()

  if (cachedItalianVoice) {
    utterance.voice = cachedItalianVoice
    return
  }

  if (!listenerAttached) {
    listenerAttached = true
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      cachedItalianVoice = findItalianVoice()
    })
  }
}
