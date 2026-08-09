import { Routes, Route } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import Home from './pages/Home'
import Mappa from './pages/Mappa'
import Opera from './pages/Opera'
import Comandi from './pages/Comandi'
import Qr from './pages/Qr'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="mappa" element={<Mappa />} />
        <Route path="opera" element={<Opera />} />
        <Route path="comandi" element={<Comandi />} />
        <Route path="qr" element={<Qr />} />
      </Route>
    </Routes>
  )
}

export default App
