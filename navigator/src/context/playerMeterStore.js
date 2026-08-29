import { useSyncExternalStore } from 'react'

// Stato ad alta frequenza del player, tenuto FUORI dal value di
// VisitProgressContext. `progress` si aggiorna ~5 volte al secondo durante la
// riproduzione e il transcript del microfono a ogni risultato intermedio del
// riconoscimento vocale: se vivessero nel context, ogni aggiornamento
// ri-renderizzerebbe tutti i suoi consumer (Opera, Comandi, Mappa, BottomNav,
// ProfileMenu, GroupSessionProvider…) e lo stesso VisitProgressProvider a ogni
// tick. Con questi store esterni si aggiorna solo chi si iscrive: la barra
// (PlayerBar) e il popup "in ascolto" (MicListeningIndicator).
//
// Due store separati così la barra di avanzamento non fa ri-renderizzare
// l'indicatore del microfono e viceversa.

function createStore(initialState) {
  let state = initialState
  const listeners = new Set()

  function getSnapshot() {
    return state
  }

  // Merge parziale. No-op (nessuna notifica) se nessun campo cambia davvero,
  // così un setter chiamato con lo stesso valore non forza un render — e
  // getSnapshot resta referenzialmente stabile per useSyncExternalStore.
  function set(patch) {
    let changed = false
    for (const key in patch) {
      if (state[key] !== patch[key]) {
        changed = true
        break
      }
    }
    if (!changed) return
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener())
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return { getSnapshot, set, subscribe }
}

const meterStore = createStore({ progress: 0, seekPreview: null })
const micStore = createStore({ listening: false, transcript: '', error: null })

export const getMeter = meterStore.getSnapshot
export const setMeter = meterStore.set
export const getMic = micStore.getSnapshot
export const setMic = micStore.set

// Posizione di lettura (0..1) e anteprima del seek durante il trascinamento.
export function usePlayerMeter() {
  return useSyncExternalStore(meterStore.subscribe, meterStore.getSnapshot, meterStore.getSnapshot)
}

// Stato del riconoscimento vocale per il popup "in ascolto".
export function useMicStatus() {
  return useSyncExternalStore(micStore.subscribe, micStore.getSnapshot, micStore.getSnapshot)
}

// Solo il booleano "sta ascoltando", per chi non usa il transcript (PlayerBar,
// che colora l'icona del microfono). Restituendo un primitivo invece
// dell'oggetto, useSyncExternalStore confronta per valore: i risultati
// intermedi del riconoscimento, che cambiano molte volte al secondo, non lo
// fanno ri-renderizzare.
function getMicListening() {
  return micStore.getSnapshot().listening
}

export function useMicListening() {
  return useSyncExternalStore(micStore.subscribe, getMicListening, getMicListening)
}
