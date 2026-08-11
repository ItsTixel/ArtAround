import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useActiveVisit } from './ActiveVisitContext'

export const TONE_ORDER = ['childish', 'simple', 'medium', 'technical']
export const TONE_LABELS = {
  childish: 'Infantile',
  simple: 'Elementare',
  medium: 'Medio',
  technical: 'Avanzato',
}

const VisitProgressContext = createContext(null)

function sortDescriptions(item) {
  return [...(item?.descriptions || [])].sort((a, b) => a.duration_sec - b.duration_sec)
}

export function VisitProgressProvider({ children }) {
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
  const canGoPreviousStep = activeStepIndex > 0
  const canGoNextStep = activeStepIndex < sortedSteps.length - 1

  const entity = step?.entity
  const items = useMemo(() => step?.items || [], [step])

  const availableTones = useMemo(
    () => TONE_ORDER.filter((tone) => items.some((item) => item.tone === tone)),
    [items]
  )

  const activeTone = availableTones.includes(selectedTone) ? selectedTone : availableTones[0]
  const currentItem = items.find((item) => item.tone === activeTone)

  const sortedDescriptions = useMemo(() => sortDescriptions(currentItem), [currentItem])

  const activeDescIndex = Math.min(selectedDescIndex, Math.max(sortedDescriptions.length - 1, 0))
  const currentDescription = sortedDescriptions[activeDescIndex]

  const toneIndex = availableTones.indexOf(activeTone)
  const canGoSimplerTone = toneIndex > 0
  const canGoComplexTone = toneIndex !== -1 && toneIndex < availableTones.length - 1
  const canGoPreviousParagraph = activeDescIndex > 0
  const canGoNextParagraph = activeDescIndex < sortedDescriptions.length - 1

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
    if (!canGoPreviousStep) return
    stopSpeech()
    setSelectedTone(null)
    setSelectedDescIndex(0)
    setStepIndex(activeStepIndex - 1)
  }

  function goToNextStep() {
    if (!canGoNextStep) return
    stopSpeech()
    setSelectedTone(null)
    setSelectedDescIndex(0)
    setStepIndex(activeStepIndex + 1)
  }

  function goToPreviousParagraph() {
    if (!canGoPreviousParagraph) return
    handleDescSelect(activeDescIndex - 1)
  }

  function goToNextParagraph() {
    if (!canGoNextParagraph) return
    handleDescSelect(activeDescIndex + 1)
  }

  // Changes tone while trying to stay at the "same" paragraph: keeps
  // activeDescIndex when the target tone has enough paragraphs, otherwise
  // clamps to its last paragraph.
  function changeTonePreservingParagraph(targetTone) {
    if (!targetTone || targetTone === activeTone) return
    const targetItem = items.find((item) => item.tone === targetTone)
    const targetDescriptions = sortDescriptions(targetItem)
    const newIndex = Math.min(activeDescIndex, Math.max(targetDescriptions.length - 1, 0))
    stopSpeech()
    setSelectedTone(targetTone)
    setSelectedDescIndex(newIndex)
  }

  function goToSimplerTone() {
    if (!canGoSimplerTone) return
    changeTonePreservingParagraph(availableTones[toneIndex - 1])
  }

  function goToComplexTone() {
    if (!canGoComplexTone) return
    changeTonePreservingParagraph(availableTones[toneIndex + 1])
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

  function toggleAutoplay() {
    setAutoplayEnabled((enabled) => !enabled)
  }

  // Resets navigation/playback whenever the active visit changes (a new
  // visit is activated, or the visit is cleared) so state from a previous
  // visit never leaks into the next one.
  useEffect(() => {
    window.speechSynthesis.cancel()
    stopProgressTimer()
    utteranceRef.current = null
    textRef.current = ''
    resumeCharRef.current = 0
    setPlaybackState('idle')
    setProgress(0)
    setSeekPreview(null)
    setStepIndex(0)
    setSelectedTone(null)
    setSelectedDescIndex(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVisit?._id])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      stopProgressTimer()
    }
  }, [])

  // Autoplay: start reading as soon as a description becomes current — on
  // first load, after Prossimo/Precedente, after switching tone/paragrafo,
  // and when triggered from the Comandi page. Skipped when autoplayEnabled
  // is off; speech already in progress is left alone rather than stopped.
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

  const value = {
    step,
    entity,
    canGoPreviousStep,
    canGoNextStep,
    goToPreviousStep,
    goToNextStep,
    availableTones,
    activeTone,
    currentItem,
    handleToneSelect,
    canGoSimplerTone,
    canGoComplexTone,
    goToSimplerTone,
    goToComplexTone,
    sortedDescriptions,
    activeDescIndex,
    currentDescription,
    handleDescSelect,
    canGoPreviousParagraph,
    canGoNextParagraph,
    goToPreviousParagraph,
    goToNextParagraph,
    playbackState,
    progress,
    seekPreview,
    setSeekPreview,
    handleSeek,
    handlePlayPause,
    autoplayEnabled,
    toggleAutoplay,
  }

  return <VisitProgressContext.Provider value={value}>{children}</VisitProgressContext.Provider>
}

export function useVisitProgress() {
  const ctx = useContext(VisitProgressContext)
  if (!ctx) throw new Error('useVisitProgress must be used inside VisitProgressProvider')
  return ctx
}
