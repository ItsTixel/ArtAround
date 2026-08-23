import { useEffect, useMemo, useRef, useState } from 'react'
import { useVisitProgress, TONE_ORDER, TONE_LABELS } from '../context/VisitProgressContext'
import { PlayIcon, PauseIcon } from './icons'
import useEscapeKey from '../hooks/useEscapeKey'
import useFocusTrap from '../hooks/useFocusTrap'

function sortDescriptions(item) {
  return [...(item?.descriptions || [])].sort((a, b) => a.duration_sec - b.duration_sec)
}

function formatDurationLabel(sec) {
  if (sec < 60) return `${sec} sec`
  return `${Math.round(sec / 60)} min`
}

function pillClasses(active, activeClasses) {
  return `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? `${activeClasses} shadow-sm` : 'glass-pill text-text-muted'
  }`
}

// Popup mostrato dopo la scansione del QR di un'opera. Se l'opera fa parte
// della visita attiva, matchedStep porta già i suoi items curati (niente
// fetch); altrimenti gli items pubblici vengono recuperati al volo quando
// l'utente sceglie di ascoltare. L'ascolto qui è volutamente semplice
// (Play/Interrompi, niente barra di avanzamento): non è la narrazione della
// visita, è un ascolto una tantum fuori dal flusso degli step.
function EntityFoundModal({ entity, matchedStep, onGoToStep, onClose }) {
  const { pauseNarration } = useVisitProgress()
  const [phase, setPhase] = useState('choice') // 'choice' | 'listening'
  const [items, setItems] = useState(matchedStep?.items || null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState(null)
  const [selectedTone, setSelectedTone] = useState(null)
  const [selectedDescIndex, setSelectedDescIndex] = useState(0)
  const [playbackState, setPlaybackState] = useState('idle')
  const utteranceRef = useRef(null)
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)

  const availableTones = useMemo(
    () => TONE_ORDER.filter((tone) => (items || []).some((item) => item.tone === tone)),
    [items]
  )
  const activeTone = availableTones.includes(selectedTone) ? selectedTone : availableTones[0]
  const currentItem = (items || []).find((item) => item.tone === activeTone)
  const sortedDescriptions = useMemo(() => sortDescriptions(currentItem), [currentItem])
  const activeDescIndex = Math.min(selectedDescIndex, Math.max(sortedDescriptions.length - 1, 0))
  const currentDescription = sortedDescriptions[activeDescIndex]

  function stopSpeech() {
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setPlaybackState('idle')
  }

  useEffect(() => stopSpeech, [])

  function handleToneSelect(tone) {
    stopSpeech()
    setSelectedTone(tone)
    setSelectedDescIndex(0)
  }

  function handleDescSelect(index) {
    stopSpeech()
    setSelectedDescIndex(index)
  }

  function handlePlayStop() {
    if (playbackState === 'playing') {
      stopSpeech()
      return
    }
    if (!currentDescription?.text) return
    pauseNarration()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(currentDescription.text)
    utterance.lang = 'it-IT'
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return
      setPlaybackState('idle')
    }
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return
      setPlaybackState('idle')
    }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setPlaybackState('playing')
  }

  async function startListening() {
    if (!items) {
      setLoadingItems(true)
      setItemsError(null)
      try {
        const res = await fetch(`/api/items?artwork=${entity._id}&license=Public&pageSize=50`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setItems(data.data || [])
      } catch {
        setItemsError('Errore nel caricamento delle informazioni.')
      } finally {
        setLoadingItems(false)
      }
    }
    setPhase('listening')
  }

  function handleClose() {
    stopSpeech()
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
                onClick={startListening}
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
            <div className="flex flex-col gap-4">
              {loadingItems && <p className="text-sm text-text-muted">Caricamento...</p>}
              {itemsError && <p className="text-sm text-[color:var(--color-error)]">{itemsError}</p>}

              {!loadingItems && !itemsError && (
                <>
                  {availableTones.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableTones.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => handleToneSelect(tone)}
                          className={pillClasses(tone === activeTone, 'border-accent bg-accent text-on-accent')}
                        >
                          {TONE_LABELS[tone]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">Nessuna informazione disponibile per quest'opera.</p>
                  )}

                  {sortedDescriptions.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {sortedDescriptions.map((desc, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleDescSelect(index)}
                          className={pillClasses(index === activeDescIndex, 'border-info bg-info text-on-accent')}
                        >
                          {formatDurationLabel(desc.duration_sec)}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentDescription?.text && (
                    <p className="text-sm leading-relaxed text-text">{currentDescription.text}</p>
                  )}

                  {currentDescription?.text && (
                    <button
                      type="button"
                      onClick={handlePlayStop}
                      className="flex items-center justify-center gap-2 self-start rounded-full bg-gradient-to-br from-accent to-accent-hover px-5 py-2.5 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
                    >
                      {playbackState === 'playing' ? (
                        <>
                          <PauseIcon className="h-4 w-4" /> Interrompi
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4" /> Ascolta
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EntityFoundModal
