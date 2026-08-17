import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useGroupSession } from '../context/GroupSessionContext'
import { PersonIcon, LogoutIcon, ExitIcon, SunIcon, MoonIcon } from './icons'
import { getTheme, toggleTheme } from '../theme'

const MARKETPLACE_PROFILE_URL = '/marketplace/pages/profile.html'

// Il pannello resta montato finché l'uscita non è finita, altrimenti
// smonterebbe di scatto a metà della transizione CSS.
const CLOSE_ANIMATION_MS = 100
const STAGGER_MS = 30

const CORNER_STORAGE_KEY = 'navigator_profile_menu_corner'
const MARGIN = 16 // px dai bordi, coincide con top-4/right-4/left-4
// px dal basso per gli angoli inferiori: deve sempre superare la BottomNav
// (~65px); quando è visibile anche la barra del player sopra di essa (fuori
// dalla Home, con una visita attiva) deve superare anche quella (~133px).
const BOTTOM_CLEARANCE_NO_PLAYER = 65 + MARGIN
const BOTTOM_CLEARANCE_WITH_PLAYER = 212
const BUTTON_SIZE = 56 // px, coincide con h-14/w-14
const DRAG_THRESHOLD = 6 // px di movimento prima che una pressione diventi un trascinamento
const SNAP_DURATION_MS = 320

// Gli angoli inferiori non includono l'offset verticale: quello è dinamico
// (dipende dalla presenza del player) e viene applicato via style inline.
const CORNER_STATIC_CLASSES = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'right-4',
  'bottom-left': 'left-4',
}

