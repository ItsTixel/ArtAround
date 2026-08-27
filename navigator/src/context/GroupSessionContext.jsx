import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useActiveVisit } from './ActiveVisitContext'
import { useVisitProgress } from './VisitProgressContext'
import { museumVisitPath } from '../utils/museumVisit'

const STORAGE_KEY = 'navigator_group_session'

const GroupSessionContext = createContext(null)

export function GroupSessionProvider({ children }) {
  const navigate = useNavigate()
  const { activeVisit, activateVisit, clearActiveVisit } = useActiveVisit()
  const {
    goToStep,
    handlePlayPause,
    activeTone,
    activeDescIndex,
    playbackState: localPlaybackState,
    activeInsightTag,
    insightState,
    closeInsight,
    registerGroupNav,
    requestPreviousStep,
    requestNextStep,
    canGoPreviousStep,
    canGoNextStep,
    directionsText,
    museum,
    openEndPrompt,
  } = useVisitProgress()

  const [role, setRole] = useState(null) // 'host' | 'student' | null
  const [visitId, setVisitId] = useState(null)
  const [groupVisit, setGroupVisit] = useState(null) // GET /api/visits/:id response
  const [status, setStatus] = useState(null) // 'waiting' | 'active' | 'quiz' | 'finished' | null
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const isRestrictedStudent = role === 'student' && (status === 'active' || status === 'quiz')
  const isHostControlling = role === 'host' && status === 'active'

  // Precedente/Prossimo: the one implementation both PlayerBar.jsx/
  // Comandi.jsx's buttons and voice commands call — group-session rules
  // wrapped around VisitProgressContext's requestPreviousStep/requestNextStep.
  // Precedente always performs a real step change (also during directions —
  // it must go back to the previous opera, never just dismiss the directions
  // view, hence no directionsText bypass here). Prossimo during directions
  // instead just dismisses the directions view (requestNextStep's own
  // closeDirections branch), so it's exempted from the restricted-student
  // gate below on purpose — that's the one thing a student may unlock.
  function handlePreviousStep() {
    if (isRestrictedStudent || !canGoPreviousStep) return
    if (isHostControlling) {
      setActiveStep(currentStepIndex - 1)
      return
    }
    requestPreviousStep()
  }

  function handleNextStep() {
    if (directionsText) {
      requestNextStep()
      return
    }
    // Visita individuale (nessuna sessione di gruppo) arrivata all'ultima
    // opera: invece di restare disabilitato, Prossimo apre il popup di fine
    // visita — "Termina visita"/"Rimani nella visita attuale" (VisitEndModal,
    // montata in AppLayout). Le visite di gruppo hanno già un modo dedicato
    // di terminare (endSession/leaveSession) e non passano di qui.
    if (role === null && !canGoNextStep) {
      openEndPrompt()
      return
    }
    if (isRestrictedStudent || !canGoNextStep) return
    if (isHostControlling) {
      setActiveStep(currentStepIndex + 1)
      return
    }
    requestNextStep()
  }

  const previousStepDisabled = isRestrictedStudent || !canGoPreviousStep
  // Stessa eccezione di handleNextStep: in una visita individuale sull'ultima
  // opera il tasto resta premibile (apre il popup) invece di disabilitarsi.
  const nextStepDisabled = role === null ? false : !directionsText && (isRestrictedStudent || !canGoNextStep)

  // VisitProgressContext can't consume this context back (it depends on
  // VisitProgressContext itself — goToStep above — so importing it here
  // would be circular). This re-seats handlePreviousStep/handleNextStep
  // into a ref there instead, every render, so voice commands (resolved
  // inside VisitProgressContext) call the exact same functions the buttons
  // do — not a second implementation of the same rules that could drift.
  registerGroupNav({ handlePreviousStep, handleNextStep })

  const [connected, setConnected] = useState(false)
  const [roster, setRoster] = useState([]) // host only — include per-studente tono/paragrafo/playback/pronto, valorizzati man mano che arrivano
  const [ownParticipant, setOwnParticipant] = useState(null) // student only
  const [isReady, setIsReady] = useState(false) // student only: proprio stato "pronto per la prossima opera"
  // Quiz sanificato (mai correct_option_index): arriva via visit:quiz_started
  // o, per uno studente che entra/rientra a quiz già avviato, nell'ack di
  // visit:join. L'host non ne ha bisogno per la UI (usa groupVisit.quiz, che
  // include le risposte corrette), ma lo teniamo comunque per simmetria.
  const [quiz, setQuiz] = useState(null)
  const [error, setError] = useState(null)

  const socketRef = useRef(null)
  const visitIdRef = useRef(null)
  const roleRef = useRef(null)
  const pendingResolveRef = useRef(null)
  // Studente entrato a sessione già avviata: l'opera da mostrare arriva dalla
  // risposta di join, ma va applicata solo DOPO che VisitProgressContext ha
  // già resettato stepIndex a 0 per il nuovo activeVisit (vedi l'effect più
  // sotto, che corre dopo grazie all'ordine di annidamento dei provider).
  const pendingStepIndexRef = useRef(null)
  // Segna il solo evento "il professore ha premuto Avvia visita"
  // (visit:session_started), distinto da un ingresso su sessione già
  // 'active': lì lo studente va solo piazzato sull'opera corrente, qui
  // invece la lettura della descrizione deve partire da sola su tutti i
  // dispositivi. Consumato dall'effect più sotto.
  const sessionJustStartedRef = useRef(false)

  function applyAck(ack) {
    if (!ack || ack.error) return
    const ls = ack.live_session
    setStatus(ls.status)
    setCurrentStepIndex(ls.current_step_index ?? 0)
    if (roleRef.current === 'host') {
      setRoster(
        (ls.participants || []).map((p) => ({
          userId: p.user?._id || p.user,
          username: p.user?.username,
          display_name: p.user?.display_name,
          joined_at: p.joined_at,
          tone: p.tone,
          paragraphIndex: p.paragraph_index,
          playbackState: p.playback_state,
          ready: p.ready,
          insightTag: p.active_insight_tag,
          insightTagsViewed: p.insight_tags_viewed || [],
          insightTone: p.insight_tone,
          insightParagraphIndex: p.insight_paragraph_index,
          insightParagraphTotal: p.insight_paragraph_total,
          insightPlaybackState: p.insight_playback_state,
          quizScore: p.quiz_score,
          quizTotal: p.quiz_answers?.length > 0 ? p.quiz_answers.length : undefined,
          quizAnswers: p.quiz_answers,
        }))
      )
    } else {
      setOwnParticipant(ls.participant || null)
      if (ls.quiz) setQuiz(ls.quiz)
    }
  }

  function performJoin() {
    const socket = socketRef.current
    if (!socket || !visitIdRef.current) return
    socket.emit('visit:join', { visitId: visitIdRef.current }, (ack) => {
      applyAck(ack)
      const resolve = pendingResolveRef.current
      if (resolve) {
        pendingResolveRef.current = null
        resolve(ack)
      }
    })
  }

  function ensureSocket() {
    if (socketRef.current) return socketRef.current
    const socket = io({ autoConnect: false })
    socket.on('connect', () => {
      setConnected(true)
      performJoin()
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('visit:session_opened', () => setStatus('waiting'))
    socket.on('visit:session_started', (payload) => {
      sessionJustStartedRef.current = true
      setStatus('active')
      setCurrentStepIndex(payload?.stepIndex ?? 0)
    })
    socket.on('visit:session_ended', () => setStatus('finished'))
    socket.on('visit:quiz_started', (payload) => {
      setStatus('quiz')
      setQuiz(payload?.quiz || null)
    })
    socket.on('visit:active_step_changed', (payload) => {
      setCurrentStepIndex(payload?.stepIndex ?? 0)
      // Il backend azzera "pronto" per tutti i partecipanti a ogni cambio
      // opera (è un segnale legato all'opera corrente, non alla sessione):
      // rispecchia subito lo stesso reset nel roster del professore, senza
      // aspettare un visit:participant_state_changed per ciascuno studente.
      if (roleRef.current === 'host') {
        setRoster((prev) => prev.map((p) => (p.ready ? { ...p, ready: false } : p)))
      }
    })
    // Solo lato host (la room :host è l'unica a riceverlo): un nuovo
    // partecipante che si è unito dopo che il professore era già connesso.
    socket.on('visit:participant_joined', (payload) => {
      setRoster((prev) => {
        if (prev.some((p) => p.userId === payload.userId)) return prev
        return [
          ...prev,
          { userId: payload.userId, username: payload.username, display_name: payload.display_name, joined_at: payload.joined_at },
        ]
      })
    })
    // Uscita esplicita di uno studente (non una semplice disconnessione
    // socket): togli subito la riga dal roster del professore.
    socket.on('visit:participant_left', (payload) => {
      setRoster((prev) => prev.filter((p) => p.userId !== payload.userId))
    })
    // Solo lato host: tono/paragrafo/playback/pronto di uno studente sono
    // cambiati. Il payload porta solo i campi effettivamente aggiornati
    // (undefined per gli altri), quindi si fa merge parziale sulla riga.
    socket.on('visit:participant_state_changed', (payload) => {
      setRoster((prev) =>
        prev.map((p) => {
          if (p.userId !== payload.userId) return p
          const next = { ...p }
          if (payload.tone !== undefined) next.tone = payload.tone
          if (payload.paragraphIndex !== undefined) next.paragraphIndex = payload.paragraphIndex
          if (payload.playbackState !== undefined) next.playbackState = payload.playbackState
          if (payload.ready !== undefined) next.ready = payload.ready
          if (payload.insightTag !== undefined) {
            next.insightTag = payload.insightTag
            if (payload.insightTag && !(next.insightTagsViewed || []).includes(payload.insightTag)) {
              next.insightTagsViewed = [...(next.insightTagsViewed || []), payload.insightTag]
            }
          }
          if (payload.insightTone !== undefined) next.insightTone = payload.insightTone
          if (payload.insightParagraphIndex !== undefined) next.insightParagraphIndex = payload.insightParagraphIndex
          if (payload.insightParagraphTotal !== undefined) next.insightParagraphTotal = payload.insightParagraphTotal
          if (payload.insightPlaybackState !== undefined) next.insightPlaybackState = payload.insightPlaybackState
          return next
        })
      )
    })
    // Solo lato host: uno studente ha inviato le risposte del quiz. answers
    // è l'array degli indici di opzione scelti, nello stesso ordine di
    // groupVisit.quiz.questions — permette al professore di rivedere ogni
    // risposta confrontandola con q.correct_option_index.
    socket.on('visit:quiz_result', (payload) => {
      setRoster((prev) =>
        prev.map((p) =>
          p.userId === payload.userId
            ? { ...p, quizScore: payload.score, quizTotal: payload.totalQuestions, quizAnswers: payload.answers }
            : p
        )
      )
    })
    socketRef.current = socket
    return socket
  }

  async function establishSession(newVisitId, newRole, { pendingStepIndex } = {}) {
    setError(null)
    setQuiz(null)
    let visit
    try {
      const res = await fetch(`/api/visits/${newVisitId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Impossibile caricare la visita.')
      visit = await res.json()
    } catch (e) {
      setError(e.message)
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    visitIdRef.current = newVisitId
    roleRef.current = newRole
    setVisitId(newVisitId)
    setRole(newRole)
    setGroupVisit(visit)

    // Il professore ora può seguire la visita come uno studente (ascolto,
    // tono/paragrafo locali) mentre gestisce il gruppo dalla tab Gruppo — sia
    // host che student attivano quindi la visita nel player.
    pendingStepIndexRef.current = pendingStepIndex ?? visit.live_session?.current_step_index ?? 0
    // Niente popup "in quale museo ti trovi?" né autoplay: in una sessione
    // di gruppo gli step (e quindi anche la partenza) li guida il professore.
    activateVisit(visit, { promptMuseumChoice: false })

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ visitId: newVisitId, role: newRole }))

    const socket = ensureSocket()
    const ack = await new Promise((resolve) => {
      pendingResolveRef.current = resolve
      if (socket.connected) performJoin()
      else socket.connect()
    })

    if (!ack || ack.error) {
      setError(ack?.error || 'Impossibile unirsi alla sessione.')
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    if (newRole === 'host') {
      navigate('/gruppo')
    } else {
      const finalStatus = ack.live_session.status
      // 'quiz' atterra su /opera come 'active': GroupQuizModal (montata
      // globalmente) mostra il quiz sopra qualunque pagina, non serve una
      // rotta dedicata — e se lo studente ha già risposto (rientro dopo
      // reload) la modale resta chiusa da sola.
      if (finalStatus === 'active' || finalStatus === 'quiz') navigate('/opera')
      else if (finalStatus === 'finished') {
        setError('Questa visita è terminata.')
        navigate('/visite')
      } else {
        navigate('/sessione')
      }
    }
  }

  async function lookupCode(code) {
    const res = await fetch(`/api/visits/code/${encodeURIComponent(code)}`, { credentials: 'include' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Codice non trovato.')
    return body
  }

  async function openAsHost(id) {
    const res = await fetch(`/api/visits/${id}/session/open`, { method: 'POST', credentials: 'include' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || "Errore nell'apertura della sessione.")
      return
    }
    await establishSession(id, 'host')
  }

  async function resumeAsHost(id) {
    await establishSession(id, 'host')
  }

  async function joinAsStudent(id) {
    const res = await fetch(`/api/visits/${id}/session/join`, { method: 'POST', credentials: 'include' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || 'Impossibile unirsi alla sessione.')
      return
    }
    await establishSession(id, 'student', { pendingStepIndex: body.live_session?.current_step_index })
  }

  async function rejoinAsStudent(id) {
    await establishSession(id, 'student')
  }

  async function startSession() {
    if (!visitId) return
    const res = await fetch(`/api/visits/${visitId}/session/start`, { method: 'POST', credentials: 'include' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Errore nell\'avvio della sessione.')
    }
    // Lo stato aggiornato arriva a tutti via l'evento socket visit:session_started.
  }

  async function endSession() {
    if (!visitId) return
    await fetch(`/api/visits/${visitId}/session/end`, { method: 'POST', credentials: 'include' })
    // Il professore ha terminato la visita: non è più "attiva" per lui da
    // subito, prima ancora di uscire dalla tab Gruppo (che nel frattempo
    // mostra ancora il riepilogo tramite groupVisit, non toccato qui).
    clearActiveVisit()
  }

  // Solo il professore. Lo stato aggiornato (status='quiz' + le domande
  // sanificate) arriva a tutti — incluso il professore stesso, che è anche
  // lui nella visitRoom — via l'evento socket visit:quiz_started, non dalla
  // risposta REST: nessun aggiornamento locale qui.
  async function startQuiz() {
    if (!visitId) return
    const res = await fetch(`/api/visits/${visitId}/session/quiz/start`, { method: 'POST', credentials: 'include' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || "Errore nell'avvio del quiz.")
    }
  }

  // Solo lo studente: invia le risposte, il punteggio torna nella risposta
  // REST (calcolato server-side). Aggiorna subito ownParticipant così la UI
  // (GroupQuizModal) può mostrare il risultato senza aspettare un reload.
  async function submitQuizAnswers(answers) {
    if (!visitId) return { error: 'Nessuna sessione attiva.' }
    const res = await fetch(`/api/visits/${visitId}/session/quiz/answers`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error || 'Errore nell\'invio delle risposte.' }
    setOwnParticipant((prev) => (prev ? { ...prev, quiz_answers: answers, quiz_score: body.score } : prev))
    return body
  }

  // Solo lo studente: emette il proprio stato locale al professore (mai
  // richiesto in risposta, il monitor si aggiorna via visit:participant_state_changed).
  function updateOwnState(partial) {
    const socket = socketRef.current
    if (!socket || !visitIdRef.current || roleRef.current !== 'student') return
    socket.emit('visit:update_state', { visitId: visitIdRef.current, ...partial })
  }

  function setReady(value) {
    setIsReady(value)
    updateOwnState({ ready: value })
  }

  function setActiveStep(stepIndex) {
    const socket = socketRef.current
    if (!socket || !visitId) return
    socket.emit('visit:set_active_step', { visitId, stepIndex }, (ack) => {
      if (ack?.error) setError(ack.error)
    })
  }

  function leaveSession() {
    // Uscita esplicita, distinta da una semplice caduta di connessione.
    if (roleRef.current === 'student' && visitIdRef.current) {
      // Avvisa il backend così il professore vede subito sparire la riga dal
      // roster (fire-and-forget, non blocca la pulizia locale se fallisce).
      fetch(`/api/visits/${visitIdRef.current}/session/leave`, { method: 'POST', credentials: 'include' }).catch(() => {})
    } else if (roleRef.current === 'host' && visitIdRef.current) {
      // Se il professore esce (disattiva la visita, fa logout, ne carica
      // un'altra via QR, ecc.) non c'è più nessuno a guidare il gruppo:
      // termina la sessione per tutti invece di lasciarla "orfana" in stato
      // waiting/active — stessa richiesta REST del bottone "Termina visita".
      fetch(`/api/visits/${visitIdRef.current}/session/end`, { method: 'POST', credentials: 'include' }).catch(() => {})
    }

    localStorage.removeItem(STORAGE_KEY)
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    // Sia host che student attivano la visita in establishSession ora, quindi
    // entrambi la puliscono qui allo stesso modo.
    clearActiveVisit()
    visitIdRef.current = null
    roleRef.current = null
    pendingStepIndexRef.current = null
    setRole(null)
    setVisitId(null)
    setGroupVisit(null)
    setStatus(null)
    setCurrentStepIndex(0)
    setRoster([])
    setOwnParticipant(null)
    setIsReady(false)
    setQuiz(null)
    setError(null)
  }

  // Ricorda se la sessione è mai arrivata ad 'active'/'quiz', per distinguere
  // "il professore ha terminato una visita in corso" (va fatto uscire subito
  // lo studente, ovunque si trovi: /opera, /mappa, /comandi, /qr) da "il
  // professore ha annullato prima di avviarla" (SessionLobby.jsx già mostra
  // un messaggio dedicato senza bisogno di essere scacciati altrove).
  const wasActiveRef = useRef(false)
  useEffect(() => {
    if (status === 'active' || status === 'quiz') wasActiveRef.current = true
  }, [status])

  // Il quiz va mostrato subito appena il professore lo avvia: se chi guarda
  // (studente o professore stesso, che può seguire la visita come un
  // partecipante) aveva un approfondimento aperto, chiuderlo esplicitamente
  // invece di lasciarlo sopra il modale del quiz finché non viene chiuso a
  // mano. Copre sia l'evento live (visit:quiz_started) sia il rientro dopo
  // reload quando status arriva già 'quiz' dall'ack di visit:join.
  useEffect(() => {
    if (status === 'quiz') closeInsight()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    if (role !== 'student') return
    if (status !== 'finished') return
    if (!wasActiveRef.current) return
    wasActiveRef.current = false
    const path = museumVisitPath(museum)
    leaveSession()
    navigate(path, { state: { groupSessionEnded: true } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status])

  // Riprende una sessione di gruppo dopo un reload della pagina: nessuna
  // chiamata REST distruttiva, solo il fetch del contenuto + la ri-unione
  // via socket (vedi establishSession). Il guard su hasResumedRef non è
  // ridondante: in sviluppo React StrictMode invoca due volte l'effect di
  // mount, e due chiamate concorrenti a establishSession si contenderebbero
  // l'unico pendingResolveRef condiviso (la seconda sovrascrive la prima),
  // producendo uno stato finale imprevedibile.
  const hasResumedRef = useRef(false)
  useEffect(() => {
    if (hasResumedRef.current) return
    hasResumedRef.current = true
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const saved = JSON.parse(raw)
      if (!saved?.visitId || !saved?.role) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      if (saved.role === 'host') resumeAsHost(saved.visitId)
      else rejoinAsStudent(saved.visitId)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tiene VisitProgressContext allineato all'opera attiva per tutta la
  // durata della sessione, non solo al momento del join: ogni volta che
  // currentStepIndex cambia (join iniziale, ingresso tardivo, o un
  // successivo visit:active_step_changed) chiama goToStep di conseguenza.
  // Vale sia per lo studente che per il professore: il professore ora può
  // ascoltare la visita come un partecipante, e le sue stesse frecce
  // Precedente/Prossimo passano da setActiveStep (broadcast), quindi il suo
  // player deve risincronizzarsi dallo stesso currentStepIndex "di ritorno"
  // invece di navigare la propria copia locale due volte. Il primo
  // allineamento dopo un join (pendingStepIndexRef ancora valorizzato da
  // establishSession) salta le indicazioni — non è un vero spostamento
  // fisico, si sta solo entrando su un punto già in corso; i cambi
  // successivi le mostrano normalmente, come per un reale spostamento del
  // gruppo da un'opera all'altra. Dipende da activeVisit?._id (non solo da
  // role) così da correre dopo l'effect di reset di VisitProgressContext
  // sullo stesso activeVisit._id — garantito dall'ordine di annidamento dei
  // provider in App.jsx.
  useEffect(() => {
    if (!role) return
    if (!activeVisit) return
    if (currentStepIndex == null) return
    const skipDirections = pendingStepIndexRef.current != null
    pendingStepIndexRef.current = null
    goToStep(currentStepIndex, { skipDirections })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, activeVisit?._id, currentStepIndex])

  // All'avvio della visita da parte del professore (visit:session_started, non
  // un ingresso su sessione già in corso) la lettura della descrizione della
  // prima opera parte da sola su tutti i dispositivi — host e studenti — allo
  // stesso modo in cui, ai passaggi successivi, il cambio opera fa già
  // ripartire la narrazione. I cambi di step normali non passano di qui:
  // sessionJustStartedRef è true solo subito dopo quell'unico evento.
  useEffect(() => {
    if (status !== 'active' || !sessionJustStartedRef.current) return
    sessionJustStartedRef.current = false
    if (localPlaybackState === 'idle') handlePlayPause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, localPlaybackState])

  // Telemetria live dello studente: ogni cambio di tono/paragrafo/playback
  // locale viene inoltrato al professore. Salta l'invio quando playbackState
  // è ancora 'idle' (prima del primo play) — non è un valore accettato dallo
  // schema del server ('playing'|'paused' soltanto), e non c'è comunque nulla
  // di significativo da mostrare nel monitor prima che l'ascolto inizi.
  useEffect(() => {
    if (role !== 'student' || status !== 'active') return
    if (localPlaybackState === 'idle') return
    updateOwnState({ tone: activeTone, paragraphIndex: activeDescIndex, playbackState: localPlaybackState })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status, activeTone, activeDescIndex, localPlaybackState])

  // Segnala al professore l'apertura/chiusura di un approfondimento (tag) e,
  // mentre è aperto, lo stesso dettaglio tono/paragrafo/playback già inviato
  // per l'opera principale — così il monitor può mostrare non solo a che
  // punto della visita è lo studente ma anche se sta seguendo un
  // approfondimento, quale, a che punto è arrivato e quali ha già ascoltato
  // (storico tenuto server-side, vedi insight_tags_viewed). A differenza
  // della narrazione principale, tono/paragrafo vengono inviati subito
  // (EntityListenPanel li sceglie in automatico all'apertura, prima ancora
  // di premere "Ascolta"): uno studente che si limita a leggere il testo
  // senza mai avviare la sintesi vocale non deve restare invisibile al
  // professore. Solo il playback resta 'idle' → null, perché lo schema del
  // server accetta solo 'playing'/'paused'.
  useEffect(() => {
    if (role !== 'student' || status !== 'active') return
    if (!activeInsightTag) {
      updateOwnState({
        insightTag: null,
        insightTone: null,
        insightParagraphIndex: null,
        insightParagraphTotal: null,
        insightPlaybackState: null,
      })
      return
    }
    updateOwnState({
      insightTag: activeInsightTag,
      insightTone: insightState.tone,
      insightParagraphIndex: insightState.paragraphIndex,
      insightParagraphTotal: insightState.paragraphTotal,
      insightPlaybackState: insightState.playbackState === 'idle' ? null : insightState.playbackState,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status, activeInsightTag, insightState])

  // "Pronto" è legato all'opera corrente: quando il professore ne cambia una
  // (currentStepIndex cambia) il proprio segnale locale si azzera, così lo
  // studente deve premerlo di nuovo per la nuova opera. Il backend fa lo
  // stesso reset lato server per il roster del professore.
  useEffect(() => {
    if (role !== 'student') return
    setIsReady(false)
  }, [role, currentStepIndex])

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect()
    }
  }, [])

  const value = {
    role,
    visitId,
    groupVisit,
    status,
    currentStepIndex,
    connected,
    roster,
    ownParticipant,
    isReady,
    quiz,
    error,
    lookupCode,
    openAsHost,
    resumeAsHost,
    joinAsStudent,
    rejoinAsStudent,
    startSession,
    endSession,
    setActiveStep,
    handlePreviousStep,
    handleNextStep,
    previousStepDisabled,
    nextStepDisabled,
    setReady,
    startQuiz,
    submitQuizAnswers,
    leaveSession,
  }

  return <GroupSessionContext.Provider value={value}>{children}</GroupSessionContext.Provider>
}

export function useGroupSession() {
  const ctx = useContext(GroupSessionContext)
  if (!ctx) throw new Error('useGroupSession must be used inside GroupSessionProvider')
  return ctx
}
