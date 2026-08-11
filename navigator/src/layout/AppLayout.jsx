import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default AppLayout
