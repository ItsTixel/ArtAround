import VisitInfoBody from './VisitInfoBody'

function VisitDetailModal({ visit, isActive, onClose, onActivate, onDeactivate }) {
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-400/20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl"
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
                className="flex-1 rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
              >
                Vai alla visita
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onActivate}
              className="flex-1 rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
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
