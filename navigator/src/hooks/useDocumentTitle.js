import { useEffect } from 'react'

// Aggiorna il titolo del tab del browser per la pagina corrente, e lo
// ripristina al titolo base quando la pagina viene smontata (cambio rotta).
export default function useDocumentTitle(title) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title ? `${title} · navigator` : 'navigator'
    return () => {
      document.title = previousTitle
    }
  }, [title])
}
