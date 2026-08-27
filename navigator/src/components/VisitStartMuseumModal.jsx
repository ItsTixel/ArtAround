import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress } from '../context/VisitProgressContext'
import { useGroupSession } from '../context/GroupSessionContext'
import useEscapeKey from '../hooks/useEscapeKey'
import useFocusTrap from '../hooks/useFocusTrap'
import { MuseumIcon } from './icons'

// Popup mostrato una sola volta all'avvio di una visita inframuseale (più
// musei): la visita parte sempre dallo step con `order` più basso, cioè dal
// primo museo, e per raggiungere gli altri bisognerebbe scorrere tutte le
// tappe. Qui l'utente dichiara in quale museo si trova davvero e la visita
// salta direttamente alla sua prima tappa in quel museo.
//
// Reso globale in AppLayout come GroupQuizModal/InsightModal: dopo
// l'attivazione si viene portati su /opera, ma tenerlo fuori dalla singola
// route lo rende indipendente dal timing di quella navigazione.
function VisitStartMuseumModal() {
  const { activeVisit, pendingMuseumChoice, clearPendingMuseumChoice } = useActiveVisit()
  const { steps, goToStep } = useVisitProgress()
  const { role: groupRole } = useGroupSession()
  const dialogRef = useRef(null)

  // Musei della visita nell'ordine in cui compaiono tra le tappe, con
  // l'indice della loro prima tappa (bersaglio del salto) e quante tappe
  // toccano quel museo.
  const museumStops = useMemo(() => {
    const seen = new Map()
    steps.forEach((s, i) => {
      const m = s.museum
      if (!m?._id) return
      const key = String(m._id)
      if (!seen.has(key)) seen.set(key, { museum: m, firstIndex: i, count: 0 })
      seen.get(key).count += 1
    })
    return [...seen.values()]
  }, [steps])

  // In una sessione di gruppo è il professore a guidare gli step per tutti:
  // la scelta individuale del museo non si applica.
  const active = pendingMuseumChoice && Boolean(activeVisit) && !groupRole && museumStops.length >= 2

  useFocusTrap(dialogRef, active)
  const onEscape = useCallback(() => {
    if (active) clearPendingMuseumChoice()
  }, [active, clearPendingMuseumChoice])
  useEscapeKey(onEscape)

  // Se le tappe risultano tutte nello stesso museo il popup non ha nulla da
  // chiedere: va comunque azzerato il flag, altrimenti VisitProgressContext
  // terrebbe l'autoplay sospeso a tempo indeterminato. (Le sessioni di
  // gruppo non passano mai di qui: attivano la visita con
  // promptMuseumChoice: false.)
  useEffect(() => {
    if (pendingMuseumChoice && steps.length > 0 && museumStops.length < 2) clearPendingMuseumChoice()
  }, [pendingMuseumChoice, steps.length, museumStops.length, clearPendingMuseumChoice])

  if (!active) return null

  function pick(firstIndex) {
    // skipDirections: sei già fisicamente in quel museo, le indicazioni per
    // raggiungerlo dal primo museo non avrebbero senso. autoplayAfterJump:
    // ma la narrazione della tappa d'arrivo deve comunque partire, come per
    // una visita normale. goToStep è un no-op se firstIndex è 0 (primo museo
    // = inizio visita): in quel caso è clearPendingMuseumChoice a far
    // ripartire l'effetto di autoplay in VisitProgressContext.
    goToStep(firstIndex, { skipDirections: true, autoplayAfterJump: true })
    clearPendingMuseumChoice()
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => clearPendingMuseumChoice()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="In quale museo ti trovi?"
        tabIndex={-1}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => clearPendingMuseumChoice()}
          aria-label="Chiudi"
          className="glass-chip absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-400/20 backdrop-blur-lg text-lg leading-none text-text hover:bg-white/20 hover:border-white/30"
        >
          ×
        </button>

        <div className="flex-1 overflow-y-auto p-5 pt-12">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Visita inframuseale
          </span>
          <h2 className="mt-1 font-serif text-xl font-semibold text-text">In quale museo ti trovi?</h2>
          <p className="mt-2 text-sm text-text-muted">
            Questa visita tocca più musei. Scegli quello in cui sei ora e partirai dalla sua prima
            tappa, senza scorrere le altre.
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {museumStops.map(({ museum, firstIndex, count }) => (
              <li key={museum._id}>
                <button
                  type="button"
                  onClick={() => pick(firstIndex)}
                  className="glass-panel flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-accent">
                    <MuseumIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif font-semibold text-text">{museum.name}</span>
                    <span className="block text-xs text-text-muted">
                      {count} tapp{count === 1 ? 'a' : 'e'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 border-t border-border p-4">
          <button
            type="button"
            onClick={() => clearPendingMuseumChoice()}
            className="w-full rounded-md border border-border px-4 py-2.5 text-sm font-medium text-text"
          >
            Comincia dall'inizio
          </button>
        </div>
      </div>
    </div>
  )
}

export default VisitStartMuseumModal
