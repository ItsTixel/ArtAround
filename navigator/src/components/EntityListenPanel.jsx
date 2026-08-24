import { useEffect, useMemo, useRef, useState } from 'react'
import { useVisitProgress, TONE_ORDER, TONE_LABELS } from '../context/VisitProgressContext'
import { PlayIcon, PauseIcon } from './icons'

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

// Contenuto "ascolto" di un'opera: tono/durata scelti in automatico (primo
// disponibile), sintesi vocale nativa. Nessun wrapper di popup — chi lo usa
// decide il contenitore (modale in EntityFoundModal, pannello inline in
// Mappa.jsx). seedItems sono gli item già noti (es. da uno step di visita:
// niente fetch); se null/undefined si recuperano al volo gli item pubblici
// dell'opera.
function EntityListenPanel({ entityId, seedItems }) {
  const { pauseNarration } = useVisitProgress()
  const [items, setItems] = useState(seedItems || null)
  const [loadingItems, setLoadingItems] = useState(!seedItems)
  const [itemsError, setItemsError] = useState(null)
  const [selectedTone, setSelectedTone] = useState(null)
  const [selectedDescIndex, setSelectedDescIndex] = useState(0)
  const [playbackState, setPlaybackState] = useState('idle')
  const utteranceRef = useRef(null)

  useEffect(() => {
    if (seedItems) {
      setItems(seedItems)
      setLoadingItems(false)
      return
    }
    let cancelled = false
    setLoadingItems(true)
    setItemsError(null)
    fetch(`/api/items?artwork=${entityId}&license=Public&pageSize=50`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setItems(data.data || [])
      })
      .catch(() => {
        if (!cancelled) setItemsError('Errore nel caricamento delle informazioni.')
      })
      .finally(() => {
        if (!cancelled) setLoadingItems(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, seedItems])

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

  return (
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
  )
}

export default EntityListenPanel
