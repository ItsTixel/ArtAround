const Visit = require('../models/visit');
const Item = require('../models/item');
const User = require('../models/user');
const Order = require('../models/order');
const Quiz = require('../models/quiz');
const { generateUniqueCode } = require('../utils/code');

// I punti-opera sulle mappe dei musei mostrano una miniatura: serve popolare
// l'entity referenziata da ogni punto (sia sul museum "riassuntivo" della
// visita che su quello di ogni step, che sono la stessa collezione ma path
// Mongoose distinti).
const mapPointEntityPopulate = { path: 'maps.points.entity', select: 'name image_url alt_text' };

const stepsPopulate = [
  { path: 'museum', populate: mapPointEntityPopulate },
  { path: 'author', select: '-password' },
  { path: 'steps.entity' },
  { path: 'steps.museum', populate: mapPointEntityPopulate },
  {
    path: 'steps.items',
    populate: [
      { path: 'artwork' },
      { path: 'author', select: '-password' }
    ]
  }
];

/* Alias frontend → campo Mongoose (per i sort inviati dalla UI) */
const SORT_ALIASES = {
  'duration-asc': 'estimated_duration_sec',
  'duration-desc': '-estimated_duration_sec',
  'price-asc': 'base_price',
  'price-desc': '-base_price',
  'recommended': '-createdAt',
};

const ALLOWED_SORT_FIELDS = ['title', 'base_price', 'createdAt', 'estimated_duration_sec'];

/* ── Paywall: le visite a pagamento mostrano solo un'anteprima (niente
   testo delle descrizioni) finché l'utente non le ha adottate ────────── */
async function getAdoptedSet(userId) {
  if (!userId) return new Set();
  const user = await User.findById(userId).select('adopted_visits').lean();
  return user ? new Set(user.adopted_visits.map(id => id.toString())) : new Set();
}

function isVisitUnlocked(visit, userId, adoptedSet) {
  if (visit.base_price === 0) return true;
  if (!userId) return false;
  const authorId = visit.author?._id?.toString() ?? visit.author?.toString();
  if (authorId === userId) return true;
  return adoptedSet.has(visit._id.toString());
}

function applyPaywall(visit, unlocked) {
  // flattenMaps: toObject() defaults to false (unlike toJSON()), so without
  // this a populated museum's `services`/`opening_hours` (Mongoose Maps)
  // survive as native Map instances — which JSON.stringify serializes as
  // "{}", silently dropping them from the API response.
  const obj = visit.toObject({ flattenMaps: true });
  obj.purchased = unlocked;
  for (const step of obj.steps) {
    for (const item of step.items) {
      item.locked = !unlocked;
      if (!unlocked) {
        item.descriptions = item.descriptions.map(d => ({ duration_sec: d.duration_sec, text: null }));
      }
    }
  }
  return obj;
}

