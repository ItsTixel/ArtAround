import { Link } from 'react-router-dom'

function NoActiveVisit() {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <p className="text-text-muted">Nessuna visita attiva.</p>
      <Link
        to="/"
        className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-[0_0_16px_rgba(212,168,83,0.25)]"
      >
        Scegli una visita dalla Home
      </Link>
    </div>
  )
}

export default NoActiveVisit
