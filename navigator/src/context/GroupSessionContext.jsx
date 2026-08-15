import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useActiveVisit } from './ActiveVisitContext'
import { useVisitProgress } from './VisitProgressContext'

const STORAGE_KEY = 'navigator_group_session'

const GroupSessionContext = createContext(null)

export function GroupSessionProvider({ children }) {
  const navigate = useNavigate()
  const { activeVisit, activateVisit, clearActiveVisit } = useActiveVisit()
  const { goToStep } = useVisitProgress()

  const [role, setRole] = useState(null) // 'host' | 'student' | null
  const [visitId, setVisitId] = useState(null)
  const [groupVisit, setGroupVisit] = useState(null) // GET /api/visits/:id response
  const [status, setStatus] = useState(null) // 'waiting' | 'active' | 'quiz' | 'finished' | null
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [connected, setConnected] = useState(false)
  const [roster, setRoster] = useState([]) // host only
  const [ownParticipant, setOwnParticipant] = useState(null) // student only
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
        }))
      )
    } else {
      setOwnParticipant(ls.participant || null)
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
      setStatus('active')
      setCurrentStepIndex(payload?.stepIndex ?? 0)
    })
    socket.on('visit:session_ended', () => setStatus('finished'))
    socket.on('visit:active_step_changed', (payload) => setCurrentStepIndex(payload?.stepIndex ?? 0))
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
    socketRef.current = socket
    return socket
  }

  async function establishSession(newVisitId, newRole, { pendingStepIndex } = {}) {
    setError(null)
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

    if (newRole === 'student') {
      pendingStepIndexRef.current = pendingStepIndex ?? visit.live_session?.current_step_index ?? 0
      activateVisit(visit)
    }

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
      navigate('/sessione/gestisci')
    } else {
      const finalStatus = ack.live_session.status
      if (finalStatus === 'active') navigate('/opera')
      else if (finalStatus === 'finished') {
        setError('Questa visita è terminata.')
        navigate('/')
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
  }

  function setActiveStep(stepIndex) {
    const socket = socketRef.current
    if (!socket || !visitId) return
    socket.emit('visit:set_active_step', { visitId, stepIndex }, (ack) => {
      if (ack?.error) setError(ack.error)
    })
  }

  function leaveSession() {
    localStorage.removeItem(STORAGE_KEY)
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    if (roleRef.current === 'student') clearActiveVisit()
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

  useEffect(() => {
    if (role !== 'student') return
    if (status !== 'finished') return
    if (!wasActiveRef.current) return
    wasActiveRef.current = false
    leaveSession()
    navigate('/', { state: { groupSessionEnded: true } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status])

  // Riprende una sessione di gruppo dopo un reload della pagina: nessuna
  // chiamata REST distruttiva, solo il fetch del contenuto + la ri-unione
  // via socket (vedi establishSession).
  useEffect(() => {
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

  // Tiene VisitProgressContext allineato all'opera scelta dal professore per
  // tutta la durata della sessione, non solo al momento del join: ogni volta
  // che currentStepIndex cambia (join iniziale, ingresso tardivo, o un
  // successivo visit:active_step_changed) chiama goToStep di conseguenza.
  // Il primo allineamento dopo un join (pendingStepIndexRef ancora valorizzato
  // da establishSession) salta le indicazioni — non è un vero spostamento
  // fisico, lo studente si sta solo unendo a un punto già in corso; i cambi
  // successivi le mostrano normalmente, come per un reale spostamento del
  // gruppo da un'opera all'altra. Dipende da activeVisit?._id (non solo da
  // role) così da correre dopo l'effect di reset di VisitProgressContext
  // sullo stesso activeVisit._id — garantito dall'ordine di annidamento dei
  // provider in App.jsx.
  useEffect(() => {
    if (role !== 'student') return
    if (!activeVisit) return
    if (currentStepIndex == null) return
    const skipDirections = pendingStepIndexRef.current != null
    pendingStepIndexRef.current = null
    goToStep(currentStepIndex, { skipDirections })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, activeVisit?._id, currentStepIndex])

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
    error,
    lookupCode,
    openAsHost,
    resumeAsHost,
    joinAsStudent,
    rejoinAsStudent,
    startSession,
    endSession,
    setActiveStep,
    leaveSession,
  }

  return <GroupSessionContext.Provider value={value}>{children}</GroupSessionContext.Provider>
}

export function useGroupSession() {
  const ctx = useContext(GroupSessionContext)
  if (!ctx) throw new Error('useGroupSession must be used inside GroupSessionProvider')
  return ctx
}
