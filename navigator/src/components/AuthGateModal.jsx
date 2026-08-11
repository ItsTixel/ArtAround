import { useAuth } from '../context/AuthContext'

const LOGIN_URL = '/marketplace/login.html'
const REGISTER_URL = '/marketplace/register.html'

// Il login/profilo vive solo nel marketplace: se non sei loggato, il
// Navigator non ha nulla di sensato da mostrare, quindi blocchiamo l'app
// dietro questo popup finché non torni da un login/registrazione riuscito
// (il redirect riporta qui, vedi login.js / register.js nel marketplace).
function AuthGateModal() {
  const { loading, user } = useAuth()
  if (loading || user) return null

  const redirect = encodeURIComponent(window.location.pathname + window.location.search)

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center shadow-xl">
        <h2 className="font-serif text-xl font-semibold text-text">Accesso richiesto</h2>
        <p className="mt-2 text-sm text-text-muted">
          Devi accedere o registrarti per usare il Navigator.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={`${LOGIN_URL}?redirect=${redirect}`}
            className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-[0_0_16px_rgba(212,168,83,0.25)]"
          >
            Accedi
          </a>
          <a
            href={`${REGISTER_URL}?redirect=${redirect}`}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text"
          >
            Registrati
          </a>
        </div>
      </div>
    </div>
  )
}

export default AuthGateModal
