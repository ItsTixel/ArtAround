import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import ProfileMenu from '../components/ProfileMenu'
import PlayerBar from '../components/PlayerBar'
import InsightModal from '../components/InsightModal'
import VisitEndModal from '../components/VisitEndModal'
import VisitStartMuseumModal from '../components/VisitStartMuseumModal'
import { useActiveVisit } from '../context/ActiveVisitContext'
import { useVisitProgress } from '../context/VisitProgressContext'
import useVisitTheme from '../hooks/useVisitTheme'

function AppLayout() {
  const location = useLocation()
  const { activeVisit } = useActiveVisit()
  const { activeInsightTag, closeInsight, showEndPrompt } = useVisitProgress()
  const showPlayer = location.pathname !== '/' && Boolean(activeVisit)

  useVisitTheme(activeVisit)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <a href="#main-content" className="skip-link">Salta al contenuto principale</a>
      <ProfileMenu hasPlayer={showPlayer} />
      <main id="main-content" className={`flex-1 overflow-y-auto ${showPlayer ? 'pb-56' : 'pb-20'}`}>
        <Outlet />
      </main>
      {showPlayer && <PlayerBar />}
      <BottomNav />
      {/* Overlay globale, come GroupQuizModal in App.jsx: un comando vocale può
          chiedere un approfondimento da qualunque pagina, non solo da Comandi. */}
      {activeInsightTag && <InsightModal tag={activeInsightTag} onClose={closeInsight} />}
      {showEndPrompt && <VisitEndModal />}
      {/* Scelta del museo di partenza per le visite inframuseali, mostrata
          una volta subito dopo l'attivazione (vedi pendingMuseumChoice). */}
      <VisitStartMuseumModal />
    </div>
  )
}

export default AppLayout
