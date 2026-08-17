// Classi Tailwind condivise per lo stile "vetro" (glass) usato dai
// web component. Rispecchiano le variabili --universal-glass-* di
// css/base.css: qui vivono come classi perché i componenti compongono
// markup via Tailwind, non tramite CSS custom properties dirette.

// La classe `liquid-glass`/`liquid-glass-pill` (css/base.css) sovrascrive
// bg/box-shadow via !important con lo stesso vetro convesso (highlight in
// alto, ombra interna in basso) usato dal resto dell'app — le utility
// Tailwind restano solo per blur/border/radius, che !important non tocca.
export const GLASS = 'liquid-glass bg-slate-400/10 backdrop-blur-lg border border-slate-400/20 shadow-xl shadow-black/5 rounded-2xl';
// Variante più opaca dello stesso "vetro", usata dove il contenuto (es. pillole
// di testo sopra foto) deve restare leggibile anche su sfondi molto chiari o
// contrastati. Stessa opacità di sfondo usata dalla navbar.
export const GLASS_STRONG = 'liquid-glass bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border border-slate-400/20 shadow-xl shadow-black/5 rounded-2xl';
// I modali (museo/visita/opera) restano sull'opacità piena
// bg-white/85 dark:bg-slate-900/85 — la stessa dei modali del navigator
// (VisitDetailModal, VisitAdoptModal...) — invece del gradiente quasi
// trasparente di `.liquid-glass`: qui sotto c'è quasi sempre una foto
// (cover del museo/opera), e con lo sfondo verde-vetro sottile il testo
// perdeva contrasto. `.liquid-glass-modal` aggiunge solo l'ombra interna
// (la sagomatura convessa), senza toccare bg/opacità.
export const GLASS_MODAL = 'liquid-glass-modal bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-400/20 shadow-2xl rounded-2xl';
export const TRANSITION = 'transition-all duration-300 ease-in-out';
// Pillola piccola bordata per etichette informative (tono, licenza, tag).
export const TAG_PILL = 'liquid-glass-pill text-[0.62rem] tracking-[0.06em] uppercase border rounded-md px-2 py-0.5 border-slate-400/30 text-slate-500 dark:text-slate-400';
