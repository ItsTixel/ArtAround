import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { MuseumIcon } from '../components/icons'

const SEARCH_DEBOUNCE_MS = 300

function MuseumRow({ museum, onClick }) {
  const location = [museum.address?.city, museum.address?.country].filter(Boolean).join(', ')

  return (
    <li key={museum._id}>
      <button
        type="button"
        onClick={onClick}
        className="glass-panel flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-bg">
          {museum.image_url ? (
            <img src={museum.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <MuseumIcon className="h-8 w-8 text-text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif font-semibold text-text">{museum.name}</h3>
          {location && <p className="truncate text-xs text-text-muted">{location}</p>}
        </div>
      </button>
    </li>
  )
}

function Home() {
  useDocumentTitle('Home')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [museums, setMuseums] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Ricerca musei per nome, con debounce come nel marketplace
  // (marketplace/js/museums.js): ricarica la lista ad ogni digitazione,
  // senza query mostra i musei disponibili in ordine alfabetico.
  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ pageSize: '20', sort: 'name' })
        if (query.trim()) params.set('name', query.trim())
        const res = await fetch(`/api/museums?${params}`)
        if (!res.ok) throw new Error('Impossibile caricare i musei')
        const body = await res.json()
        if (!cancelled) setMuseums(body.data || [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query])

  function selectMuseum(museum) {
    const params = new URLSearchParams({ museum: museum._id, museumName: museum.name })
    navigate(`/visite?${params}`)
  }

  return (
    <div className="flex flex-col gap-8 p-4 pt-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-semibold text-text">Benvenuto</h1>
        <p className="mt-1 text-sm text-text-muted">Cerca e seleziona il museo che vuoi visitare.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="museum-search" className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Cerca museo
        </label>
        <div className="glass-panel flex gap-2 rounded-2xl p-1.5">
          <input
            id="museum-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome del museo..."
            autoComplete="off"
            className="flex-1 rounded-xl bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-text-muted">Caricamento musei...</p>}
      {error && <p className="text-sm text-[color:var(--color-error)]">{error}</p>}

      {!loading && !error && museums.length === 0 && (
        <p className="text-sm text-text-muted">Nessun museo trovato.</p>
      )}

      {!loading && !error && museums.length > 0 && (
        <ul className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto pr-1">
          {museums.map((museum) => (
            <MuseumRow key={museum._id} museum={museum} onClick={() => selectMuseum(museum)} />
          ))}
        </ul>
      )}
    </div>
  )
}

export default Home
