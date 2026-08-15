import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroupSession } from '../context/GroupSessionContext'

function SessionLobby() {
  const navigate = useNavigate()
  const { groupVisit, status, connected, error, leaveSession } = useGroupSession()

  // Non appena il professore avvia la visita, lo stato passa ad 'active' via
  // l'evento socket visit:session_started: si entra automaticamente in /opera.
  useEffect(() => {
    if (status === 'active') navigate('/opera')
  }, [status, navigate])

  if (!groupVisit) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-text-muted">Nessuna sessione in corso.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent"
        >
          Torna alla Home
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {connected ? 'Connesso' : 'Riconnessione…'}
        </span>
        <button
          type="button"
          onClick={() => {
            leaveSession()
            navigate('/')
          }}
          className="text-sm text-text-muted underline-offset-4 hover:underline"
        >
          Esci
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-serif text-2xl font-semibold text-text">{groupVisit.title}</h1>

        {status === 'finished' ? (
          <>
            <p className="text-text-muted">Il professore ha terminato la sessione prima di avviarla.</p>
            <button
              type="button"
              onClick={() => {
                leaveSession()
                navigate('/')
              }}
              className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent"
            >
              Torna alla Home
            </button>
          </>
        ) : (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent/30 border-t-accent" />
            <p className="text-text-muted">Sei in sala d'attesa. La visita partirà quando il professore la avvia.</p>
          </>
        )}

        {error && <p className="text-sm text-[color:var(--color-error)]">{error}</p>}
      </div>
    </div>
  )
}

export default SessionLobby
