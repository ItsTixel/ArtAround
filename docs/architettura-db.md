# Scelte architetturali del database

> Documento che spiega **perché** il modello dati di ArtAround è fatto così:
> collezioni, relazioni, cosa è embeddato e cosa è referenziato, indici e
> vincoli applicativi. Non è un dump degli schemi (quelli stanno in
> `backend/models/`), ma la motivazione dietro le decisioni.

---

## Quadro generale

L'obiettivo dell'architettura dell'intero sito, a partire dal database, è fornire un sistema flessibile. Sia i visitatori che gli autori hanno la possibilità di andare molto nel dettaglio nella creazione e fruizione di contenuti, ma non sono obbligati.

In questo documento sono spiegate le scelte più esemplificative per raggiungere questo scopo, mettendo in secondo piano il lato tecnico e concentrandosi su quello di design.

## Le collezioni

Per ognuna: scopo, campi principali, cosa è embeddato, a cosa fa riferimento, perché.

### User
- Gli utenti si dividono in due ruoli: visitatori e autori. Solo gli autori possono creare contenuti, tuttavia qualora un visitatore fosse interessato a cominciare a creare contenuti può istantaneamente fare l'upgrade ad "Autore" nel profilo con un click. 
-  Account locali vs Google Sign-In, ogni utente può scegliere il metodo di autenticazione che preferisce.

### Museum
- Ogni museo ha diversi campi possibili, ma solo lo stretto indispensabile è obbligatorio, tutto il resto del sito è adatto ad usare musei con informazioni minimali
- Ogni autore può modificare i musei (così come le opere), in questo modo un utente può creare soltanto l'entry nel database e lasciare che il resto della community inserisca il resto delle informazioni.
- La mappa è semplicemente un'immagine con una serie di punti di interesse (ognuno con coordinate normalizzate sull'immagine), rendendo l'aggiunta di una mappa molto veloce.

### Entity ("opera" / "approfondimento")
- Le entity sono una delle unità fondamentali del database, rappresentano gli oggetti della visita. Ogni entity può essere o fisica (un quadro, una scultura) o astratta (un concetto, una persona)
- Le entity contengono solo informazioni intrinseche all'opera, il nome, una foto o la posizione, le informazioni estrinseche (le descrizioni) sono disaccoppiate e inserite in "Item".
- Disaccopiare descrizioni ed opere aggiunge un step di complessità all'architettura, ma porta diversi benefici:
  - Un autore può semplicemente "riempire" un museo con tutte le opere, non è obbligato a scrivere anche tutte le descrizioni in una volta
  - Nel database ci possono essere più descrizioni per la singola opera anche con lo stesso tono, per esempio si possono differenziare per il modo in cui viene descritta l'opera.
- Per semplificare l'uso per i visitatori è sempre possibile chiedere al sito opere già fornite di descrizioni (es: nella richiesta di approfondimenti o dopo lo scan di un codice QR), in questo caso il backend si occuperà di fornire l'entity richiesta insieme a delle descrizioni pubbliche. In questo modo durante la visita è impossibile che l'utente non abbia accesso a delle informazioni esistenti nel database solo perché in precedenza un autore non ha selezionato tutte le descrizioni.

### Item ("descrizione")
- Gli item sono il secondo componente fondamentale del database, insieme alle entity caratterizzano interamente una visita.
- Ogni descrizione è una lista di paragrafi di durata incrementale con un singolo tono; la lunghezza e il numero dei paragrafi all'interno della descrizione è a completa discrezione dell'autore e delle sue esigenze.
- I quattro toni (infantile, elementare, medio, avanzato) caratterizzano ogni descrizione e indicano la difficoltà del testo, permettendo visite flessibili ad ogni esigenza.
- La licenza di ogni descrizione indica la sua visibilità e si dividono in:
  - Pubblica: ogni utente può vedere quella descrizione e usarla per le proprie visite
  - Privata: solo il creatore può vedere quella descrizione e inserirle nelle proprie visite, ugualmente private.
  - Riservate: le descrizioni riservate fanno da ponte tra le due visibilità. Una descrizione riservata può essere messa in descrizioni pubbliche, ma solo dall'autore. In questo modo un autore ha la possibilità di creare contenuti con cura sapendo di poterci guadagnare, inserendo queste descrizioni in visite pubbliche a pagamento. Nessun altro a parte l'autore può monetizzare su quelle descrizioni.

