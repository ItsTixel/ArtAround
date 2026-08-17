import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

// Cuoricino per aggiungere/togliere una visita dai preferiti (bookmarked_visits),
// usato nell'header dei modal di dettaglio/adozione visita. Le visite di gruppo
// non si possono salvare nei preferiti (si entra con un codice), come impone
// anche il backend.
function FavoriteButton({ visit, className = '' }) {
  const { user, refresh } = useAuth()
  const [favorited, setFavorited] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setFavorited((user?.bookmarked_visits || []).some((id) => String(id) === String(visit._id)))
  }, [user, visit._id])

  if (!user || visit.is_group) return null

  async function toggle() {
    const next = !favorited
    setFavorited(next)
    setPending(true)
    try {
      const res = await fetch(`/api/users/${user._id}/bookmark/${visit._id}`, {
        method: next ? 'PUT' : 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      await refresh()
    } catch {
      setFavorited(!next)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
      className={`glass-chip flex h-9 w-9 items-center justify-center rounded-full border border-slate-400/20 backdrop-blur-lg hover:bg-white/20 hover:border-white/30 disabled:opacity-50 ${className}`}
    >
      <svg
        className={`h-4 w-4 ${favorited ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-current text-text'}`}
        viewBox="0 0 24 24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20.6s-6.9-4.35-9.5-8.4C.9 9.1 1.7 5.4 5 4c2.2-.9 4.5 0 5.8 2l1.2 1.5L13.2 6c1.3-2 3.6-2.9 5.8-2 3.3 1.4 4.1 5.1 2.5 8.2-2.6 4.05-9.5 8.4-9.5 8.4z" />
      </svg>
    </button>
  )
}

export default FavoriteButton
