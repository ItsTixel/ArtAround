import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress } from '../context/VisitProgressContext'
import { useGroupSession } from '../context/GroupSessionContext'
import { PreviousIcon, NextIcon, PlayIcon, PauseIcon, MicrophoneIcon, InfoIcon } from './icons'
import MicListeningIndicator from './MicListeningIndicator'
import CommandsHelpModal from './CommandsHelpModal'

function formatTime(sec) {
  const total = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Le due label toggle (Auto Mic/Auto Play) vivono nella stessa barra di
// vetro degli altri controlli, senza una capsula propria attorno: solo il
// colore del testo segnala lo stato, per restare un unico pannello — non
// una finestra annidata dentro un'altra.
function toggleLabelClasses(active) {
  return `text-[11px] font-bold uppercase tracking-wide leading-tight transition-colors disabled:opacity-30 ${
    active ? 'text-accent' : 'text-text-muted'
  }`
}

// Icona nuda per Precedente/Prossimo/Microfono: nessun bordo/sfondo
// proprio, solo il colore cambia con lo stato. Precedente/Prossimo vogliono
// un target di tocco pieno (h-10 w-10); il microfono sta in linea con la
// label di testo accanto e resta alla dimensione naturale dell'icona.
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
  const [helpOpen, setHelpOpen] = useState(false)

  if (!activeVisit) return null

  const seekValue = seekPreview ?? progress

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 glass-surface border-t border-slate-400/20 backdrop-blur-xl transition-colors duration-300">
      <MicListeningIndicator />
      <div className="mx-auto max-w-md px-5 pt-3">
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
      <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Precedente"
            onClick={handlePreviousStep}
            disabled={previousStepDisabled}
            className={iconButtonClasses(false)}
          >
            <PreviousIcon className="h-5 w-5" />
          </button>
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
          </div>
        </div>

        <button
          type="button"
          aria-label={playbackState === 'playing' ? 'Pausa' : 'Play'}
          onClick={handlePlayPause}
          disabled={!activeText}
          className="glass-orb flex h-14 w-14 items-center justify-center justify-self-center rounded-full text-accent disabled:opacity-40"
        >
          {playbackState === 'playing' ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6 translate-x-0.5" />}
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
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
            <button
              type="button"
              aria-label="Frasi e comandi vocali disponibili"
              aria-haspopup="dialog"
              onClick={() => setHelpOpen(true)}
              className={iconButtonClasses(false, { inline: true })}
            >
              <InfoIcon className="h-5 w-5" />
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

      {/* Portale su body: la PlayerBar ha backdrop-filter, che crea un
          containing block anche per i figli `fixed` — senza portale il
          modale resterebbe ritagliato dentro la barra invece di coprire
          lo schermo. */}
      {helpOpen &&
        createPortal(<CommandsHelpModal onClose={() => setHelpOpen(false)} />, document.body)}
    </div>
  )
}

export default PlayerBar
