import VisitInfoBody from './VisitInfoBody'

function VisitDetailModal({ visit, isActive, onClose, onActivate, onDeactivate }) {
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <VisitInfoBody visit={visit} onClose={onClose} />
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-border p-4">
          {isActive ? (
            <>
              <button
                type="button"
                onClick={onDeactivate}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text"
              >
                Disattiva
              </button>
              <button
                type="button"
                onClick={onActivate}
                className="flex-1 rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-[0_0_16px_rgba(212,168,83,0.25)]"
              >
                Vai alla visita
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onActivate}
              className="flex-1 rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-[0_0_16px_rgba(212,168,83,0.25)]"
            >
              Attiva visita
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default VisitDetailModal
