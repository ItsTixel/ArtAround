import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ActiveVisitProvider } from './context/ActiveVisitContext'
import { VisitProgressProvider } from './context/VisitProgressContext'
import { GroupSessionProvider } from './context/GroupSessionContext'
import AppLayout from './layout/AppLayout'
import Home from './pages/Home'
import Mappa from './pages/Mappa'
import Opera from './pages/Opera'
import Comandi from './pages/Comandi'
import Qr from './pages/Qr'
import SessionLobby from './pages/SessionLobby'
import Gruppo from './pages/Gruppo'
import GroupQuizModal from './components/GroupQuizModal'

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
            <Routes>
              {/* Al di fuori di AppLayout: niente BottomNav/PlayerBar/ProfileMenu,
                  è una sala d'attesa, non contenuto da navigare. La console del
                  professore (ex /sessione/gestisci) è invece dentro AppLayout,
                  sulla tab "Gruppo" — il professore segue la visita come
                  chiunque altro mentre la gestisce. */}
              <Route path="sessione" element={<SessionLobby />} />
              <Route element={<AppLayout />}>
                <Route index element={<Home />} />
                <Route path="mappa" element={<Mappa />} />
                <Route path="opera" element={<Opera />} />
                <Route path="comandi" element={<Comandi />} />
                <Route path="qr" element={<Qr />} />
                <Route path="gruppo" element={<Gruppo />} />
              </Route>
            </Routes>
          </GroupSessionProvider>
        </VisitProgressProvider>
      </ActiveVisitProvider>
    </AuthProvider>
  )
}

export default App
