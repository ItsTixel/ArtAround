import { useEffect, useMemo, useRef, useState } from 'react'
import { useActiveVisit } from '../context/ActiveVisitContext'
import NoActiveVisit from '../components/NoActiveVisit'
import {
  PreviousIcon,
  NextIcon,
  PlayIcon,
  PauseIcon,
  MicrophoneIcon,
} from '../components/icons'

const TONE_ORDER = ['childish', 'simple', 'medium', 'technical']
const TONE_LABELS = {
  childish: 'Infantile',
  simple: 'Elementare',
  medium: 'Medio',
  technical: 'Avanzato',
}

function formatDurationLabel(sec) {
  if (sec < 60) return `${sec} sec`
  return `${Math.round(sec / 60)} min`
}

// Chrome on Android has a long-standing bug where speechSynthesis.resume()
// silently fails to continue after pause(), leaving playback stuck. There's
// no reliable feature-detect for it, so on Android "pause" just stops the
// utterance and "play" restarts the description from the beginning instead
// of trying (and failing) to resume mid-sentence.
const IS_ANDROID = /Android/i.test(navigator.userAgent)

function pillClasses(active, activeClasses) {
  return `rounded-full border px-4 py-1.5 text-sm font-medium ${
    active ? activeClasses : 'border-border bg-surface text-text-muted'
  }`
}

function Opera() {
  const { activeVisit } = useActiveVisit()
  const [selectedTone, setSelectedTone] = useState(null)
  const [selectedDescIndex, setSelectedDescIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [playbackState, setPlaybackState] = useState('idle') // 'idle' | 'playing' | 'paused'
  const utteranceRef = useRef(null)

  const sortedSteps = useMemo(() => {
    if (!activeVisit?.steps?.length) return []
    return [...activeVisit.steps].sort((a, b) => a.order - b.order)
  }, [activeVisit])

  const activeStepIndex = Math.min(stepIndex, Math.max(sortedSteps.length - 1, 0))
  const step = sortedSteps[activeStepIndex] || null
  const canGoPrevious = activeStepIndex > 0
  const canGoNext = activeStepIndex < sortedSteps.length - 1

  const entity = step?.entity
  const items = useMemo(() => step?.items || [], [step])

  const availableTones = useMemo(
    () => TONE_ORDER.filter((tone) => items.some((item) => item.tone === tone)),
    [items]
  )

  const activeTone = availableTones.includes(selectedTone) ? selectedTone : availableTones[0]
  const currentItem = items.find((item) => item.tone === activeTone)

  const sortedDescriptions = useMemo(
    () => [...(currentItem?.descriptions || [])].sort((a, b) => a.duration_sec - b.duration_sec),
    [currentItem]
  )

  const activeDescIndex = Math.min(selectedDescIndex, Math.max(sortedDescriptions.length - 1, 0))
  const currentDescription = sortedDescriptions[activeDescIndex]

  function stopSpeech() {
    window.speechSynthesis.cancel()
    setPlaybackState('idle')
  }

  function handleToneSelect(tone) {
    stopSpeech()
    setSelectedTone(tone)
    setSelectedDescIndex(0)
  }

  function handleDescSelect(index) {
    stopSpeech()
    setSelectedDescIndex(index)
  }

  function goToPreviousStep() {
    if (!canGoPrevious) return
    stopSpeech()
    setSelectedTone(null)
    setSelectedDescIndex(0)
    setStepIndex(activeStepIndex - 1)
  }

  function goToNextStep() {
    if (!canGoNext) return
    stopSpeech()
    setSelectedTone(null)
    setSelectedDescIndex(0)
    setStepIndex(activeStepIndex + 1)
  }

  function handlePlayPause() {
    if (playbackState === 'playing') {
      if (IS_ANDROID) {
        stopSpeech() // falls back to idle; next Play restarts from the beginning
      } else {
        window.speechSynthesis.pause()
        setPlaybackState('paused')
      }
      return
    }
    if (playbackState === 'paused') {
      window.speechSynthesis.resume()
      setPlaybackState('playing')
      return
    }
    if (!currentDescription?.text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(currentDescription.text)
    utterance.lang = 'it-IT'
    utterance.onend = () => setPlaybackState('idle')
    utterance.onerror = () => setPlaybackState('idle')
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setPlaybackState('playing')
  }

  useEffect(() => {
    return () => window.speechSynthesis.cancel()
  }, [])

  if (!activeVisit) return <NoActiveVisit />

  if (!step || !entity) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <h1 className="font-serif text-2xl font-semibold text-text">Opera</h1>
        <p className="text-text-muted">Nessuna opera disponibile per questa visita.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-32">
      {entity.image_url ? (
        <img
          src={entity.image_url}
          alt={entity.alt_text || entity.name}
          className="h-64 w-full object-cover"
        />
      ) : (
        <div className="flex h-64 w-full items-center justify-center bg-border text-sm text-text-muted">
          Nessuna immagine disponibile
        </div>
      )}

      <div className="flex flex-col gap-1 px-6">
        <h1 className="font-serif text-2xl font-semibold text-text">{entity.name}</h1>
        {entity.artwork_author && (
          <p className="text-sm text-text-muted">{entity.artwork_author}</p>
        )}
      </div>

      <div className="flex flex-col gap-4 px-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Durata
          </span>
          {sortedDescriptions.length > 0 ? (
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
          ) : (
            <p className="text-sm text-text-muted">Non disponibile</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Tono
          </span>
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
            <p className="text-sm text-text-muted">Non disponibile</p>
          )}
        </div>
      </div>

      <div className="mx-6 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm leading-relaxed text-text">
          {currentDescription?.text || 'Nessuna descrizione disponibile.'}
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-md items-center justify-between px-8 py-3">
          <button
            type="button"
            aria-label="Precedente"
            onClick={goToPreviousStep}
            disabled={!canGoPrevious}
            className={`text-text-muted ${!canGoPrevious ? 'opacity-30' : ''}`}
          >
            <PreviousIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label={playbackState === 'playing' ? 'Pausa' : 'Play'}
            onClick={handlePlayPause}
            disabled={!currentDescription?.text}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-on-accent shadow-[0_0_20px_rgba(212,168,83,0.35)] disabled:opacity-40"
          >
            {playbackState === 'playing' ? (
              <PauseIcon className="h-6 w-6" />
            ) : (
              <PlayIcon className="h-6 w-6" />
            )}
          </button>
          <button
            type="button"
            aria-label="Microfono"
            onClick={() => console.log('Microfono')}
            className="text-text-muted"
          >
            <MicrophoneIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Prossimo"
            onClick={goToNextStep}
            disabled={!canGoNext}
            className={`text-text-muted ${!canGoNext ? 'opacity-30' : ''}`}
          >
            <NextIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Opera
