// Classi Tailwind condivise per lo stile "vetro" (glass) usato dai
// web component. Rispecchiano le variabili --universal-glass-* di
// css/base.css: qui vivono come classi perché i componenti compongono
// markup via Tailwind, non tramite CSS custom properties dirette.

export const GLASS = 'bg-slate-400/10 backdrop-blur-lg border border-slate-400/20 shadow-xl shadow-black/5 rounded-2xl';
export const GLASS_MODAL = 'bg-slate-400/10 backdrop-blur-2xl border border-slate-400/20 shadow-2xl rounded-2xl';
export const TRANSITION = 'transition-all duration-300 ease-in-out';
