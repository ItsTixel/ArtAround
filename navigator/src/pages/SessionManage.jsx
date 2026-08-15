import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroupSession } from '../context/GroupSessionContext'

function SessionManage() {
  const navigate = useNavigate()
  const {
    groupVisit,
    status,
    currentStepIndex,
    roster,
    connected,
    error,
    startSession,
    endSession,
    setActiveStep,
    leaveSession,
  } = useGroupSession()

  const sortedSteps = useMemo(() => {
    if (!groupVisit?.steps?.length) return []
    return [...groupVisit.steps].sort((a, b) => a.order - b.order)
  }, [groupVisit])

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

  function handleExit() {
    leaveSession()
    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {connected ? 'Connesso' : 'Riconnessione…'}
        </span>
        <button type="button" onClick={handleExit} className="text-sm text-text-muted underline-offset-4 hover:underline">
          Esci
        </button>
      </div>

      <h1 className="mt-2 font-serif text-2xl font-semibold text-text">{groupVisit.title}</h1>
      <p className="mt-1 text-sm text-text-muted">Codice: {groupVisit.code}</p>

      {error && <p className="mt-3 text-sm text-[color:var(--color-error)]">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Partecipanti ({roster.length})
        </h2>
        {roster.length === 0 ? (
          <p className="text-sm text-text-muted">Nessuno studente si è ancora unito.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roster.map((p) => (
              <li key={p.userId} className="glass-panel rounded-xl px-4 py-2.5 text-sm text-text">
                {p.display_name || p.username}
              </li>
            ))}
          </ul>
        )}
      </div>

      {status === 'waiting' && (
        <button
          type="button"
          onClick={startSession}
          className="mt-6 rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-3 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
        >
          Avvia visita
        </button>
      )}

      {(status === 'active' || status === 'quiz') && (
        <>
          <div className="mt-5 flex flex-col gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">Opera attiva</h2>
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {sortedSteps.map((step, index) => (
                <li key={step._id || index}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`glass-panel flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${
                      index === currentStepIndex ? 'border-accent!' : ''
                    }`}
                  >
                    {step.entity?.image_url && (
                      <img src={step.entity.image_url} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{step.entity?.name}</span>
                    {index === currentStepIndex && (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-medium text-on-accent">
                        In corso
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              disabled
              title="Disponibile in un prossimo aggiornamento"
              className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-text-muted opacity-50"
            >
              Avvia quiz
            </button>
            <button
              type="button"
              onClick={endSession}
              className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-text"
            >
              Termina visita
            </button>
          </div>
        </>
      )}

      {status === 'finished' && (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-text-muted">Visita terminata.</p>
          <button
            type="button"
            onClick={handleExit}
            className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent"
          >
            Torna alla Home
          </button>
        </div>
      )}
    </div>
  )
}

export default SessionManage
