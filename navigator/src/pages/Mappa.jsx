import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress } from '../context/VisitProgressContext'
import NoActiveVisit from '../components/NoActiveVisit'
import { ToiletIcon, ExitIcon, SignpostIcon, OperaIcon, ZoomInIcon, ZoomOutIcon } from '../components/icons'

function iconForPoint(point) {
  if (point.icon_type === 'entity') return OperaIcon
  if (point.service_key === 'Toilette') return ToiletIcon
  if (point.service_key === 'Uscita') return ExitIcon
  return SignpostIcon
}

// point.entity è l'opera collegata al punto: un oggetto (con image_url) se
// il backend l'ha popolata, altrimenti (fallback) un id grezzo.
function entityIdOf(point) {
  return point?.entity?._id ?? point?.entity ?? null
}

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5
const DRAG_THRESHOLD_PX = 6
// Con tante opere sulla stessa mappa, mostrarle tutte alla vista d'insieme
// le farebbe sovrapporre illeggibili: restano nascoste finché non si
// ingrandisce almeno un po' (i punti-servizio restano invece sempre visibili).
const SHOW_ENTITIES_MIN_SCALE = 1.4

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Mantiene la pianta ancorata: usa pan/zoom con pizzico a due dita,
// rotellina/trackpad, doppio tap e pulsanti +/-. La trasformazione (CSS
// transform, che è puramente visiva) è applicata al contenuto interno; il
// contenitore esterno mantiene invece le dimensioni naturali dell'immagine
// (i transform non influenzano il layout) e ritaglia con overflow-hidden —
// quindi non serve misurare l'aspect ratio dell'immagine a parte.
function useMapZoomPan(viewportRef) {
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const stateRef = useRef({ scale: 1, tx: 0, ty: 0 })
  stateRef.current = { scale, tx, ty }

  const pointers = useRef(new Map()) // pointerId -> {x, y}
  const dragStart = useRef(null) // {x, y, tx, ty} per il pan a un dito
  const pinchStart = useRef(null) // {dist, scale, tx, ty, midX, midY} per il pizzico
  const draggedRef = useRef(false)

  function reset() {
    setScale(1)
    setTx(0)
    setTy(0)
  }

  function applyZoomAt(cx, cy, targetScale) {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const { scale: s, tx: curTx, ty: curTy } = stateRef.current
    const newScale = clamp(targetScale, MIN_SCALE, MAX_SCALE)
    const contentX = (cx - curTx) / s
    const contentY = (cy - curTy) / s
    const rawTx = cx - contentX * newScale
    const rawTy = cy - contentY * newScale
    const minX = Math.min(0, rect.width - rect.width * newScale)
    const minY = Math.min(0, rect.height - rect.height * newScale)
    setScale(newScale)
    setTx(clamp(rawTx, minX, 0))
    setTy(clamp(rawTy, minY, 0))
  }

  function zoomByStep(factor) {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    applyZoomAt(rect.width / 2, rect.height / 2, stateRef.current.scale * factor)
  }

  function updatePointer(e) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  function handlePointerDown(e) {
    // Ogni nuovo gesto riparte "pulito": senza questo, un tocco che atterra
    // proprio su un'icona subito dopo un pan/pizzico (che aveva lasciato
    // draggedRef a true) verrebbe ignorato una volta prima di tornare a
    // funzionare — perché il return qui sotto uscirebbe prima di azzerarlo.
    draggedRef.current = false

    // Un dito/mouse che parte su un bottone (icona di un punto, +/-) non deve
    // avviare pan/pizzico: setPointerCapture sul contenitore altrimenti
    // "ruba" il target del click successivo, che finirebbe sul contenitore
    // invece che sul bottone, e il bottone non riceverebbe mai l'evento.
    if (e.target.closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePointer(e)
    draggedRef.current = pointers.current.size > 1
    const pts = [...pointers.current.values()]
    if (pts.length === 1) {
      dragStart.current = { x: pts[0].x, y: pts[0].y, tx: stateRef.current.tx, ty: stateRef.current.ty }
      pinchStart.current = null
    } else if (pts.length === 2) {
      const rect = viewportRef.current.getBoundingClientRect()
      pinchStart.current = {
        dist: distanceBetween(pts[0], pts[1]),
        scale: stateRef.current.scale,
        tx: stateRef.current.tx,
        ty: stateRef.current.ty,
        midX: (pts[0].x + pts[1].x) / 2 - rect.left,
        midY: (pts[0].y + pts[1].y) / 2 - rect.top,
      }
      dragStart.current = null
    }
  }

  function handlePointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return
    updatePointer(e)
    const pts = [...pointers.current.values()]
    const rect = viewportRef.current.getBoundingClientRect()

    if (pts.length === 1 && dragStart.current) {
      const dx = pts[0].x - dragStart.current.x
      const dy = pts[0].y - dragStart.current.y
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) draggedRef.current = true
      if (stateRef.current.scale <= 1) return
      const minX = Math.min(0, rect.width - rect.width * stateRef.current.scale)
      const minY = Math.min(0, rect.height - rect.height * stateRef.current.scale)
      setTx(clamp(dragStart.current.tx + dx, minX, 0))
      setTy(clamp(dragStart.current.ty + dy, minY, 0))
    } else if (pts.length === 2 && pinchStart.current) {
      draggedRef.current = true
      const dist = distanceBetween(pts[0], pts[1])
      const ratio = dist / pinchStart.current.dist
      const newScale = clamp(pinchStart.current.scale * ratio, MIN_SCALE, MAX_SCALE)
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top
      const contentX = (pinchStart.current.midX - pinchStart.current.tx) / pinchStart.current.scale
      const contentY = (pinchStart.current.midY - pinchStart.current.ty) / pinchStart.current.scale
      const minX = Math.min(0, rect.width - rect.width * newScale)
      const minY = Math.min(0, rect.height - rect.height * newScale)
      setScale(newScale)
      setTx(clamp(midX - contentX * newScale, minX, 0))
      setTy(clamp(midY - contentY * newScale, minY, 0))
    }
  }

  function handlePointerUp(e) {
    pointers.current.delete(e.pointerId)
    const pts = [...pointers.current.values()]
    if (pts.length === 1) {
      dragStart.current = { x: pts[0].x, y: pts[0].y, tx: stateRef.current.tx, ty: stateRef.current.ty }
      pinchStart.current = null
    } else {
      dragStart.current = null
      pinchStart.current = null
    }
  }

  function handleDoubleClick(e) {
    const rect = viewportRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    applyZoomAt(cx, cy, stateRef.current.scale > 1 ? 1 : DOUBLE_TAP_SCALE)
  }

  // Consumato dal bottone di un punto: un pan/pizzico appena concluso non
  // deve anche aprire il popup del punto sotto il dito.
  function consumeWasDragging() {
    const was = draggedRef.current
    draggedRef.current = false
    return was
  }

  // React registra i listener onWheel come passive: preventDefault() lì
  // dentro verrebbe ignorato (e loggherebbe un warning), quindi lo scroll
  // della pagina non si fermerebbe mentre si zooma con trackpad/rotellina.
  // Serve un listener nativo non-passive. Nessun array di dipendenze: il nodo
  // (selectedMap monta un render dopo quello iniziale) va riletto da
  // viewportRef.current ad ogni render — usarlo come dipendenza non
  // funzionerebbe, perché il valore controllato da React è quello letto
  // *durante* il render, cioè prima che il ref di questo stesso render venga
  // collegato al commit, quindi resterebbe sempre a null.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    function handleWheel(e) {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = Math.exp(-e.deltaY * 0.0015)
      applyZoomAt(cx, cy, stateRef.current.scale * factor)
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  })

  return {
    scale,
    tx,
    ty,
    reset,
    zoomByStep,
    consumeWasDragging,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      onPointerLeave: handlePointerUp,
      onDoubleClick: handleDoubleClick,
    },
  }
}

