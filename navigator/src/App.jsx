import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ActiveVisitProvider } from './context/ActiveVisitContext'
import { VisitProgressProvider } from './context/VisitProgressContext'
import { GroupSessionProvider } from './context/GroupSessionContext'
import AppLayout from './layout/AppLayout'
import GroupQuizModal from './components/GroupQuizModal'

const Home = lazy(() => import('./pages/Home'))
const SelectVisit = lazy(() => import('./pages/SelectVisit'))
const Mappa = lazy(() => import('./pages/Mappa'))
const Opera = lazy(() => import('./pages/Opera'))
const Comandi = lazy(() => import('./pages/Comandi'))
const Qr = lazy(() => import('./pages/Qr'))
const SessionLobby = lazy(() => import('./pages/SessionLobby'))
const Gruppo = lazy(() => import('./pages/Gruppo'))

function PageFallback() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ActiveVisitProvider>
        <VisitProgressProvider>
          <GroupSessionProvider>
            {/* Overlay globale: deve interrompere lo studente qualunque tab
                stia guardando quando il professore avvia il quiz, non solo
                su /opera — per questo sta qui e non dentro una singola route. */}
            <GroupQuizModal />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Al di fuori di AppLayout: niente BottomNav/PlayerBar/ProfileMenu,
                    è una sala d'attesa, non contenuto da navigare. La console del
                    professore (ex /sessione/gestisci) è invece dentro AppLayout,
                    sulla tab "Gruppo" — il professore segue la visita come
                    chiunque altro mentre la gestisce. */}
                <Route path="sessione" element={<SessionLobby />} />
                <Route element={<AppLayout />}>
                  <Route index element={<Home />} />
                  <Route path="visite" element={<SelectVisit />} />
                  <Route path="mappa" element={<Mappa />} />
                  <Route path="opera" element={<Opera />} />
                  <Route path="comandi" element={<Comandi />} />
                  <Route path="qr" element={<Qr />} />
                  <Route path="gruppo" element={<Gruppo />} />
                </Route>
              </Routes>
            </Suspense>
          </GroupSessionProvider>
        </VisitProgressProvider>
      </ActiveVisitProvider>
    </AuthProvider>
  )
}

export default App
