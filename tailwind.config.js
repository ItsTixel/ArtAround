/** @type {import('tailwindcss').Config} */
// Config del marketplace, prima inline (e duplicata) nell'<head> di ogni
// pagina come `tailwind.config = {...}` per la Play CDN. Ora vive qui e la
// CLI compila un CSS statico (marketplace/css/tailwind.css), linkato dalle
// pagine al posto di cdn.tailwindcss.com — vedi script "build:css".
module.exports = {
  content: ['./marketplace/**/*.{html,js}'],
  // Il tema light/dark è pilotato da [data-theme] su <html> (vedi lo
  // script inline anti-FOUC in cima a ogni pagina), non da prefers-color-scheme.
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Le utility font-sans/serif/mono puntano ai token di base.css,
      // così non serve più ripetere il font-family inline nel markup.
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
};
