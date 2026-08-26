import { useEffect, useMemo, useRef, useState } from 'react'
import { useVisitProgress, TONE_ORDER, TONE_LABELS, closestToneAtMost } from '../context/VisitProgressContext'
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
// dell'opera. voiceControlled (usato da InsightModal, l'unico contenitore in
// cui l'utente può ancora parlare mentre il pannello è aperto) registra le
// proprie funzioni di navigazione in VisitProgressContext così i comandi
// vocali "più dettagli"/"più semplice"/... agiscono su quest'opera in
// sovraimpressione invece che sullo step di visita sottostante — vedi
// insightNavRef in VisitProgressContext.
function EntityListenPanel({ entityId, seedItems, voiceControlled = false }) {
  const {
    pauseNarration,
    registerInsightNav,
    scheduleAutoListen,
    autoplayEnabled,
    activeTone: mainActiveTone,
    reportInsightState,
  } = useVisitProgress()
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
  // Sticky tone come nell'opera principale (VisitProgressContext.activeTone):
  // finché l'utente non ne sceglie uno esplicitamente in questo pannello,
  // parte dal tono già attivo nella visita, o dal più vicino non più
  // difficile se l'approfondimento non lo offre.
  const activeTone = availableTones.includes(selectedTone)
    ? selectedTone
    : selectedTone
      ? closestToneAtMost(availableTones, selectedTone)
      : closestToneAtMost(availableTones, mainActiveTone)
  const currentItem = (items || []).find((item) => item.tone === activeTone)
  const sortedDescriptions = useMemo(() => sortDescriptions(currentItem), [currentItem])
  const activeDescIndex = Math.min(selectedDescIndex, Math.max(sortedDescriptions.length - 1, 0))
  const currentDescription = sortedDescriptions[activeDescIndex]

  const toneIndex = availableTones.indexOf(activeTone)
  const canGoSimplerTone = toneIndex > 0
  const canGoComplexTone = toneIndex !== -1 && toneIndex < availableTones.length - 1
  const canGoPreviousDesc = activeDescIndex > 0
  const canGoNextDesc = activeDescIndex < sortedDescriptions.length - 1

  function goToPreviousDesc() {
    if (!canGoPreviousDesc) return
    handleDescSelect(activeDescIndex - 1)
  }

  function goToNextDesc() {
    if (!canGoNextDesc) return
    handleDescSelect(activeDescIndex + 1)
  }

  function goToSimplerTone() {
    if (!canGoSimplerTone) return
    handleToneSelect(availableTones[toneIndex - 1])
  }

  function goToComplexTone() {
    if (!canGoComplexTone) return
    handleToneSelect(availableTones[toneIndex + 1])
  }

  // Re-seated every render (fresh closures over this opera's state), same
  // pattern GroupSessionContext uses for registerGroupNav — VisitProgressContext
  // calls into whichever function is currently registered here, no separate
  // implementation to drift out of sync with. Cleared on unmount so a voice
  // command after this panel closes can't call into a stale closure.
  if (voiceControlled) {
    registerInsightNav({
      lessDetails: goToPreviousDesc,
      moreDetails: goToNextDesc,
      simplerTone: goToSimplerTone,
      complexTone: goToComplexTone,
    })
  }

  useEffect(() => {
    if (!voiceControlled) return undefined
    return () => registerInsightNav(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceControlled])

  // Riporta tono/paragrafo/playback di questo approfondimento a
  // VisitProgressContext (e da lì, in sessione di gruppo, al professore) —
  // stesso principio del reporting dell'opera principale in
  // GroupSessionContext, ma per il contenuto mostrato in sovraimpressione.
  useEffect(() => {
    if (!voiceControlled) return
    reportInsightState({ tone: activeTone, paragraphIndex: activeDescIndex, playbackState })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceControlled, activeTone, activeDescIndex, playbackState])

  function stopSpeech() {
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setPlaybackState('idle')
  }

  useEffect(() => stopSpeech, [])

  // Stessa logica di changeTonePreservingParagraph in VisitProgressContext:
  // resta sullo stesso indice di paragrafo quando il nuovo tono ne ha
  // abbastanza, altrimenti clampa all'ultimo — invece di ripartire sempre dal
  // primo paragrafo come per un cambio d'opera.
  function handleToneSelect(tone) {
    if (!tone || tone === activeTone) return
    const targetItem = (items || []).find((item) => item.tone === tone)
    const targetDescriptions = sortDescriptions(targetItem)
    const newIndex = Math.min(activeDescIndex, Math.max(targetDescriptions.length - 1, 0))
    stopSpeech()
    setSelectedTone(tone)
    setSelectedDescIndex(newIndex)
  }

  function handleDescSelect(index) {
    stopSpeech()
    setSelectedDescIndex(index)
  }

  function speak(text) {
    pauseNarration()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return
      setPlaybackState('idle')
      if (voiceControlled) scheduleAutoListen()
    }
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return
      setPlaybackState('idle')
      if (voiceControlled) scheduleAutoListen()
    }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setPlaybackState('playing')
  }

  function handlePlayStop() {
    if (playbackState === 'playing') {
      stopSpeech()
      return
    }
    if (!currentDescription?.text) return
    speak(currentDescription.text)
  }

  // Parità con la narrazione principale (l'effect di autoplay in
  // VisitProgressContext): quando è mostrato in sovraimpressione e Autoplay è
  // attivo, ogni testo nuovo — apertura del pannello, cambio tono, cambio
  // paragrafo, che siano da tap o da comando vocale — parte da sé invece di
  // aspettare "Ascolta".
  useEffect(() => {
    if (!voiceControlled || !autoplayEnabled) return
    if (!currentDescription?.text) return
    speak(currentDescription.text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDescription?.text, voiceControlled, autoplayEnabled])

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
