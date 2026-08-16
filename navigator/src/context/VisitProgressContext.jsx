import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

// Voice command phrase → action key. Patterns are matched as substrings of
// the normalized (lowercased, accent-stripped) transcript, so a full
// sentence like "puoi dirmi dov'è il bagno" still matches "bagno" — users
// won't say the exact Comandi.jsx button label.
const VOICE_COMMAND_PATTERNS = [
  { key: 'previousStep', patterns: ['precedente', 'indietro'] },
  { key: 'nextStep', patterns: ['prossimo', 'successivo', 'avanti'] },
  { key: 'lessDetails', patterns: ['meno dettagli', 'meno particolari'] },
  { key: 'moreDetails', patterns: ['dimmi di piu', 'piu dettagli', 'continua'] },
  { key: 'simplerTone', patterns: ['piu semplice', 'troppo difficile', 'troppo complesso', 'semplifica'] },
  { key: 'complexTone', patterns: ['piu complesso', 'troppo semplice', 'piu difficile', 'complica'] },
  { key: 'toilette', patterns: ['bagno', 'toilette'] },
  { key: 'uscita', patterns: ['uscita', 'come esco'] },
]

function normalizeVoiceText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchVoiceCommand(transcript) {
  const normalized = normalizeVoiceText(transcript)
  if (!normalized) return null
  const match = VOICE_COMMAND_PATTERNS.find(({ patterns }) => patterns.some((p) => normalized.includes(p)))
  return match?.key || null
}

