import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { MuseumIcon } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { useGroupSession } from '../context/GroupSessionContext'
import VisitDetailModal, { PENDING_CODE_KEY } from '../components/VisitDetailModal'
import { museumVisitPath } from '../utils/museumVisit'

const SEARCH_DEBOUNCE_MS = 300
const LOGIN_URL = '/marketplace/login.html'
const REGISTER_URL = '/marketplace/register.html'

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
  const { user } = useAuth()
  const { lookupCode } = useGroupSession()
  const [query, setQuery] = useState('')
  const [museums, setMuseums] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visitCode, setVisitCode] = useState('')
  const [codePreview, setCodePreview] = useState(null) // { code, preview } | null
  const [codeError, setCodeError] = useState(null)

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
    navigate(museumVisitPath(museum))
  }

  async function openCodePreview(code) {
    setCodeError(null)
    try {
      const preview = await lookupCode(code)
      setCodePreview({ code, preview })
    } catch (e) {
      setCodeError(e.message)
    }
  }

  function handleVisitCodeSubmit(e) {
    e.preventDefault()
    if (!visitCode.trim()) return
    openCodePreview(visitCode.trim())
  }

  // Se l'utente ha inserito un codice da sloggato, è stato mandato a
  // login/registrati e torna qui: riprende automaticamente l'anteprima
  // del codice che aveva lasciato in sospeso.
  useEffect(() => {
    if (!user) return
    const pendingCode = localStorage.getItem(PENDING_CODE_KEY)
    if (!pendingCode) return
    localStorage.removeItem(PENDING_CODE_KEY)
    setVisitCode(pendingCode)
    openCodePreview(pendingCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div className="flex flex-col gap-8 p-4 pt-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-semibold text-text">Benvenuto</h1>
        <p className="mt-1 text-sm text-text-muted">Cerca e seleziona il museo che vuoi visitare.</p>
      </div>

      {!user && (
        <div className="glass-panel flex flex-col gap-2 rounded-2xl p-4 text-center outline outline-1 outline-accent/30 outline-offset-[-1px]">
          <p className="text-sm text-text">
            Accedi o registrati per adottare visite e salvare i tuoi progressi.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href={`${LOGIN_URL}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="rounded-full bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
            >
              Accedi
            </a>
            <a
              href={`${REGISTER_URL}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="glass-pill rounded-full px-4 py-2 text-sm font-medium text-text"
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
        <div className="glass-panel flex gap-2 rounded-2xl p-1.5">
          <input
            id="visit-code"
            type="text"
            value={visitCode}
            onChange={(e) => setVisitCode(e.target.value.toUpperCase())}
            placeholder="Es. ABC123"
            autoComplete="off"
            className="flex-1 rounded-xl bg-transparent px-3 py-2 text-sm uppercase text-text placeholder:text-text-muted focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
          >
            Vai
          </button>
        </div>
        {codeError && <p className="text-sm text-[color:var(--color-error)]">{codeError}</p>}
      </form>

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

      {codePreview && <VisitDetailModal groupVisit={codePreview} onClose={() => setCodePreview(null)} />}
    </div>
  )
}

export default Home
