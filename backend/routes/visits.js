const express = require('express');
const router = express.Router();
const controller = require('../controllers/visit');

// MIDDLEWARE
const verifyToken = require('../middlewares/verifyToken');
const isVisitOwner = require('../middlewares/isVisitOwner');
const optionalAuth = require('../middlewares/optionalAuth'); // Verifica se la visita è pubblica o privata.
const loadGroupVisit = require('../middlewares/loadGroupVisit');
const requireVisitAuthor = require('../middlewares/requireVisitAuthor');

// ROUTES MISTE (se è pubblica chiunque può vederla, altrimenti è protetta)
router.get('/', optionalAuth, controller.getAll);

// Visite di gruppo — ricerca per codice. Richiede login: l'ingresso senza
// account (ospite/nickname) è rimandato a una fase successiva.
router.get('/code/:code', verifyToken, controller.getByCode);

router.get('/:id', optionalAuth, controller.getById);

// ROUTES PROTETTE
router.post('/', verifyToken, controller.create);
router.put('/:id', verifyToken, isVisitOwner, controller.update);
router.delete('/:id', verifyToken, isVisitOwner, controller.remove);

// Visite di gruppo — ciclo di vita della sessione live.
// Solo l'autore: apri/avvia/termina la sessione, avvia il quiz.
router.post('/:id/session/open', verifyToken, loadGroupVisit, requireVisitAuthor, controller.openSession);
router.post('/:id/session/start', verifyToken, loadGroupVisit, requireVisitAuthor, controller.startSession);
router.post('/:id/session/end', verifyToken, loadGroupVisit, requireVisitAuthor, controller.endSession);
router.post('/:id/session/quiz/start', verifyToken, loadGroupVisit, requireVisitAuthor, controller.startQuiz);

// Qualsiasi utente autenticato: unirsi, rispondere al quiz.
router.post('/:id/session/join', verifyToken, loadGroupVisit, controller.joinSession);
router.post('/:id/session/quiz/answers', verifyToken, loadGroupVisit, controller.submitQuizAnswers);

// Autore o partecipante (il controller distingue cosa vede chi).
router.get('/:id/session', verifyToken, loadGroupVisit, controller.getSessionState);

// Nota:
// L'ordine è fondamentale, Express esegue da sinistra a destra:
// 1. verifyToken capisce CHI sei.
// 2. isVisitOwner controlla se la visita è TUA.
// 3. controller.update/remove esegue l'azione vera e propria.

module.exports = router;