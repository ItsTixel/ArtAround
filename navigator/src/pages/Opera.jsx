import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress, TONE_LABELS } from '../context/VisitProgressContext'
import NoActiveVisit from '../components/NoActiveVisit'
import {
  PreviousIcon,
  NextIcon,
  PlayIcon,
  PauseIcon,
  MicrophoneIcon,
  AutoplayIcon,
  SignpostIcon,
  MuseumIcon,
  FloorIcon,
  RoomIcon,
} from '../components/icons'

const DIRECTIONS_ICONS = {
  museum: MuseumIcon,
  floor: FloorIcon,
  room: RoomIcon,
}

function formatDurationLabel(sec) {
  if (sec < 60) return `${sec} sec`
  return `${Math.round(sec / 60)} min`
}

function formatTime(sec) {
  const total = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function pillClasses(active, activeClasses) {
  return `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? `${activeClasses} shadow-sm` : 'border-border bg-surface text-text-muted'
  }`
}

function Opera() {
  const { activeVisit } = useActiveVisit()
  const {
    step,
    entity,
    canGoPreviousStep,
    canGoNextStep,
    goToPreviousStep,
    goToNextStep,
    availableTones,
    activeTone,
    handleToneSelect,
    sortedDescriptions,
    activeDescIndex,
    currentDescription,
    handleDescSelect,
    playbackState,
    progress,
    seekPreview,
    setSeekPreview,
    handleSeek,
    handlePlayPause,
    autoplayEnabled,
    toggleAutoplay,
    directionsParts,
    closeDirections,
    activeText,
    activeDurationSec,
  } = useVisitProgress()

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
    <div className="flex flex-col gap-5 pb-32">
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

          <div className="mx-6 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
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

          <p className="px-6 text-center text-xs text-text-muted">
            Premi «Prossimo» quando sei arrivato, per vedere l'opera
          </p>
        </>
      ) : (
        <>
          <div className="relative mx-6 mt-4 h-72 w-[calc(100%-3rem)] overflow-hidden rounded-2xl border border-border shadow-lg">
            {entity.image_url ? (
              <img
                src={entity.image_url}
                alt={entity.alt_text || entity.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-border text-sm text-text-muted">
                Nessuna immagine disponibile
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-5 pb-4 pt-12">
              <h1 className="font-serif text-2xl font-semibold text-text">{entity.name}</h1>
              {entity.artwork_author && (
                <p className="text-sm text-text-muted">{entity.artwork_author}</p>
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

          <div className="relative mx-6 overflow-hidden rounded-lg border border-border bg-surface p-5 pl-6">
            <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent to-accent-hover" />
            <p className="text-sm leading-relaxed text-text">
              {currentDescription?.text || 'Nessuna descrizione disponibile.'}
            </p>
          </div>
        </>
      )}

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-surface">
        <div className="mx-auto max-w-md px-8 pt-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={seekPreview ?? progress}
            disabled={!activeText}
            onInput={(e) => setSeekPreview(Number(e.target.value))}
            onChange={(e) => {
              handleSeek(Number(e.target.value))
              setSeekPreview(null)
            }}
            aria-label="Posizione lettura"
            className="w-full accent-accent disabled:opacity-30"
          />
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{formatTime((seekPreview ?? progress) * (activeDurationSec || 0))}</span>
            <span>{formatTime(activeDurationSec || 0)}</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-md items-center justify-between px-8 py-3">
          <button
            type="button"
            aria-label="Precedente"
            onClick={directionsParts ? closeDirections : goToPreviousStep}
            disabled={!directionsParts && !canGoPreviousStep}
            className={`text-text-muted transition-opacity ${
              !directionsParts && !canGoPreviousStep ? 'opacity-30' : ''
            }`}
          >
            <PreviousIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label={
              autoplayEnabled ? 'Disattiva lettura automatica' : 'Attiva lettura automatica'
            }
            aria-pressed={autoplayEnabled}
            onClick={toggleAutoplay}
            className={`text-text-muted transition-opacity ${!autoplayEnabled ? 'opacity-30' : ''}`}
          >
            <AutoplayIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={playbackState === 'playing' ? 'Pausa' : 'Play'}
            onClick={handlePlayPause}
            disabled={!activeText}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-on-accent shadow-[0_0_20px_rgba(212,168,83,0.35)] disabled:opacity-40"
          >
            {playbackState === 'playing' ? (
              <PauseIcon className="h-6 w-6" />
            ) : (
              <PlayIcon className="h-6 w-6" />
            )}
          </button>
          <button
            type="button"
            aria-label="Microfono"
            onClick={() => console.log('Microfono')}
            className="text-text-muted transition-opacity"
          >
            <MicrophoneIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Prossimo"
            onClick={directionsParts ? closeDirections : goToNextStep}
            disabled={!directionsParts && !canGoNextStep}
            className={`text-text-muted transition-opacity ${
              !directionsParts && !canGoNextStep ? 'opacity-30' : ''
            }`}
          >
            <NextIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Opera
