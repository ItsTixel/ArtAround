# Consigli per il testing dei contenuti

> Guida per chi prova ArtAround a mano: **quale visita provare con quale
> profilo utente**, in che ordine, e cosa guardare. Serve a esercitare tutte
> le funzionalità (paywall, toni, mappe, approfondimenti, visite di gruppo,
> quiz) senza dover indovinare quali dati usare.

---

## 1. Come usare questo documento

- [ ] Ogni sezione = uno scenario: **profilo** + **visita/contenuto** + **passi** + **cosa verificare**
- [ ] Prerequisiti: backend + mongod attivi, seed importati (vedi `docs/architettura-db.md` §7)
- [ ] Le due app: marketplace (`/marketplace`) per creare/sfogliare/adottare, navigator (`/navigator`) per fare la visita
- [ ] Reset: come tornare a uno stato pulito tra uno scenario e l'altro

## 2. Profili utente di prova

Tabella dei profili da usare negli scenari (username, ruolo, cosa possiede).

| Profilo | Ruolo | Stato / cosa ha | Usato per |
|---|---|---|---|
| [ ] `autore-demo` | author | ha creato musei, opere, visite pubbliche e a pagamento | creazione contenuti, storico vendite |
| [ ] `visitatore-nuovo` | visitor | nessuna visita adottata, nessun bookmark | primo accesso, paywall, adozione |
| [ ] `visitatore-pro` | visitor | ha adottato visite a pagamento + bookmark | visita completa, ripresa progresso |
| [ ] `professore-gruppo` | author | proprietario di una visita di gruppo con `code` e quiz | avvio sessione live, pannello docente |
| [ ] `studente-1` / `studente-2` | visitor | partecipano a una visita di gruppo | join, telemetria, quiz |
| [ ] `google-user` | visitor | account creato via Google Sign-In (senza password) | login alternativo |

- [ ] Per ciascun profilo: credenziali o come crearlo/seedarlo

## 3. Contenuti di prova consigliati

Quali visite/opere usare e perché ognuna è interessante.

- [ ] **Visita "singolo museo, breve"** — 2–3 step, un solo museo: smoke test rapido
- [ ] **Visita "multi-museo"** — step in musei diversi: verifica `museum[]` inferito, note logistiche
- [ ] **Visita a pagamento** (`base_price > 0`) — paywall
- [ ] **Visita gratuita pubblica** (`base_price = 0`, `is_public = true`)
- [ ] **Visita privata** (`is_public = false`) — visibile solo all'autore
- [ ] **Visita con tutti i toni** — opere con Item `childish`/`simple`/`medium`/`technical`: selettore del tono
- [ ] **Visita con approfondimenti** — step su Entity senza `placements`: InsightModal, tag verificati
- [ ] **Visita con tema personalizzato** (`theme`): palette chiara/scura + font applicati dal navigator
- [ ] **Visita di gruppo** con `code` + `quiz`: sessione live
- [ ] **Opera con licenza `Private`/`Reserved`**: usabile in visita solo dall'autore

## 4. Scenari di test

Per ogni scenario: **Profilo**, **Contenuto**, **Passi**, **Risultato atteso**.

### 4.1 Primo accesso e adozione di una visita gratuita
- [ ] Profilo: `visitatore-nuovo` · Contenuto: visita gratuita pubblica
- [ ] Passi: registrazione/login → sfoglia visite → apri dettaglio → adotta → apri nel navigator
- [ ] Attese: compare in "le mie visite", nessun pagamento richiesto, si avvia dal primo step

### 4.2 Paywall su visita a pagamento
- [ ] Profilo: `visitatore-nuovo` · Contenuto: visita a pagamento
- [ ] Passi: apri dettaglio visita non adottata → prova ad avviarla
- [ ] Attese: visita bloccata finché non adottata; `GET /api/items/:id` resta accessibile (nessuna UI di "item bloccato" nel item-modal); dopo l'adozione si crea un Order con `price_paid`

### 4.3 Visita completa con cambio di tono
- [ ] Profilo: `visitatore-pro` · Contenuto: visita con tutti i toni
- [ ] Passi: avvia visita → per un'opera cambia tono → scorri i paragrafi → metti in pausa/riprendi il player
- [ ] Attese: il testo cambia col tono, i paragrafi sono sequenziali, la durata stimata è coerente

### 4.4 Navigazione mappa e indicazioni
- [ ] Profilo: `visitatore-pro` · Contenuto: museo con `maps` e `services`
- [ ] Passi: apri Mappa → tocca un punto opera → usa "Indicazioni" verso un servizio (es. Toilette/Uscita)
- [ ] Attese: i punti restano allineati ridimensionando, l'indicazione vocale corrisponde al `service_key`

