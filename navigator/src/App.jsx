import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ActiveVisitProvider } from './context/ActiveVisitContext'
import { VisitProgressProvider } from './context/VisitProgressContext'
import AppLayout from './layout/AppLayout'
import Home from './pages/Home'
import Mappa from './pages/Mappa'
import Opera from './pages/Opera'
import Comandi from './pages/Comandi'
import Qr from './pages/Qr'

function App() {
  return (
    <AuthProvider>
      <ActiveVisitProvider>
        <VisitProgressProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="mappa" element={<Mappa />} />
              <Route path="opera" element={<Opera />} />
              <Route path="comandi" element={<Comandi />} />
              <Route path="qr" element={<Qr />} />
            </Route>
          </Routes>
        </VisitProgressProvider>
      </ActiveVisitProvider>
    </AuthProvider>
  )
}

export default App
