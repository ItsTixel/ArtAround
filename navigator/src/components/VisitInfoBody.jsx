export function formatDuration(sec) {
  if (!sec) return null
  const minutes = Math.round(sec / 60)
  return `${minutes} min`
}

export function formatPrice(price) {
  if (!price) return 'Gratis'
  return `${price.toFixed(2)} €`
}

// Corpo informativo di una visita (titolo, meta, descrizione, opere incluse)
// condiviso da VisitDetailModal (visita già posseduta) e VisitAdoptModal
// (visita da adottare) — cambia solo il footer con le azioni disponibili.
function VisitInfoBody({ visit, onClose }) {
  const museumNames = (visit.museum || []).map((m) => m.name).join(', ')
  const steps = [...(visit.steps || [])].sort((a, b) => a.order - b.order)

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {museumNames && (
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">{museumNames}</p>
          )}
          <h2 className="font-serif text-xl font-semibold text-text">{visit.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-400/20 text-text-muted hover:bg-slate-400/10"
        >
          ×
        </button>
      </div>

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
        <div className="mb-5 flex flex-wrap gap-2">
          {visit.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <h3 className="mb-3 font-serif text-sm font-semibold text-text">Opere incluse</h3>
      <ul className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const entity = step.entity || {}
          return (
            <li key={step._id || index} className="flex items-start gap-3">
              <span className="mt-0.5 font-mono text-xs text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-bg">
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
                {entity.artwork_author && (
                  <p className="truncate text-xs text-text-muted">{entity.artwork_author}</p>
                )}
              </div>
            </li>
          )
        })}
        {steps.length === 0 && (
          <li className="text-sm text-text-muted">Nessuna opera disponibile.</li>
        )}
      </ul>
    </>
  )
}

export default VisitInfoBody
