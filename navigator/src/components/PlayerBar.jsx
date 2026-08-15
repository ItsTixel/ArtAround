import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress } from '../context/VisitProgressContext'
import { useGroupSession } from '../context/GroupSessionContext'
import { PreviousIcon, NextIcon, PlayIcon, PauseIcon, MicrophoneIcon } from './icons'

function formatTime(sec) {
  const total = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function PlayerBar() {
  const { activeVisit } = useActiveVisit()
  const {
    canGoPreviousStep,
    canGoNextStep,
    goToPreviousStep,
    goToNextStep,
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
  const { role, status: groupStatus, currentStepIndex, setActiveStep } = useGroupSession()

  if (!activeVisit) return null

  // In una sessione di gruppo attiva lo studente non sceglie l'opera: è il
  // professore a decidere per tutta la stanza (visit:set_active_step).
  const isRestrictedStudent = role === 'student' && (groupStatus === 'active' || groupStatus === 'quiz')
  // Il professore ora ascolta la visita come chiunque altro, ma le sue
  // Precedente/Prossimo restano l'unica sorgente di verità per l'opera
  // attiva: invece di navigare solo la propria copia locale, cambiano
  // l'opera per tutta la stanza (stessa azione dello step-picker in Gruppo).
  const isHostControlling = role === 'host' && groupStatus === 'active'

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 border-t border-slate-400/20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl transition-colors duration-300">
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
          onClick={
            directionsParts
              ? closeDirections
              : isRestrictedStudent
                ? undefined
                : isHostControlling
                  ? () => setActiveStep(currentStepIndex - 1)
                  : goToPreviousStep
          }
          disabled={directionsParts ? false : (isRestrictedStudent || !canGoPreviousStep)}
          className={`flex h-10 w-10 items-center justify-center text-text-muted transition-opacity ${
            directionsParts ? '' : (isRestrictedStudent || !canGoPreviousStep) ? 'opacity-30' : ''
          }`}
        >
          <PreviousIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label={autoplayEnabled ? 'Disattiva lettura automatica' : 'Attiva lettura automatica'}
          aria-pressed={autoplayEnabled}
          onClick={toggleAutoplay}
          className="flex h-10 w-10 items-center justify-center"
        >
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              autoplayEnabled ? 'bg-accent text-on-accent' : 'text-text-muted'
            }`}
          >
            Auto
          </span>
        </button>
        <button
          type="button"
          aria-label={playbackState === 'playing' ? 'Pausa' : 'Play'}
          onClick={handlePlayPause}
          disabled={!activeText}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-on-accent shadow-lg shadow-black/20 disabled:opacity-40"
        >
          {playbackState === 'playing' ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
        </button>
        <button
          type="button"
          aria-label="Microfono"
          onClick={() => console.log('Microfono')}
          className="flex h-10 w-10 items-center justify-center text-text-muted transition-opacity"
        >
          <MicrophoneIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label="Prossimo"
          onClick={
            directionsParts
              ? closeDirections
              : isRestrictedStudent
                ? undefined
                : isHostControlling
                  ? () => setActiveStep(currentStepIndex + 1)
                  : goToNextStep
          }
          disabled={directionsParts ? false : (isRestrictedStudent || !canGoNextStep)}
          className={`flex h-10 w-10 items-center justify-center text-text-muted transition-opacity ${
            directionsParts ? '' : (isRestrictedStudent || !canGoNextStep) ? 'opacity-30' : ''
          }`}
        >
          <NextIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}

export default PlayerBar
