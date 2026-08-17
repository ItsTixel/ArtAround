import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress } from '../context/VisitProgressContext'
import { useGroupSession } from '../context/GroupSessionContext'
import { PreviousIcon, NextIcon, PlayIcon, PauseIcon, MicrophoneIcon } from './icons'
import MicListeningIndicator from './MicListeningIndicator'

function formatTime(sec) {
  const total = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Le due label toggle (Auto Play/Auto Mic) vivono già dentro la capsula di
// vetro che le racchiude, quindi restano testo nudo: solo il colore segnala
// lo stato, senza una seconda pillola dentro la prima.
function toggleLabelClasses(active) {
  return `text-[11px] font-bold uppercase tracking-wide transition-colors disabled:opacity-30 ${
    active ? 'text-accent' : 'text-text-muted'
  }`
}

// Icona nuda per Precedente/Prossimo/Microfono: nessun bordo/sfondo
// proprio, per non competere con la capsula di vetro che racchiude i
// controlli centrali — solo il colore cambia con lo stato. Precedente/
// Prossimo stanno fuori dalla capsula e vogliono un target di tocco pieno
// (h-10 w-10); il microfono sta dentro, in linea con la label di testo
// accanto, e quindi resta alla dimensione naturale dell'icona.
function iconButtonClasses(active, { inline = false } = {}) {
  return `flex shrink-0 items-center justify-center transition-colors disabled:opacity-30 ${
    inline ? '' : 'h-10 w-10'
  } ${active ? 'text-accent' : 'text-text-muted'}`
}

function PlayerBar() {
  const { activeVisit } = useActiveVisit()
  const {
    playbackState,
    progress,
    seekPreview,
    setSeekPreview,
    handleSeek,
    handlePlayPause,
    autoplayEnabled,
    toggleAutoplay,
    activeText,
    activeDurationSec,
    micListening,
    micAutoEnabled,
    micSupported,
    handleMicToggle,
    toggleMicAuto,
  } = useVisitProgress()
  // Precedente/Prossimo come funzione: la stessa che usa Comandi.jsx e la
  // stessa che risolvono i comandi vocali — un solo posto decide cosa fanno
  // e quando sono permessi, non una copia per canale di input.
  const { handlePreviousStep, handleNextStep, previousStepDisabled, nextStepDisabled } = useGroupSession()

  if (!activeVisit) return null

  const seekValue = seekPreview ?? progress

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+0.625rem)] z-40 px-3 transition-colors duration-300">
      <MicListeningIndicator />
      <div className="glass-surface mx-auto max-w-md rounded-3xl border border-slate-400/20 backdrop-blur-xl">
        <div className="px-5 pt-4">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={seekValue}
            disabled={!activeText}
            onInput={(e) => setSeekPreview(Number(e.target.value))}
            onChange={(e) => {
              handleSeek(Number(e.target.value))
              setSeekPreview(null)
            }}
            aria-label="Posizione lettura"
            style={{ '--seek-percent': `${seekValue * 100}%` }}
            className="player-seek w-full disabled:opacity-30"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-text-muted">
            <span>{formatTime(seekValue * (activeDurationSec || 0))}</span>
            <span>{formatTime(activeDurationSec || 0)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 pb-4 pt-3">
          <button
            type="button"
            aria-label="Precedente"
            onClick={handlePreviousStep}
            disabled={previousStepDisabled}
            className={iconButtonClasses(false)}
          >
            <PreviousIcon className="h-5 w-5" />
          </button>

          {/* Capsula di vetro che racchiude i comandi centrali: bordo +
              sfondo semi-trasparente con blur proprio (oltre a quello della
              card esterna) così il vetro si legge anche sovrapposto allo
              sfondo scuro/chiaro della card, non solo sulla pagina. Il play
              è assoluto e centrato per poter "sfondare" il bordo alto della
              capsula, sporgendo verso l'esterno come nel riferimento. */}
          <div className="glass-capsule relative flex min-h-[3.25rem] flex-1 items-center justify-between rounded-full px-5">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                aria-label={micListening ? 'Interrompi ascolto' : 'Attiva microfono'}
                aria-pressed={micListening}
                onClick={handleMicToggle}
                disabled={!micSupported}
                title={micSupported ? undefined : 'Riconoscimento vocale non supportato in questo browser.'}
                className={iconButtonClasses(micListening, { inline: true })}
              >
                <MicrophoneIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={autoplayEnabled ? 'Disattiva lettura automatica' : 'Attiva lettura automatica'}
                aria-pressed={autoplayEnabled}
                onClick={toggleAutoplay}
                className={toggleLabelClasses(autoplayEnabled)}
              >
                Auto
                <br />
                Play
              </button>
            </div>

            <button
              type="button"
              aria-label={
                micAutoEnabled ? 'Disattiva attivazione automatica microfono' : 'Attiva attivazione automatica microfono'
              }
              aria-pressed={micAutoEnabled}
              onClick={toggleMicAuto}
              disabled={!micSupported}
              className={toggleLabelClasses(micAutoEnabled && micSupported)}
            >
              Auto
              <br />
              Mic
            </button>

            <button
              type="button"
              aria-label={playbackState === 'playing' ? 'Pausa' : 'Play'}
              onClick={handlePlayPause}
              disabled={!activeText}
              className="group absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center disabled:opacity-40"
            >
              <span className="absolute inset-0 rounded-full bg-info/50 blur-xl transition-opacity group-disabled:opacity-0" />
              <span className="play-orb relative flex h-16 w-16 items-center justify-center rounded-full text-slate-700 dark:text-slate-100">
                {playbackState === 'playing' ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6 translate-x-0.5" />}
              </span>
            </button>
          </div>

          <button
            type="button"
            aria-label="Prossimo"
            onClick={handleNextStep}
            disabled={nextStepDisabled}
            className={iconButtonClasses(false)}
          >
            <NextIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlayerBar
