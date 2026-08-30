# Scelte architetturali del database

> Documento che spiega **perché** il modello dati di ArtAround è fatto così. Non è un dump degli schemi (quelli stanno in
> `backend/models/`), ma la motivazione dietro le decisioni.

---

## Quadro generale

L'obiettivo dell'architettura dell'intero sito, a partire dal database, è fornire un sistema flessibile. Sia i visitatori che gli autori hanno la possibilità di andare molto nel dettaglio nella creazione e fruizione di contenuti, ma non sono obbligati.

In questo documento sono spiegate le scelte più significative per raggiungere questo scopo, mettendo in secondo piano il lato tecnico e concentrandosi su quello di design.

## Le collezioni

### User
- Gli utenti si dividono in due ruoli: visitatori e autori. Solo gli autori possono creare contenuti, tuttavia qualora un visitatore fosse interessato a cominciare a creare contenuti può istantaneamente fare l'upgrade ad "Autore" nel profilo con un click. 
-  Account locali vs Google Sign-In, ogni utente può scegliere il metodo di autenticazione che preferisce.

### Museum
- Ogni museo ha diversi campi possibili, ma solo lo stretto indispensabile è obbligatorio, tutto il resto del sito è adatto ad usare musei con informazioni minimali.
- Ogni autore può modificare i musei (così come le opere), in questo modo un utente può creare soltanto l'entry nel database e lasciare che il resto della community inserisca il resto delle informazioni.
- La mappa è semplicemente un'immagine con una serie di punti di interesse (ognuno con coordinate normalizzate sull'immagine), rendendo l'aggiunta di una mappa molto veloce.

### Entity ("opera" / "approfondimento")
- Le entity sono una delle unità fondamentali del database, rappresentano gli oggetti della visita. Ogni entity può essere o fisica (un quadro, una scultura) o astratta (un concetto, una persona).
- Le entity contengono solo informazioni intrinseche all'opera, il nome, una foto o la posizione, le informazioni estrinseche (le descrizioni) sono disaccoppiate e inserite in "Item".
- Disaccopiare descrizioni ed opere aggiunge un step di complessità all'architettura, ma porta diversi benefici:
  - Un autore può semplicemente "riempire" un museo con tutte le opere, non è obbligato a scrivere anche tutte le descrizioni in una volta.
  - Nel database ci possono essere più descrizioni per la singola opera anche con lo stesso tono, per esempio si possono differenziare per il modo in cui viene descritta l'opera.
- Per semplificare l'uso per i visitatori è sempre possibile chiedere al sito opere già fornite di descrizioni (es: nella richiesta di approfondimenti o dopo lo scan di un codice QR), in questo caso il backend si occuperà di fornire l'entity richiesta insieme a delle descrizioni pubbliche. In questo modo durante la visita è impossibile che l'utente non abbia accesso a delle informazioni esistenti nel database solo perché in precedenza un autore non ha selezionato tutte le descrizioni.

### Item ("descrizione")
- Gli item sono il secondo componente fondamentale del database, insieme alle entity caratterizzano interamente una visita.
- Ogni descrizione è una lista di paragrafi di durata incrementale con un singolo tono; la lunghezza e il numero dei paragrafi all'interno della descrizione è a completa discrezione dell'autore e delle sue esigenze.
- I quattro toni (infantile, elementare, medio, avanzato) caratterizzano ogni descrizione e indicano la difficoltà del testo, permettendo visite flessibili ad ogni esigenza.
- La licenza di ogni descrizione indica la sua visibilità e si dividono in:
  - Pubblica: ogni utente può vedere quella descrizione e usarla per le proprie visite;
  - Privata: solo il creatore può vedere quella descrizione e inserirle nelle proprie visite, ugualmente private.
  - Riservate: le descrizioni riservate fanno da ponte tra le due visibilità. Una descrizione riservata può essere messa in visite pubbliche, ma solo dall'autore. In questo modo un autore ha la possibilità di creare contenuti con cura sapendo di poterci guadagnare, inserendo queste descrizioni in visite pubbliche a pagamento. Nessun altro a parte l'autore può monetizzare su quelle descrizioni.

### Visit
- Una visita è un percorso ordinato di step su una o più opere. Ogni visita contiene una lista di step, ogni step contiene l'opera di riferimento e una serie di descrizioni (massimo una per tono).
- Quest'architettura consente senza problemi di creare visite che comprendono più musei e su qualsiasi argomento.
- La creazione di una visita si compone soltanto dell'unica parte importante: la selezione delle opere e il loro ordine, tutte le complessità aggiuntive son gestite dal sito:
  - Le indicazioni tra un'opera e l'altra son calcolate dinamicamente confrontando la posizione dell'opera attuale e dell'opera successiva, indicando all'utente le differenze (es: "Procedi alla stanza 2" oppure "Procedi al museo Galleria degli Uffizi, Piano 1, stanza 1")
  - Le indicazioni su punti di interesse nel museo (es: il bagno, l'uscita o le scale) vengono importate dal museo.
  - Le descrizioni possono essere selezionate manualmente dall'autore, ma se non si è interessati si può semplicemente cliccare "Compila automaticamente" e vengono selezionate tutte le descrizioni necessarie istantaneamente.
  - Gli approfondimenti sono generati tramite ricerca nel database dei tag dell'opera attuale e delle descrizioni.
  - La durata totale è semplicemente la somma degli step della visita, cioè delle descrizioni.
- Per permettere agli autori di creare versioni specifiche dell'app ogni visita può includere una serie di informazioni sullo stile. Questi valori vengono applicati al Navigator una volta che la visita è attiva.
- Ogni visita a pagamento è protetta da paywall paywall lato backend, un utente non può visualizzare le descrizioni di una visita non comprata, ma soltanto quali step la compongono.
- Una volta creata una visita pubblica non è più possibile renderla privata. In questo si impedisce a un utente di vendere contenuti per poi privatizzarli.

### Visite di gruppo
  - Le visite di gruppo si trovano all'interno della collezione Visit, ma hanno alcuni campi in più a determinarne il comportamento.
  - Ogni visita di gruppo comprende un codice (unico nel database) per permettere agli studenti di unirsi facilmente dal Navigator.
  - Le visite di gruppo sono sempre private, solo il creatore può far partire la sessione. L'unico modo per altri utenti di partecipare a queste visite è unirsi come studenti una volta aperta la sessione.
  - Alla fine di ogni visita è possibile somministrare un quiz agli studenti con domande a scelta multipla caricate precedentemente durante la creazione della visita.
  - Il professore ha pieno controllo sulla sessione:
    - Decide quando passare da un'opera a un'altra, quando avviare il quiz e quando terminare la visita;
    - Può vedere tutte le azioni dello studente: quale paragrafo sta ascoltando e con quale tono, quali approfondimenti ha chiesto e quali risposte ha dato nel quiz finale.
  - Gli studenti hanno permessi limitati rispetto al classico visitatore, non possono infatti cambiare l'opera attuale. Possono soltanto: cambiare tono e/o paragrafo, chiedere approfondimenti e vedere la mappa.