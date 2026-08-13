import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import VisitInfoBody, { formatPrice } from './VisitInfoBody'

// Popup mostrato dopo la scansione del QR di una visita che l'utente non ha
// ancora adottato: propone l'adozione (con conferma se a pagamento) invece
// delle azioni "vai/disattiva" di VisitDetailModal. Nessun pagamento reale è
// implementato — la conferma va a buon fine automaticamente.
function VisitAdoptModal({ visit, onAdopted, onClose }) {
  const { user } = useAuth()
  const [confirm, setConfirm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  const price = visit.base_price || 0
  const isFree = !price

  async function handleAdopt() {
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${user._id}/adopt/${visit._id}`, {
        method: 'PUT',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      onAdopted()
    } catch {
      setError("Errore durante l'acquisto. Riprova.")
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <VisitInfoBody visit={visit} onClose={onClose} />
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4">
          {confirm ? (
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm text-text-muted">
                Sei sicuro? Costa <strong className="text-text">{formatPrice(price)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                disabled={adding}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleAdopt}
                disabled={adding}
                className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-[0_0_16px_rgba(212,168,83,0.25)] disabled:opacity-50"
              >
                {adding ? 'Acquisto...' : 'Sì, adotta'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (isFree ? handleAdopt() : setConfirm(true))}
              disabled={adding}
              className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2.5 text-sm font-medium text-on-accent shadow-[0_0_16px_rgba(212,168,83,0.25)] disabled:opacity-50"
            >
              {adding ? 'Aggiunta...' : isFree ? 'Aggiungi alla libreria' : `Adotta — ${formatPrice(price)}`}
            </button>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default VisitAdoptModal
