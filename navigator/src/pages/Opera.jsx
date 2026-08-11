import { useEffect, useMemo, useRef, useState } from 'react'
import { useActiveVisit } from '../context/ActiveVisitContext'
import NoActiveVisit from '../components/NoActiveVisit'
import {
  PreviousIcon,
  NextIcon,
  PlayIcon,
  PauseIcon,
  MicrophoneIcon,
  AutoplayIcon,
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

function formatTime(sec) {
  const total = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

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
  const [progress, setProgress] = useState(0) // 0..1, position within currentDescription.text
  const [seekPreview, setSeekPreview] = useState(null) // 0..1 while dragging, else null
  const [autoplayEnabled, setAutoplayEnabled] = useState(true)
  const utteranceRef = useRef(null)
  const textRef = useRef('') // full text currently loaded for playback/seeking
  const resumeCharRef = useRef(0) // char offset to resume/seek from
  const timerRef = useRef(null) // interval driving the progress bar while playing
  const playStartRef = useRef({ time: 0, baseFraction: 0 })

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

  function stopProgressTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Word/sentence `onboundary` events are unreliable across browsers and TTS
  // voices (many never fire them at all), so the bar can't rely on them.
  // Instead we estimate position from wall-clock time against the
  // description's known duration, ticking resumeCharRef along with it so
  // pause/seek always restart from roughly the right spot.
  function startProgressTimer(baseFraction) {
    stopProgressTimer()
    playStartRef.current = { time: Date.now(), baseFraction }
    const duration = currentDescription?.duration_sec || 0
    if (!duration) return
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - playStartRef.current.time) / 1000
      const fraction = Math.min(1, playStartRef.current.baseFraction + elapsed / duration)
      setProgress(fraction)
      resumeCharRef.current = Math.round(fraction * textRef.current.length)
    }, 200)
  }

  function stopSpeech() {
    utteranceRef.current = null
    window.speechSynthesis.cancel()
    stopProgressTimer()
    setPlaybackState('idle')
    setProgress(0)
    setSeekPreview(null)
    resumeCharRef.current = 0
    textRef.current = ''
  }

  // Cancels any speech in progress and starts reading textRef.current from
  // charIndex onward. Used for the initial Play, for seeking, and for
  // resuming after pause — speechSynthesis.pause()/resume() is broken on
  // several browsers (playback gets permanently stuck after pause()), so
  // "resume" is really just "restart from the last known position".
  function speakFromChar(charIndex) {
    const text = textRef.current
    if (!text) return
    const clamped = Math.max(0, Math.min(charIndex, text.length))
    window.speechSynthesis.cancel()
    stopProgressTimer()
    resumeCharRef.current = clamped
    const baseFraction = text.length ? clamped / text.length : 0
    setProgress(baseFraction)

    const remaining = text.slice(clamped)
    if (!remaining) {
      setPlaybackState('idle')
      return
    }

    const utterance = new SpeechSynthesisUtterance(remaining)
    utterance.lang = 'it-IT'
    // cancel() fires the outgoing utterance's onend/onerror asynchronously,
    // after a newer utterance may already be playing (e.g. seeking again
    // while the previous cancel is still settling). Ignore callbacks from an
    // utterance that's no longer the current one so they can't clobber the
    // fresher state.
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return
      stopProgressTimer()
      setPlaybackState('idle')
    }
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return
      stopProgressTimer()
      setPlaybackState('idle')
    }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setPlaybackState('playing')
    startProgressTimer(baseFraction)
  }

  function handleSeek(fraction) {
    if (!currentDescription?.text) return
    textRef.current = currentDescription.text
    const clampedFraction = Math.max(0, Math.min(1, fraction))
    speakFromChar(Math.round(clampedFraction * textRef.current.length))
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
      utteranceRef.current = null
      window.speechSynthesis.cancel()
      stopProgressTimer()
      setPlaybackState('paused')
      return
    }
    if (playbackState === 'paused') {
      speakFromChar(resumeCharRef.current)
      return
    }
    if (!currentDescription?.text) return
    if (textRef.current !== currentDescription.text) {
      textRef.current = currentDescription.text
      resumeCharRef.current = 0
    }
    speakFromChar(resumeCharRef.current)
  }

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      stopProgressTimer()
    }
  }, [])

  // Autoplay: start reading as soon as a description becomes current —
  // on first load, after Avanti/Indietro, and after switching tone/durata.
  // Skipped when autoplayEnabled is off; speech already in progress is left
  // alone rather than stopped.
  useEffect(() => {
    if (!autoplayEnabled) return
    if (!currentDescription?.text) return
    textRef.current = currentDescription.text
    resumeCharRef.current = 0
    speakFromChar(0)
    // Deliberately NOT depending on autoplayEnabled: toggling it must not
    // restart/interrupt whatever is currently playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDescription?.text])

  function toggleAutoplay() {
    setAutoplayEnabled((enabled) => !enabled)
  }

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
        <div className="mx-auto max-w-md px-8 pt-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={seekPreview ?? progress}
            disabled={!currentDescription?.text}
            onInput={(e) => setSeekPreview(Number(e.target.value))}
            onChange={(e) => {
              handleSeek(Number(e.target.value))
              setSeekPreview(null)
            }}
            aria-label="Posizione lettura"
            className="w-full accent-accent disabled:opacity-30"
          />
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{formatTime((seekPreview ?? progress) * (currentDescription?.duration_sec || 0))}</span>
            <span>{formatTime(currentDescription?.duration_sec || 0)}</span>
          </div>
        </div>
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
            aria-label={
              autoplayEnabled ? 'Disattiva lettura automatica' : 'Attiva lettura automatica'
            }
            aria-pressed={autoplayEnabled}
            onClick={toggleAutoplay}
            className={`text-text-muted ${!autoplayEnabled ? 'opacity-30' : ''}`}
          >
            <AutoplayIcon className="h-4 w-4" />
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
