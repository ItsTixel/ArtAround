import { useActiveVisit } from '../context/ActiveVisitContext'
import NoActiveVisit from '../components/NoActiveVisit'

function Mappa() {
  const { activeVisit } = useActiveVisit()

  if (!activeVisit) return <NoActiveVisit />

  return (
    <div className="flex flex-col gap-2 p-6">
      <h1 className="font-serif text-2xl font-semibold text-text">Mappa</h1>
      <p className="text-text-muted">Visita attiva: {activeVisit.title}</p>
    </div>
  )
}

export default Mappa
