import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import { useAuth } from '../context/AuthContext'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress } from '../context/VisitProgressContext'
import EntityFoundModal from '../components/EntityFoundModal'
import VisitAdoptModal from '../components/VisitAdoptModal'

// Un QR fisico codifica semplicemente "entity:<id>" o "visit:<id>" (l'id
// Mongo dell'opera/visita) — nessun endpoint dedicato: bastano le rotte
// pubbliche GET /api/entities/:id e GET /api/visits/:id già esistenti.
const QR_PATTERN = /^(entity|visit):([a-fA-F0-9]{24})$/

function parseCode(text) {
  const match = QR_PATTERN.exec(text.trim())
  if (!match) return null
  return { type: match[1], id: match[2] }
}

function Qr() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const frameRef = useRef(null)
  const navigate = useNavigate()
  const { user, refresh } = useAuth()
  const { activeVisit } = useActiveVisit()
  const { step, steps, goToStep, pauseNarration } = useVisitProgress()
  const [status, setStatus] = useState('requesting') // 'requesting' | 'scanning' | 'detected' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState(null) // { type, id } | null
  // { loading, error, entity, matchedStep, matchedIndex } | null — populated
  // when result is an entity code, drives the EntityFoundModal below.
  const [entityLookup, setEntityLookup] = useState(null)
  // { loading, error, visit } | null — populated when result is a visit code.
  const [visitLookup, setVisitLookup] = useState(null)
  // Nessun QR fisico esiste ancora nel mondo reale (e non ne avremo per la
  // demo/correzione): questo pannello simula una scansione per ciascuno dei
  // 4 casi, scegliendo id reali dai dati già caricati o da una fetch al
  // volo, ed entra nella stessa pipeline di un vero risultato jsQR.
  const [testOpen, setTestOpen] = useState(false)
  const [testBusy, setTestBusy] = useState(null) // chiave del bottone in caricamento | null
  const [testError, setTestError] = useState(null)

  const stopCamera = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const handleDecoded = useCallback(
    (text) => {
      const parsed = parseCode(text)
      stopCamera()
      setTestOpen(false)
      setResult(parsed || { type: 'unknown', raw: text })
      setStatus('detected')
    },
    [stopCamera]
  )

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code?.data) {
        handleDecoded(code.data)
        return
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [handleDecoded])

  const startCamera = useCallback(async () => {
    setStatus('requesting')
    setErrorMessage('')
    setResult(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Il browser non supporta l\'accesso alla fotocamera.')
      setStatus('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('scanning')
      frameRef.current = requestAnimationFrame(tick)
    } catch {
      setErrorMessage('Impossibile accedere alla fotocamera. Controlla i permessi del browser.')
      setStatus('error')
    }
  }, [tick])

  useEffect(() => {
    startCamera()
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status !== 'detected' || result?.type !== 'entity') {
      setEntityLookup(null)
      return
    }
    let cancelled = false
    setEntityLookup({ loading: true, error: null, entity: null, matchedStep: null, matchedIndex: -1 })
    fetch(`/api/entities/${result.id}`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((entity) => {
        if (cancelled) return
        const matchedIndex = steps.findIndex((s) => String(s.entity?._id) === String(entity._id))
        setEntityLookup({
          loading: false,
          error: null,
          entity,
          matchedStep: matchedIndex === -1 ? null : steps[matchedIndex],
          matchedIndex,
        })
      })
      .catch(() => {
        if (cancelled) return
        setEntityLookup({ loading: false, error: 'Opera non trovata.', entity: null, matchedStep: null, matchedIndex: -1 })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, result])

  useEffect(() => {
    if (status !== 'detected' || result?.type !== 'visit') {
      setVisitLookup(null)
      return
    }
    let cancelled = false
    setVisitLookup({ loading: true, error: null, visit: null })
    fetch(`/api/visits/${result.id}`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((visit) => {
        if (!cancelled) setVisitLookup({ loading: false, error: null, visit })
      })
      .catch(() => {
        if (!cancelled) setVisitLookup({ loading: false, error: 'Visita non trovata.', visit: null })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, result])

  const isVisitAdopted =
    visitLookup?.visit && (user?.adopted_visits || []).some((id) => String(id) === String(visitLookup.visit._id))

  // Visita già adottata: nessuna interazione richiesta, si mette in pausa la
  // visita attuale e si apre direttamente il suo popup di dettaglio in Home.
  useEffect(() => {
    if (!isVisitAdopted) return
    pauseNarration()
    navigate('/', { state: { detailVisit: visitLookup.visit } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisitAdopted])

  async function runTest(key, resolveCode) {
    setTestBusy(key)
    setTestError(null)
    try {
      const code = await resolveCode()
      if (!code) {
        setTestError('Nessun dato disponibile per simulare questo caso.')
        return
      }
      handleDecoded(code)
    } catch {
      setTestError('Errore durante la simulazione.')
    } finally {
      setTestBusy(null)
    }
  }

  const testCases = [
    {
      key: 'entity-in-visit',
      label: 'Opera nella visita',
      disabledReason: !steps.length ? 'Serve una visita attiva' : null,
      resolve: async () => {
        const candidate = steps.find((s) => s !== step) || steps[0]
        const id = candidate?.entity?._id
        return id ? `entity:${id}` : null
      },
    },
    {
      key: 'entity-out-visit',
      label: 'Opera non nella visita',
      disabledReason: null,
      resolve: async () => {
        const inVisitIds = new Set(steps.map((s) => String(s.entity?._id)))
        const res = await fetch('/api/entities?pageSize=30')
        if (!res.ok) return null
        const data = await res.json()
        const candidate = (data.data || []).find((e) => !inVisitIds.has(String(e._id)))
        return candidate ? `entity:${candidate._id}` : null
      },
    },
    {
      key: 'visit-adopted',
      label: 'Visita adottata',
      disabledReason: !user?.adopted_visits?.length ? 'Nessuna visita adottata da questo account' : null,
      resolve: async () => {
        const adoptedIds = user?.adopted_visits || []
        const id = adoptedIds.find((v) => String(v) !== String(activeVisit?._id)) || adoptedIds[0]
        return id ? `visit:${id}` : null
      },
    },
    {
      key: 'visit-not-adopted',
      label: 'Visita non adottata',
      disabledReason: null,
      resolve: async () => {
        const adoptedIds = new Set((user?.adopted_visits || []).map(String))
        const res = await fetch('/api/visits?pageSize=30')
        if (!res.ok) return null
        const data = await res.json()
        const candidate = (data.data || []).find((v) => !adoptedIds.has(String(v._id)))
        return candidate ? `visit:${candidate._id}` : null
      },
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-serif text-2xl font-semibold text-text">QR</h1>

      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-cover ${status === 'scanning' ? '' : 'opacity-0'}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {status === 'scanning' && (
          <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-accent/70" />
        )}

        {status === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-text-muted">
            Avvio fotocamera...
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-text-muted">{errorMessage}</p>
            <button
              type="button"
              onClick={startCamera}
              className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-[0_0_16px_rgba(212,168,83,0.25)]"
            >
              Riprova
            </button>
          </div>
        )}

        {status === 'detected' &&
          !(result?.type === 'entity' && entityLookup?.entity) &&
          !(result?.type === 'visit' && visitLookup?.visit) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {result?.type === 'unknown' && <p className="text-sm text-text-muted">QR non riconosciuto.</p>}
            {result?.type === 'entity' && entityLookup?.loading && (
              <p className="text-sm text-text-muted">Caricamento opera...</p>
            )}
            {result?.type === 'entity' && entityLookup?.error && (
              <p className="text-sm text-text-muted">{entityLookup.error}</p>
            )}
            {result?.type === 'visit' && visitLookup?.loading && (
              <p className="text-sm text-text-muted">Caricamento visita...</p>
            )}
            {result?.type === 'visit' && visitLookup?.error && (
              <p className="text-sm text-text-muted">{visitLookup.error}</p>
            )}
            <button
              type="button"
              onClick={startCamera}
              className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-[0_0_16px_rgba(212,168,83,0.25)]"
            >
              Scansiona di nuovo
            </button>
          </div>
        )}
      </div>

      {status === 'scanning' && (
        <p className="text-center text-sm text-text-muted">Inquadra un QR code.</p>
      )}

      {result?.type === 'entity' && entityLookup?.entity && (
        <EntityFoundModal
          entity={entityLookup.entity}
          matchedStep={entityLookup.matchedStep}
          onGoToStep={() => {
            // Sei già davanti all'opera (hai appena inquadrato il suo QR):
            // le indicazioni per raggiungerla non avrebbero senso qui.
            goToStep(entityLookup.matchedIndex, { skipDirections: true })
            navigate('/opera')
          }}
          onClose={startCamera}
        />
      )}

      {result?.type === 'visit' && visitLookup?.visit && !isVisitAdopted && (
        <VisitAdoptModal
          visit={visitLookup.visit}
          onAdopted={async () => {
            pauseNarration()
            await refresh()
            navigate('/', { state: { detailVisit: visitLookup.visit } })
          }}
          onClose={startCamera}
        />
      )}

      <div className="mt-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => {
            setTestError(null)
            setTestOpen((open) => !open)
          }}
          className="text-xs text-text-muted underline-offset-4 hover:underline"
        >
          {testOpen ? 'Nascondi strumento di test' : 'Non hai un QR a disposizione? Simula una scansione'}
        </button>

        {testOpen && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-text-muted">
              Simula il risultato di una scansione per ciascuno dei 4 casi, senza bisogno di un QR reale.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {testCases.map(({ key, label, disabledReason, resolve }) => (
                <button
                  key={key}
                  type="button"
                  disabled={Boolean(disabledReason) || testBusy === key}
                  title={disabledReason || undefined}
                  onClick={() => runTest(key, resolve)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text disabled:opacity-40"
                >
                  {testBusy === key ? 'Simulazione...' : label}
                </button>
              ))}
            </div>
            {testError && <p className="text-xs text-red-400">{testError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default Qr
