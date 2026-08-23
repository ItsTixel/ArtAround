import { useEffect } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function focusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null
  )
}

// Intrappola il focus dentro il dialog mentre è aperto: alla comparsa lo
// sposta al suo interno, impedisce al Tab di uscire verso la pagina
// sottostante, e lo restituisce a chi l'aveva aperto alla chiusura.
// Interroga il DOM a ogni Tab (invece di calcolare gli elementi una volta
// sola) perché il contenuto del dialog può cambiare mentre resta aperto
// (cambio schermata, domanda successiva del quiz, stato di errore…).
//
// `active` serve per i dialog che restano montati sempre (es. un overlay
// globale che si mostra/nasconde con un `if (...) return null` interno
// invece di essere montato/smontato dal genitore): senza, l'effetto
// scatterebbe una sola volta al mount del componente, quando il dialog non
// è ancora visibile e containerRef.current è ancora null.
export default function useFocusTrap(containerRef, active = true) {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement
    const [first] = focusableElements(container)
    ;(first || container).focus()

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return
      const items = focusableElements(container)
      if (!items.length) { e.preventDefault(); return }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === firstItem || !container.contains(active)) {
          e.preventDefault()
          lastItem.focus()
        }
      } else if (active === lastItem || !container.contains(active)) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [containerRef, active])
}