// Sceglie di default il museo dello step corrente (se ha almeno una mappa),
// altrimenti il primo museo della visita che ne ha una.
function pickDefaultMuseumId(museums, currentMuseumId) {
  const current = museums.find((m) => m._id === currentMuseumId)
  if (current?.maps?.length) return current._id
  const firstWithMaps = museums.find((m) => m.maps?.length)
  return firstWithMaps?._id || null
}

function Mappa() {
  const { activeVisit } = useActiveVisit()
  const { museum: currentMuseum, entity: currentEntity, steps, goToStep } = useVisitProgress()
  const location = useLocation()
  const navigate = useNavigate()

  // Passato da Comandi.jsx quando si clicca un pulsante servizio: apre
  // direttamente la mappa/piano giusti sul punto corrispondente.
  const highlightRequest = location.state || null

  const museumsWithMaps = useMemo(
    () => (activeVisit?.museum || []).filter((m) => m && typeof m === 'object' && m.maps?.length),
    [activeVisit]
  )

  const [selectedMuseumId, setSelectedMuseumId] = useState(null)
  const [selectedMapIndex, setSelectedMapIndex] = useState(0)
  const [activePoint, setActivePoint] = useState(null)
  const [hintDismissed, setHintDismissed] = useState(false)

  const viewportRef = useRef(null)
  const zoomPan = useMapZoomPan(viewportRef)

  // Riparte da zoom neutro ogni volta che si cambia museo o piano.
  useEffect(() => {
    zoomPan.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMuseumId, selectedMapIndex])

  // Chiudere l'avviso lo nasconde solo finché le opere restano nascoste: se
  // si torna a ingrandire e poi si rimpicciolisce di nuovo, ricompare.
  useEffect(() => {
    if (zoomPan.scale >= SHOW_ENTITIES_MIN_SCALE) setHintDismissed(false)
  }, [zoomPan.scale])

  // Inizializza (o segue una richiesta di evidenziazione) museo/piano/punto
  // attivi. Gira ogni volta che cambia la richiesta di evidenziazione o
  // l'elenco musei-con-mappa, non ad ogni render.
  useEffect(() => {
    if (!museumsWithMaps.length) {
      setSelectedMuseumId(null)
      return
    }

    const targetMuseumId = highlightRequest?.museumId || currentMuseum?._id
    const museum =
      museumsWithMaps.find((m) => m._id === targetMuseumId) ||
      museumsWithMaps.find((m) => m._id === pickDefaultMuseumId(museumsWithMaps, currentMuseum?._id))

    if (!museum) return
    setSelectedMuseumId(museum._id)

    if (highlightRequest?.serviceKey) {
      const mapIndex = museum.maps.findIndex((map) =>
        map.points.some((p) => p.icon_type === 'service' && p.service_key === highlightRequest.serviceKey)
      )
      if (mapIndex !== -1) {
        setSelectedMapIndex(mapIndex)
        const point = museum.maps[mapIndex].points.find(
          (p) => p.icon_type === 'service' && p.service_key === highlightRequest.serviceKey
        )
        setActivePoint(point || null)
        return
      }
    }

    setSelectedMapIndex(0)
    setActivePoint(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightRequest, museumsWithMaps])

  if (!activeVisit) return <NoActiveVisit />

  const selectedMuseum = museumsWithMaps.find((m) => m._id === selectedMuseumId) || null
  const selectedMap = selectedMuseum?.maps?.[selectedMapIndex] || null
  const entitiesVisible = zoomPan.scale >= SHOW_ENTITIES_MIN_SCALE
  const hasHiddenEntities =
    !entitiesVisible && !hintDismissed && (selectedMap?.points || []).some((p) => p.icon_type === 'entity')

  function handleSelectMuseum(id) {
    setSelectedMuseumId(id)
    setSelectedMapIndex(0)
    setActivePoint(null)
  }

  function handleSelectMap(index) {
    setSelectedMapIndex(index)
    setActivePoint(null)
  }

  // Se il punto è un'opera che fa parte della visita, porta allo step
  // corrispondente e passa alla pagina Opera.
  function handleGoToEntity(point) {
    const stepIndex = steps.findIndex((s) => String(s.entity?._id) === String(entityIdOf(point)))
    if (stepIndex === -1) return
    goToStep(stepIndex, { skipDirections: true })
    navigate('/opera')
  }

  const servicePhrase =
    activePoint?.icon_type === 'service' ? selectedMuseum?.services?.[activePoint.service_key] : null
  const canGoToEntity =
    activePoint?.icon_type === 'entity' &&
    steps.some((s) => String(s.entity?._id) === String(entityIdOf(activePoint)))

  return (
    <div className="flex flex-col gap-4 p-6 pb-10">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-text">Mappa</h1>
        <p className="text-sm text-text-muted">
          {currentEntity ? `Ti trovi a: ${currentEntity.name}` : activeVisit.title}
        </p>
      </div>

      {museumsWithMaps.length === 0 && (
        <p className="text-sm text-text-muted">Nessuna mappa disponibile per questa visita.</p>
      )}

      {museumsWithMaps.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {museumsWithMaps.map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => handleSelectMuseum(m._id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                m._id === selectedMuseumId
                  ? 'border-accent bg-accent text-on-accent shadow-sm'
                  : 'glass-pill text-text-muted'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {selectedMuseum && selectedMuseum.maps.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {selectedMuseum.maps.map((map, index) => (
            <button
              key={map._id || index}
              type="button"
              onClick={() => handleSelectMap(index)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                index === selectedMapIndex
                  ? 'border-info bg-info text-on-accent shadow-sm'
                  : 'glass-pill text-text-muted'
              }`}
            >
              {map.name}
            </button>
          ))}
        </div>
      )}

      {selectedMap && (
        <div
          ref={viewportRef}
          className="glass-panel relative w-full touch-none select-none overflow-hidden rounded-2xl"
          style={{ cursor: zoomPan.scale > 1 ? 'grab' : 'default' }}
          {...zoomPan.handlers}
        >
          {hasHiddenEntities && (
            <div className="glass-chip pointer-events-none absolute left-2 top-2 z-20 flex max-w-[85%] items-center gap-1.5 rounded-full border border-slate-400/20 backdrop-blur-lg py-1 pl-3 pr-1.5">
              <p className="text-xs text-text-muted">Ingrandisci la mappa per vedere le opere.</p>
              <button
                type="button"
                onClick={() => setHintDismissed(true)}
                aria-label="Chiudi"
                className="pointer-events-auto shrink-0 rounded-full px-1.5 text-text-muted"
              >
                ×
              </button>
            </div>
          )}

          <div
            style={{
              transform: `translate(${zoomPan.tx}px, ${zoomPan.ty}px) scale(${zoomPan.scale})`,
              transformOrigin: '0 0',
            }}
          >
            <img
              src={selectedMap.image_url}
              alt={`Pianta — ${selectedMap.name}`}
              className="pointer-events-none block w-full"
              draggable={false}
            />

            {selectedMap.points.map((point) => {
              const Icon = iconForPoint(point)
              const thumbnailUrl = point.icon_type === 'entity' ? point.entity?.image_url : null
              const isActive = activePoint && String(activePoint._id) === String(point._id)
              const isHiddenEntity = point.icon_type === 'entity' && !entitiesVisible
              return (
                <button
                  key={point._id}
                  type="button"
                  onClick={() => {
                    if (zoomPan.consumeWasDragging()) return
                    setActivePoint(point)
                  }}
                  aria-label={point.label}
                  style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                  className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 shadow-md transition active:scale-95 ${
                    isHiddenEntity ? 'pointer-events-none opacity-0' : 'opacity-100'
                  } ${
                    isActive
                      ? 'z-10 border-accent bg-accent text-on-accent ring-4 ring-accent/40 animate-pulse'
                      : point.icon_type === 'entity'
                        ? 'border-info bg-info/90 text-on-accent'
                        : 'border-accent bg-accent/90 text-on-accent'
                  }`}
                >
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="absolute bottom-2 right-2 z-20 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => zoomPan.zoomByStep(1.5)}
              disabled={zoomPan.scale >= MAX_SCALE}
              aria-label="Ingrandisci"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg text-text shadow-lg shadow-black/10 dark:shadow-black/30 disabled:opacity-40"
            >
              <ZoomInIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => zoomPan.zoomByStep(1 / 1.5)}
              disabled={zoomPan.scale <= MIN_SCALE}
              aria-label="Rimpicciolisci"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg text-text shadow-lg shadow-black/10 dark:shadow-black/30 disabled:opacity-40"
            >
              <ZoomOutIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {activePoint && (
        <div className="glass-panel flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold text-text">{activePoint.label}</h2>
            <button
              type="button"
              onClick={() => setActivePoint(null)}
              aria-label="Chiudi"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-400/20 text-text-muted hover:bg-slate-400/10"
            >
              ×
            </button>
          </div>

          {activePoint.description && <p className="text-sm text-text-muted">{activePoint.description}</p>}
          {servicePhrase && <p className="text-sm text-text-muted">{servicePhrase}</p>}

          {canGoToEntity && (
            <button
              type="button"
              onClick={() => handleGoToEntity(activePoint)}
              className="self-start rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2.5 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
            >
              Vai a quest'opera
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Mappa
