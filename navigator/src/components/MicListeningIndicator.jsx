import { useVisitProgress } from '../context/VisitProgressContext'
import { MicrophoneIcon } from './icons'

// Piccolo popup "in ascolto" ancorato sopra la PlayerBar mentre il
// riconoscimento vocale è attivo: conferma che il microfono sta
// registrando e mostra in diretta cosa sta sentendo (interim/final
// transcript), così l'utente sa se deve ripetere o parlare più chiaro.
// Sempre montato (non condizionato da micListening) per poter animare
// entrata/uscita via transizione CSS invece di un mount/unmount secco.
function MicListeningIndicator() {
  const { micListening, micTranscript } = useVisitProgress()

  return (
    <div
      aria-hidden={!micListening}
      className={`absolute inset-x-0 bottom-full z-10 flex justify-center px-4 pb-3 transition-all duration-300 ${
        micListening ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <div className="flex max-w-xs items-center gap-3 rounded-full border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl px-4 py-2.5 shadow-2xl shadow-black/10 dark:shadow-black/30">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <span className="absolute h-full w-full animate-ping rounded-full bg-accent opacity-40" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-on-accent">
            <MicrophoneIcon className="h-4 w-4" />
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent">In ascolto…</p>
          <p className="truncate text-sm text-text">{micTranscript || 'Dimmi pure...'}</p>
        </div>
      </div>
    </div>
  )
}

export default MicListeningIndicator
