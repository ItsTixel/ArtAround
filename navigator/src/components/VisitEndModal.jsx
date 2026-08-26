import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress } from '../context/VisitProgressContext'
import { museumVisitPath } from '../utils/museumVisit'
import useFocusTrap from '../hooks/useFocusTrap'
import useEscapeKey from '../hooks/useEscapeKey'

// Popup mostrato quando si preme Prossimo sull'ultima opera di una visita
// individuale (mai per una visita di gruppo, che termina già per conto suo —
// vedi GroupSessionContext.handleNextStep). "Rimani nella visita attuale"
// si limita a chiudere il popup: lo stepIndex non è mai cambiato, quindi
// l'utente resta esattamente dov'era e può tornare indietro ad ascoltare
// approfondimenti saltati. "Termina visita" ricalca invece lo stesso
// percorso di ProfileMenu.jsx (handleLeaveVisit): svuota la visita attiva e
// riporta alla scelta visite del museo corrente.
function VisitEndModal() {
  const navigate = useNavigate()
  const { clearActiveVisit } = useActiveVisit()
  const { museum, closeEndPrompt } = useVisitProgress()
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)
  useEscapeKey(closeEndPrompt)

  function handleEndVisit() {
    const path = museumVisitPath(museum)
    clearActiveVisit()
    closeEndPrompt()
    navigate(path)
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={closeEndPrompt}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Visita terminata"
        tabIndex={-1}
        className="glass-panel w-full max-w-md rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="font-serif text-2xl font-semibold text-text">Visita terminata</h1>
        <p className="mt-2 text-sm text-text-muted">
          Hai raggiunto l'ultima opera della visita. Puoi procedere per conto tuo oppure tornare alla home e
          scegliere una visita diversa.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleEndVisit}
            className="w-full rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-3 text-sm font-medium text-on-accent"
          >
            Termina visita
          </button>
          <button
            type="button"
            onClick={closeEndPrompt}
            className="w-full rounded-md border border-border px-4 py-3 text-sm font-medium text-text"
          >
            Rimani nella visita attuale
          </button>
        </div>
      </div>
    </div>
  )
}

export default VisitEndModal
