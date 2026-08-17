import { NavLink } from 'react-router-dom'
import { useGroupSession } from '../context/GroupSessionContext'
import { HomeIcon, MapIcon, OperaIcon, CommandsIcon, QrIcon, GroupIcon } from './icons'

const baseItems = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/mappa', label: 'Mappa', Icon: MapIcon },
  { to: '/opera', label: 'Opera', Icon: OperaIcon },
  { to: '/comandi', label: 'Comandi', Icon: CommandsIcon },
  { to: '/qr', label: 'QR', Icon: QrIcon },
]

function BottomNav() {
  const { role, status } = useGroupSession()
  // Scansionare un QR durante una sessione di gruppo permetterebbe di
  // saltare a un'altra opera/visita fuori dal controllo del professore.
  const isRestrictedStudent = role === 'student' && (status === 'active' || status === 'quiz')
  // Tab in più, solo per il professore: la console di gestione del gruppo,
  // ora una tab come le altre invece di una rotta isolata.
  const items = role === 'host' ? [...baseItems, { to: '/gruppo', label: 'Gruppo', Icon: GroupIcon }] : baseItems

  return (
    <nav className="glass-surface fixed inset-x-0 bottom-0 z-50 border-t border-slate-400/20 backdrop-blur-xl transition-colors duration-300 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex h-16 items-stretch justify-around">
        {items.map(({ to, label, Icon, end }) => {
          const disabled = isRestrictedStudent && to === '/qr'
          return (
            <li key={to} className="flex-1">
              {disabled ? (
                <span
                  aria-disabled="true"
                  className="flex h-full flex-col items-center justify-center gap-1 text-xs text-text-muted opacity-30"
                >
                  <Icon className="h-6 w-6" />
                  <span>{label}</span>
                </span>
              ) : (
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex h-full flex-col items-center justify-center gap-1 text-xs ${
                      isActive ? 'text-accent' : 'text-text-muted'
                    }`
                  }
                >
                  <Icon className="h-6 w-6" />
                  <span>{label}</span>
                </NavLink>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default BottomNav
