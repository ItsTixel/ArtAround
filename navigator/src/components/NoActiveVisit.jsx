import { Link } from 'react-router-dom'

function NoActiveVisit() {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <p className="text-text-muted">Nessuna visita attiva.</p>
      <Link
        to="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
      >
        Scegli una visita dalla Home
      </Link>
    </div>
  )
}

export default NoActiveVisit
