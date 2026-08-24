import { useRef, useState } from 'react'
import useEscapeKey from '../hooks/useEscapeKey'
import useFocusTrap from '../hooks/useFocusTrap'
import EntityListenPanel from './EntityListenPanel'

// Popup mostrato dopo la scansione del QR di un'opera. Se l'opera fa parte
// della visita attiva, matchedStep porta già i suoi items curati (passati
// come seed a EntityListenPanel, niente fetch); altrimenti EntityListenPanel
// recupera da sé gli items pubblici quando l'utente sceglie di ascoltare.
function EntityFoundModal({ entity, matchedStep, onGoToStep, onClose }) {
  const [phase, setPhase] = useState('choice') // 'choice' | 'listening'
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)

  function handleClose() {
    window.speechSynthesis.cancel()
    onClose()
  }

  useEscapeKey(handleClose)

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={entity.name}
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-bg">
              {entity.image_url && (
                <img src={entity.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg font-semibold text-text">{entity.name}</h2>
              {entity.artwork_author && <p className="text-xs text-text-muted">{entity.artwork_author}</p>}
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

          {phase === 'choice' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-muted">
                {matchedStep
                  ? 'Questa opera fa parte della tua visita.'
                  : 'Questa opera non fa parte della tua visita attiva.'}
              </p>
              {matchedStep && (
                <button
                  type="button"
                  onClick={onGoToStep}
                  className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2.5 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
                >
                  Vai a questo punto della visita
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhase('listening')}
                className={
                  matchedStep
                    ? 'rounded-md border border-border px-4 py-2.5 text-sm font-medium text-text'
                    : 'rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2.5 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30'
                }
              >
                Ascolta informazioni su quest'opera
              </button>
            </div>
          )}

          {phase === 'listening' && (
            <EntityListenPanel entityId={entity._id} seedItems={matchedStep?.items || null} />
          )}
        </div>
      </div>
    </div>
  )
}

export default EntityFoundModal
