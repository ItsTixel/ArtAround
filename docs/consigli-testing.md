# Consigli per il testing dei contenuti

> Guida per chi prova ArtAround a mano: **quale visita provare con quale
> profilo utente**, in che ordine, e cosa guardare. Serve a esercitare tutte
> le funzionalità (paywall, toni, mappe, approfondimenti, visite di gruppo,
> quiz) senza dover indovinare quali dati usare.

---


## 1. Profili utente di prova

Il profilo consigliato ha queste credenziali:
- Mail: autore1@example.com
- Password: 12345678

Questo è uno dei profili più completi, ha creato e possiede diverse visite (tra cui una di gruppo)

Altri utenti nel database sono (tutti con pwd=12345678):
- alice@example.com
- autore2@example.com
- visitatore1@example.com
- visitatore2@example.com

## 2. Contenuti di prova consigliati

Quali visite usare e perché ognuna è interessante.

- Capolavori degli Uffizi: un percorso essenziale:
    - Visita completa con 15 step;
    - Mappa multipiano;
    - Stile dell'app personalizzato;
    - Ogni step ha tutti i toni e diversi tag di approfondimenti.
- Da Michelangelo a Botticelli: dagli Uffizi all'Accademia:
    -  Visita che comprende più musei.
- Menù degustazione all'Osteria delle Belle Arti:
    - Visita non di un museo, mostra flessibilità dell'app ad altre esperienze.
- Visita di Gruppo (codice GRUPPO):
    - Visita di gruppo della Pinacoteca Nazionale di Bologna;
    - Quiz integrato alla fine del percorso;
    - Visita creata da autore1, deve essere quest'utente ad inserire il codice GRUPPO nel navigator per cominciare la sessione.




------------ Si può eliminare da qui sotto
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
