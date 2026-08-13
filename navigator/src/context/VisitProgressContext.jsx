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

const TTS_WORDS_PER_MINUTE = 150

function estimateDurationSec(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length
  if (!words) return 0
  return Math.max(1, Math.round((words / TTS_WORDS_PER_MINUTE) * 60))
}

// Resolves the room/floor a step's entity sits in, for the museum that step
// actually takes place in (an entity can have placements in several
// museums). Returns null for non-physical entities, which have no
// meaningful location to give directions to.
function getStepLocation(step) {
  if (!step?.entity?.is_physical) return null
  const museumId = step.museum?._id != null ? String(step.museum._id) : null
  const placement = (step.entity.placements || []).find((p) => {
    const placementMuseumId = p.museum?._id != null ? String(p.museum._id) : String(p.museum)
    return placementMuseumId === museumId
  })
  return {
    museumId,
    museumName: step.museum?.name || '',
    floor: placement?.location?.floor || '',
    room: placement?.location?.room || '',
  }
}

// Builds hierarchical directions: museum > floor > room. A difference at one
// level implies mentioning every level below it, even if its value happens
// to be textually identical, since the higher-level change already makes it
// a new place. No previous location (first physical opera of the visit) or
// no differences at all yields no directions. Returns both a spoken
// sentence (for the TTS/player) and a structured parts list (for the UI, so
// it can render one row per level instead of a flat sentence).
function buildDirections(prev, curr) {
  if (!prev || !curr) return null

  const museumDiffers = prev.museumId !== curr.museumId
  const floorDiffers = museumDiffers || (prev.floor || '') !== (curr.floor || '')
  const roomDiffers = floorDiffers || (prev.room || '') !== (curr.room || '')

  const parts = []
  if (museumDiffers && curr.museumName) parts.push({ key: 'museum', label: 'Museo', value: curr.museumName })
  if (floorDiffers && curr.floor) parts.push({ key: 'floor', label: 'Piano', value: curr.floor })
  if (roomDiffers && curr.room) parts.push({ key: 'room', label: 'Stanza', value: curr.room })

  if (!parts.length) return null

  const sentenceBits = []
  if (museumDiffers && curr.museumName) sentenceBits.push(`al museo ${curr.museumName}`)
  if (floorDiffers && curr.floor) sentenceBits.push(`al piano ${curr.floor}`)
  if (roomDiffers && curr.room) sentenceBits.push(`nella stanza ${curr.room}`)

  return { text: `Procedi ${sentenceBits.join(', ')}.`, parts }
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
  const [directions, setDirections] = useState(null) // { text, parts } | null — null when not showing the directions view
  const utteranceRef = useRef(null)
  const textRef = useRef('') // full text currently loaded for playback/seeking
  const resumeCharRef = useRef(0) // char offset to resume/seek from
  const timerRef = useRef(null) // interval driving the progress bar while playing
  const playStartRef = useRef({ time: 0, baseFraction: 0 })
  const lastPhysicalLocationRef = useRef(null) // location of the last physical opera actually shown
  const lastStepIndexRef = useRef(null)
  // Duration matching whatever's currently in textRef.current. Kept as a ref
  // (not derived from render state) and updated in lockstep with textRef:
  // effects that set textRef.current and immediately call speakFromChar in
  // the same pass would otherwise read stale render-time state (e.g.
  // directionsText right after the setDirections that's meant to introduce
  // it, but hasn't committed a re-render yet).
  const activeDurationRef = useRef(0)

  const sortedSteps = useMemo(() => {
    if (!activeVisit?.steps?.length) return []
    return [...activeVisit.steps].sort((a, b) => a.order - b.order)
  }, [activeVisit])

  const activeStepIndex = Math.min(stepIndex, Math.max(sortedSteps.length - 1, 0))
  const step = sortedSteps[activeStepIndex] || null
  const canGoPreviousStep = activeStepIndex > 0
  const canGoNextStep = activeStepIndex < sortedSteps.length - 1

  const entity = step?.entity
  const museum = step?.museum
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

  const directionsText = directions?.text || null

  // What the player (progress bar, play/pause, seek) currently acts on:
  // the directions view's text while it's shown, otherwise the description.
  const activeText = directionsText || currentDescription?.text || ''
  const activeDurationSec = directionsText
    ? estimateDurationSec(directionsText)
    : currentDescription?.duration_sec || 0

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
    const duration = activeDurationRef.current
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
    if (!activeText) return
    textRef.current = activeText
    activeDurationRef.current = activeDurationSec
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
    if (!activeText) return
    if (textRef.current !== activeText) {
      textRef.current = activeText
      activeDurationRef.current = activeDurationSec
      resumeCharRef.current = 0
    }
    speakFromChar(resumeCharRef.current)
  }

  function toggleAutoplay() {
    setAutoplayEnabled((enabled) => !enabled)
  }

  // Dismisses the directions view, handing the player back to the
  // description (starting it if autoplay is on) — the main narration wasn't
  // playing underneath, since directions take over the player while shown.
  function closeDirections() {
    if (!directions) return
    window.speechSynthesis.cancel()
    stopProgressTimer()
    setPlaybackState('idle')
    setProgress(0)
    setSeekPreview(null)
    resumeCharRef.current = 0
    textRef.current = ''
    setDirections(null)
    if (autoplayEnabled && currentDescription?.text) {
      textRef.current = currentDescription.text
      activeDurationRef.current = currentDescription.duration_sec || 0
      resumeCharRef.current = 0
      speakFromChar(0)
    }
  }

  // Pauses whatever description narration is in progress (if any, keeping
  // its resume position) and reads a service location phrase on top of it.
  // The main narration stays paused afterwards — it's not resumed
  // automatically — so Play on Opera picks up right where it left off.
  function announceService(text) {
    if (!text) return
    if (playbackState === 'playing') {
      utteranceRef.current = null
      stopProgressTimer()
      setPlaybackState('paused')
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    window.speechSynthesis.speak(utterance)
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
    setDirections(null)
    lastPhysicalLocationRef.current = null
    lastStepIndexRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVisit?._id])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      stopProgressTimer()
    }
  }, [])

  // Handles both step-to-step directions and description autoplay in one
  // effect so they can never race each other (two separate effects reacting
  // to the same step change would both try to seize speechSynthesis in the
  // same commit). On a step change that moves FORWARD (Prossimo, never
  // Precedente — walking back through steps you've already seen shouldn't
  // re-litigate directions you already got, and isn't a real physical move),
  // compares the new physical location against the last physical one
  // actually shown: if it differs, the directions view takes over the
  // player and description autoplay is skipped for this step (closeDirections
  // hands playback back afterwards). Non-physical entities are skipped
  // entirely — lastPhysicalLocationRef just keeps pointing at the last real
  // physical opera reached going forward. On a same-step tone/paragraph
  // change, a backward step, or when there were no directions to show, it
  // behaves like the old plain autoplay-on-description-change effect.
  // Whether either narration actually auto-starts speaking is gated on
  // autoplayEnabled either way — directions just get to load/display
  // regardless, ready for a manual Play.
  useEffect(() => {
    if (!step) return
    const previousStepIndex = lastStepIndexRef.current
    const stepChanged = previousStepIndex !== activeStepIndex
    const isInitialMount = previousStepIndex === null
    const movedForward = !isInitialMount && activeStepIndex > previousStepIndex
    lastStepIndexRef.current = activeStepIndex

    if (stepChanged) {
      window.speechSynthesis.cancel()
      stopProgressTimer()

      // The initial mount must still seed lastPhysicalLocationRef with
      // wherever the visit starts (so the first real forward move has
      // something to compare against) even though — like a backward move —
      // it never shows directions itself: buildDirections already returns
      // null with no previous location to compare from.
      if (movedForward || isInitialMount) {
        const currentLocation = getStepLocation(step)
        let newDirections = null
        if (currentLocation) {
          newDirections = buildDirections(lastPhysicalLocationRef.current, currentLocation)
          lastPhysicalLocationRef.current = currentLocation
        }
        setDirections(newDirections)

        if (newDirections) {
          textRef.current = newDirections.text
          activeDurationRef.current = estimateDurationSec(newDirections.text)
          resumeCharRef.current = 0
          if (autoplayEnabled) speakFromChar(0)
          return
        }
      } else {
        setDirections(null)
      }
    }

    if (!autoplayEnabled) return
    if (!currentDescription?.text) return
    textRef.current = currentDescription.text
    activeDurationRef.current = currentDescription.duration_sec || 0
    resumeCharRef.current = 0
    speakFromChar(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepIndex, currentDescription?.text])

  const value = {
    step,
    entity,
    museum,
    announceService,
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
    directionsText,
    directionsParts: directions?.parts || null,
    closeDirections,
    activeText,
    activeDurationSec,
  }

  return <VisitProgressContext.Provider value={value}>{children}</VisitProgressContext.Provider>
}

export function useVisitProgress() {
  const ctx = useContext(VisitProgressContext)
  if (!ctx) throw new Error('useVisitProgress must be used inside VisitProgressProvider')
  return ctx
}
