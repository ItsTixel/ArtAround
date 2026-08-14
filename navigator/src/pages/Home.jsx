import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActiveVisit } from '../context/ActiveVisitContext'
import VisitDetailModal from '../components/VisitDetailModal'

const MARKETPLACE_VISITS_URL = '/marketplace/pages/visits.html'
const LOGIN_URL = '/marketplace/login.html'
const REGISTER_URL = '/marketplace/register.html'

function formatDuration(sec) {
  if (!sec) return null
  const minutes = Math.round(sec / 60)
  return `${minutes} min`
}

function formatPrice(price) {
  if (!price) return 'Gratis'
  return `${price.toFixed(2)} €`
}

function Home() {
  const { user } = useAuth()
  const { activeVisit, activateVisit, clearActiveVisit } = useActiveVisit()
  const navigate = useNavigate()
  const location = useLocation()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Il QR di una visita già adottata arriva qui via navigate('/', { state:
  // { detailVisit } }) per aprire direttamente il suo popup (vedi Qr.jsx).
  const [detailVisit, setDetailVisit] = useState(() => location.state?.detailVisit || null)
  const [visitCode, setVisitCode] = useState('')

  useEffect(() => {
    let cancelled = false
    const adoptedIds = user?.adopted_visits || []

    async function loadVisits() {
      if (adoptedIds.length === 0) {
        setVisits([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const results = await Promise.all(
          adoptedIds.map((id) => fetch(`/api/visits/${id}`).then((res) => (res.ok ? res.json() : null)))
        )
        if (!cancelled) setVisits(results.filter(Boolean))
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadVisits()
    return () => {
      cancelled = true
    }
  }, [user])

  function handleVisitCodeSubmit(e) {
    e.preventDefault()
    // Il riscatto di un codice visita richiede una rotta backend non ancora
    // esistente: per ora il campo è solo interfaccia, senza chiamata reale.
  }

  return (
    <div className="flex flex-col gap-8 p-4 pt-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-semibold text-text">Benvenuto</h1>
        <p className="mt-1 text-sm text-text-muted">
          Inserisci un codice visita, oppure scegli una delle tue visite qui sotto.
        </p>
      </div>

      {!user && (
        <div className="flex flex-col gap-2 rounded-lg border border-accent/40 bg-accent/10 p-4 text-center">
          <p className="text-sm text-text">
            Accedi o registrati per adottare visite e salvare i tuoi progressi.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href={`${LOGIN_URL}?redirect=${encodeURIComponent(location.pathname + location.search)}`}
              className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
            >
              Accedi
            </a>
            <a
              href={`${REGISTER_URL}?redirect=${encodeURIComponent(location.pathname + location.search)}`}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text"
            >
              Registrati
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleVisitCodeSubmit} className="flex flex-col gap-2">
        <label htmlFor="visit-code" className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Codice visita
        </label>
        <div className="flex gap-2">
          <input
            id="visit-code"
            type="text"
            value={visitCode}
            onChange={(e) => setVisitCode(e.target.value)}
            placeholder="Es. ABC123"
            autoComplete="off"
            className="flex-1 rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2.5 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
          >
            Vai
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-text">Visite disponibili</h2>

        {loading && <p className="text-sm text-text-muted">Caricamento visite...</p>}
        {error && <p className="text-sm text-[color:var(--color-error)]">{error}</p>}

        {!loading && !error && visits.length === 0 && (
          <p className="text-sm text-text-muted">Non hai ancora nessuna visita adottata.</p>
        )}

        {!loading && !error && visits.length > 0 && (
          <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
            {visits.map((visit) => {
              const isActive = activeVisit?._id === visit._id
              const museumNames = (visit.museum || []).map((m) => m.name).join(', ')
              const coverImage = visit.image_url || visit.steps?.[0]?.entity?.image_url

              return (
                <li key={visit._id}>
                  <button
                    type="button"
                    onClick={() => setDetailVisit(visit)}
                    className={`glass-panel flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                      isActive ? 'border-accent! shadow-lg shadow-black/10 dark:shadow-black/30' : ''
                    }`}
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-bg">
                      {coverImage && (
                        <img src={coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-serif font-semibold text-text">{visit.title}</h3>
                        {isActive && (
                          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-medium text-on-accent">
                            Attiva
                          </span>
                        )}
                      </div>
                      {museumNames && <p className="truncate text-xs text-text-muted">{museumNames}</p>}
                      <div className="mt-1 flex gap-3 text-xs text-text-muted">
                        {formatDuration(visit.estimated_duration_sec) && (
                          <span>{formatDuration(visit.estimated_duration_sec)}</span>
                        )}
                        <span>{formatPrice(visit.base_price)}</span>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <a
          href={MARKETPLACE_VISITS_URL}
          className="mt-1 text-center text-sm text-accent underline-offset-4 hover:underline"
        >
          Vuoi altre visite? Vai al marketplace
        </a>
      </div>

      {detailVisit && (
        <VisitDetailModal
          visit={detailVisit}
          isActive={activeVisit?._id === detailVisit._id}
          onClose={() => setDetailVisit(null)}
          onActivate={() => {
            activateVisit(detailVisit)
            setDetailVisit(null)
            navigate('/opera')
          }}
          onDeactivate={() => {
            clearActiveVisit()
            setDetailVisit(null)
          }}
        />
      )}
    </div>
  )
}

export default Home
