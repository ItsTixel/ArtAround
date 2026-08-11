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

  useEffect(() => {
    if (activeVisit) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeVisit))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [activeVisit])

  function activateVisit(visit) {
    setActiveVisitState(visit)
  }

  function clearActiveVisit() {
    setActiveVisitState(null)
  }

  return (
    <ActiveVisitContext.Provider value={{ activeVisit, activateVisit, clearActiveVisit }}>
      {children}
    </ActiveVisitContext.Provider>
  )
}

export function useActiveVisit() {
  const ctx = useContext(ActiveVisitContext)
  if (!ctx) throw new Error('useActiveVisit must be used inside ActiveVisitProvider')
  return ctx
}
