import { useEffect, useRef, useState } from 'react'
import { useGroupSession } from '../context/GroupSessionContext'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import useFocusTrap from '../hooks/useFocusTrap'

function GroupQuizModal() {
  const { role, status, quiz, ownParticipant, submitQuizAnswers } = useGroupSession()

  const [answers, setAnswers] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const dialogRef = useRef(null)
  const isVisible = role === 'student' && status === 'quiz' && Boolean(quiz) && !dismissed
  useFocusTrap(dialogRef, isVisible)

  // Un nuovo oggetto quiz arriva sia al vero avvio (visit:quiz_started) sia
  // al rientro dopo un reload a metà quiz (ack di visit:join). In entrambi i
  // casi si riparte da qui: se lo studente aveva già risposto (quiz_score
  // non nullo, letto da ownParticipant nello stesso momento), la modale
  // resta chiusa invece di ripresentare il form.
  useEffect(() => {
    if (!quiz) return
    setAnswers(new Array(quiz.questions.length).fill(null))
    setQuestionIndex(0)
    setResult(null)
    setSubmitError(null)
    setDismissed(ownParticipant?.quiz_score != null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz])

  if (!isVisible) return null

  const question = quiz.questions[questionIndex]
  const isLast = questionIndex === quiz.questions.length - 1
  const missingCount = answers.filter((a) => a == null).length
  const allAnswered = missingCount === 0

  function selectOption(oIndex) {
    setAnswers((prev) => prev.map((a, i) => (i === questionIndex ? oIndex : a)))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    const body = await submitQuizAnswers(answers)
    setSubmitting(false)
    if (body.error) {
      setSubmitError(body.error)
      return
    }
    setResult({ score: body.score, totalQuestions: body.totalQuestions })
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md">
        {/* Frecce in sovrimpressione ai lati della card, non parte del suo
            layout interno — a cavallo del bordo, come in un carosello di
            immagini. Navigazione sempre libera in entrambe le direzioni
            (una risposta mancante non blocca lo scorrimento, solo l'invio
            finale). Nascoste sulla schermata di risultato, dove non c'è più
            nulla da scorrere. */}
        {!result && (
          <>
            <button
              type="button"
              onClick={() => setQuestionIndex((i) => i - 1)}
              disabled={questionIndex === 0}
              aria-label="Domanda precedente"
              className="glass-orb absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-text disabled:opacity-30"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setQuestionIndex((i) => i + 1)}
              disabled={isLast}
              aria-label="Domanda successiva"
              className="glass-orb absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-text disabled:opacity-30"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </>
        )}

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={quiz.title || 'Quiz'}
          tabIndex={-1}
          className="glass-panel flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl"
        >
          <div className="flex-1 overflow-y-auto p-6">
            {result ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <h1 className="font-serif text-2xl font-semibold text-text">Quiz inviato</h1>
                <p className="text-text-muted">
                  Hai risposto correttamente a {result.score} su {result.totalQuestions} domande.
                </p>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="mt-3 rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent"
                >
                  Chiudi
                </button>
              </div>
            ) : (
              <>
                <h1 className="font-serif text-2xl font-semibold text-text">{quiz.title || 'Quiz'}</h1>
                <p className="mt-1 text-sm text-text-muted">
                  Domanda {questionIndex + 1} di {quiz.questions.length}
                </p>

                {/* Indicatori a pallini: cliccabili per saltare a qualunque
                    domanda, come le frecce ai lati — la navigazione è sempre
                    libera in ogni direzione, solo l'invio finale richiede
                    che tutte le domande abbiano una risposta. */}
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {quiz.questions.map((q, i) => (
                    <button
                      key={q._id || i}
                      type="button"
                      onClick={() => setQuestionIndex(i)}
                      aria-label={`Vai alla domanda ${i + 1}`}
                      aria-current={i === questionIndex}
                      className={`h-2 rounded-full transition-all ${
                        i === questionIndex
                          ? 'w-6 bg-accent'
                          : answers[i] != null
                            ? 'w-2 bg-accent/50'
                            : 'w-2 bg-[color:var(--pill-border)]'
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <p className="text-sm font-medium text-text">{question.text}</p>
                  <div className="flex flex-col gap-2">
                    {question.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        type="button"
                        onClick={() => selectOption(oIndex)}
                        aria-pressed={answers[questionIndex] === oIndex}
                        className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          answers[questionIndex] === oIndex
                            ? 'border-accent bg-accent text-on-accent'
                            : 'glass-pill text-text'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {submitError && <p className="mt-4 text-sm text-[color:var(--color-error)]">{submitError}</p>}

                {/* Sempre presente, su ogni domanda — non solo sull'ultima —
                    dato che la navigazione è libera: mostra quante risposte
                    mancano finché non sono tutte date, poi si abilita. */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting}
                  className="mt-6 w-full rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-3 text-sm font-medium text-on-accent shadow-lg shadow-black/10 disabled:opacity-40 dark:shadow-black/30"
                >
                  {submitting
                    ? 'Invio…'
                    : allAnswered
                      ? 'Invia risposte'
                      : `Risposte mancanti ${missingCount}/${quiz.questions.length}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupQuizModal
