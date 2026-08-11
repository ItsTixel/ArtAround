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
} from '../components/icons'

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
  return `rounded-full border px-4 py-1.5 text-sm font-medium ${
    active ? activeClasses : 'border-border bg-surface text-text-muted'
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
      {entity.image_url ? (
        <img
          src={entity.image_url}
          alt={entity.alt_text || entity.name}
          className="mx-6 mt-4 h-64 w-[calc(100%-3rem)] rounded-xl border border-border object-cover"
        />
      ) : (
        <div className="mx-6 mt-4 flex h-64 w-[calc(100%-3rem)] items-center justify-center rounded-xl border border-border bg-border text-sm text-text-muted">
          Nessuna immagine disponibile
        </div>
      )}

      <div className="flex flex-col gap-1 px-6">
        <h1 className="font-serif text-2xl font-semibold text-text">{entity.name}</h1>
        {entity.artwork_author && (
          <p className="text-sm text-text-muted">{entity.artwork_author}</p>
        )}
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

      <div className="mx-6 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm leading-relaxed text-text">
          {currentDescription?.text || 'Nessuna descrizione disponibile.'}
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-surface">
        <div className="mx-auto max-w-md px-8 pt-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={seekPreview ?? progress}
            disabled={!currentDescription?.text}
            onInput={(e) => setSeekPreview(Number(e.target.value))}
            onChange={(e) => {
              handleSeek(Number(e.target.value))
              setSeekPreview(null)
            }}
            aria-label="Posizione lettura"
            className="w-full accent-accent disabled:opacity-30"
          />
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{formatTime((seekPreview ?? progress) * (currentDescription?.duration_sec || 0))}</span>
            <span>{formatTime(currentDescription?.duration_sec || 0)}</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-md items-center justify-between px-8 py-3">
          <button
            type="button"
            aria-label="Precedente"
            onClick={goToPreviousStep}
            disabled={!canGoPreviousStep}
            className={`text-text-muted ${!canGoPreviousStep ? 'opacity-30' : ''}`}
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
            className={`text-text-muted ${!autoplayEnabled ? 'opacity-30' : ''}`}
          >
            <AutoplayIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={playbackState === 'playing' ? 'Pausa' : 'Play'}
            onClick={handlePlayPause}
            disabled={!currentDescription?.text}
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
            className="text-text-muted"
          >
            <MicrophoneIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Prossimo"
            onClick={goToNextStep}
            disabled={!canGoNextStep}
            className={`text-text-muted ${!canGoNextStep ? 'opacity-30' : ''}`}
          >
            <NextIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Opera
