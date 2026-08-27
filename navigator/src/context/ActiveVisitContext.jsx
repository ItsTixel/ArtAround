import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'navigator_active_visit'

const ActiveVisitContext = createContext(null)

function readStoredVisit() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function ActiveVisitProvider({ children }) {
  const [activeVisit, setActiveVisitState] = useState(readStoredVisit)
  // True subito dopo aver attivato una visita inframuseale (più musei): fa
  // comparire una volta il popup "in quale museo ti trovi?" (vedi
  // VisitStartMuseumModal) così non si parte per forza dal primo museo.
  // Volutamente non persistito: un refresh a metà visita non lo deve
  // rimostrare, e viene valorizzato solo qui in activateVisit.
  const [pendingMuseumChoice, setPendingMuseumChoice] = useState(false)

  useEffect(() => {
    if (activeVisit) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeVisit))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [activeVisit])

  // `promptMuseumChoice` di default è true per le visite inframuseali (più
  // musei). Le sessioni di gruppo passano esplicitamente false: lì è il
  // professore a guidare gli step e non deve esserci né il popup né
  // l'autoplay che ne consegue (vedi VisitProgressContext).
  function activateVisit(visit, { promptMuseumChoice } = {}) {
    setActiveVisitState(visit)
    setPendingMuseumChoice(promptMuseumChoice ?? (visit?.museum || []).length > 1)
  }

  function clearActiveVisit() {
    setActiveVisitState(null)
    setPendingMuseumChoice(false)
  }

  function clearPendingMuseumChoice() {
    setPendingMuseumChoice(false)
  }

  return (
    <ActiveVisitContext.Provider
      value={{ activeVisit, activateVisit, clearActiveVisit, pendingMuseumChoice, clearPendingMuseumChoice }}
    >
      {children}
    </ActiveVisitContext.Provider>
  )
}

export function useActiveVisit() {
  const ctx = useContext(ActiveVisitContext)
  if (!ctx) throw new Error('useActiveVisit must be used inside ActiveVisitProvider')
  return ctx
}
