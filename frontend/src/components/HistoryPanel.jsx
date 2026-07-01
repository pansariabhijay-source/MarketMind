import React from 'react'
import { C, verdictColor } from '../theme.js'

const statusTone = {
  completed: { c: C.positive, bg: 'rgba(63,185,80,0.1)' },
  running:   { c: C.gold,     bg: 'rgba(232,184,109,0.1)' },
  pending:   { c: C.gold,     bg: 'rgba(232,184,109,0.1)' },
  failed:    { c: C.negative, bg: 'rgba(240,97,109,0.1)' },
}

export default function HistoryPanel({ history, onSelect, onClear, activeJobId }) {
  if (!history.length) return (
    <div className="text-center py-14">
      <div className="text-3xl mb-3 opacity-20">📋</div>
      <p className="text-muted text-sm">No research runs yet</p>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="label">Previous Runs · {history.length}</h3>
        <button onClick={onClear} className="text-[0.68rem] text-muted hover:text-negative font-mono transition-colors">Clear all</button>
      </div>
      <div className="space-y-2">
        {history.map((job) => {
          const t = statusTone[job.status] || statusTone.pending
          const verdict = job.analysis?.verdict
          const score = job.analysis?.opportunity_score
          return (
            <button key={job.job_id} onClick={() => onSelect(job)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                activeJobId === job.job_id ? 'border-gold/40 bg-gold/5' : 'border-border bg-card hover:border-line'
              }`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-bright line-clamp-1 leading-snug">{job.product_idea}</p>
                <span className="text-[0.6rem] px-1.5 py-0.5 rounded font-mono shrink-0 uppercase tracking-wider"
                      style={{ color: t.c, background: t.bg }}>{job.status}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="label">{new Date(job.created_at).toLocaleDateString()} · {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {verdict && (
                  <span className="font-mono text-[0.62rem] px-1.5 py-0.5 rounded border tabular-nums"
                        style={{ color: verdictColor(verdict), borderColor: `${verdictColor(verdict)}44` }}>
                    {verdict}{score != null ? ` · ${score}` : ''}
                  </span>
                )}
                {job.from_cache && <span className="label" style={{ color: C.teal }}>⚡ cached</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
