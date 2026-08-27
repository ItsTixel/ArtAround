import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroupSession } from '../context/GroupSessionContext'
import { PlayIcon, PauseIcon, InfoIcon, CheckIcon, CrossIcon } from '../components/icons'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { museumVisitPath } from '../utils/museumVisit'

const TONE_ABBR = { childish: 'Infan.', simple: 'Elem.', medium: 'Med.', technical: 'Avan.' }

function tileClasses(extra = '') {
  return `glass-pill flex h-8 min-w-9 items-center justify-center rounded-md px-2 text-xs font-medium text-text-muted ${extra}`
}

// Tono/paragrafo/playback: stesso trio di indicatori usato sia per l'opera
// principale che, dentro il pannello approfondimenti, per quello attivo.
function StatusPills({ tone, paragraphIndex, total, playbackState, ready }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className={tileClasses()} title="Tono">
        {tone ? TONE_ABBR[tone] : '–'}
      </span>
      <span className={tileClasses()} title="Paragrafo">
        {paragraphIndex != null ? `${paragraphIndex + 1}${total ? `/${total}` : ''}` : '–'}
      </span>
      <span className={tileClasses()} title={playbackState === 'playing' ? 'In ascolto' : playbackState === 'paused' ? 'In pausa' : 'Playback'}>
        {playbackState === 'playing' ? (
          <PlayIcon className="h-3.5 w-3.5" />
        ) : playbackState === 'paused' ? (
          <PauseIcon className="h-3.5 w-3.5" />
        ) : (
          '–'
        )}
      </span>
      {ready !== undefined && (
        <span className={tileClasses(ready ? 'border-info! bg-info! text-on-accent!' : '')} title="Pronto">
          {ready ? '✓' : '–'}
        </span>
      )}
    </div>
  )
}

