import { useRef } from 'react'
import {
  useVisitProgress,
  VOICE_COMMANDS,
  STANDARD_SERVICE_KEYS,
  insightCandidateTags,
} from '../context/VisitProgressContext'
import useEscapeKey from '../hooks/useEscapeKey'
import useFocusTrap from '../hooks/useFocusTrap'
import useVerifiedInsightTags from '../hooks/useVerifiedInsightTags'
import {
  PreviousIcon,
  NextIcon,
  LessDetailsIcon,
  MoreDetailsIcon,
  SimplerIcon,
  ComplexIcon,
  MapIcon,
  ToiletIcon,
  ExitIcon,
  SignpostIcon,
  BookshopIcon,
} from './icons'

const COMMAND_ICONS = {
  previousStep: PreviousIcon,
  nextStep: NextIcon,
  lessDetails: LessDetailsIcon,
  moreDetails: MoreDetailsIcon,
  simplerTone: SimplerIcon,
  complexTone: ComplexIcon,
  goToMap: MapIcon,
  toilette: ToiletIcon,
  uscita: ExitIcon,
}

// Frasi d'esempio per introdurre un approfondimento: l'argomento va detto
// subito dopo ("approfondisci Rinascimento"). Sottoinsieme leggibile dei
// trigger riconosciuti in VisitProgressContext (INSIGHT_TRIGGER_PATTERNS).
const INSIGHT_EXAMPLE_PHRASES = ['approfondisci', 'parlami di', 'spiegami']

function PhraseChips({ phrases }) {
  if (!phrases?.length) return null
  return (
    <span className="mt-1 flex flex-wrap gap-1.5">
      {phrases.map((phrase) => (
        <span
          key={phrase}
          className="rounded-full border border-slate-400/20 bg-slate-400/10 px-2 py-0.5 text-xs text-text-muted"
        >
          «{phrase}»
        </span>
      ))}
    </span>
  )
}

function CommandRow({ Icon, label, phrases }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-400/10 text-text-muted">
        {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">{label}</p>
        <PhraseChips phrases={phrases} />
      </div>
    </li>
  )
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
      <ul className="flex flex-col gap-4">{children}</ul>
    </section>
  )
}

// Popup di aiuto aperto dal pulsante info nella PlayerBar: elenca, diviso
// per sezioni, i comandi disponibili e le frasi che li attivano al
// microfono. La sezione servizi mostra solo quelli del museo dell'opera in
// ascolto (museum viene dallo step corrente, quindi per le visite
// inframuseali è già quello giusto), gli approfondimenti solo i tag di
// quest'opera con contenuti verificati — stessa logica dei pulsanti in
// Comandi.jsx.
function CommandsHelpModal({ onClose }) {
  const { museum, entity, items } = useVisitProgress()
  const verifiedInsightTags = useVerifiedInsightTags(insightCandidateTags(entity, items))
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)
  useEscapeKey(onClose)

  const operaCommands = VOICE_COMMANDS.filter((cmd) => cmd.section === 'opera')
  const serviceCommands = VOICE_COMMANDS.filter((cmd) => cmd.section === 'servizi')
  const extraServices = Object.keys(museum?.services || {}).filter(
    (key) => !STANDARD_SERVICE_KEYS.includes(key)
  )

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Comandi vocali disponibili"
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-400/15 p-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg font-semibold text-text">Comandi vocali</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Tocca il microfono nella barra e pronuncia una di queste frasi. Gli stessi comandi
              sono disponibili come pulsanti nella pagina Comandi.
            </p>
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

        <div className="flex flex-col gap-6 overflow-y-auto p-5">
          <Section title="Comandi opera">
            {operaCommands.map((cmd) => (
              <CommandRow
                key={cmd.key}
                Icon={COMMAND_ICONS[cmd.key]}
                label={cmd.label}
                phrases={cmd.phrases}
              />
            ))}
          </Section>

          <Section title="Posizioni e servizi">
            {serviceCommands.map((cmd) => (
              <CommandRow
                key={cmd.key}
                Icon={COMMAND_ICONS[cmd.key]}
                label={cmd.label}
                phrases={cmd.phrases}
              />
            ))}
            {extraServices.map((label) => (
              <CommandRow key={label} Icon={SignpostIcon} label={label} phrases={[label.toLowerCase()]} />
            ))}
          </Section>

          {verifiedInsightTags.length > 0 && (
            <Section title="Approfondimenti">
              <CommandRow
                Icon={BookshopIcon}
                label="Chiedi un approfondimento su un argomento"
                phrases={INSIGHT_EXAMPLE_PHRASES.map((phrase) => `${phrase} …`)}
              />
              <li className="flex flex-col gap-2">
                <p className="text-xs text-text-muted">Argomenti di quest'opera:</p>
                <span className="flex flex-wrap gap-1.5">
                  {verifiedInsightTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-1 text-xs font-medium text-text"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              </li>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommandsHelpModal
