import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress } from '../context/VisitProgressContext'
import NoActiveVisit from '../components/NoActiveVisit'
import {
  ToiletIcon,
  ExitIcon,
  SignpostIcon,
  OperaIcon,
  BookshopIcon,
  ElevatorIcon,
  StairsIcon,
  CloakroomIcon,
  InfoIcon,
  ZoomInIcon,
  ZoomOutIcon,
  FullscreenIcon,
  FullscreenExitIcon,
} from '../components/icons'
import useDocumentTitle from '../hooks/useDocumentTitle'

const SERVICE_ICONS = {
  Toilette: ToiletIcon,
  Uscita: ExitIcon,
  Bookshop: BookshopIcon,
  Ascensore: ElevatorIcon,
  Scale: StairsIcon,
  Guardaroba: CloakroomIcon,
  Info: InfoIcon,
}

function iconForPoint(point) {
  if (point.icon_type === 'entity') return OperaIcon
  return SERVICE_ICONS[point.service_key] ?? SignpostIcon
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

// Calcola i limiti di tx/ty per un dato scale: se il contenuto (a quello
// scale) è più piccolo del contenitore su un asse resta centrato e bloccato
// su quell'asse (min===max); altrimenti può scorrere fra i due bordi.
function boundsFor(rect, base, scale) {
  const scaledW = base.width * scale
  const scaledH = base.height * scale
  const centerX = (rect.width - scaledW) / 2
  const centerY = (rect.height - scaledH) / 2
  return {
    minX: scaledW <= rect.width ? centerX : rect.width - scaledW,
    maxX: scaledW <= rect.width ? centerX : 0,
    minY: scaledH <= rect.height ? centerY : rect.height - scaledH,
    maxY: scaledH <= rect.height ? centerY : 0,
  }
}

// Mantiene la pianta ancorata: usa pan/zoom con pizzico a due dita,
// rotellina/trackpad, doppio tap e pulsanti +/-. La trasformazione (CSS
// transform, che è puramente visiva) è applicata al contenuto interno; il
// contenitore esterno (viewportRef) può avere dimensioni indipendenti dal
// contenuto — es. a schermo intero è alto quanto lo schermo, non quanto
// l'immagine — quindi le dimensioni "naturali" del contenuto (base) si
// leggono da contentRef via offsetWidth/Height (non influenzate dal
// transform) invece di assumere che coincidano col rect del contenitore.
function useMapZoomPan(viewportRef, contentRef) {
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const stateRef = useRef({ scale: 1, tx: 0, ty: 0 })
  stateRef.current = { scale, tx, ty }

  const pointers = useRef(new Map()) // pointerId -> {x, y}
  const dragStart = useRef(null) // {x, y, tx, ty} per il pan a un dito
  const pinchStart = useRef(null) // {dist, scale, tx, ty, midX, midY} per il pizzico
  const draggedRef = useRef(false)

  function getBase() {
    const el = contentRef.current
    return { width: el?.offsetWidth || 0, height: el?.offsetHeight || 0 }
  }

  // Riporta a scale neutro, centrando il contenuto nel contenitore (utile
  // sia al cambio museo/piano sia all'ingresso/uscita da schermo intero,
  // dove le dimensioni del contenitore cambiano bruscamente).
  function reset() {
    const rect = viewportRef.current?.getBoundingClientRect()
    const base = getBase()
    setScale(1)
    if (rect) {
      setTx((rect.width - base.width) / 2)
      setTy((rect.height - base.height) / 2)
    } else {
      setTx(0)
      setTy(0)
    }
  }

  function applyZoomAt(cx, cy, targetScale) {
    const rect = viewportRef.current?.getBoundingClientRect()
    const base = getBase()
    if (!rect) return
    const { scale: s, tx: curTx, ty: curTy } = stateRef.current
    const newScale = clamp(targetScale, MIN_SCALE, MAX_SCALE)
    const contentX = (cx - curTx) / s
    const contentY = (cy - curTy) / s
    const rawTx = cx - contentX * newScale
    const rawTy = cy - contentY * newScale
    const { minX, maxX, minY, maxY } = boundsFor(rect, base, newScale)
    setScale(newScale)
    setTx(clamp(rawTx, minX, maxX))
    setTy(clamp(rawTy, minY, maxY))
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
    const base = getBase()

    if (pts.length === 1 && dragStart.current) {
      const dx = pts[0].x - dragStart.current.x
      const dy = pts[0].y - dragStart.current.y
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) draggedRef.current = true
      const { minX, maxX, minY, maxY } = boundsFor(rect, base, stateRef.current.scale)
      setTx(clamp(dragStart.current.tx + dx, minX, maxX))
      setTy(clamp(dragStart.current.ty + dy, minY, maxY))
    } else if (pts.length === 2 && pinchStart.current) {
      draggedRef.current = true
      const dist = distanceBetween(pts[0], pts[1])
      const ratio = dist / pinchStart.current.dist
      const newScale = clamp(pinchStart.current.scale * ratio, MIN_SCALE, MAX_SCALE)
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top
      const contentX = (pinchStart.current.midX - pinchStart.current.tx) / pinchStart.current.scale
      const contentY = (pinchStart.current.midY - pinchStart.current.ty) / pinchStart.current.scale
      const { minX, maxX, minY, maxY } = boundsFor(rect, base, newScale)
      setScale(newScale)
      setTx(clamp(midX - contentX * newScale, minX, maxX))
      setTy(clamp(midY - contentY * newScale, minY, maxY))
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

// Fullscreen sull'elemento passato: tiene lo stato sincronizzato anche
// quando si esce senza passare dal bottone (es. tasto Esc).
function useFullscreen(elementRef) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement === elementRef.current)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      elementRef.current?.requestFullscreen()
    }
  }

  return { isFullscreen, toggle }
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
  useDocumentTitle('Mappa')
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
  // Dimensioni intrinseche dell'immagine e dimensioni del contenitore: usate
  // solo a schermo intero (vedi `fit` più sotto) per calcolare un "contain"
  // fit che non tagli mai la mappa quando è tutta dezoomata — in pagina
  // normale il contenitore si adatta già all'immagine (mai tagliata) quindi
  // non servono.
  const [naturalSize, setNaturalSize] = useState(null)
  const [containerSize, setContainerSize] = useState(null)

  const viewportRef = useRef(null)
  const contentRef = useRef(null)
  const zoomPan = useMapZoomPan(viewportRef, contentRef)
  const fullscreen = useFullscreen(viewportRef)

  // Nessun array di dipendenze: come per il listener wheel più sotto,
  // viewportRef.current va riletto ad ogni render (monta un render dopo
  // quello iniziale). Copre sia il cambio piano/museo sia l'ingresso/uscita
  // da schermo intero, l'orientamento del device, ecc.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  })

  const fit =
    fullscreen.isFullscreen && containerSize && naturalSize
      ? (() => {
          const scale = Math.min(
            containerSize.width / naturalSize.width,
            containerSize.height / naturalSize.height
          )
          return { width: naturalSize.width * scale, height: naturalSize.height * scale }
        })()
      : null

  // Riparte da zoom neutro ogni volta che si cambia museo o piano, o che
  // cambia il fit del contenuto (schermo intero attivato/disattivato,
  // ridimensionamento): le dimensioni del contenitore/contenuto cambiano di
  // colpo, quindi il centraggio va ricalcolato.
  useEffect(() => {
    zoomPan.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMuseumId, selectedMapIndex, fit?.width, fit?.height])

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
      const candidateIndexes = museum.maps.reduce((acc, map, index) => {
        if (map.points.some((p) => p.icon_type === 'service' && p.service_key === highlightRequest.serviceKey)) {
          acc.push(index)
        }
        return acc
      }, [])

      if (candidateIndexes.length) {
        // Piano dell'opera che si sta visitando: se c'è un servizio omonimo
        // proprio su quel piano si preferisce sempre quello; altrimenti si
        // sceglie il candidato più vicino nell'ordine dell'array `maps`.
        const currentEntityMapIndex = currentEntity
          ? museum.maps.findIndex((map) =>
              map.points.some(
                (p) => p.icon_type === 'entity' && String(entityIdOf(p)) === String(currentEntity._id)
              )
            )
          : -1

        const mapIndex =
          currentEntityMapIndex !== -1
            ? candidateIndexes.reduce((closest, index) =>
                Math.abs(index - currentEntityMapIndex) < Math.abs(closest - currentEntityMapIndex)
                  ? index
                  : closest
              )
            : candidateIndexes[0]

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
  }, [highlightRequest, museumsWithMaps, currentEntity])

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
          className={`glass-panel relative w-full touch-none select-none overflow-hidden ${
            fullscreen.isFullscreen ? '' : 'rounded-2xl'
          }`}
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
            ref={contentRef}
            style={{
              ...(fit ? { width: fit.width, height: fit.height } : null),
              transform: `translate(${zoomPan.tx}px, ${zoomPan.ty}px) scale(${zoomPan.scale})`,
              transformOrigin: '0 0',
            }}
          >
            <img
              src={selectedMap.image_url}
              alt={`Pianta — ${selectedMap.name}`}
              onLoad={(e) => setNaturalSize({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
              className={`pointer-events-none block ${fit ? 'h-full w-full' : 'w-full'}`}
              draggable={false}
            />

            {selectedMap.points.map((point) => {
              const Icon = iconForPoint(point)
              const thumbnailUrl = point.icon_type === 'entity' ? point.entity?.image_url : null
              const isActive = activePoint && String(activePoint._id) === String(point._id)
              const isCurrentEntity =
                point.icon_type === 'entity' &&
                currentEntity &&
                String(entityIdOf(point)) === String(currentEntity._id)
              // L'opera attuale e quella selezionata restano sempre visibili, anche in vista d'insieme.
              const isHiddenEntity =
                point.icon_type === 'entity' && !entitiesVisible && !isCurrentEntity && !isActive
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
                      : isCurrentEntity
                        ? 'z-10 border-accent bg-accent text-on-accent ring-4 ring-accent/40'
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

          <button
            type="button"
            onClick={fullscreen.toggle}
            aria-label={fullscreen.isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
            className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg text-text shadow-lg shadow-black/10 dark:shadow-black/30"
          >
            {fullscreen.isFullscreen ? (
              <FullscreenExitIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <FullscreenIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

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
