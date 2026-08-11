import { useState } from 'react'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress, TONE_LABELS } from '../context/VisitProgressContext'
import NoActiveVisit from '../components/NoActiveVisit'
import {
  PreviousIcon,
  NextIcon,
  MoreDetailsIcon,
  LessDetailsIcon,
  SimplerIcon,
  ComplexIcon,
  ToiletIcon,
  ExitIcon,
} from '../components/icons'

function CommandButton({ label, Icon, onClick, disabled, colorClasses }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl px-3 py-6 text-center text-base font-semibold shadow-md transition active:scale-[0.97] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none disabled:active:scale-100 ${colorClasses}`}
    >
      <Icon className="h-9 w-9" aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

function Comandi() {
  const { activeVisit } = useActiveVisit()
  const {
    entity,
    canGoPreviousStep,
    canGoNextStep,
    goToPreviousStep,
    goToNextStep,
    activeTone,
    canGoSimplerTone,
    canGoComplexTone,
    goToSimplerTone,
    goToComplexTone,
    sortedDescriptions,
    activeDescIndex,
    canGoPreviousParagraph,
    canGoNextParagraph,
    goToPreviousParagraph,
    goToNextParagraph,
  } = useVisitProgress()
  const [serviceMessage, setServiceMessage] = useState(null)

  if (!activeVisit) return <NoActiveVisit />

  function handleServicePlaceholder(label) {
    setServiceMessage(`"${label}" non ancora disponibile per questo museo.`)
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-10">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-text">Comandi</h1>
        <p aria-live="polite" className="text-sm text-text-muted">
          {entity
            ? `${entity.name} · ${TONE_LABELS[activeTone] || '—'} · paragrafo ${
                sortedDescriptions.length ? activeDescIndex + 1 : 0
              }/${sortedDescriptions.length}`
            : 'Nessuna opera attiva.'}
        </p>
      </div>

      <section aria-labelledby="comandi-nav-heading" className="flex flex-col gap-3">
        <h2 id="comandi-nav-heading" className="sr-only">
          Comandi di navigazione
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <CommandButton
            label="Precedente"
            Icon={PreviousIcon}
            onClick={goToPreviousStep}
            disabled={!canGoPreviousStep}
            colorClasses="bg-sky-600 text-white"
          />
          <CommandButton
            label="Prossimo"
            Icon={NextIcon}
            onClick={goToNextStep}
            disabled={!canGoNextStep}
            colorClasses="bg-sky-600 text-white"
          />
          <CommandButton
            label="Meno dettagli"
            Icon={LessDetailsIcon}
            onClick={goToPreviousParagraph}
            disabled={!canGoPreviousParagraph}
            colorClasses="bg-emerald-700 text-white"
          />
          <CommandButton
            label="Dimmi di più"
            Icon={MoreDetailsIcon}
            onClick={goToNextParagraph}
            disabled={!canGoNextParagraph}
            colorClasses="bg-emerald-600 text-white"
          />
          <CommandButton
            label="Più semplice"
            Icon={SimplerIcon}
            onClick={goToSimplerTone}
            disabled={!canGoSimplerTone}
            colorClasses="bg-amber-500 text-black"
          />
          <CommandButton
            label="Più complesso"
            Icon={ComplexIcon}
            onClick={goToComplexTone}
            disabled={!canGoComplexTone}
            colorClasses="bg-rose-600 text-white"
          />
        </div>
      </section>

      <section aria-labelledby="comandi-servizi-heading" className="flex flex-col gap-3">
        <h2
          id="comandi-servizi-heading"
          className="text-xs font-medium uppercase tracking-wide text-text-muted"
        >
          Posizioni e Servizi
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <CommandButton
            label="Toilette"
            Icon={ToiletIcon}
            onClick={() => handleServicePlaceholder('Toilette')}
            colorClasses="bg-violet-600 text-white"
          />
          <CommandButton
            label="Uscita"
            Icon={ExitIcon}
            onClick={() => handleServicePlaceholder('Uscita')}
            colorClasses="bg-teal-600 text-white"
          />
        </div>
        {serviceMessage && (
          <p role="status" aria-live="polite" className="text-sm text-text-muted">
            {serviceMessage}
          </p>
        )}
      </section>
    </div>
  )
}

export default Comandi
