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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <VisitInfoBody visit={visit} onClose={onClose} />
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4">
          {!user ? (
            <div className="flex flex-col gap-2 text-center">
              <p className="text-sm text-text-muted">
                {isFree
                  ? 'Devi accedere per aggiungere questa visita.'
                  : 'Devi accedere per acquistare questa visita.'}
              </p>
              <a
                href={`/marketplace/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2.5 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
              >
                Accedi
              </a>
            </div>
          ) : confirm ? (
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
                className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30 disabled:opacity-50"
              >
                {adding ? 'Acquisto...' : 'Sì, adotta'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (isFree ? handleAdopt() : setConfirm(true))}
              disabled={adding}
              className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2.5 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30 disabled:opacity-50"
            >
              {adding ? 'Aggiunta...' : isFree ? 'Aggiungi alla libreria' : `Adotta — ${formatPrice(price)}`}
            </button>
          )}
          {error && <p className="text-xs text-[color:var(--color-error)]">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default VisitAdoptModal