### 4.5 Approfondimenti
- [ ] Profilo: `visitatore-pro` · Contenuto: visita con step di approfondimento
- [ ] Passi: durante un'opera apri un approfondimento → ascolta qualche paragrafo → chiudi
- [ ] Attese: il tag risulta "verificato/ascoltato", riapribile, tono/paragrafo tracciati separatamente dall'opera

### 4.6 Ripresa del progresso
- [ ] Profilo: `visitatore-pro` · Contenuto: qualsiasi visita a più step
- [ ] Passi: avanza di qualche step → esci dal navigator → rientra
- [ ] Attese: la visita riprende dallo step/paragrafo dove era rimasta

### 4.7 Comandi vocali e lettura ad alta voce
- [ ] Profilo: `visitatore-pro`
- [ ] Passi: attiva la sintesi vocale sulla descrizione → prova un comando vocale (avanti/pausa)
- [ ] Attese: `SpeechSynthesis` legge il paragrafo, `SpeechRecognition` esegue il comando; degrado pulito se il browser non supporta

### 4.8 Scansione QR
- [ ] Profilo: `visitatore-nuovo`
- [ ] Passi: dal marketplace genera il QR di una visita → nel navigator scansiona con la fotocamera
- [ ] Attese: il QR porta alla visita giusta; gestione del permesso fotocamera negato

### 4.9 Visita di gruppo — lato professore
- [ ] Profilo: `professore-gruppo` · Contenuto: visita di gruppo con `code` + `quiz`
- [ ] Passi: apri la sessione → stato `waiting` → avvia (`active`) → avanza gli step → lancia il `quiz` → chiudi (`finished`)
- [ ] Attese: `live_session` sovrascritta all'apertura (niente storico), pannello mostra tono/paragrafo/"pronto" per studente, approfondimenti ascoltati visibili

### 4.10 Visita di gruppo — lato studente
- [ ] Profilo: `studente-1` + `studente-2` (due browser/sessioni) · Contenuto: come sopra
- [ ] Passi: join col `code` → segui gli step → apri un approfondimento → rispondi al quiz
- [ ] Attese: telemetria in tempo reale al professore via Socket.IO, `insight_paragraph_total` inviato dallo studente, `quiz_score` calcolato

### 4.11 Autore: creazione contenuti
- [ ] Profilo: `autore-demo`
- [ ] Passi: crea museo → crea opera (Entity) + descrizioni (Item) con toni diversi → crea visita con step in più musei
- [ ] Attese: `museum[]` e `estimated_duration_sec` inferiti, validazioni (≥1 step, ≥1 descrizione, museo = placement dell'entity)

### 4.12 Licenze degli Item
- [ ] Profilo: `autore-demo` poi `visitatore-pro`
- [ ] Passi: l'autore usa un Item `Reserved` in una visita → un altro autore prova a usarlo
- [ ] Attese: consentito solo all'autore dell'Item, errore chiaro altrimenti

### 4.13 Profilo utente e avatar
- [ ] Profilo: `visitatore-pro` / `google-user`
- [ ] Passi: modifica `display_name`/`bio` → carica avatar → login con Google
- [ ] Attese: upload via multer ok, account Google senza password, dati persistiti

### 4.14 Storico ordini
- [ ] Profilo: `autore-demo` (venditore) + `visitatore-pro` (acquirente)
- [ ] Passi: acquirente adotta una visita a pagamento → poi la rimuove
- [ ] Attese: Order creato e poi cancellato; una sola adozione per coppia `{buyer, visit}`

## 5. Casi limite da provare

- [ ] Visita con un solo step
- [ ] Opera presente in più musei (placement multipli)
- [ ] Step di approfondimento (Entity senza placement) con museo scelto a mano
- [ ] Visita di gruppo senza quiz
- [ ] Item eliminato citato da una visita (regressione paywall già corretta)
- [ ] Descrizioni con `duration_sec` molto diversi → durata stimata
- [ ] Tema con solo alcune chiavi di palette valorizzate (le altre ai default)
- [ ] Riapertura di una sessione di gruppo già `finished`

## 6. Cosa NON serve testare qui

- [ ] Unit test automatici (`backend/test/`, `navigator/src/**/*.test.js`): coperti a parte
- [ ] Dettagli di stile/design system

## 7. Checklist rapida "tutto funziona"

- [ ] Login (locale + Google)
- [ ] Sfoglia + adotta visita gratuita
- [ ] Paywall su visita a pagamento
- [ ] Visita completa con cambio tono + approfondimento
- [ ] Mappa + indicazioni
- [ ] Sessione di gruppo con 2 studenti + quiz
- [ ] Creazione museo/opera/visita da autore
