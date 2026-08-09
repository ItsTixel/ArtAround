import { useEffect, useState } from 'react'
import { useActiveVisit } from '../context/ActiveVisitContext'

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
  const { activeVisit, activateVisit, clearActiveVisit } = useActiveVisit()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadVisits() {
      try {
        const res = await fetch('/api/visits?pageSize=100&sort=title')
        if (!res.ok) throw new Error('Errore nel caricamento delle visite')
        const body = await res.json()
        if (!cancelled) setVisits(body.data || [])
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
  }, [])

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Home</h1>
        <p className="text-sm text-text-muted">
          Seleziona una visita da attivare per iniziare.
        </p>
      </div>

      {loading && <p className="text-text-muted">Caricamento visite...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <ul className="flex flex-col gap-3">
        {visits.map((visit) => {
          const isActive = activeVisit?._id === visit._id
          const museumNames = (visit.museum || []).map((m) => m.name).join(', ')

          return (
            <li
              key={visit._id}
              className={`rounded-lg border bg-surface p-4 shadow-sm ${
                isActive ? 'border-accent' : 'border-border'
              }`}
            >
              <h2 className="font-semibold text-primary">{visit.title}</h2>
              {museumNames && (
                <p className="text-sm text-text-muted">{museumNames}</p>
              )}
              <div className="mt-1 flex gap-3 text-xs text-text-muted">
                {formatDuration(visit.estimated_duration_sec) && (
                  <span>{formatDuration(visit.estimated_duration_sec)}</span>
                )}
                <span>{formatPrice(visit.base_price)}</span>
              </div>

              <button
                type="button"
                onClick={() => (isActive ? clearActiveVisit() : activateVisit(visit))}
                className={`mt-3 w-full rounded-md px-4 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-primary text-white'
                }`}
              >
                {isActive ? 'Visita attiva ✓' : 'Attiva'}
              </button>
            </li>
          )
        })}
      </ul>

      {!loading && !error && visits.length === 0 && (
        <p className="text-text-muted">Nessuna visita disponibile.</p>
      )}
    </div>
  )
}

export default Home
