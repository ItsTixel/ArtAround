import { useActiveVisit } from '../context/ActiveVisitContext'
import NoActiveVisit from '../components/NoActiveVisit'

function Comandi() {
  const { activeVisit } = useActiveVisit()

  if (!activeVisit) return <NoActiveVisit />

  return (
    <div className="flex flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold text-primary">Comandi</h1>
      <p className="text-text-muted">Visita attiva: {activeVisit.title}</p>
    </div>
  )
}

export default Comandi
