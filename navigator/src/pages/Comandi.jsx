import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const STANDARD_SERVICE_KEYS = ['Toilette', 'Uscita']

// Cycled through in order for the extra service buttons of each museum
// section — button N gets EXTRA_SERVICE_COLORS[N % length], wrapping around.
const EXTRA_SERVICE_COLORS = [
  'bg-fuchsia-600 text-white',
  'bg-orange-500 text-black',
  'bg-lime-600 text-black',
  'bg-cyan-600 text-white',
  'bg-indigo-600 text-white',
  'bg-pink-600 text-white',
  'bg-yellow-500 text-black',
  'bg-blue-600 text-white',
]

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

const SERVICE_GAP_PX = 8 // must match the gap-2 used on the row wrappers below

// Splits `items` into as-even-as-possible groups of at most `maxCols`,
// distributing any remainder across the earlier rows first — e.g. 5 items
// with maxCols 3 becomes rows of [3, 2], never [3, 1, 1] or [1,1,1,1,1].
function chunkBalanced(items, maxCols) {
  if (items.length === 0) return []
  if (!maxCols || maxCols >= items.length) return [items]
  const rows = Math.ceil(items.length / maxCols)
  const result = []
  let i = 0
  for (let r = 0; r < rows; r++) {
    const count = Math.ceil((items.length - i) / (rows - r))
    result.push(items.slice(i, i + count))
    i += count
  }
  return result
}

// Renders `labels` as full-width rows of equally-sized buttons. The number
// of columns is chosen (from an always-present, invisible measuring copy of
// the buttons at their natural width) as the largest count that still lets
// every label's natural width fit — so rows are as uniform as possible
// without ever cutting off text — and each row's buttons then stretch
// (flex-1) to fill it completely, remainder rows included.
function ServiceButtonGrid({ labels, onSelect }) {
  const containerRef = useRef(null)
  const measureRefs = useRef([])
  const [columns, setColumns] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || labels.length === 0) return

    function recompute() {
      const containerWidth = container.clientWidth
      const widths = measureRefs.current
        .slice(0, labels.length)
        .map((el) => el?.getBoundingClientRect().width || 0)
      if (!containerWidth || widths.some((w) => !w)) return
      let best = 1
      for (let c = labels.length; c >= 1; c--) {
        const colWidth = (containerWidth - SERVICE_GAP_PX * (c - 1)) / c
        if (widths.every((w) => w <= colWidth + 0.5)) {
          best = c
          break
        }
      }
      setColumns(best)
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(container)
    return () => ro.disconnect()
  }, [labels])

  const rows = chunkBalanced(labels, columns)
  let globalIndex = -1

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 flex gap-2"
      >
        {labels.map((label, index) => (
          <span
            key={label}
            ref={(el) => {
              measureRefs.current[index] = el
            }}
            className="min-h-14 shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-base font-semibold"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((label) => {
              globalIndex += 1
              const colorClasses = EXTRA_SERVICE_COLORS[globalIndex % EXTRA_SERVICE_COLORS.length]
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onSelect(label)}
                  className={`min-h-14 flex-1 whitespace-nowrap rounded-xl px-4 py-3 text-base font-semibold shadow-md transition active:scale-[0.98] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white ${colorClasses}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function Comandi() {
  const navigate = useNavigate()
  const { activeVisit } = useActiveVisit()
  const {
    entity,
    museum,
    announceService,
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
    directionsParts,
  } = useVisitProgress()
  const [serviceMessage, setServiceMessage] = useState(null)

  if (!activeVisit) return <NoActiveVisit />

  // A visit can span more than one museum (es. "Leonardo tra Firenze e
  // Milano"): show one section per museum, with the museum of the step
  // currently on screen listed first.
  const currentMuseumId = museum?._id
  const visitMuseums = (activeVisit.museum || [])
    .filter((m) => m && typeof m === 'object')
    .slice()
    .sort((a, b) => (a._id === currentMuseumId ? -1 : b._id === currentMuseumId ? 1 : 0))

  function handleService(museumForService, label) {
    const phrase = museumForService?.services?.[label]
    if (!phrase) {
      setServiceMessage(`"${label}" non disponibile per ${museumForService?.name || 'questo museo'}.`)
      return
    }
    setServiceMessage(phrase)
    announceService(phrase)
    navigate('/mappa', { state: { museumId: museumForService?._id, serviceKey: label } })
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
            disabled={!canGoPreviousParagraph || !!directionsParts}
            colorClasses="bg-emerald-700 text-white"
          />
          <CommandButton
            label="Dimmi di più"
            Icon={MoreDetailsIcon}
            onClick={goToNextParagraph}
            disabled={!canGoNextParagraph || !!directionsParts}
            colorClasses="bg-emerald-600 text-white"
          />
          <CommandButton
            label="Più semplice"
            Icon={SimplerIcon}
            onClick={goToSimplerTone}
            disabled={!canGoSimplerTone || !!directionsParts}
            colorClasses="bg-amber-500 text-black"
          />
          <CommandButton
            label="Più complesso"
            Icon={ComplexIcon}
            onClick={goToComplexTone}
            disabled={!canGoComplexTone || !!directionsParts}
            colorClasses="bg-rose-600 text-white"
          />
        </div>
      </section>

      <section aria-labelledby="comandi-servizi-heading" className="flex flex-col gap-5">
        <h2
          id="comandi-servizi-heading"
          className="text-xs font-medium uppercase tracking-wide text-text-muted"
        >
          Posizioni e Servizi
        </h2>

        {visitMuseums.length === 0 && (
          <p className="text-sm text-text-muted">Nessuna informazione disponibile.</p>
        )}

        {visitMuseums.map((visitMuseum) => {
          const extraServiceLabels = Object.keys(visitMuseum.services || {}).filter(
            (key) => !STANDARD_SERVICE_KEYS.includes(key)
          )
          return (
            <div key={visitMuseum._id} className="flex flex-col gap-3">
              {visitMuseums.length > 1 && (
                <h3 className="text-sm font-semibold text-text">{visitMuseum.name}</h3>
              )}
              <div className="grid grid-cols-2 gap-3">
                <CommandButton
                  label="Toilette"
                  Icon={ToiletIcon}
                  onClick={() => handleService(visitMuseum, 'Toilette')}
                  colorClasses="bg-violet-600 text-white"
                />
                <CommandButton
                  label="Uscita"
                  Icon={ExitIcon}
                  onClick={() => handleService(visitMuseum, 'Uscita')}
                  colorClasses="bg-teal-600 text-white"
                />
              </div>
              {extraServiceLabels.length > 0 && (
                <ServiceButtonGrid
                  labels={extraServiceLabels}
                  onSelect={(label) => handleService(visitMuseum, label)}
                />
              )}
            </div>
          )
        })}

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