async function getAll(req, res) {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const page = Math.max(parseInt(req.query.page) || 0, 0);

    const conditions = [];

    /* ── Visibilità ─────────────────────────────────────────── */
    if (req.user) {
      conditions.push({ $or: [{ is_public: true }, { author: req.user.id }] });
    } else {
      conditions.push({ is_public: true });
    }

    /* ── Le visite di gruppo non compaiono mai qui, nemmeno per il
       proprio autore: sono private, si raggiungono solo via codice ── */
    conditions.push({ is_group: { $ne: true } });

    /* ── Autore ─────────────────────────────────────────────── */
    if (req.query.author) conditions.push({ author: req.query.author });

    /* ── Musei (uno o più ID separati da virgola) ────────────── */
    if (req.query.museum) {
      const ids = req.query.museum.split(',').map(s => s.trim()).filter(Boolean);
      conditions.push({ museum: ids.length === 1 ? ids[0] : { $in: ids } });
    }

    /* ── Tag ($in: almeno un tag presente) ──────────────────── */
    if (req.query.tags) {
      conditions.push({ tags: { $in: req.query.tags.split(',').map(t => t.trim()) } });
    }

    /* ── Tono (almeno un'opera di uno step con quel tono) ────── */
    if (req.query.tones) {
      const tones = req.query.tones.split(',').map(t => t.trim()).filter(Boolean);
      const toneItems = await Item.find({ tone: { $in: tones } }).select('_id');
      conditions.push({ 'steps.items': { $in: toneItems.map(i => i._id) } });
    }

    /* ── Ricerca testuale sul titolo ─────────────────────────── */
    if (req.query.title) {
      conditions.push({ title: new RegExp(req.query.title, 'i') });
    }

    /* ── Prezzo ─────────────────────────────────────────────── */
    if (req.query.price === 'free') conditions.push({ base_price: 0 });
    if (req.query.price === 'paid') conditions.push({ base_price: { $gt: 0 } });

    /* ── Durata massima (durationMax in minuti) ──────────────── */
    if (req.query.durationMax) {
      const maxSec = parseInt(req.query.durationMax) * 60;
      conditions.push({
        $or: [
          { estimated_duration_sec: { $lte: maxSec } },
          { estimated_duration_sec: null },
          { estimated_duration_sec: { $exists: false } },
        ]
      });
    }

    const filter = { $and: conditions };

    /* ── Ordinamento ─────────────────────────────────────────── */
    const rawSort = req.query.sort || 'title';
    let sort;
    if (SORT_ALIASES[rawSort]) {
      sort = SORT_ALIASES[rawSort];
    } else {
      const field = rawSort.replace(/^-/, '');
      sort = ALLOWED_SORT_FIELDS.includes(field) ? rawSort : 'title';
    }

    const [totalItems, distinctMuseums, visits] = await Promise.all([
      Visit.countDocuments(filter),
      Visit.distinct('museum', filter),
      Visit.find(filter)
        .populate(stepsPopulate)
        .sort(sort)
        .skip(pageSize * page)
        .limit(pageSize),
    ]);

    const adoptedSet = await getAdoptedSet(req.user?.id);
    const data = visits.map(v => applyPaywall(v, isVisitUnlocked(v, req.user?.id, adoptedSet)));

    res.json({ totalItems, museumCount: distinctMuseums.length, pageSize, page, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getById(req, res) {
  try {
    const visit = await Visit.findById(req.params.id).populate(stepsPopulate);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    const authorId = visit.author?._id?.toString() ?? visit.author?.toString();
    const userId = req.user ? req.user.id : null;

    if (visit.is_group) {
      const isParticipant = visit.live_session.participants.some(p => p.user.toString() === userId);
      if (authorId !== userId && !isParticipant) {
        return res.status(403).json({ error: 'Join this visit with its code first.' });
      }
      // Il quiz (con la risposta corretta) è visibile solo all'autore via
      // REST: gli studenti lo ricevono solo via socket, già sanificato
      // (vedi startQuiz).
      if (authorId === userId) {
        await visit.populate('quiz');
      }
    } else if (!visit.is_public) {
      if (authorId !== userId) {
        return res.status(403).json({ error: 'This visit is private.' });
      }
    }

    const adoptedSet = await getAdoptedSet(req.user?.id);
    const data = applyPaywall(visit, isVisitUnlocked(visit, req.user?.id, adoptedSet));

    // Non far trapelare lo stato live degli altri partecipanti (tono,
    // paragrafo, punteggio quiz) a chi non è l'autore: quello passa solo da
    // getSessionState/socket, mai da qui.
    if (visit.is_group && authorId !== userId) {
      data.live_session = {
        status: visit.live_session.status,
        current_step_index: visit.live_session.current_step_index
      };
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function create(req, res) {
  let quizDoc = null;
  let codeWasRequested = false;
  try {
    req.body.author = req.user.id;

    // I visitatori possono creare solo visite private.
    if (req.user.role === 'visitor') {
      const isPublic = req.body.is_public !== undefined ? req.body.is_public : true; // 'true' è il default dello schema
      if (isPublic !== false) {
        return res.status(403).json({ error: 'I visitatori possono creare solo visite private.' });
      }
    }

    if (req.body.is_group) {
      if (req.user.role !== 'author') {
        return res.status(403).json({ error: 'Solo gli autori possono creare visite di gruppo.' });
      }
      if (!req.body.quiz || !Array.isArray(req.body.quiz.questions) || req.body.quiz.questions.length === 0) {
        return res.status(400).json({ error: 'Una visita di gruppo richiede un quiz con almeno una domanda.' });
      }

      quizDoc = new Quiz({ title: req.body.quiz.title, questions: req.body.quiz.questions, author: req.user.id });
      await quizDoc.save();
      req.body.quiz = quizDoc._id;

      // L'autore può scegliere il codice (verificato lato client con
      // GET /code/:code/available mentre digita): qui va comunque
      // riverificato server-side prima di usarlo. Se non ne è stato
      // richiesto uno, se ne genera uno casuale come prima.
      if (req.body.code) {
        codeWasRequested = true;
        const requestedCode = String(req.body.code).trim().toUpperCase();
        if (!CODE_PATTERN.test(requestedCode)) {
          await Quiz.findByIdAndDelete(quizDoc._id).catch(() => {});
          return res.status(400).json({ error: 'Il codice deve avere 4-15 caratteri, solo lettere e cifre.' });
        }
        if (await Visit.exists({ code: requestedCode })) {
          await Quiz.findByIdAndDelete(quizDoc._id).catch(() => {});
          return res.status(409).json({ error: 'Codice già in uso, scegline un altro.' });
        }
        req.body.code = requestedCode;
      } else {
        req.body.code = await generateUniqueCode(Visit);
      }
    }

    const existingVisit = await Visit.findOne({ title: req.body.title, museum: req.body.museum });
    if (existingVisit) {
      if (quizDoc) await Quiz.findByIdAndDelete(quizDoc._id).catch(() => {});
      return res.status(409).json({ error: 'A visit with the same title already exists for this museum' });
    }

    const visit = new Visit(req.body);
    try {
      await visit.save();
    } catch (saveErr) {
      // Race su un codice duplicato (rarissima, ma l'unique index del
      // db è l'ultima rete di sicurezza): per un codice generato si
      // rigenera e si riprova una sola volta prima di arrendersi; per
      // un codice scelto dall'autore si segnala l'errore invece di
      // sostituirlo a sua insaputa con uno diverso.
      if (req.body.is_group && saveErr.code === 11000 && /code/.test(saveErr.message)) {
        if (codeWasRequested) {
          if (quizDoc) await Quiz.findByIdAndDelete(quizDoc._id).catch(() => {});
          return res.status(409).json({ error: 'Codice già in uso, scegline un altro.' });
        }
        visit.code = await generateUniqueCode(Visit);
        await visit.save();
      } else {
        throw saveErr;
      }
    }

    // L'autore adotta automaticamente la propria visita appena creata
    // (stessa meccanica di adoptVisit in controllers/user.js).
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { adopted_visits: visit._id } });

    // Le visite di gruppo sono sempre gratuite: nessun Order da registrare.
    if (!visit.is_group) {
      await Order.findOneAndUpdate(
        { buyer: req.user.id, visit: visit._id },
        { buyer: req.user.id, visit: visit._id, seller: visit.author, price_paid: visit.base_price },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    const populatedVisit = await visit.populate(stepsPopulate);
    res.status(201).json(populatedVisit);
  } catch (e) {
    if (quizDoc) await Quiz.findByIdAndDelete(quizDoc._id).catch(() => {});
    res.status(400).json({ error: e.message });
  }
}

async function update(req, res) {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    if (visit.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // I visitatori possono avere solo visite private.
    if (req.user.role === 'visitor' && req.body.is_public === true) {
      return res.status(403).json({ error: 'I visitatori possono avere solo visite private.' });
    }

    // is_group è immutabile dopo la creazione: cambiarlo orfanerebbe
    // code/quiz (o richiederebbe di generarli a posteriori).
    if (req.body.is_group !== undefined && req.body.is_group !== visit.is_group) {
      return res.status(400).json({ error: 'Cannot change visit type after creation.' });
    }

    // Il quiz di una visita di gruppo è 1:1 e non condiviso: un quiz nel
    // payload sostituisce il contenuto del quiz esistente, non ne cambia
    // il riferimento.
    if (visit.is_group && req.body.quiz) {
      await Quiz.findByIdAndUpdate(visit.quiz, {
        title: req.body.quiz.title,
        questions: req.body.quiz.questions
      }, { runValidators: true });
      delete req.body.quiz;
    }

    visit.set(req.body);
    await visit.save();
    const populatedVisit = await visit.populate(stepsPopulate);
    res.json(populatedVisit);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function remove(req, res) {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    if (visit.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await visit.deleteOne();
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

/* ── Visite di gruppo: sessione live ─────────────────────────────────────
   Le mutazioni di stato "importanti" (join, open/start/end, quiz) passano
   da qui via REST — hanno bisogno di uno status code vero e vengono
   ribroadcastate via socket subito dopo il salvataggio. I soli aggiornamenti
   ad alta frequenza (tono/paragrafo/playback dello studente, opera attiva
   scelta dal professore) passano invece direttamente dai socket handler
   (backend/sockets/visitSession.js), non da qui. ────────────────────────── */

function emitToVisit(req, visitId, event, payload) {
  const io = req.app.get('io');
  if (io) io.to(`visit:${visitId}`).emit(event, payload);
}

function emitToHost(req, visitId, event, payload) {
  const io = req.app.get('io');
  if (io) io.to(`visit:${visitId}:host`).emit(event, payload);
}

// Formato accettato sia per un codice scelto dall'autore sia per uno
// generato automaticamente: stesso range di lunghezza dello schema
// (backend/models/visit.js), ma alfabeto più permissivo — l'autore può
// scegliere lettere/cifre a piacere, non solo quelle senza ambiguità usate
// da generateUniqueCode per i codici casuali.
const CODE_PATTERN = /^[A-Z0-9]{4,15}$/;

async function checkCodeAvailability(req, res) {
  try {
    const code = req.params.code.trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) {
      return res.json({ available: false, reason: 'invalid' });
    }
    const taken = await Visit.exists({ code });
    res.json({ available: !taken });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getByCode(req, res) {
  try {
    const code = req.params.code.toUpperCase();
    const visit = await Visit.findOne({ code, is_group: true })
      .select('title description image_url author live_session.status')
      .populate('author', 'username display_name');
    // 404 generico: non distinguiamo "codice inesistente" da "non è una
    // visita di gruppo", per non permettere enumerazione.
    if (!visit) return res.status(404).json({ error: 'Code not found' });

    res.json({
      _id: visit._id,
      title: visit.title,
      description: visit.description,
      image_url: visit.image_url,
      author: visit.author,
      status: visit.live_session.status
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function openSession(req, res) {
  try {
    const visit = await Visit.findByIdAndUpdate(
      req.visit._id,
      { $set: { live_session: { status: 'waiting', current_step_index: 0, participants: [], opened_at: new Date() } } },
      { new: true }
    );
    emitToVisit(req, visit._id, 'visit:session_opened', { status: 'waiting' });
    res.json({ live_session: visit.live_session });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function joinSession(req, res) {
  try {
    const visit = req.visit;

    if (!['waiting', 'active'].includes(visit.live_session.status)) {
      const message = visit.live_session.status === 'finished'
        ? 'Questa sessione è terminata.'
        : 'La sessione non è ancora aperta.';
      return res.status(400).json({ error: message });
    }

    const alreadyJoined = visit.live_session.participants.some(p => p.user.toString() === req.user.id);
    if (!alreadyJoined) {
      await Visit.updateOne(
        { _id: visit._id },
        { $push: { 'live_session.participants': { user: req.user.id } } }
      );
      const user = await User.findById(req.user.id).select('username display_name');
      emitToHost(req, visit._id, 'visit:participant_joined', {
        userId: req.user.id,
        username: user?.username,
        display_name: user?.display_name,
        joined_at: new Date()
      });
    }

    const updated = await Visit.findById(visit._id).select('live_session');
    res.json({ live_session: updated.live_session });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// Uscita esplicita di un partecipante (distinta da una semplice disconnessione
// socket, che potrebbe essere solo un calo di rete transitorio): rimuove il
// partecipante dal roster e avvisa il professore. Un rientro successivo passa
// di nuovo da joinSession, che lo riaggiunge con stato pulito.
async function leaveSession(req, res) {
  try {
    const visit = req.visit;
    await Visit.updateOne(
      { _id: visit._id },
      { $pull: { 'live_session.participants': { user: req.user.id } } }
    );
    emitToHost(req, visit._id, 'visit:participant_left', { userId: req.user.id });
    res.status(204).send();
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function startSession(req, res) {
  try {
    if (req.visit.live_session.status !== 'waiting') {
      return res.status(400).json({ error: 'Session is not in waiting state.' });
    }
    const visit = await Visit.findByIdAndUpdate(
      req.visit._id,
      {
        $set: {
          'live_session.status': 'active',
          'live_session.current_step_index': 0,
          'live_session.started_at': new Date()
        }
      },
      { new: true }
    );
    emitToVisit(req, visit._id, 'visit:session_started', { status: 'active', stepIndex: 0 });
    res.json({ live_session: visit.live_session });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function startQuiz(req, res) {
  try {
    if (req.visit.live_session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active.' });
    }
    if (!req.visit.quiz) {
      return res.status(400).json({ error: 'This visit has no quiz.' });
    }
    const quiz = await Quiz.findById(req.visit.quiz);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    await Visit.updateOne(
      { _id: req.visit._id },
      {
        $set: {
          'live_session.status': 'quiz',
          'live_session.quiz_started_at': new Date(),
          'live_session.participants.$[].quiz_answers': [],
          'live_session.participants.$[].quiz_score': null
        }
      }
    );

    // Mai inviare correct_option_index agli studenti.
    const sanitizedQuiz = {
      title: quiz.title,
      questions: quiz.questions.map(q => ({ _id: q._id, text: q.text, item: q.item, options: q.options }))
    };

    emitToVisit(req, req.visit._id, 'visit:quiz_started', { quiz: sanitizedQuiz });
    res.json({ quiz: sanitizedQuiz });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function submitQuizAnswers(req, res) {
  try {
    if (req.visit.live_session.status !== 'quiz') {
      return res.status(400).json({ error: 'Quiz is not active.' });
    }
    const isParticipant = req.visit.live_session.participants.some(p => p.user.toString() === req.user.id);
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant of this session.' });

    const { answers } = req.body;
    const quiz = await Quiz.findById(req.visit.quiz);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({ error: 'answers must match the number of questions.' });
    }

    // Il punteggio si calcola sempre server-side: non ci si fida mai del
    // client per stabilire cosa sia "giusto".
    const score = answers.filter((a, i) => a === quiz.questions[i].correct_option_index).length;

    await Visit.updateOne(
      { _id: req.visit._id },
      {
        $set: {
          'live_session.participants.$[elem].quiz_answers': answers,
          'live_session.participants.$[elem].quiz_score': score
        }
      },
      { arrayFilters: [{ 'elem.user': req.user.id }] }
    );

    emitToHost(req, req.visit._id, 'visit:quiz_result', {
      userId: req.user.id, score, totalQuestions: quiz.questions.length
    });

    res.json({ score, totalQuestions: quiz.questions.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function endSession(req, res) {
  try {
    const visit = await Visit.findByIdAndUpdate(
      req.visit._id,
      { $set: { 'live_session.status': 'finished' } },
      { new: true }
    );
    emitToVisit(req, visit._id, 'visit:session_ended', { status: 'finished' });
    res.json({ live_session: visit.live_session });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function getSessionState(req, res) {
  try {
    const visit = await Visit.findById(req.visit._id)
      .populate('live_session.participants.user', 'username display_name avatar_url');

    const isAuthor = visit.author.toString() === req.user.id;
    if (isAuthor) {
      return res.json({ live_session: visit.live_session });
    }

    const own = visit.live_session.participants.find(p => p.user._id.toString() === req.user.id);
    if (!own) return res.status(403).json({ error: 'Join this visit with its code first.' });

    res.json({
      live_session: {
        status: visit.live_session.status,
        current_step_index: visit.live_session.current_step_index,
        participant: own
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  getAll, getById, create, update, remove,
  getByCode, checkCodeAvailability, openSession, joinSession, leaveSession, startSession, startQuiz, submitQuizAnswers, endSession, getSessionState
};
