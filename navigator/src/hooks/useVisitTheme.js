import { useEffect } from 'react'

const STYLE_ID = 'visit-theme-vars'

// Include anche la forma a 8 cifre (#RRGGBBAA): glass_border è nativamente
// traslucido, un hex senza alpha lo renderebbe un anello opaco.
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const FONT_FAMILY_PATTERN = /^[A-Za-z0-9 ]{1,60}$/

const COLOR_VAR_MAP = {
  accent: '--color-accent',
  accent_hover: '--color-accent-hover',
  on_accent: '--color-on-accent',
  bg: '--color-bg',
  surface: '--color-surface',
  text: '--color-text',
  text_muted: '--color-text-muted',
  border: '--color-border',
  glass_border: '--liquid-glass-border'
}

// Rivalida gli stessi pattern dello schema (backend/models/visit.js): non ci
// si fida ciecamente del payload, che potrebbe venire da una modifica diretta
// del DB e finire interpolato in un testo CSS.
function paletteRule(selector, palette) {
  if (!palette) return ''
  const declarations = Object.entries(COLOR_VAR_MAP)
    .filter(([key]) => HEX_COLOR_PATTERN.test(palette[key] ?? ''))
    .map(([key, cssVar]) => `${cssVar}: ${palette[key]};`)
  if (declarations.length === 0) return ''
  return `${selector} { ${declarations.join(' ')} }\n`
}

function fontFamilyValue(family, fallback) {
  if (!FONT_FAMILY_PATTERN.test(family ?? '')) return null
  return `"${family}", ${fallback}`
}

function googleFontsLinkHref(family) {
  const encoded = encodeURIComponent(family).replace(/%20/g, '+')
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700&display=swap`
}

function ensureFontLink(family) {
  if (document.querySelector(`link[data-visit-font="${family}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = googleFontsLinkHref(family)
  link.dataset.visitFont = family
  document.head.appendChild(link)
}

// Applica il tema della visita attiva sovrascrivendo, in uno <style> scoped
// su `body`, le stesse CSS custom properties già usate ovunque nell'app —
// così componenti e classi Tailwind non vanno toccati. Scoped su `body`
// (non su :root) e non su un div interno: `body` copre l'intero viewport,
// quindi anche l'area fuori dalla colonna max-w-md (i margini laterali su
// desktop) prende lo sfondo della visita invece di lasciar trapelare il
// default. Non serve una guardia esplicita per /sessione (SessionLobby, fuori
// da AppLayout): l'effect gira solo mentre AppLayout è montato e il cleanup
// svuota lo style al suo smontaggio, prima che SessionLobby prenda il posto.
// Le due palette (light/dark) riusano il meccanismo già presente in
// index.css ([data-theme="light"] su :root): la cascata CSS fa da sola lo
// switch quando l'utente cambia tema, niente listener JS.
export default function useVisitTheme(activeVisit) {
  const theme = activeVisit?.theme

  useEffect(() => {
    let styleEl = document.getElementById(STYLE_ID)

    if (!theme) {
      if (styleEl) styleEl.textContent = ''
      return
    }

    if (theme.font_serif && FONT_FAMILY_PATTERN.test(theme.font_serif)) ensureFontLink(theme.font_serif)
    if (theme.font_sans && FONT_FAMILY_PATTERN.test(theme.font_sans)) ensureFontLink(theme.font_sans)

    const serif = fontFamilyValue(theme.font_serif, "'Libre Baskerville', Georgia, serif")
    const sans = fontFamilyValue(theme.font_sans, "'Nunito Sans', system-ui, -apple-system, sans-serif")
    const fontDeclarations = [
      serif && `--font-serif: ${serif};`,
      sans && `--font-sans: ${sans};`
    ].filter(Boolean)

    let css = ''
    css += paletteRule('[data-theme="dark"] body', theme.dark)
    css += paletteRule('[data-theme="light"] body', theme.light)
    if (fontDeclarations.length > 0) {
      css += `body { ${fontDeclarations.join(' ')} }\n`
    }

    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = css

    return () => {
      if (styleEl) styleEl.textContent = ''
    }
  }, [theme])
}
