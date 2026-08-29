import { useEffect, useState } from 'react'

// Verifica quali tag hanno un'opera-approfondimento associata (un'opera,
// anche non fisica, il cui nome coincide esattamente col tag — vedi
// InsightModal), così i bottoni si mostrano solo per i tag che hanno
// davvero contenuti. Usa richieste HEAD: il backend espone il conteggio
// totale nell'header X-Total-Count (vedi controllers/entity.js), quindi
// basta leggere gli header senza scaricare il body di ogni risposta.
// Condivisa da Comandi.jsx (la lista dei bottoni) e Opera.jsx (il bottone
// "vai agli approfondimenti"), così entrambi concordano su quali tag
// contano come approfondimenti disponibili.
export default function useVerifiedInsightTags(tags) {
  const [verifiedTags, setVerifiedTags] = useState([])
  const tagsKey = (tags || []).join('|')

  useEffect(() => {
    if (!tagsKey) {
      setVerifiedTags([])
      return
    }
    let cancelled = false
    Promise.all(
      tagsKey.split('|').map((tag) =>
        fetch(`/api/entities?name_exact=${encodeURIComponent(tag)}&pageSize=1`, { method: 'HEAD' })
          .then((res) => (parseInt(res.headers.get('X-Total-Count') || '0', 10) > 0 ? tag : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) setVerifiedTags(results.filter(Boolean))
    })
    return () => {
      cancelled = true
    }
  }, [tagsKey])

  return verifiedTags
}
