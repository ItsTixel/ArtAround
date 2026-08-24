import { useEffect, useRef, useState } from 'react'
import useEscapeKey from '../hooks/useEscapeKey'
import useFocusTrap from '../hooks/useFocusTrap'
import EntityListenPanel from './EntityListenPanel'
import { exactNameQuery } from '../context/VisitProgressContext'

// Popup aperto chiedendo un approfondimento su un tag dell'opera attuale (da
// Comandi.jsx o da un comando vocale — vedi requestInsight in
// VisitProgressContext). L'opera-approfondimento non è mai quella già in
// visita: si cerca per nome (il tag stesso), anche fra opere non fisiche, e
// si passa l'id trovato a EntityListenPanel, che si occupa da sé del fetch
// degli item e della sintesi vocale — stesso pattern riusabile di
// EntityFoundModal/Mappa.jsx, senza fase di scelta perché qui l'utente ha già
// chiesto esplicitamente di ascoltare.
function InsightModal({ tag, onClose }) {
  const [lookup, setLookup] = useState({ loading: true, error: null, entity: null })
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)

  useEffect(() => {
    let cancelled = false
    setLookup({ loading: true, error: null, entity: null })
    fetch(`/api/entities?name=${encodeURIComponent(exactNameQuery(tag))}&pageSize=1`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const entity = data.data?.[0] || null
        setLookup({ loading: false, error: entity ? null : 'not-found', entity })
      })
      .catch(() => {
        if (!cancelled) setLookup({ loading: false, error: 'fetch', entity: null })
      })
    return () => {
      cancelled = true
    }
  }, [tag])

  function handleClose() {
    window.speechSynthesis.cancel()
    onClose()
  }

  useEscapeKey(handleClose)

  const { loading, error, entity } = lookup

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={entity?.name || tag}
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-start gap-3">
            {entity && (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-bg">
                {entity.image_url && (
                  <img src={entity.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Approfondimento</span>
              <h2 className="font-serif text-lg font-semibold text-text">{entity?.name || tag}</h2>
              {entity?.artwork_author && <p className="text-xs text-text-muted">{entity.artwork_author}</p>}
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Chiudi"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-400/20 text-text-muted hover:bg-slate-400/10"
            >
              ×
            </button>
          </div>

          {loading && <p className="text-sm text-text-muted">Caricamento...</p>}
          {error === 'not-found' && (
            <p className="text-sm text-text-muted">Nessun approfondimento disponibile su «{tag}».</p>
          )}
          {error === 'fetch' && (
            <p className="text-sm text-[color:var(--color-error)]">Errore nel caricamento dell'approfondimento.</p>
          )}
          {entity && <EntityListenPanel entityId={entity._id} seedItems={null} />}
        </div>
      </div>
    </div>
  )
}

export default InsightModal
