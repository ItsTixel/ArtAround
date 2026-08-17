import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import ProfileMenu from '../components/ProfileMenu'
import PlayerBar from '../components/PlayerBar'
import { useActiveVisit } from '../context/ActiveVisitContext'

function AppLayout() {
  const location = useLocation()
  const { activeVisit } = useActiveVisit()
  const showPlayer = location.pathname !== '/' && Boolean(activeVisit)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <ProfileMenu hasPlayer={showPlayer} />
      <main className={`flex-1 overflow-y-auto ${showPlayer ? 'pb-56' : 'pb-20'}`}>
        <Outlet />
      </main>
      {showPlayer && <PlayerBar />}
      <BottomNav />
    </div>
  )
}

export default AppLayout
