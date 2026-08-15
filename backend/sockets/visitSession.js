const Visit = require('../models/visit');

function visitRoom(visitId) { return `visit:${visitId}`; }
function hostRoom(visitId) { return `visit:${visitId}:host`; }

// Ogni evento che muta stato riverifica sul DB invece di fidarsi
// dell'appartenenza alla room in memoria, che non sopravvive a una
// riconnessione finché il client non ri-emette visit:join.
module.exports = function registerVisitSessionHandlers(io, socket) {
  socket.on('visit:join', async ({ visitId }, ack) => {
    try {
      const visit = await Visit.findById(visitId)
        .populate('live_session.participants.user', 'username display_name avatar_url');
      if (!visit || !visit.is_group) {
        return ack?.({ error: 'Visit not found' });
      }

      const isAuthor = visit.author.toString() === socket.user.id;
      const own = visit.live_session.participants.find(p => p.user._id.toString() === socket.user.id);
      if (!isAuthor && !own) {
        return ack?.({ error: 'Join this visit with its code first.' });
      }

      socket.join(visitRoom(visitId));
      if (isAuthor) socket.join(hostRoom(visitId));

      if (isAuthor) {
        return ack?.({ live_session: visit.live_session });
      }

      // Uno studente che entra (o rientra dopo un reload) a quiz già avviato
      // deve poter ricevere le domande — visit:quiz_started è già passato e
      // non verrà ripetuto. Stessa sanificazione di startQuiz: mai
      // correct_option_index qui.
      let quiz;
      if (visit.live_session.status === 'quiz') {
        await visit.populate('quiz');
        if (visit.quiz) {
          quiz = {
            title: visit.quiz.title,
            questions: visit.quiz.questions.map(q => ({ _id: q._id, text: q.text, item: q.item, options: q.options }))
          };
        }
      }

      ack?.({
        live_session: {
          status: visit.live_session.status,
          current_step_index: visit.live_session.current_step_index,
          participant: own,
          quiz
        }
      });
    } catch (e) {
      ack?.({ error: e.message });
    }
  });

  // Solo il professore: sceglie l'opera attiva per tutta la stanza. Nessun
  // campo tono/paragrafo/playback qui — quelli sono locali allo studente.
  socket.on('visit:set_active_step', async ({ visitId, stepIndex }, ack) => {
    try {
      const visit = await Visit.findById(visitId).select('author steps live_session.status');
      if (!visit || visit.author.toString() !== socket.user.id) {
        return ack?.({ error: 'Not authorized' });
      }
      if (visit.live_session.status !== 'active') {
        return ack?.({ error: 'Session is not active.' });
      }
      if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= visit.steps.length) {
        return ack?.({ error: 'Invalid stepIndex.' });
      }

      // Il "pronto" è legato all'opera corrente: cambiando opera va
      // riazzerato per tutti, non solo per chi lo emetterà di nuovo.
      await Visit.updateOne(
        { _id: visitId },
        { $set: { 'live_session.current_step_index': stepIndex, 'live_session.participants.$[].ready': false } }
      );
      io.to(visitRoom(visitId)).emit('visit:active_step_changed', { stepIndex });
      ack?.({ ok: true });
    } catch (e) {
      ack?.({ error: e.message });
    }
  });

  // Solo lo studente: aggiorna il proprio tono/paragrafo/playback/pronto
  // locale. Nessun campo stepIndex qui — lo studente non naviga tra le opere.
  socket.on('visit:update_state', async ({ visitId, tone, paragraphIndex, playbackState, ready }, ack) => {
    try {
      const visit = await Visit.findById(visitId).select('live_session');
      const isParticipant = visit?.live_session.participants.some(p => p.user.toString() === socket.user.id);
      if (!visit || !isParticipant) {
        return ack?.({ error: 'Not a participant of this session.' });
      }
      if (visit.live_session.status !== 'active') {
        return ack?.({ error: 'Session is not active.' });
      }

      const set = {};
      if (tone !== undefined) set['live_session.participants.$[elem].tone'] = tone;
      if (paragraphIndex !== undefined) set['live_session.participants.$[elem].paragraph_index'] = paragraphIndex;
      if (playbackState !== undefined) set['live_session.participants.$[elem].playback_state'] = playbackState;
      if (ready !== undefined) set['live_session.participants.$[elem].ready'] = ready;
      if (Object.keys(set).length === 0) return ack?.({ ok: true });

      await Visit.updateOne(
        { _id: visitId },
        { $set: set },
        { arrayFilters: [{ 'elem.user': socket.user.id }], runValidators: true }
      );

      io.to(hostRoom(visitId)).emit('visit:participant_state_changed', {
        userId: socket.user.id, tone, paragraphIndex, playbackState, ready
      });
      ack?.({ ok: true });
    } catch (e) {
      ack?.({ error: e.message });
    }
  });
};
