import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useGroupSession } from '../context/GroupSessionContext'
import VisitDetailModal, { PENDING_CODE_KEY } from '../components/VisitDetailModal'
import VisitAdoptModal from '../components/VisitAdoptModal'
import { formatDuration, formatPrice } from '../components/VisitInfoBody'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { ChevronLeftIcon } from '../components/icons'
import { slugify } from '../utils/slug'

const MARKETPLACE_VISITS_URL = '/marketplace/pages/visits.html'

// Adatta una visita di gruppo completa (fetch di /api/visits/:id, con
// `live_session.status`) alla stessa forma { code, preview } della preview
// snella restituita da GET /code/:code (che usa `status` diretto), così può
// alimentare lo stesso VisitDetailModal groupVisit sia che si arrivi da un
// codice sia da una visita già raggiunta per altra via (Adottate, QR,
// ?openVisit=).
function toGroupPreview(visit) {
  return { code: visit.code, preview: { ...visit, status: visit.live_session?.status } }
}

function VisitRow({ visit, isActive, badge, onClick }) {
  const museumNames = (visit.museum || []).map((m) => m.name).join(', ')
  const coverImage = visit.image_url || visit.steps?.[0]?.entity?.image_url

  return (
    <li key={visit._id}>
      <button
        type="button"
        onClick={onClick}
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
            {badge}
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
}

function SelectVisit() {
  useDocumentTitle('Visite')
  const { user, refresh } = useAuth()
  const { activeVisit, activateVisit, clearActiveVisit } = useActiveVisit()
  const { role: groupRole, lookupCode, leaveSession: leaveGroupSession } = useGroupSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  // Museo scelto nella schermata precedente (Home), nel path come slug del
  // nome (/visite/:museumSlug, vedi utils/museumVisit.js) invece che come id
  // in query string: se presente, le liste sotto vengono filtrate a solo le
  // visite che lo includono. Assente per i deep link diretti a una visita
  // (?openVisit=, QR, codice) o quando si torna qui da un flusso senza
  // contesto museo: in quel caso si mostra la lista completa, come prima
  // dell'introduzione della selezione museo.
  const { museumSlug } = useParams()
  const [museumId, setMuseumId] = useState(null)
  const [museumName, setMuseumName] = useState(null)
  const [visits, setVisits] = useState([])
  const [favoriteVisits, setFavoriteVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Pill "Adottate" / "Preferiti", stesso pattern delle sub-pill nella tab
  // "Visite" del profilo marketplace: un'unica sezione, filtro sopra la lista.
  const [visitsTab, setVisitsTab] = useState('adopted')
  // Preferito non ancora adottato su cui l'utente ha cliccato: apre
  // VisitAdoptModal invece del VisitDetailModal (serve prima adottarla).
  const [adoptVisit, setAdoptVisit] = useState(null)
  // Il QR di una visita già adottata arriva qui via navigate('/visite', { state:
  // { detailVisit } }) per aprire direttamente il suo popup (vedi Qr.jsx).
  // Può capitare anche per una visita di gruppo (l'autore la scansiona da
  // adottata): in quel caso va in codePreview, non qui, stessa logica di
  // openGroupVisit più sotto.
  const [detailVisit, setDetailVisit] = useState(() => {
    const v = location.state?.detailVisit
    return v && !v.is_group ? v : null
  })
  const [visitCode, setVisitCode] = useState('')
  const [codePreview, setCodePreview] = useState(() => {
    const v = location.state?.detailVisit
    return v && v.is_group ? toGroupPreview(v) : null
  }) // { code, preview } | null
  const [codeError, setCodeError] = useState(null)
  // Il professore ha terminato una visita di gruppo in corso: GroupSessionContext
  // riporta qui lo studente via navigate('/visite', { state: { groupSessionEnded } }).
  const [groupSessionEnded, setGroupSessionEnded] = useState(() => Boolean(location.state?.groupSessionEnded))

  // L'URL porta solo lo slug del nome (leggibile, non l'id): si risolve qui
  // al museo vero (id incluso, serve per filtrare le liste sotto) con una
  // GET sulla lista musei, cercando quello il cui nome slugificato coincide.
  useEffect(() => {
    if (!museumSlug) {
      setMuseumId(null)
      setMuseumName(null)
      return
    }
    let cancelled = false
    // Il primo segmento dello slug come filtro `name` (ricerca parziale
    // case-insensitive lato backend, vedi controllers/museum.js) restringe
    // i risultati prima del confronto esatto sullo slug completo.
    const searchTerm = museumSlug.split('-')[0]
    const params = new URLSearchParams({ name: searchTerm, pageSize: '100' })
    fetch(`/api/museums?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled) return
        const match = (body?.data || []).find((m) => slugify(m.name) === museumSlug)
        setMuseumId(match?._id || null)
        setMuseumName(match?.name || null)
      })
      .catch(() => {
        if (!cancelled) {
          setMuseumId(null)
          setMuseumName(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [museumSlug])

  useEffect(() => {
    let cancelled = false
    const adoptedIds = user?.adopted_visits || []
    const bookmarkedIds = user?.bookmarked_visits || []
    // Le due liste possono condividere id (una visita adottata può anche
    // essere tra i preferiti): si scarica ogni visita una volta sola e poi
    // si ricompongono le due sezioni, duplicati tra loro inclusi.
    const allIds = [...new Set([...adoptedIds, ...bookmarkedIds].map(String))]

    async function loadVisits() {
      if (allIds.length === 0) {
        setVisits([])
        setFavoriteVisits([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const results = await Promise.all(
          allIds.map((id) => fetch(`/api/visits/${id}`).then((res) => (res.ok ? res.json() : null)))
        )
        if (cancelled) return
        const byId = new Map(results.filter(Boolean).map((visit) => [String(visit._id), visit]))
        setVisits(adoptedIds.map((id) => byId.get(String(id))).filter(Boolean))
        setFavoriteVisits(bookmarkedIds.map((id) => byId.get(String(id))).filter(Boolean))
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

  // Dal marketplace, dopo aver adottato/acquistato una visita, si arriva qui
  // via window.location.href (page load vero e proprio, non navigazione SPA:
  // location.state non è disponibile) con ?openVisit=<id> per aprire subito
  // il popup "Attiva visita". Si fa fetch diretta della visita invece di
  // aspettare che si popoli la lista `visits` (derivata da user.adopted_visits,
  // che carica in modo asincrono dopo l'auth): così il popup appare subito,
  // senza dipendere dal timing di quel secondo caricamento.
  useEffect(() => {
    const openVisitId = searchParams.get('openVisit')
    if (!openVisitId) return
    let cancelled = false
    fetch(`/api/visits/${openVisitId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((visit) => {
        if (cancelled || !visit) return
        if (visit.is_group) openGroupVisit(visit)
        else setDetailVisit(visit)
      })
      .finally(() => {
        if (cancelled) return
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.delete('openVisit')
            return next
          },
          { replace: true }
        )
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openCodePreview(code) {
    setCodeError(null)
    try {
      const preview = await lookupCode(code)
      setCodePreview({ code, preview })
    } catch (e) {
      setCodeError(e.message)
    }
  }

  // Una visita di gruppo può comparire tra le "Adottate" per il suo stesso
  // autore (auto-adottata alla creazione, vedi backend/controllers/visit.js
  // create): va aperta con lo stesso popup/le stesse azioni del flusso da
  // codice, non con l'attiva/disattiva delle visite singole.
  function openGroupVisit(visit) {
    setCodePreview(toGroupPreview(visit))
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

  // Se è stato scelto un museo nella schermata precedente, si mostrano solo
  // le visite (adottate/preferite) che lo includono tra le proprie tappe.
  const visibleVisits = useMemo(() => {
    if (!museumId) return visits
    return visits.filter((visit) => (visit.museum || []).some((m) => String(m._id) === String(museumId)))
  }, [visits, museumId])
  const visibleFavoriteVisits = useMemo(() => {
    if (!museumId) return favoriteVisits
    return favoriteVisits.filter((visit) => (visit.museum || []).some((m) => String(m._id) === String(museumId)))
  }, [favoriteVisits, museumId])

  return (
    <div className="flex flex-col gap-8 p-4 pt-6">
      <div className="text-center">
        {museumId && (
          <Link
            to="/"
            className="mb-2 inline-flex items-center gap-1 text-sm text-accent underline-offset-4 hover:underline"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Cambia museo
          </Link>
        )}
        <h1 className="font-serif text-3xl font-semibold text-text">
          {museumName || 'Benvenuto'}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Inserisci un codice visita, oppure scegli una delle tue visite qui sotto.
        </p>
      </div>

      {groupSessionEnded && (
        <div className="glass-panel flex items-center justify-between gap-3 rounded-2xl p-3 text-sm text-text">
          <span>Il professore ha terminato la visita di gruppo.</span>
          <button
            type="button"
            onClick={() => setGroupSessionEnded(false)}
            aria-label="Chiudi"
            className="shrink-0 text-text-muted hover:text-text"
          >
            ×
          </button>
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

      {loading && <p className="text-sm text-text-muted">Caricamento visite...</p>}
      {error && <p className="text-sm text-[color:var(--color-error)]">{error}</p>}

      <div className="flex flex-col gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Filtro visite">
          <button
            type="button"
            role="tab"
            aria-selected={visitsTab === 'adopted'}
            onClick={() => setVisitsTab('adopted')}
            className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
              visitsTab === 'adopted'
                ? 'bg-gradient-to-br from-accent to-accent-hover text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30'
                : 'glass-pill text-text-muted'
            }`}
          >
            Adottate
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={visitsTab === 'favorites'}
            onClick={() => setVisitsTab('favorites')}
            className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
              visitsTab === 'favorites'
                ? 'bg-gradient-to-br from-accent to-accent-hover text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30'
                : 'glass-pill text-text-muted'
            }`}
          >
            Preferiti
          </button>
        </div>

        {visitsTab === 'adopted' ? (
          <>
            {!loading && !error && visibleVisits.length === 0 && (
              <p className="text-sm text-text-muted">Non hai ancora nessuna visita adottata.</p>
            )}

            {!loading && !error && visibleVisits.length > 0 && (
              <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
                {visibleVisits.map((visit) => {
                  const isActive = activeVisit?._id === visit._id
                  return (
                    <VisitRow
                      key={visit._id}
                      visit={visit}
                      isActive={isActive}
                      onClick={() => (visit.is_group ? openGroupVisit(visit) : setDetailVisit(visit))}
                      badge={
                        isActive && (
                          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-medium text-on-accent">
                            Attiva
                          </span>
                        )
                      }
                    />
                  )
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            {!loading && !error && visibleFavoriteVisits.length === 0 && (
              <p className="text-sm text-text-muted">Non hai ancora nessuna visita tra i preferiti.</p>
            )}

            {!loading && !error && visibleFavoriteVisits.length > 0 && (
              <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
                {visibleFavoriteVisits.map((visit) => {
                  const isActive = activeVisit?._id === visit._id
                  const isAdopted = (user?.adopted_visits || []).some((id) => String(id) === String(visit._id))
                  return (
                    <VisitRow
                      key={visit._id}
                      visit={visit}
                      isActive={isActive}
                      onClick={() => (isAdopted ? setDetailVisit(visit) : setAdoptVisit(visit))}
                      badge={
                        isActive ? (
                          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-medium text-on-accent">
                            Attiva
                          </span>
                        ) : (
                          !isAdopted && (
                            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.65rem] font-medium text-text-muted">
                              Da adottare
                            </span>
                          )
                        )
                      }
                    />
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <a
        href={MARKETPLACE_VISITS_URL}
        className="text-center text-sm text-accent underline-offset-4 hover:underline"
      >
        Vuoi altre visite? Vai al marketplace
      </a>

      {adoptVisit && (
        <VisitAdoptModal
          visit={adoptVisit}
          onClose={() => setAdoptVisit(null)}
          onAdopted={async () => {
            const visit = adoptVisit
            setAdoptVisit(null)
            await refresh()
            setDetailVisit(visit)
          }}
        />
      )}

      {detailVisit && (
        <VisitDetailModal
          visit={detailVisit}
          isActive={activeVisit?._id === detailVisit._id}
          onClose={() => setDetailVisit(null)}
          onActivate={() => {
            // Attivare qui una visita singola diversa mentre si è in una
            // sessione di gruppo (host o student) lascerebbe quella sessione
            // "appesa" (socket ancora connesso, stato ancora popolato) — si
            // esce prima esplicitamente. Per il professore questo termina
            // anche la visita di gruppo per tutti (vedi leaveSession).
            if (groupRole) leaveGroupSession()
            activateVisit(detailVisit)
            setDetailVisit(null)
            navigate('/opera')
          }}
          onDeactivate={() => {
            if (groupRole) leaveGroupSession()
            else clearActiveVisit()
            setDetailVisit(null)
          }}
        />
      )}

      {codePreview && <VisitDetailModal groupVisit={codePreview} onClose={() => setCodePreview(null)} />}
    </div>
  )
}

export default SelectVisit
