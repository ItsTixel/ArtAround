# Insegnamento di Tecnologie Web
# CdS In Informatica
# (A.A. 2025-26)

# Progetto ArtAround 18-24 18-27 18-33

# READ ME DEL PROGETTO ARTAROUND

## Nome del gruppo:
Boia dé che gruppo


## Membri del gruppo

* Nome e cognome: Zeno Maccari, matricola: 1175138, mail: zeno.maccari@studio.unibo.it
* Nome e cognome: Dusan Arandelovic, matricola: 1163531, mail: dusan.arandelovic@studio.unibo.it
* Nome e cognome: Luca Argentino, matricola: 1161779, mail: luca.argentino@studio.unibo.it
* LLM: Claude Code Pro - Sonnet 5

_Il primo membro della lista verrà considerato come punto di contatto primario. Sarà la persona
incaricata di spedire mail (sempre e solo dall'indirizzo studio.unibo.it) e tenere contatti con i docenti. Ogni mail deve sempre includere tutti i componenti del gruppo in cc, e deve essere indirizzata a tutti i docenti del corso:_

* fabio.vitali@unibo.it
* andrea.schimmenti2@unibo.it
* gianmarco.spinaci2@unibo.it
* remo.grillo@unibo.it

## Tipo progetto
18-27

## Data di disponibilità delle applicazioni
TBA

## Locazione del progetto:

Tutto il sito è servito da un unico server Node/Express sulla stessa origin.
Le applicazioni non hanno un dominio proprio: sono montate su path diversi
dello stesso host.

* URI del marketplace: https://site242555.tw.cs.unibo.it/marketplace
* URI del navigator: https://site242555.tw.cs.unibo.it/navigator
* Altri URI rilevanti:
  * https://site242555.tw.cs.unibo.it/ — landing page del progetto
  * https://site242555.tw.cs.unibo.it/api — base delle API REST (auth, museums, entities, items, visits, users, orders)
  * https://site242555.tw.cs.unibo.it/assets — asset statici e immagini caricate dagli utenti
  * https://site242555.tw.cs.unibo.it/socket.io — canale WebSocket (Socket.IO) per le visite di gruppo "live"

## Organizzazione dei sorgenti

Permessi: file `644`, directory `755`.
Il repository contiene una directory per ciascuna delle due applicazioni
client (`marketplace/`, `navigator/`) più una directory per l'applicazione
server-side (`backend/`), oltre agli asset e agli script condivisi.

```
/                       radice del repository
├── backend/            applicazione server-side (Node.js + Express + MongoDB)
│   ├── index.js        entry point: monta le route, avvia il server HTTP + Socket.IO, si connette a MongoDB e serve marketplace/navigator/assets come statici
│   ├── routes/         definizione degli endpoint REST, una per risorsa (auth, museums, entities, items, visits, users, orders, dev, landing)
│   ├── controllers/    logica applicativa di ogni risorsa (incl. visit.js: visite singole e ciclo di vita delle sessioni di gruppo)
│   ├── models/         schemi Mongoose: User, Museum, Entity, Item, Visit, Quiz, Order
│   ├── middlewares/    autenticazione JWT (verifyToken/optionalAuth), controlli di ruolo e proprietà, upload immagini (multer), rate limiting
│   ├── sockets/        server Socket.IO e handler della sessione "live" delle visite di gruppo (join, stato partecipanti, quiz)
│   └── utils/          helper generici (generazione dei codici visita)
│
├── marketplace/        applicazione "marketplace" — HTML + CSS + JavaScript vanilla, nessun bundler JS (unico step di build: il CSS di Tailwind)
│   ├── pages/          una pagina HTML per vista (index, opere, visits, my-visits, profile, create-museum/entity/item/visit, landing)
│   ├── login.html, register.html   pagine di autenticazione
│   ├── components/     Web Components nativi (customElements) riutilizzabili: navbar, footer, card e modali di musei/opere/visite, sidebar dei filtri, modale licenze
│   ├── js/             moduli ES: logica di pagina, sessione/auth lato client, wizard dei form, gestione tema, generazione QR; js/vendor/ contiene librerie incluse a mano (qrcode.mjs)
│   └── css/            fogli di stile scritti a mano, uno per pagina + base.css condiviso + tailwind.css (generato dalla CLI di Tailwind, da non modificare a mano)
│
├── navigator/          applicazione "navigator" — Single Page Application React, build con Vite
│   ├── index.html      entry HTML della SPA
│   ├── vite.config.js  configurazione Vite (base /navigator/, proxy verso il backend in sviluppo)
│   ├── src/
│   │   ├── main.jsx, App.jsx    bootstrap React e definizione delle route (react-router)
│   │   ├── pages/      una vista per schermata: Home, SelectVisit, Mappa, Opera, Comandi, Qr, Gruppo, SessionLobby
│   │   ├── components/ componenti UI (player audio, bottom nav, modali, pannello di ascolto, indicatore microfono, quiz di gruppo…)
│   │   ├── context/    React Context per lo stato globale: AuthContext, ActiveVisitContext, VisitProgressContext, GroupSessionContext
│   │   ├── hooks/      custom hook (focus trap, tasto Esc, titolo pagina, tema della visita, tag degli approfondimenti verificati)
│   │   ├── layout/     AppLayout — shell con navigazione e player
│   │   └── utils/      helper (slug, sintesi vocale, gestione visita museo)
│   ├── public/         asset statici copiati as-is nella build (icons.svg)
│   └── dist/           build di produzione generata da `npm run build`, servita dal backend su /navigator
│
├── assets/             asset comuni serviti su /assets: logo, favicon, immagini della landing, mappe dei musei, uploads/ (immagini caricate dagli utenti: musei, opere, entità, avatar)
├── tailwind.config.js  config di Tailwind per il marketplace (content, dark mode via [data-theme], token font)
├── tailwind-input.css   sorgente della CLI di Tailwind, compilato in marketplace/css/tailwind.css
└── package.json        (radice) script `build:css`/`watch:css` per il CSS del marketplace + dipendenze condivise dallo strato Socket.IO (socket.io, cookie); devDependency `tailwindcss`
```

## Tecnologie utilizzate
#### Server-side

* Linguaggio: JavaScript (Node.js 22)
* Framework: Express 4
* Database: MongoDB, tramite l'ODM Mongoose 7
* Realtime: Socket.IO 4 (sessioni "live" delle visite di gruppo, autenticate con lo stesso cookie JWT delle API REST)
* Autenticazione: JWT (cookie httpOnly) + bcrypt per l'hashing delle password + Google Sign-In
* Pacchetti NPM installati (backend/package.json):
  * `express` — web server e routing
  * `mongoose` — ODM per MongoDB
  * `socket.io` — WebSocket / eventi realtime
  * `jsonwebtoken` — generazione e verifica dei token JWT di sessione
  * `bcrypt` — hashing delle password
  * `cookie-parser` — lettura dei cookie nelle richieste Express
  * `cookie` — parsing del cookie nell'handshake di Socket.IO (dove cookie-parser non arriva)
  * `cors` — richieste cross-origin, con header `X-Total-Count` esposto (usato dal navigator)
  * `multer` — upload di immagini su disco (musei, opere, entità, avatar)
  * `google-auth-library` — verifica degli ID token di Google Sign-In
  * `mongodb` — driver MongoDB (dichiarato esplicitamente; usato di fatto da Mongoose)
  * `dotenv` - lettura delle variabili d'ambiente
  * `nodemon` (devDependency) — riavvio automatico del server in sviluppo

#### Applicazione marketplace

* Linguaggi: HTML5, CSS3, JavaScript (ES modules, serviti direttamente al browser — nessun transpiler né bundler)
* Architettura: multi-page (una pagina HTML per vista); parti riutilizzabili implementate come Web Components nativi (`customElements`), senza alcun framework
* CSS: fogli di stile scritti a mano + Tailwind CSS compilato in un file statico. La CLI di Tailwind (`npm run build:css` nella radice) compila `tailwind-input.css` in `marketplace/css/tailwind.css` — con la config in `tailwind.config.js` (radice) — che le pagine linkano al posto della vecchia Play CDN
* Un solo pacchetto NPM, di build: `tailwindcss` (v3, devDependency nel `package.json` della radice), usato solo dalla CLI per generare il CSS; a runtime le pagine non caricano alcuna libreria (JavaScript vanilla, ES module serviti così come sono). I Google Fonts sono inclusi via `<link>`; `marketplace/js/vendor/qrcode.mjs` è una libreria di generazione QR code inclusa manualmente nel repository (non da npm)
* API del browser utilizzate: Fetch, Web Components / Custom Elements, `localStorage` (preferenza tema), Canvas (anteprime immagini)

#### Applicazione navigator

* Linguaggi: JavaScript + JSX
* Framework: React 19 (Single Page Application)
* Routing: react-router-dom 7 (BrowserRouter, route caricate in lazy)
* Build tool: Vite 8 con `@vitejs/plugin-react`
* Styling: Tailwind CSS 4 tramite il plugin `@tailwindcss/vite`, configurazione CSS-first con `@theme` (nessun `tailwind.config.js`, a differenza del marketplace che usa Tailwind 3 con la CLI)
* Pacchetti NPM installati (navigator/package.json):
  * `react`, `react-dom` — libreria UI
  * `react-router-dom` — routing lato client
  * `socket.io-client` — connessione realtime alle sessioni di gruppo
  * `jsqr` — decodifica dei QR code dal flusso video della fotocamera
  * devDependencies: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `oxlint` (linter), `@types/react`, `@types/react-dom`
* API del browser utilizzate: `getUserMedia` (fotocamera per la scansione QR), Web Speech API — `SpeechSynthesis` (lettura ad alta voce delle descrizioni) e `SpeechRecognition` (comandi vocali), Canvas, `localStorage` (preferenza tema, condivisa con il marketplace)


## Contributo individuale
Il lavoro è stato principalmente svolto in maniera collettiva, in particolare però i singoli membri si sono concentrati individualmente su:
#### Zeno Maccari:
Ideazione degli oggetti del database e relazioni, route/controller di museums/entities/items/orders, pagine e componenti del marketplace persfogliare e creare contenuti (opere, create-*), mappe dei musei.
#### Dusan Arandelovic:
Login + registrazione + JWT (cookie httpOnly, bcrypt, Google Sign-In), middlewares ruoli/proprietà, rate limiting, pagine login.html/register.html, AuthContext del navigator, area profilo utente e upload avatar (multer).
#### Luca Argentino:
Ideazione del design system e applicazione a tutte le pagine (marketplace + navigator, tema, token, Tailwind di entrambe), landing page, schermate di visita del navigator (player audio, Web Speech, scanner QR), visite di gruppo "live" con Socket.IO (server + client + quiz) e design delle card e dei modal degli oggetti.
#### LLM:
I modelli di LLM sono stati usati in modalità agentica per:
* Discutere e progettare scelte implementative;
* Code review;
* Ottimizzazione del codice;
* Testing;
* Bug fixing.
Tutte le interazioni seguivano questo workflow:
* Discussione e progettazione tra i membri sull'archittetura e sul design delle modifiche da fare;
* Spiegazione all'agente nel dettaglio delle modifiche richieste, con vincoli e contesto dell'archittetura. Chiedendo di sviluppare un piano operativo prima di ogni modifica;
* Controllo e conferma del piano, con possibili proposte di cambiamento;
* Controllo delle modifiche effettuate, testing sia umano che di un secondo agente.