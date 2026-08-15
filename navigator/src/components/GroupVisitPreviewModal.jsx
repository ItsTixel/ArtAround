import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGroupSession } from '../context/GroupSessionContext'

const LOGIN_URL = '/marketplace/login.html'
const REGISTER_URL = '/marketplace/register.html'
const PENDING_CODE_KEY = 'navigator_pending_group_code'

const STATUS_LABELS = {
  idle: 'Non ancora aperta',
  waiting: 'In attesa di partire',
  active: 'In corso',
  quiz: 'Quiz in corso',
  finished: 'Terminata',
}

function GroupVisitPreviewModal({ code, preview, onClose }) {
  const { user } = useAuth()
  const { error, openAsHost, resumeAsHost, joinAsStudent } = useGroupSession()
  const [submitting, setSubmitting] = useState(false)

  const isOwn = Boolean(user && preview.author?.username === user.username)

  async function run(action) {
    setSubmitting(true)
    try {
      await action(preview._id)
    } finally {
      setSubmitting(false)
    }
  }

  function saveCodeAndGoAuth(url) {
    localStorage.setItem(PENDING_CODE_KEY, code)
    const redirect = window.location.pathname + window.location.search
    window.location.href = `${url}?redirect=${encodeURIComponent(redirect)}`
  }

  const buttonClasses =
    'w-full rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2.5 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30 disabled:opacity-50'

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-400/20 bg-slate-400/10 backdrop-blur-lg text-lg leading-none text-text hover:bg-white/20 hover:border-white/30"
        >
          ×
        </button>

        <div className="flex-1 overflow-y-auto p-5 pt-12">
          {preview.image_url && (
            <div className="mb-4 h-40 w-full overflow-hidden rounded-xl border border-border">
              <img src={preview.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {STATUS_LABELS[preview.status] || preview.status}
          </span>
          <h2 className="mt-1 font-serif text-xl font-semibold text-text">{preview.title}</h2>
          {preview.author?.display_name && (
            <p className="mt-1 text-sm text-text-muted">A cura di {preview.author.display_name}</p>
          )}
          {preview.description && <p className="mt-3 text-sm text-text">{preview.description}</p>}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4">
          {error && <p className="text-center text-sm text-[color:var(--color-error)]">{error}</p>}

          {!user && (
            <>
              <p className="text-center text-sm text-text-muted">Accedi per unirti a questa visita.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => saveCodeAndGoAuth(LOGIN_URL)}
                  className="flex-1 rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
                >
                  Accedi
                </button>
                <button
                  type="button"
                  onClick={() => saveCodeAndGoAuth(REGISTER_URL)}
                  className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-text"
                >
                  Registrati
                </button>
              </div>
            </>
          )}

          {user && isOwn && preview.status === 'idle' && (
            <button type="button" disabled={submitting} onClick={() => run(openAsHost)} className={buttonClasses}>
              Apri visita
            </button>
          )}
          {user && isOwn && ['waiting', 'active', 'quiz'].includes(preview.status) && (
            <button type="button" disabled={submitting} onClick={() => run(resumeAsHost)} className={buttonClasses}>
              Gestisci visita in corso
            </button>
          )}
          {user && isOwn && preview.status === 'finished' && (
            <button type="button" disabled={submitting} onClick={() => run(openAsHost)} className={buttonClasses}>
              Riapri visita
            </button>
          )}

          {user && !isOwn && preview.status !== 'finished' && (
            <button type="button" disabled={submitting} onClick={() => run(joinAsStudent)} className={buttonClasses}>
              Entra nella visita
            </button>
          )}
          {user && !isOwn && preview.status === 'finished' && (
            <p className="text-center text-sm text-text-muted">Questa visita è terminata.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default GroupVisitPreviewModal
export { PENDING_CODE_KEY }
