import React, { useState, useEffect } from 'react'
import { C } from '../theme.js'
import WaitingGame from './WaitingGame.jsx'

// Mirrors backend AGENT_STEPS (backend/main.py)
const STEPS = [
  { label: 'Market Research',          desc: 'Sizing TAM · SAM · SOM',      icon: '🔍' },
  { label: 'Competitive Intelligence', desc: 'Mapping the field',           icon: '🏆' },
  { label: 'Customer Insights',        desc: 'Segments · WTP · triggers',   icon: '👥' },
  { label: 'Product Strategy',         desc: 'MVP · pricing · GTM',         icon: '🗺️' },
  { label: 'Fact Verification',        desc: 'Sourcing every claim',        icon: '✅' },
  { label: 'Business Synthesis',       desc: 'Scoring the opportunity',     icon: '📊' },
  { label: 'Reliability Audit',        desc: 'Cross-verifying outputs',     icon: '🛡️' },
  { label: 'Structuring Insights',     desc: 'Building the dashboard',      icon: '✨' },
]

function Ring({ pct }) {
  const r = 52, circ = 2 * Math.PI * r
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke={C.border} strokeWidth="7" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={C.gold} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                style={{ filter: `drop-shadow(0 0 5px ${C.gold}66)`, transition: 'stroke-dasharray .6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-2xl text-white tnum">{pct}%</span>
        <span className="label">Complete</span>
      </div>
    </div>
  )
}

export default function LivePipeline({ job }) {
  const [showGame, setShowGame] = useState(false)
  const [elapsed, setElapsed] = useState(Math.round(job.elapsed_seconds || 0))
  const step = job.current_step ?? 0
  const pct = job.progress_pct ?? 0
  const status = job.status

  useEffect(() => {
    if (status !== 'running' && status !== 'pending') return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    if (job.elapsed_seconds) setElapsed(Math.round(job.elapsed_seconds))
  }, [job.elapsed_seconds])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
      {/* Progress + steps */}
      <div className="panel p-6">
        <div className="flex items-center gap-5 mb-6">
          <Ring pct={pct} />
          <div className="min-w-0">
            <p className="label mb-1">Now Running</p>
            <p className="font-display font-semibold text-white text-base leading-tight">{STEPS[step]?.label || 'Initialising'}</p>
            <p className="text-muted text-xs mt-1">{STEPS[step]?.desc}</p>
            <p className="font-mono text-[0.68rem] text-gold mt-3 tnum">
              {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')} elapsed
            </p>
          </div>
        </div>

        <div className="space-y-1">
          {STEPS.map((s, i) => {
            const done = i < step || status === 'completed'
            const active = i === step && status !== 'completed'
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                active ? 'border-gold/40 bg-gold/5' : done ? 'border-border/60 bg-surface/30' : 'border-transparent'
              }`}>
                <span className="font-mono text-[0.64rem] tnum w-4 shrink-0"
                      style={{ color: active ? C.gold : done ? C.teal : C.muted }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-sm shrink-0" style={{ opacity: done || active ? 1 : 0.35 }}>{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8rem] font-medium leading-tight truncate"
                     style={{ color: active ? C.white : done ? C.soft : C.muted }}>{s.label}</p>
                  {active && (
                    <p className="text-[0.66rem] text-muted font-mono flex items-center gap-1 mt-0.5">
                      {s.desc}
                      <span className="inline-flex gap-0.5 ml-0.5">
                        {[0, 1, 2].map(d => (
                          <span key={d} className="w-1 h-1 rounded-full animate-bounce" style={{ background: C.gold, animationDelay: `${d * 0.15}s` }} />
                        ))}
                      </span>
                    </p>
                  )}
                </div>
                <span className="shrink-0 w-4 text-right">
                  {done ? <span style={{ color: C.teal }} className="text-xs">✓</span>
                        : active ? <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.gold }} />
                        : <span className="inline-block w-1.5 h-1.5 rounded-full border" style={{ borderColor: C.border }} />}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Side: what's happening / game */}
      <div className="panel p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="label mb-1">Live Pipeline</p>
            <p className="text-soft text-sm">Seven agents are researching your market in sequence.</p>
          </div>
          <button onClick={() => setShowGame(g => !g)}
            className="px-3 py-1.5 rounded-lg border border-border text-muted hover:text-gold hover:border-gold/40 text-[0.66rem] font-mono uppercase tracking-widest transition-colors shrink-0">
            {showGame ? '× Close' : '🎮 Play Snake'}
          </button>
        </div>

        {showGame ? (
          <div className="flex-1 flex items-center justify-center">
            <WaitingGame agentName={STEPS[step]?.label || 'Working'} />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
            {STEPS.slice(0, 8).map((s, i) => {
              const done = i < step || status === 'completed'
              const active = i === step && status !== 'completed'
              return (
                <div key={i} className={`rounded-lg border p-4 transition-all ${
                  active ? 'border-gold/40 bg-gold/5' : done ? 'border-border bg-surface/30' : 'border-border/50'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-base" style={{ opacity: done || active ? 1 : 0.3 }}>{s.icon}</span>
                    {done && <span style={{ color: C.teal }} className="text-xs">✓</span>}
                    {active && <span className="label" style={{ color: C.gold }}>Running</span>}
                  </div>
                  <p className="font-display font-semibold text-[0.78rem] leading-tight"
                     style={{ color: active ? C.white : done ? C.bright : C.muted }}>{s.label}</p>
                  <p className="text-muted text-[0.66rem] mt-0.5 leading-snug">{s.desc}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