export function VisitProgressProvider({ children }) {
  const navigate = useNavigate()
  const { activeVisit } = useActiveVisit()
  const [selectedTone, setSelectedTone] = useState(null)
  const [selectedDescIndex, setSelectedDescIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [playbackState, setPlaybackState] = useState('idle') // 'idle' | 'playing' | 'paused'
  const [progress, setProgress] = useState(0) // 0..1, position within currentDescription.text
  const [seekPreview, setSeekPreview] = useState(null) // 0..1 while dragging, else null
  const [autoplayEnabled, setAutoplayEnabled] = useState(true)
  const [directions, setDirections] = useState(null) // { text, parts } | null — null when not showing the directions view
  const [micListening, setMicListening] = useState(false)
  const [micTranscript, setMicTranscript] = useState('') // live/final speech heard during the current listen, for the "listening" popup
  const [micAutoEnabled, setMicAutoEnabled] = useState(true)
  const micAutoEnabledRef = useRef(true) // mirrors micAutoEnabled for onend callbacks created before a later toggle
  micAutoEnabledRef.current = micAutoEnabled
  // scheduleAutoListen is a fresh closure every render (it reads directions,
  // canGoNextStep, museum, etc. transitively through handleVoiceCommand).
  // But utterance.onend/onerror in speakFromChar/speakEphemeral can be
  // *armed* by a call that happened synchronously inside an effect, one
  // render before a state update (e.g. setDirections) actually commits — if
  // they called the closed-over scheduleAutoListen directly, the mic would
  // end up resolving a voice command against that stale pre-commit state
  // (concretely: saying "prossimo" right after the directions view appears
  // would see a stale directions=null and skip the opera instead of just
  // dismissing the view). Routing through this ref — updated every render,
  // read only when the callback actually fires — guarantees whichever
  // render is current *at that moment* runs, not whichever was current when
  // the utterance was armed. See also `function scheduleAutoListen` below.
  const latestScheduleAutoListenRef = useRef(null)
  const micSupported =
    typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  const recognitionRef = useRef(null) // lazily-created SpeechRecognition instance, reused across listens
  const promptUtteranceRef = useRef(null) // current one-off spoken message (service info, "non ho capito"...) — kept separate from narration's utteranceRef so the two lanes' stale-callback guards can't cross
  const utteranceRef = useRef(null)
  const textRef = useRef('') // full text currently loaded for playback/seeking
  const resumeCharRef = useRef(0) // char offset to resume/seek from
  const timerRef = useRef(null) // interval driving the progress bar while playing
  const playStartRef = useRef({ time: 0, baseFraction: 0 })
  const lastPhysicalLocationRef = useRef(null) // location of the last physical opera actually shown
  const lastStepIndexRef = useRef(null)
  // { handlePreviousStep, handleNextStep } | null — the exact same
  // functions GroupSessionProvider hands PlayerBar.jsx/Comandi.jsx for
  // their Precedente/Prossimo onClick, re-seated here every render.
  // GroupSessionContext already depends on this context (goToStep etc.),
  // so it can't be consumed here without a circular import; this ref is the
  // other direction of that bridge, letting voice commands call the exact
  // same functions a tap does instead of a second implementation of the
  // same group-session rules that could drift out of sync.
  const groupNavRef = useRef(null)
  // Set by goToStep({ skipDirections: true }) — e.g. a QR jump, where you're
  // already standing at the opera, so walking directions would be nonsense.
  // Consumed (and cleared) by the very next directions computation.
  const skipNextDirectionsRef = useRef(false)
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
    stopListening()
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
      latestScheduleAutoListenRef.current?.()
    }
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return
      stopProgressTimer()
      setPlaybackState('idle')
      latestScheduleAutoListenRef.current?.()
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

  function goToStep(index, { skipDirections = false } = {}) {
    const clamped = Math.max(0, Math.min(index, sortedSteps.length - 1))
    if (clamped === activeStepIndex) return
    stopSpeech()
    setSelectedTone(null)
    setSelectedDescIndex(0)
    if (skipDirections) skipNextDirectionsRef.current = true
    setStepIndex(clamped)
  }

  function goToPreviousStep() {
    if (!canGoPreviousStep) return
    goToStep(activeStepIndex - 1)
  }

  function goToNextStep() {
    if (!canGoNextStep) return
    goToStep(activeStepIndex + 1)
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

  // ---- Request functions ------------------------------------------------
  //
  // The single implementation behind each Comandi.jsx/PlayerBar.jsx nav
  // button — a tap and a voice command both end up calling the very same
  // function, so there's exactly one place that decides "what does this
  // button do and when is it allowed", not a copy per input method that can
  // drift out of sync. Precedente/Prossimo are additionally group-session
  // gated; that gating can't live here (GroupSessionContext depends on this
  // context, so the dependency can't run the other way — see groupNavRef),
  // so requestPreviousStep/requestNextStep only cover the ungated base
  // case, and GroupSessionProvider wraps them into handlePreviousStep/
  // handleNextStep, which is what buttons and voice both actually call.
  function requestPreviousStep() {
    goToPreviousStep()
  }

  function requestNextStep() {
    if (directions) {
      closeDirections()
      return
    }
    goToNextStep()
  }

  function requestPreviousParagraph() {
    if (directions) return
    goToPreviousParagraph()
  }

  function requestNextParagraph() {
    if (directions) return
    goToNextParagraph()
  }

  function requestSimplerTone() {
    if (directions) return
    goToSimplerTone()
  }

  function requestComplexTone() {
    if (directions) return
    goToComplexTone()
  }

  // Speaks a short one-off message (service info, mic "didn't catch that"
  // prompts) outside the narration lane: cancels whatever's currently
  // speaking, doesn't touch textRef/resumeCharRef/progress, and — when the
  // message finishes on its own — re-opens the mic if auto-listen is on.
  // The separate promptUtteranceRef (instead of narration's utteranceRef)
  // keeps this lane's stale-callback guard from crossing with speakFromChar's.
  function speakEphemeral(text) {
    if (!text) return
    stopListening()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    promptUtteranceRef.current = utterance
    const finish = () => {
      if (promptUtteranceRef.current !== utterance) return
      promptUtteranceRef.current = null
      latestScheduleAutoListenRef.current?.()
    }
    utterance.onend = finish
    utterance.onerror = finish
    window.speechSynthesis.speak(utterance)
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
    speakEphemeral(text)
  }

  // Looks up a museum's spoken info for a given service label (e.g.
  // "Toilette", "Uscita"), speaks it, and jumps to the map centered on it.
  // Returns the phrase on success, null when the museum has none for that
  // label — shared by the Comandi service buttons and the "dov'è il bagno"
  // style voice commands so both stay in sync.
  function goToService(museumForService, label) {
    const phrase = museumForService?.services?.[label]
    if (!phrase) return null
    announceService(phrase)
    navigate('/mappa', { state: { museumId: museumForService?._id, serviceKey: label } })
    return phrase
  }

  // Pauses the main narration (if playing) without speaking anything, so an
  // unrelated one-off narration (e.g. a QR-scanned opera outside the visit's
  // steps) can use speechSynthesis without fighting over it. Keeps the
  // resume position, same as the pause branch of handlePlayPause. Also
  // silences an in-progress mic listen — whoever's borrowing the audio
  // channel gets it exclusively, same as narration vs. mic below.
  function pauseNarration() {
    stopListening()
    if (playbackState !== 'playing') return
    utteranceRef.current = null
    window.speechSynthesis.cancel()
    stopProgressTimer()
    setPlaybackState('paused')
  }

  // ---- Voice control ---------------------------------------------------
  //
  // Two ways the mic turns on: the user presses the mic button (interrupting
  // whatever's speaking), or a narration/service/prompt utterance finishes
  // on its own while micAutoEnabled is on (scheduleAutoListen, wired into
  // speakFromChar's and speakEphemeral's onend/onerror above). Either path
  // funnels through startListening, which always silences speechSynthesis
  // first — mic and TTS are never allowed to run at the same time.

  function getRecognition() {
    if (recognitionRef.current) return recognitionRef.current
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return null
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'it-IT'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    return recognition
  }

  function stopListening() {
    recognitionRef.current?.abort()
    setMicListening(false)
  }

  function scheduleAutoListen() {
    if (!micAutoEnabledRef.current) return
    startListening()
  }
  latestScheduleAutoListenRef.current = scheduleAutoListen

  function startListening() {
    const recognition = getRecognition()
    if (!recognition) return
    if (playbackState === 'playing') {
      utteranceRef.current = null
      stopProgressTimer()
      setPlaybackState('paused')
    }
    promptUtteranceRef.current = null
    window.speechSynthesis.cancel()
    setMicTranscript('')

    recognition.onresult = (event) => {
      // interimResults=true fires this repeatedly as the phrase is heard, so
      // the popup can show live speech-to-text; only the isFinal chunk is
      // actually resolved to a command.
      let interimText = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0]?.transcript || ''
        if (result.isFinal) finalText += text
        else interimText += text
      }
      setMicTranscript((finalText || interimText).trim())
      if (finalText) handleVoiceCommand(finalText)
    }
    recognition.onerror = () => setMicListening(false)
    recognition.onend = () => setMicListening(false)

    try {
      recognition.start()
      setMicListening(true)
    } catch {
      // start() throws if a session is already active (e.g. a stray
      // double-press) — the existing session just continues.
    }
  }

  // Manual mic button: interrupts whatever's speaking and starts listening,
  // or — pressed again while already listening — cancels the listen.
  function handleMicToggle() {
    if (micListening) {
      stopListening()
      return
    }
    startListening()
  }

  function toggleMicAuto() {
    setMicAutoEnabled((enabled) => !enabled)
  }

  // Registered every render by GroupSessionProvider with the exact same
  // handlePreviousStep/handleNextStep it hands PlayerBar.jsx/Comandi.jsx for
  // their onClick — voice ends up calling the identical function a tap
  // would, group gating included, instead of a second implementation of the
  // same rules that could drift out of sync with the buttons'.
  function registerGroupNav(nav) {
    groupNavRef.current = nav
  }

  // Precedente/Prossimo go through whatever GroupSessionProvider registered
  // (group-gated) when it's available, and straight to the ungated request
  // function on the very first renders before it has (there's no group
  // session to gate against yet anyway).
  function callStepNav(name, fallback) {
    const fn = groupNavRef.current?.[name]
    if (fn) fn()
    else fallback()
  }

  // Resolves one recognized phrase to its Comandi.jsx/PlayerBar.jsx button
  // equivalent, calling the exact same function the button's onClick does —
  // so a blocked command does nothing, same as tapping a disabled button.
  // The service commands are the one exception: their button never
  // disables (always speaks the phrase or shows why not), so an unavailable
  // service is voiced too instead of silently doing nothing. Unrecognized
  // speech has no button equivalent at all, so that one alone prompts a
  // retry.
  function handleVoiceCommand(transcript) {
    const key = matchVoiceCommand(transcript)
    switch (key) {
      case 'previousStep':
        callStepNav('handlePreviousStep', requestPreviousStep)
        break
      case 'nextStep':
        callStepNav('handleNextStep', requestNextStep)
        break
      case 'lessDetails':
        requestPreviousParagraph()
        break
      case 'moreDetails':
        requestNextParagraph()
        break
      case 'simplerTone':
        requestSimplerTone()
        break
      case 'complexTone':
        requestComplexTone()
        break
      case 'toilette': {
        const phrase = goToService(museum, 'Toilette')
        if (!phrase) speakEphemeral('Il bagno non è disponibile per questo museo.')
        break
      }
      case 'uscita': {
        const phrase = goToService(museum, 'Uscita')
        if (!phrase) speakEphemeral("L'uscita non è disponibile per questo museo.")
        break
      }
      default:
        speakEphemeral('Non ho capito, puoi ripetere?')
    }
  }

  // Resets navigation/playback whenever the active visit changes (a new
  // visit is activated, or the visit is cleared) so state from a previous
  // visit never leaks into the next one.
  useEffect(() => {
    window.speechSynthesis.cancel()
    stopProgressTimer()
    recognitionRef.current?.abort()
    setMicListening(false)
    promptUtteranceRef.current = null
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
      recognitionRef.current?.abort()
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
        const suppressDirections = skipNextDirectionsRef.current
        skipNextDirectionsRef.current = false
        let newDirections = null
        if (currentLocation) {
          if (!suppressDirections) {
            newDirections = buildDirections(lastPhysicalLocationRef.current, currentLocation)
          }
          lastPhysicalLocationRef.current = currentLocation
        }
        setDirections(newDirections)

        if (newDirections) {
          textRef.current = newDirections.text
          activeDurationRef.current = estimateDurationSec(newDirections.text)
          resumeCharRef.current = 0
          if (autoplayEnabled && !isInitialMount) speakFromChar(0)
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
    // The very first step of a freshly (re)loaded visit must never speak on
    // its own — only a user action (Play, or navigating away and back)
    // should start it. Every other autoplay trigger (step change, tone/
    // paragraph change) still fires normally.
    if (isInitialMount) return
    speakFromChar(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepIndex, currentDescription?.text])

  const value = {
    steps: sortedSteps,
    step,
    entity,
    museum,
    announceService,
    goToService,
    pauseNarration,
    micListening,
    micTranscript,
    micAutoEnabled,
    micSupported,
    handleMicToggle,
    toggleMicAuto,
    registerGroupNav,
    canGoPreviousStep,
    canGoNextStep,
    goToStep,
    goToPreviousStep,
    goToNextStep,
    requestPreviousStep,
    requestNextStep,
    availableTones,
    activeTone,
    currentItem,
    handleToneSelect,
    canGoSimplerTone,
    canGoComplexTone,
    goToSimplerTone,
    goToComplexTone,
    requestSimplerTone,
    requestComplexTone,
    sortedDescriptions,
    activeDescIndex,
    currentDescription,
    handleDescSelect,
    canGoPreviousParagraph,
    canGoNextParagraph,
    goToPreviousParagraph,
    goToNextParagraph,
    requestPreviousParagraph,
    requestNextParagraph,
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
