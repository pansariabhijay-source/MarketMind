import React from 'react'

export default function HistoryPanel({ history, onSelect, onClear, activeJobId }) {
  if (!history.length) return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3 opacity-20">📋</div>
      <p className="text-muted text-sm">No previous research runs yet</p>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-muted">
          Previous Runs
        </h3>
        <button
          onClick={onClear}
          className="text-xs text-muted hover:text-rose transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-2">
        {history.map((job) => (
          <button
            key={job.job_id}
            onClick={() => onSelect(job)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
              activeJobId === job.job_id
                ? 'border-accent/40 bg-accent/5'
                : 'border-border bg-card hover:border-dim'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-white/80 line-clamp-1 leading-snug">
                {job.product_idea}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${
                job.status === 'completed' ? 'text-emerald bg-emerald/10' :
                job.status === 'running'   ? 'text-accent bg-accent/10' :
                job.status === 'failed'    ? 'text-rose bg-rose/10' :
                'text-muted bg-dim/10'
              }`}>
                {job.status}
              </span>
            </div>
            <p className="text-xs text-muted mt-1 font-mono">
              {new Date(job.created_at).toLocaleDateString()} · {new Date(job.created_at).toLocaleTimeString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