function Gruppo() {
  useDocumentTitle('Gruppo')
  const navigate = useNavigate()
  const {
    groupVisit,
    status,
    currentStepIndex,
    roster,
    connected,
    error,
    startSession,
    endSession,
    setActiveStep,
    startQuiz,
    leaveSession,
  } = useGroupSession()

  // Riga(he) del roster con il pannello "approfondimenti ascoltati" aperto
  // (più di uno studente alla volta, per confrontarli senza doverli riaprire).
  const [expandedInsightIds, setExpandedInsightIds] = useState(() => new Set())
  // Stesso pattern, per il pannello "risposte al quiz" di ciascuno studente.
  const [expandedAnswersIds, setExpandedAnswersIds] = useState(() => new Set())

  function toggleInsightPanel(userId) {
    setExpandedInsightIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function toggleAnswersPanel(userId) {
    setExpandedAnswersIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const sortedSteps = useMemo(() => {
    if (!groupVisit?.steps?.length) return []
    return [...groupVisit.steps].sort((a, b) => a.order - b.order)
  }, [groupVisit])

  const activeStep = sortedSteps[currentStepIndex]

  // Il totale dei paragrafi dipende dall'opera (item) che lo studente sta
  // guardando col proprio tono — non è un numero fisso della visita.
  function paragraphTotal(tone) {
    const item = activeStep?.items?.find((it) => it.tone === tone)
    return item?.descriptions?.length || null
  }

  if (!groupVisit) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-text-muted">Nessuna sessione di gruppo in corso.</p>
      </div>
    )
  }

  function handleExit() {
    // Presa prima di leaveSession(): quella pulisce groupVisit, da cui
    // activeStep (e il suo museo) è derivato.
    const path = museumVisitPath(activeStep?.museum)
    leaveSession()
    navigate(path)
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-10">
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {connected ? 'Connesso' : 'Riconnessione…'}
        </span>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-text">{groupVisit.title}</h1>
        <p className="mt-1 text-sm text-text-muted">Codice: {groupVisit.code}</p>
      </div>

      {error && <p className="text-sm text-[color:var(--color-error)]">{error}</p>}

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Partecipanti ({roster.length})
        </h2>
        {roster.length === 0 ? (
          <p className="text-sm text-text-muted">Nessuno studente si è ancora unito.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roster.map((p) => {
              const total = paragraphTotal(p.tone)
              const hasInsights = p.insightTagsViewed?.length > 0
              const isExpanded = expandedInsightIds.has(p.userId)
              return (
                <li key={p.userId} className="glass-panel flex flex-col gap-2 rounded-xl px-4 py-2.5 text-sm text-text">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="min-w-0 truncate">{p.display_name || p.username}</span>
                      {status === 'active' && hasInsights && (
                        <button
                          type="button"
                          onClick={() => toggleInsightPanel(p.userId)}
                          aria-expanded={isExpanded}
                          className={tileClasses(`shrink-0 gap-1 ${p.insightTag ? 'border-info! bg-info! text-on-accent!' : ''}`)}
                          title={p.insightTag ? `Sta ascoltando l'approfondimento "${p.insightTag}"` : 'Approfondimenti ascoltati'}
                        >
                          <InfoIcon className="h-3.5 w-3.5" />
                          {p.insightTagsViewed.length}
                        </button>
                      )}
                    </div>
                    {status === 'active' && (
                      <StatusPills tone={p.tone} paragraphIndex={p.paragraphIndex} total={total} playbackState={p.playbackState} ready={p.ready} />
                    )}
                    {status === 'quiz' && p.quizScore != null && p.quizAnswers?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleAnswersPanel(p.userId)}
                        aria-expanded={expandedAnswersIds.has(p.userId)}
                        className="shrink-0 rounded-full border border-info bg-info px-2.5 py-1 text-xs font-medium text-on-accent"
                      >
                        {`${p.quizScore}/${p.quizTotal}`}
                      </button>
                    )}
                    {status === 'quiz' && (p.quizScore == null || !(p.quizAnswers?.length > 0)) && (
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                          p.quizScore != null
                            ? 'border-info bg-info text-on-accent'
                            : 'glass-pill text-text-muted'
                        }`}
                      >
                        {p.quizScore != null ? `${p.quizScore}/${p.quizTotal}` : 'In corso…'}
                      </span>
                    )}
                  </div>

                  {status === 'quiz' && p.quizAnswers?.length > 0 && expandedAnswersIds.has(p.userId) && (
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-2.5 text-xs">
                      <span className="font-medium uppercase tracking-wide text-text-muted">Risposte al quiz</span>
                      <ul className="flex flex-col gap-2">
                        {groupVisit.quiz.questions.map((q, i) => {
                          const givenIndex = p.quizAnswers[i]
                          const isCorrect = givenIndex === q.correct_option_index
                          return (
                            <li key={q._id || i} className="flex items-start gap-2">
                              {isCorrect ? (
                                <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
                              ) : (
                                <CrossIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-error)]" />
                              )}
                              <div className="flex min-w-0 flex-col">
                                <span className="text-text">{q.text}</span>
                                <span className="text-text-muted">
                                  Risposta: {givenIndex != null ? q.options[givenIndex] : '—'}
                                </span>
                                {!isCorrect && (
                                  <span className="text-text-muted">Corretta: {q.options[q.correct_option_index]}</span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {status === 'active' && hasInsights && isExpanded && (
                    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-2.5 text-xs">
                      <span className="font-medium uppercase tracking-wide text-text-muted">Approfondimenti ascoltati</span>
                      <ul className="flex flex-col gap-1.5">
                        {p.insightTagsViewed.map((tag) => {
                          const isActive = tag === p.insightTag
                          return (
                            <li key={tag} className="flex items-center justify-between gap-2">
                              <span className={`min-w-0 truncate ${isActive ? 'font-semibold text-text' : 'text-text-muted'}`}>
                                {isActive ? '● ' : ''}
                                {tag}
                              </span>
                              {isActive && (
                                <StatusPills
                                  tone={p.insightTone}
                                  paragraphIndex={p.insightParagraphIndex}
                                  total={p.insightParagraphTotal}
                                  playbackState={p.insightPlaybackState}
                                />
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {status === 'waiting' && (
        <button
          type="button"
          onClick={startSession}
          className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-3 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
        >
          Avvia visita
        </button>
      )}

      {status === 'active' && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">Opera attiva</h2>
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
            {sortedSteps.map((step, index) => (
              <li key={step._id || index}>
                <button
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`glass-panel flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${
                    index === currentStepIndex ? 'border-accent!' : ''
                  }`}
                >
                  {step.entity?.image_url && (
                    <img src={step.entity.image_url} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-text">{step.entity?.name}</span>
                  {index === currentStepIndex && (
                    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-medium text-on-accent">
                      In corso
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'quiz' && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">Quiz in corso</h2>
          <p className="text-sm text-text-muted">
            {roster.filter((p) => p.quizScore != null).length}/{roster.length} studenti hanno risposto.
          </p>
        </div>
      )}

      {(status === 'active' || status === 'quiz') && (
        <div className="flex gap-3">
          {status === 'active' && groupVisit?.quiz && (
            <button
              type="button"
              onClick={startQuiz}
              className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-text"
            >
              Avvia quiz
            </button>
          )}
          <button
            type="button"
            onClick={endSession}
            className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-text"
          >
            Termina visita
          </button>
        </div>
      )}

      {status === 'finished' && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-text-muted">Visita terminata.</p>
          <button
            type="button"
            onClick={handleExit}
            className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent"
          >
            Torna alla Home
          </button>
        </div>
      )}
    </div>
  )
}

export default Gruppo
