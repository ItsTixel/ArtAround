import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { PersonIcon, LogoutIcon, ExitIcon } from './icons'

const MARKETPLACE_PROFILE_URL = '/marketplace/pages/profile.html'

// Il pannello resta montato finché l'uscita non è finita, altrimenti
// smonterebbe di scatto a metà della transizione CSS.
const CLOSE_ANIMATION_MS = 100
const STAGGER_MS = 30

function initials(name) {
  if (!name) return ''
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const pillClasses =
  'flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text shadow-md'

// Ogni voce entra con un piccolo scarto in cascata (via transitionDelay) e
// esce tutta insieme, senza scarto.
function MenuItem({ index, open, as: Tag = 'div', className = '', ...props }) {
  return (
    <Tag
      style={{ transitionDelay: open ? `${index * STAGGER_MS}ms` : '0ms' }}
      className={`transition-[opacity,transform] ${
        open
          ? 'duration-150 ease-out translate-x-0 opacity-100'
          : 'duration-100 ease-in translate-x-2 opacity-0'
      } ${className}`}
      {...props}
    />
  )
}

function ProfileMenu() {
  const { user, refresh } = useAuth()
  const { activeVisit, clearActiveVisit } = useActiveVisit()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const closeTimerRef = useRef(null)
  const rafRef = useRef(null)

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

  useEffect(
    () => () => {
      clearTimeout(closeTimerRef.current)
      cancelAnimationFrame(rafRef.current)
    },
    []
  )

  useEffect(() => {
    if (!mounted) return

    function handlePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) closeMenu()
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') closeMenu()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mounted])

  if (!user) return null

  const label = user.display_name || user.username

  async function handleLogout() {
    closeMenu()
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    await refresh()
  }

  function handleLeaveVisit() {
    closeMenu()
    clearActiveVisit()
    navigate('/')
  }

  const items = [
    {
      key: 'profile',
      as: 'a',
      href: MARKETPLACE_PROFILE_URL,
      icon: PersonIcon,
      label: 'Il mio profilo',
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

  return (
    <div ref={rootRef} className="fixed right-4 top-4 z-50">
      <button
        type="button"
        onClick={toggleMenu}
        aria-haspopup="true"
        aria-expanded={mounted}
        aria-label="Profilo"
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-sm font-semibold text-text shadow-md transition-transform active:scale-95"
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : initials(label) ? (
          <span>{initials(label)}</span>
        ) : (
          <PersonIcon className="h-6 w-6" />
        )}
      </button>

      {mounted && (
        <div
          className={`absolute right-0 top-full mt-2 flex origin-top-right flex-col items-end gap-2 transition-[opacity,transform] ${
            open
              ? 'duration-150 ease-out translate-y-0 scale-100 opacity-100'
              : 'duration-100 ease-in -translate-y-1 scale-95 opacity-0'
          }`}
        >
          <MenuItem
            index={0}
            open={open}
            className="mr-1 max-w-[12rem] truncate text-xs font-medium text-text-muted"
          >
            {label}
          </MenuItem>

          {items.map(({ key, as, icon: Icon, label: itemLabel, accent, ...rest }, i) => (
            <MenuItem
              key={key}
              index={i + 1}
              open={open}
              as={as}
              className={`${pillClasses} ${accent ? 'bg-gradient-to-br from-accent to-accent-hover text-on-accent' : ''}`}
              {...rest}
            >
              <Icon className="h-4 w-4" />
              {itemLabel}
            </MenuItem>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProfileMenu
