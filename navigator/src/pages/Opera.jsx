import { useMemo, useState } from 'react'
import { useActiveVisit } from '../context/ActiveVisitContext'
import NoActiveVisit from '../components/NoActiveVisit'
import {
  PreviousIcon,
  NextIcon,
  PlayIcon,
  VolumeIcon,
  MicrophoneIcon,
} from '../components/icons'

const TONE_ORDER = ['childish', 'simple', 'medium', 'technical']
const TONE_LABELS = {
  childish: 'Infantile',
  simple: 'Elementare',
  medium: 'Medio',
  technical: 'Avanzato',
}

function formatDurationLabel(sec) {
  if (sec < 60) return `${sec} sec`
  return `${Math.round(sec / 60)} min`
}

function pillClasses(active, colorClass) {
  return `rounded-full border px-4 py-1.5 text-sm font-medium ${
    active ? `${colorClass} text-white` : 'border-border bg-surface text-text-muted'
  }`
}

function Opera() {
  const { activeVisit } = useActiveVisit()
  const [selectedTone, setSelectedTone] = useState(null)
  const [selectedDescIndex, setSelectedDescIndex] = useState(0)

  const step = useMemo(() => {
    if (!activeVisit?.steps?.length) return null
    return [...activeVisit.steps].sort((a, b) => a.order - b.order)[0]
  }, [activeVisit])

  const entity = step?.entity
  const items = useMemo(() => step?.items || [], [step])

  const availableTones = useMemo(
    () => TONE_ORDER.filter((tone) => items.some((item) => item.tone === tone)),
    [items]
  )

  const activeTone = availableTones.includes(selectedTone) ? selectedTone : availableTones[0]
  const currentItem = items.find((item) => item.tone === activeTone)

  const sortedDescriptions = useMemo(
    () => [...(currentItem?.descriptions || [])].sort((a, b) => a.duration_sec - b.duration_sec),
    [currentItem]
  )

  const activeDescIndex = Math.min(selectedDescIndex, Math.max(sortedDescriptions.length - 1, 0))
  const currentDescription = sortedDescriptions[activeDescIndex]

  function handleToneSelect(tone) {
    setSelectedTone(tone)
    setSelectedDescIndex(0)
  }

  if (!activeVisit) return <NoActiveVisit />

  if (!step || !entity) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <h1 className="text-2xl font-semibold text-primary">Opera</h1>
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
          className="h-64 w-full object-cover"
        />
      ) : (
        <div className="flex h-64 w-full items-center justify-center bg-border text-sm text-text-muted">
          Nessuna immagine disponibile
        </div>
      )}

      <div className="flex flex-col gap-1 px-6">
        <h1 className="text-2xl font-semibold text-primary">{entity.name}</h1>
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
                  onClick={() => setSelectedDescIndex(index)}
                  className={pillClasses(index === activeDescIndex, 'border-primary bg-primary')}
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
                  className={pillClasses(tone === activeTone, 'border-accent bg-accent')}
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
        <div className="mx-auto flex max-w-md items-center justify-between px-8 py-3">
          <button
            type="button"
            aria-label="Precedente"
            onClick={() => console.log('Precedente')}
            className="text-text-muted"
          >
            <PreviousIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Volume"
            onClick={() => console.log('Volume/Mute')}
            className="text-text-muted"
          >
            <VolumeIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Play/Pausa"
            onClick={() => console.log('Play/Pause')}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-md"
          >
            <PlayIcon className="h-6 w-6" />
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
            onClick={() => console.log('Prossimo')}
            className="text-text-muted"
          >
            <NextIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Opera