### Visit
- Una visita è un percorso ordinato di step su una o più opere. Ogni visita contiene una lista di step, ogni step contiene l'opera di riferimento e una serie di descrizioni (massimo una per tono).
- Quest'architettura consente senza problemi di creare visite che comprendono più musei e su qualsiasi argomento.
- La creazione di una visita si compone soltanto dell'unica parte importante: la selezione delle opere e il loro ordine, tutte le complessità aggiuntive son gestite dal sito:
  - Le indicazioni tra un'opera e l'altra son calcolate dinamicamente confrontando la posizione dell'opera attuale e dell'opera successiva, indicando all'utente le differenze (es: "Procedi alla stanza 2" oppure "Procedi al museo Galleria degli Uffizi, Piano 1, stanza 1")
  - Le indicazioni su punti di interesse nel museo (es: il bagno, l'uscita o le scale) vengono importate dal museo.
  - Le descrizioni possono essere selezionate manualmente dall'autore, ma se non si è interessati si può semplicemente cliccare "Compila automaticamente" e vengono selezionate tutte le descrizioni necessarie istantaneamente.
  - Gli approfondimenti sono generati tramite ricerca nel database dei tag dell'opera attuale e delle descrizioni.
  - La durata totale è semplicemente la somma degli step della visita, cioè delle descrizioni.
- Ogni visita a pagamento è da paywall paywall lato backend, un utente non può visualizzare le descrizioni di una visita non comprate, ma soltanto quali step la compongono


------- Da rimuovere tutto il sottostante
### 2.6 Visite di gruppo (dentro Visit)
- [ ] `is_group`: invarianti forzate nell'hook (`is_public = false`, `base_price = 0`) e perché
- [ ] `code` (unique + **sparse**): perché sparse — le visite singole non hanno codice e non devono violare l'unique
- [ ] `quiz` → Quiz (opzionale anche per i gruppi)
- [ ] `live_session` → `liveSessionSchema` **sotto-documento singolo, non storico**: sovrascritto a ogni riapertura, niente multi-sessione
  - [ ] `status` (`idle`→`waiting`→`active`→`quiz`→`finished`), `current_step_index`, timestamp
  - [ ] `participants[]` → `liveParticipantSchema`: stato per-studente (tono, `paragraph_index`, `playback_state`, `ready`)
  - [ ] Tracciamento approfondimenti: `active_insight_tag`, `insight_tags_viewed[]`, campi `insight_*` speculari a quelli dell'opera principale
  - [ ] Perché `null` è esplicito negli enum `insight_*` (validatori di update di Mongoose vs validazione del documento)
  - [ ] `insight_paragraph_total` mandato dallo studente (il professore non ha gli item dell'approfondimento)
  - [ ] `quiz_answers[]`, `quiz_score`

### 2.7 Order
- [ ] Perché esiste oltre a `User.adopted_visits`: serve storico con `price_paid` e data (acquisti lato buyer, vendite lato seller)
- [ ] Indice unico `{ buyer, visit }`: un utente adotta una visita una volta sola; relazione con `$addToSet` su User
- [ ] Ciclo di vita: creato all'adozione, cancellato alla rimozione

### 2.8 Quiz
- [ ] `questions[]` → `questionSchema` embeddato: `text`, `options[]` (≥2), `correct_option_index` validato contro `options.length`
- [ ] `question.item` opzionale: quando una domanda è legata a un'opera
- [ ] Relazione con Visit (`Visit.quiz`) e con la sessione live (`participants.quiz_answers/score`)

## 3. Embed vs riferimento: i criteri

- [ ] Regola generale adottata (embed per dati posseduti e non condivisi / ref per entità con vita propria o condivise)
- [ ] Tabella riassuntiva: per ogni relazione → scelta → motivo
  - [ ] `Visit.steps` embed · `Visit.steps.entity/items` ref · `Visit.live_session` embed · `Museum.maps` embed · `Item.descriptions` embed · `Entity.placements` embed · `User.adopted_visits` array di ref · `Order` collezione separata
- [ ] Costi accettati: aggiornare un item non aggiorna le visite che lo citano (snapshot vs vista live) — dove è un problema e dove no

### 3.1 Dati derivati / denormalizzati
- [ ] Cosa viene calcolato nell'hook `pre('save')` di Visit e perché lì
- [ ] Rischi di disallineamento e come sono mitigati

### 3.2 Il caso "approfondimento"
- [ ] Entity senza `placements` usata come step di visita: l'autore sceglie il museo dello step a mano
- [ ] Come l'hook di validazione di Visit distingue i due casi (placement valido vs museo esistente)

## 4. Vincoli e regole applicative (non solo di schema)

- [ ] Validazioni custom negli schemi: `steps.length > 0`, `descriptions.length > 0`, `questions.length > 0`, pattern hex/font del tema
- [ ] Regole imposte nell'hook `Visit.pre('save')`:
  - [ ] `step.museum` deve essere un placement di `step.entity` (o un museo esistente se l'entity non ha placement)
  - [ ] Item `Private`/`Reserved` usabili in visita solo dal loro autore
  - [ ] Invarianti delle visite di gruppo
- [ ] Paywall: dove vive (`isVisitUnlocked`, `base_price`), cosa gatekeep**a** (le visite) e cosa **no** (`GET /api/items/:id` resta libero per design)
- [ ] Permessi per ruolo/proprietà: rimando ai middleware in `backend/middlewares/`

## 5. Indici

- [ ] Elenco indici dichiarati: `User.username/email/googleId`, `Museum.name`, `Visit.code` (unique sparse), `Order {buyer,visit}` unique
- [ ] Indici impliciti (`_id`) e query principali che li sfruttano
- [ ] Indici mancanti noti / possibili ottimizzazioni future (ricerca full-text, `tags`, `placements.museum`)

## 6. Alternative valutate e scartate

- [ ] `steps` come collezione separata
- [ ] `descriptions` come Item indipendenti invece che embeddate
- [ ] Storico multi-sessione per le visite di gruppo
- [ ] Un solo campo "difficoltà" invece del `tone`
- [ ] Per ognuna: perché è stata scartata

## 7. Evoluzione e migrazioni

- [ ] Come sono gestiti i cambi di schema finora (assenza di migrazioni formali, reimport dei seed)
- [ ] Dati di seed: dove stanno, flusso di reimport (`mongoimport`)
- [ ] Cosa servirebbe per andare in produzione (script di migrazione, versionamento schema)
