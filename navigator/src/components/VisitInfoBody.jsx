import { TONE_ORDER, TONE_LABELS } from '../context/VisitProgressContext'

// Stessa formattazione di marketplace/components/visit-card.js e
// visit-modal.js, per coerenza tra le due app.
export function formatDuration(sec) {
  if (!sec) return null
  const minutes = Math.round(sec / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}min` : `${hours}h`
}

export function formatPrice(price) {
  if (!price) return 'Gratis'
  return `€ ${price.toFixed(2).replace('.', ',')}`
}

// Corpo informativo di una visita (banner, meta, descrizione, temi,
// linguaggio, opere incluse) condiviso da VisitDetailModal (visita già
// posseduta) e VisitAdoptModal (visita da adottare) — cambia solo il footer
// con le azioni disponibili. Rispecchia marketplace/components/visit-modal.js.
function VisitInfoBody({ visit }) {
  const museums = visit.museum || []
  const isInfra = museums.length > 1
  const museumLine = museums.map((m) => m.name).join(' + ')
  const steps = [...(visit.steps || [])].sort((a, b) => a.order - b.order)

  const availableTones = TONE_ORDER.filter((tone) =>
    steps.some((step) => (step.items || []).some((item) => item.tone === tone))
  )

  const bannerImage = visit.image_url || steps.find((s) => s.entity?.image_url)?.entity?.image_url

  return (
    <>
      <div className="relative flex h-[170px] shrink-0 items-center justify-center overflow-hidden border-b border-border bg-slate-400/10">
        {bannerImage ? (
          <img src={bannerImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="img-placeholder absolute inset-0" />
        )}
        {isInfra && (
          <span className="absolute left-3 top-3 z-[2] rounded-full px-2.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-400/20 shadow-2xl text-slate-800 dark:text-slate-100">
            Inframuseale
          </span>
        )}
        <span className="relative z-[1] max-w-[80%] truncate rounded-full px-3 py-1.5 text-center font-mono text-[0.68rem] uppercase tracking-[0.14em] bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-400/20 shadow-2xl text-slate-800 dark:text-slate-100">
          {visit.title}
        </span>
      </div>

      <div className="px-6 pb-2 pt-5">
        {museumLine && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">{museumLine}</p>
        )}
        <h2 className="mb-3.5 font-serif text-xl font-semibold text-text">{visit.title}</h2>
        {(visit.author?.display_name || visit.author?.username) && (
          <p className="mb-4 text-xs text-text-muted">A cura di {visit.author.display_name || visit.author.username}</p>
        )}

        <div className="mb-4 flex items-center gap-3 border-b border-border pb-4 text-xs text-text-muted">
          {formatDuration(visit.estimated_duration_sec) && (
            <span>
              <strong className="text-text">{formatDuration(visit.estimated_duration_sec)}</strong> durata
            </span>
          )}
          <span>
            <strong className="text-text">{steps.length}</strong> tapp{steps.length === 1 ? 'a' : 'e'}
          </span>
          <span>
            <strong className="text-text">{formatPrice(visit.base_price)}</strong>
          </span>
        </div>

        {visit.description && (
          <p className="mb-4 text-sm leading-relaxed text-text-muted">{visit.description}</p>
        )}

        {visit.tags?.length > 0 && (
          <div className="mb-5">
            <h4 className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-text-muted">Temi</h4>
            <div className="flex flex-wrap gap-2">
              {visit.tags.map((tag) => (
                <span
                  key={tag}
                  className="glass-chip rounded-full border border-slate-400/20 backdrop-blur-lg px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {availableTones.length > 0 && (
          <div className="mb-5">
            <h4 className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Linguaggio
            </h4>
            <div className="flex flex-wrap gap-2">
              {availableTones.map((tone) => (
                <span
                  key={tone}
                  className="glass-chip rounded-full border border-slate-400/20 backdrop-blur-lg px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-text-muted"
                >
                  {TONE_LABELS[tone]}
                </span>
              ))}
            </div>
          </div>
        )}

        <h3 className="mb-3 font-serif text-sm font-semibold text-text">Opere incluse</h3>
        <ul className="flex flex-col gap-4">
          {steps.map((step, index) => {
            const entity = step.entity || {}
            const description = step.intro_note || entity.description
            return (
              <li key={step._id || index} className="flex items-start gap-3.5">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-bg">
                  {entity.image_url && (
                    <img
                      src={entity.image_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{entity.name}</p>
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    {entity.artwork_author && (
                      <span className="truncate text-xs text-text-muted">{entity.artwork_author}</span>
                    )}
                    {isInfra && step.museum?.name && (
                      <span className="shrink-0 text-[0.62rem] uppercase tracking-[0.1em] text-accent">
                        {step.museum.name}
                      </span>
                    )}
                  </div>
                  {description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-text-muted">{description}</p>
                  )}
                </div>
              </li>
            )
          })}
          {steps.length === 0 && (
            <li className="text-sm text-text-muted">Nessuna opera disponibile.</li>
          )}
        </ul>
      </div>
    </>
  )
}

export default VisitInfoBody
