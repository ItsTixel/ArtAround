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
import SessionManage from './pages/SessionManage'

function App() {
  return (
    <AuthProvider>
      <ActiveVisitProvider>
        <VisitProgressProvider>
          <GroupSessionProvider>
            <Routes>
              {/* Al di fuori di AppLayout: niente BottomNav/PlayerBar/ProfileMenu,
                  sono console di attesa/gestione, non contenuto da navigare. */}
              <Route path="sessione" element={<SessionLobby />} />
              <Route path="sessione/gestisci" element={<SessionManage />} />
              <Route element={<AppLayout />}>
                <Route index element={<Home />} />
                <Route path="mappa" element={<Mappa />} />
                <Route path="opera" element={<Opera />} />
                <Route path="comandi" element={<Comandi />} />
                <Route path="qr" element={<Qr />} />
              </Route>
            </Routes>
          </GroupSessionProvider>
        </VisitProgressProvider>
      </ActiveVisitProvider>
    </AuthProvider>
  )
}

export default App
