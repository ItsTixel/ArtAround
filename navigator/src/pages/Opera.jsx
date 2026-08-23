import { useRef, useState } from 'react'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress, TONE_LABELS } from '../context/VisitProgressContext'
import { useGroupSession } from '../context/GroupSessionContext'
import NoActiveVisit from '../components/NoActiveVisit'
import { SignpostIcon, MuseumIcon, FloorIcon, RoomIcon } from '../components/icons'
import useDocumentTitle from '../hooks/useDocumentTitle'
import useEscapeKey from '../hooks/useEscapeKey'
import useFocusTrap from '../hooks/useFocusTrap'

const DIRECTIONS_ICONS = {
  museum: MuseumIcon,
  floor: FloorIcon,
  room: RoomIcon,
}

function formatDurationLabel(sec) {
  if (sec < 60) return `${sec} sec`
  return `${Math.round(sec / 60)} min`
}

function pillClasses(active, activeClasses) {
  return `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? `${activeClasses} shadow-sm` : 'glass-pill text-text-muted'
  }`
}

function Opera() {
  useDocumentTitle('Opera')
  const [imageOpen, setImageOpen] = useState(false)
  const lightboxRef = useRef(null)
  useFocusTrap(lightboxRef, imageOpen)
  useEscapeKey(() => setImageOpen(false))
  const { activeVisit } = useActiveVisit()
  const {
    step,
    entity,
    availableTones,
    activeTone,
    handleToneSelect,
    sortedDescriptions,
    activeDescIndex,
    currentDescription,
    handleDescSelect,
    directionsParts,
    entityLocation,
  } = useVisitProgress()
  const { role, status: groupStatus, isReady, setReady } = useGroupSession()

  if (!activeVisit) return <NoActiveVisit />

  if (!step || !entity) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <h1 className="font-serif text-2xl font-semibold text-text">Opera</h1>
        <p className="text-text-muted">Nessuna opera disponibile per questa visita.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {directionsParts ? (
        <>
          <div className="flex flex-col items-center gap-3 px-6 pt-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-gradient-to-br from-accent/15 to-transparent">
              <SignpostIcon className="h-9 w-9 text-accent" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-text">Indicazioni</h1>
              <p className="mt-1 text-sm text-text-muted">Per raggiungere la prossima opera</p>
            </div>
          </div>

          <div className="glass-panel mx-6 flex flex-col divide-y divide-border overflow-hidden rounded-2xl">
            {directionsParts.map((part) => {
              const Icon = DIRECTIONS_ICONS[part.key]
              return (
                <div key={part.key} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      {part.label}
                    </span>
                    <span className="text-base font-medium text-text">{part.value}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {entity.image_url && (
            <div className="relative mx-6 h-64 overflow-hidden rounded-2xl border border-border shadow-lg">
              <img
                src={entity.image_url}
                alt={entity.alt_text || entity.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-5 pb-4 pt-12">
                <span className="text-xs font-medium uppercase tracking-wide text-white/80">
                  Cerca questo
                </span>
                <h2 className="font-serif text-xl font-semibold text-white">{entity.name}</h2>
                {entity.artwork_author && (
                  <p className="text-sm text-white/75">{entity.artwork_author}</p>
                )}
              </div>
            </div>
          )}

          <p className="px-6 text-center text-xs text-text-muted">
            Premi «Prossimo» quando sei arrivato, per vedere l'opera
          </p>
        </>
      ) : (
        <>
          <div className="relative mx-6 mt-4 h-72 w-[calc(100%-3rem)] overflow-hidden rounded-2xl border border-border shadow-lg">
            {entity.image_url ? (
              <button
                type="button"
                onClick={() => setImageOpen(true)}
                aria-label="Ingrandisci immagine"
                className="block h-full w-full cursor-zoom-in"
              >
                <img
                  src={entity.image_url}
                  alt={entity.alt_text || entity.name}
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-border text-sm text-text-muted">
                Nessuna immagine disponibile
              </div>
            )}
            {entityLocation?.room && (
              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                <RoomIcon className="h-3.5 w-3.5" />
                {entityLocation.room}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-5 pb-4 pt-12">
              <h1 className="font-serif text-2xl font-semibold text-white">{entity.name}</h1>
              {entity.artwork_author && (
                <p className="text-sm text-white/75">{entity.artwork_author}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 px-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Durata
              </span>
              {sortedDescriptions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sortedDescriptions.map((desc, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDescSelect(index)}
                      className={pillClasses(index === activeDescIndex, 'border-info bg-info text-on-accent')}
                    >
                      {formatDurationLabel(desc.duration_sec)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Non disponibile</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Tono
              </span>
              {availableTones.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableTones.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => handleToneSelect(tone)}
                      className={pillClasses(tone === activeTone, 'border-accent bg-accent text-on-accent')}
                    >
                      {TONE_LABELS[tone]}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Non disponibile</p>
              )}
            </div>
          </div>

          <div className="glass-panel relative mx-6 overflow-hidden rounded-2xl p-5 pl-6">
            <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent to-accent-hover" />
            <p className="text-sm leading-relaxed text-text">
              {currentDescription?.text || 'Nessuna descrizione disponibile.'}
            </p>
          </div>
        </>
      )}

      {role === 'student' && groupStatus === 'active' && !directionsParts && (
        <div className="px-6">
          <button
            type="button"
            onClick={() => setReady(!isReady)}
            aria-pressed={isReady}
            className={`w-full rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
              isReady
                ? 'border-info bg-info text-on-accent'
                : 'border-border text-text'
            }`}
          >
            {isReady ? 'Pronto — in attesa del professore' : 'Segnala che sei pronto per la prossima opera'}
          </button>
        </div>
      )}

      {imageOpen && entity.image_url && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={entity.alt_text || entity.name}
          tabIndex={-1}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImageOpen(false)}
        >
          {entityLocation?.room && (
            <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <RoomIcon className="h-3.5 w-3.5" />
              {entityLocation.room}
            </span>
          )}
          <button
            type="button"
            onClick={() => setImageOpen(false)}
            aria-label="Chiudi"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-xl text-white"
          >
            ×
          </button>
          <img
            src={entity.image_url}
            alt={entity.alt_text || entity.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </div>
  )
}

export default Opera
