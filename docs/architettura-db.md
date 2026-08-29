# Scelte architetturali del database

> Documento che spiega **perché** il modello dati di ArtAround è fatto così:
> collezioni, relazioni, cosa è embeddato e cosa è referenziato, indici e
> vincoli applicativi. Non è un dump degli schemi (quelli stanno in
> `backend/models/`), ma la motivazione dietro le decisioni.

---

## 1. Quadro generale

- [ ] DBMS scelto (MongoDB) e ODM (Mongoose 7): motivazioni
- [ ] Documento vs relazionale: perché un modello a documenti si adatta ai contenuti di ArtAround (musei → opere → descrizioni → visite)
- [ ] Diagramma delle collezioni e delle relazioni (embed vs ref)
- [ ] Convenzioni comuni: `timestamps`, ObjectId come chiavi, naming

## 2. Le collezioni

Per ognuna: scopo, campi principali, cosa è embeddato, a cosa fa riferimento, perché.

### 2.1 User
- [ ] Ruoli (`author` / `visitor`) e come guidano i permessi
- [ ] Account locali vs Google Sign-In (`password` condizionale, `googleId` sparse)
- [ ] Array di relazioni denormalizzate: `adopted_visits`, `bookmarked_visits`, `bookmarked_entities` — perché array sull'utente e non collezioni a parte (eccezione: Order, vedi §2.7)
- [ ] Campi di profilo (`display_name`, `bio`, `avatar_url`)

### 2.2 Museum
- [ ] Dati anagrafici + `address` come sotto-documento
- [ ] Uso di `Map` per `services`, `accessibility_info`, `opening_hours`: perché una Map e non un array di coppie o campi fissi
- [ ] `maps[]` → `museumMapSchema` → `mapPointSchema`: punti di interesse con coordinate normalizzate 0–1, perché normalizzate
- [ ] `mapPointSchema.entity` / `service_key`: collegamento punto mappa ↔ opera / servizio
- [ ] Virtual `entities` (reverse populate su `placements.museum`): perché virtual invece di un array `entities` sul museo

### 2.3 Entity ("opera" / "approfondimento")
- [ ] Cos'è una Entity: l'oggetto reale/concettuale, indipendente dalle sue descrizioni
- [ ] `is_physical` e la distinzione opera fisica vs approfondimento
- [ ] `placements[]`: dove l'opera si trova (museo + stanza/piano). Perché un'opera può stare in più musei
- [ ] Entity **senza** placements = "approfondimento": conseguenze sul modello e sulle visite (vedi §3.2)
- [ ] Identificatori esterni/interni: `wikidata_id`, `local_id` + `generateLocalId()` (formato `AA-00000`)
- [ ] `external_links[]`, `tags[]`

### 2.4 Item ("descrizione")
- [ ] Perché Item è separato da Entity: più descrizioni della stessa opera, con tono e lunghezza diversi
- [ ] `tone` (`childish` / `simple` / `medium` / `technical`): il tono **è** il concetto di difficoltà, non esiste un campo "difficoltà" a parte
- [ ] `descriptions[]` (`text` + `duration_sec`): paragrafi sequenziali, non versioni alternative dello stesso testo
- [ ] `license` (`Public` / `Private` / `Reserved`): significato e dove viene fatto rispettare (vedi §4)
- [ ] `marketplace_summary`, `image_url` / `alt_text`, `tags[]`
- [ ] Relazione `artwork` → Entity, `author` → User

### 2.5 Visit
- [ ] Cos'è una visita: percorso ordinato di step su una o più opere
- [ ] `steps[]` → `visitStepSchema` **embeddato**: perché gli step vivono e muoiono con la visita
  - [ ] `entity` (ref), `items[]` (ref), `museum` (ref), `order`, `intro_note`, `logistic_note`
- [ ] `museum[]` **inferito** dall'unione dei musei degli step (hook `pre('save')`): perché derivato e non inserito a mano
- [ ] `estimated_duration_sec` **inferito** dalla media delle durate delle descrizioni: formula e limiti
- [ ] `theme` → `visitThemeSchema` (palette chiara/scura + font): perché embeddato, validazione hex/font, applicato solo dal Navigator a visita attiva
- [ ] `is_public`, `base_price` e il paywall (vedi §4)
- [ ] `tags[]`, `image_url`, `description`

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
