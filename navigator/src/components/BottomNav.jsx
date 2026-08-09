import { NavLink } from 'react-router-dom'
import { HomeIcon, MapIcon, OperaIcon, CommandsIcon, QrIcon } from './icons'

const items = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/mappa', label: 'Mappa', Icon: MapIcon },
  { to: '/opera', label: 'Opera', Icon: OperaIcon },
  { to: '/comandi', label: 'Comandi', Icon: CommandsIcon },
  { to: '/qr', label: 'QR', Icon: QrIcon },
]

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="flex h-16 items-stretch justify-around">
        {items.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
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
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default BottomNav