// Direzione di apertura e allineamento del pannello a seconda dell'angolo in
// cui si trova l'icona: si apre sempre verso il centro dello schermo, mai
// fuori dai bordi.
const CORNER_PANEL_CONFIG = {
  'top-right': {
    position: 'right-0 top-full mt-2 origin-top-right',
    align: 'items-end',
    closedTranslate: '-translate-y-1',
    itemClosedTranslate: 'translate-x-2',
  },
  'top-left': {
    position: 'left-0 top-full mt-2 origin-top-left',
    align: 'items-start',
    closedTranslate: '-translate-y-1',
    itemClosedTranslate: '-translate-x-2',
  },
  'bottom-right': {
    position: 'right-0 bottom-full mb-2 origin-bottom-right',
    align: 'items-end',
    closedTranslate: 'translate-y-1',
    itemClosedTranslate: 'translate-x-2',
  },
  'bottom-left': {
    position: 'left-0 bottom-full mb-2 origin-bottom-left',
    align: 'items-start',
    closedTranslate: 'translate-y-1',
    itemClosedTranslate: '-translate-x-2',
  },
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function cornerToPosition(cornerKey, bottomClearance) {
  const [vert, horiz] = cornerKey.split('-')
  return {
    left: horiz === 'left' ? MARGIN : window.innerWidth - MARGIN - BUTTON_SIZE,
    top: vert === 'top' ? MARGIN : window.innerHeight - bottomClearance - BUTTON_SIZE,
  }
}

function nearestCorner(centerX, centerY) {
  const vert = centerY < window.innerHeight / 2 ? 'top' : 'bottom'
  const horiz = centerX < window.innerWidth / 2 ? 'left' : 'right'
  return `${vert}-${horiz}`
}

function readStoredCorner() {
  try {
    const stored = localStorage.getItem(CORNER_STORAGE_KEY)
    return stored && CORNER_STATIC_CLASSES[stored] ? stored : 'top-right'
  } catch {
    return 'top-right'
  }
}

function initials(name) {
  if (!name) return ''
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

// `glass-chip` (index.css) applica il proprio `background` fuori da un
// @layer Tailwind: essendo "unlayered" batte sempre, a prescindere
// dall'ordine, le utility di sfondo di Tailwind (che vivono in
// @layer utilities) — incluso il gradiente "accent" qui sotto. Per la
// voce logout (accent) va quindi omessa, altrimenti il gradiente non si
// vede mai e il testo (`text-on-accent`, pensato per contrastare
// sull'accent) resta su un vetro che ha il tono quasi opposto in entrambi
// i temi, illeggibile.
const pillBaseClasses =
  'flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-400/20 backdrop-blur-lg px-4 py-2 text-sm font-medium'

// Ogni voce entra con un piccolo scarto in cascata (via transitionDelay) e
// esce tutta insieme, senza scarto.
function MenuItem({ index, open, closedTranslate, as: Tag = 'div', className = '', ...props }) {
  return (
    <Tag
      style={{ transitionDelay: open ? `${index * STAGGER_MS}ms` : '0ms' }}
      className={`transition-[opacity,transform] ${
        open
          ? 'duration-150 ease-out translate-x-0 opacity-100'
          : `duration-100 ease-in ${closedTranslate} opacity-0`
      } ${className}`}
      {...props}
    />
  )
}

function ProfileMenu({ hasPlayer = false }) {
  const { user, refresh } = useAuth()
  const { activeVisit, clearActiveVisit } = useActiveVisit()
  const { role: groupRole, leaveSession: leaveGroupSession } = useGroupSession()
  const navigate = useNavigate()

  const bottomClearance = hasPlayer ? BOTTOM_CLEARANCE_WITH_PLAYER : BOTTOM_CLEARANCE_NO_PLAYER

  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [corner, setCorner] = useState(readStoredCorner)
  const [theme, setThemeState] = useState(getTheme)
  const [dragPos, setDragPos] = useState(null)
  const [lifted, setLifted] = useState(false)
  const [snapping, setSnapping] = useState(false)

  const rootRef = useRef(null)
  const closeTimerRef = useRef(null)
  const rafRef = useRef(null)
  const snapRafRef = useRef(null)
  const snapTimerRef = useRef(null)
  const dragStateRef = useRef(null)
  const dragPosRef = useRef(null)
  // Dopo un tocco reale (con movimento) il browser a volte non genera affatto
  // un click "residuo" al rilascio, quindi il toggle del menu va gestito
  // direttamente in pointerup, non nel click: questo flag serve solo a
  // ignorare quel click quando invece arriva (es. con il mouse, dove arriva
  // sempre), evitando un doppio toggle. Si autoripristina dopo poco così un
  // eventuale Invio/Spazio da tastiera (che genera solo un click, senza
  // pointerup) non resta bloccato.
  const suppressNextClickRef = useRef(false)
  const suppressClickTimerRef = useRef(null)

  function openMenu() {
    clearTimeout(closeTimerRef.current)
    setMounted(true)
    // Doppio rAF: il primo frame monta il pannello nello stato "chiuso",
    // il secondo lo fa transizionare verso "aperto" così il browser anima
    // davvero il passaggio invece di applicare subito lo stato finale.
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setOpen(true))
    })
  }

  function closeMenu() {
    cancelAnimationFrame(rafRef.current)
    setOpen(false)
    closeTimerRef.current = setTimeout(() => setMounted(false), CLOSE_ANIMATION_MS)
  }

  function toggleMenu() {
    if (mounted) closeMenu()
    else openMenu()
  }

  function suppressNextClick() {
    suppressNextClickRef.current = true
    clearTimeout(suppressClickTimerRef.current)
    suppressClickTimerRef.current = setTimeout(() => {
      suppressNextClickRef.current = false
    }, 500)
  }

  function handleTriggerClick() {
    // Le pressioni con puntatore (mouse/touch/penna) gestiscono già il
    // toggle direttamente in pointerup: qui arriviamo solo per l'attivazione
    // da tastiera (Invio/Spazio), oppure per il click residuo che il browser
    // a volte genera dopo un pointerup già gestito, da ignorare.
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      clearTimeout(suppressClickTimerRef.current)
      return
    }
    toggleMenu()
  }

  function updateDragPos(pos) {
    dragPosRef.current = pos
    setDragPos(pos)
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const rect = rootRef.current.getBoundingClientRect()
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    clearTimeout(snapTimerRef.current)
    cancelAnimationFrame(snapRafRef.current)
    setSnapping(false)
    setLifted(true)
  }

  function handlePointerMove(e) {
    const ds = dragStateRef.current
    if (!ds) return
    const dx = e.clientX - ds.startX
    const dy = e.clientY - ds.startY

    if (!ds.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      ds.moved = true
      if (mounted) closeMenu()
    }

    e.preventDefault()
    const left = clamp(ds.originLeft + dx, MARGIN, window.innerWidth - MARGIN - BUTTON_SIZE)
    const top = clamp(ds.originTop + dy, MARGIN, window.innerHeight - bottomClearance - BUTTON_SIZE)
    updateDragPos({ left, top })
  }

  function finishDrag(e) {
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const ds = dragStateRef.current
    dragStateRef.current = null
    setLifted(false)
    suppressNextClick()

    if (!ds) return

    if (!ds.moved) {
      // Pressione senza movimento: è un tap. Non aspettiamo l'eventuale
      // click del browser (dopo un touch può non arrivare affatto) e
      // gestiamo il toggle qui, dove sappiamo per certo che l'evento arriva.
      updateDragPos(null)
      toggleMenu()
      return
    }

    const pos = dragPosRef.current
    const newCorner = nearestCorner(pos.left + BUTTON_SIZE / 2, pos.top + BUTTON_SIZE / 2)
    setCorner(newCorner)
    try {
      localStorage.setItem(CORNER_STORAGE_KEY, newCorner)
    } catch {
      // localStorage non disponibile: la posizione semplicemente non persiste
    }

    // Se si abilita la transizione e si cambia subito la posizione nello
    // stesso render, il browser non anima nulla: scatta direttamente al
    // valore finale. Come per l'apertura del menu, serve un doppio rAF così
    // il "transition" viene applicato in un frame separato da quello in cui
    // cambia il target.
    setSnapping(true)
    const target = cornerToPosition(newCorner, bottomClearance)
    snapRafRef.current = requestAnimationFrame(() => {
      snapRafRef.current = requestAnimationFrame(() => {
        updateDragPos(target)
        snapTimerRef.current = setTimeout(() => {
          setSnapping(false)
          updateDragPos(null)
        }, SNAP_DURATION_MS)
      })
    })
  }

  useEffect(
    () => () => {
      clearTimeout(closeTimerRef.current)
      clearTimeout(snapTimerRef.current)
      clearTimeout(suppressClickTimerRef.current)
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(snapRafRef.current)
    },
    []
  )

  useEffect(() => {
    if (!mounted) return

    function handleOutsidePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) closeMenu()
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') closeMenu()
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mounted])

  if (!user) return null

  const label = user.display_name || user.username
  const panelConfig = CORNER_PANEL_CONFIG[corner]

  async function handleLogout() {
    closeMenu()
    // In una visita di gruppo (host o student) l'uscita deve passare da
    // GroupSessionContext (avvisa il backend, chiude il socket, pulisce lo
    // stato di sessione — e se si è il professore termina la visita per
    // tutti) — clearActiveVisit() da sola lascerebbe la sessione "appesa".
    if (groupRole) leaveGroupSession()
    else clearActiveVisit()
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    await refresh()
  }

  function handleLeaveVisit() {
    closeMenu()
    if (groupRole) leaveGroupSession()
    else clearActiveVisit()
    navigate('/')
  }

  function handleToggleTheme() {
    setThemeState(toggleTheme())
  }

  const items = [
    {
      key: 'profile',
      as: 'a',
      href: MARKETPLACE_PROFILE_URL,
      icon: PersonIcon,
      label,
      truncate: true,
    },
    {
      key: 'theme',
      as: 'button',
      type: 'button',
      onClick: handleToggleTheme,
      icon: theme === 'light' ? MoonIcon : SunIcon,
      label: theme === 'light' ? 'Tema scuro' : 'Tema chiaro',
    },
    activeVisit && {
      key: 'leave-visit',
      as: 'button',
      type: 'button',
      onClick: handleLeaveVisit,
      icon: ExitIcon,
      label: 'Esci dalla visita attiva',
    },
    {
      key: 'logout',
      as: 'button',
      type: 'button',
      onClick: handleLogout,
      icon: LogoutIcon,
      label: 'Esci',
      accent: true,
    },
  ].filter(Boolean)

  const positionClassName = dragPos
    ? `fixed z-[60] ${
        snapping ? 'transition-[left,top] duration-[320ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]' : ''
      }`
    : `fixed z-[60] ${CORNER_STATIC_CLASSES[corner]}`
  const positionStyle = dragPos
    ? { left: dragPos.left, top: dragPos.top }
    : corner.startsWith('bottom')
      ? { bottom: bottomClearance }
      : undefined

  return (
    <div ref={rootRef} className={positionClassName} style={positionStyle}>
      <button
        type="button"
        onClick={handleTriggerClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onDragStart={(e) => e.preventDefault()}
        aria-haspopup="true"
        aria-expanded={mounted}
        aria-label="Profilo"
        style={{ touchAction: 'none' }}
        className={`glass-chip flex h-14 w-14 select-none items-center justify-center overflow-hidden rounded-full border border-slate-400/20 backdrop-blur-lg text-base font-semibold text-text transition-transform duration-150 ease-out ${
          lifted ? 'scale-110 cursor-grabbing shadow-xl' : 'scale-100 cursor-grab'
        }`}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : initials(label) ? (
          <span>{initials(label)}</span>
        ) : (
          <PersonIcon className="h-7 w-7" />
        )}
      </button>

      {mounted && (
        <div
          className={`absolute flex flex-col gap-2 transition-[opacity,transform] ${panelConfig.position} ${panelConfig.align} ${
            open
              ? 'duration-150 ease-out translate-y-0 scale-100 opacity-100'
              : `duration-100 ease-in ${panelConfig.closedTranslate} scale-95 opacity-0`
          }`}
        >
          {items.map(({ key, as, icon: Icon, label: itemLabel, accent, truncate, ...rest }, i) => (
            <MenuItem
              key={key}
              index={i}
              open={open}
              closedTranslate={panelConfig.itemClosedTranslate}
              as={as}
              className={`${pillBaseClasses} ${accent ? 'bg-gradient-to-br from-accent to-accent-hover text-on-accent' : 'glass-chip text-text'}`}
              {...rest}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={truncate ? 'max-w-[10rem] truncate' : ''}>{itemLabel}</span>
            </MenuItem>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProfileMenu
