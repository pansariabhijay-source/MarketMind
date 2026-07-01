import React from 'react'

// ── Panel ──────────────────────────────────────────────────────────────────
export function Panel({ children, className = '', hover = false, id }) {
  return (
    <section id={id} className={`panel ${hover ? 'panel-hover' : ''} ${className}`}>
      {children}
    </section>
  )
}

// ── Section title (label + rule) ───────────────────────────────────────────
export function SectionTitle({ index, title, sub, icon, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {index != null && (
          <span className="font-mono text-[0.66rem] text-gold/70 tabular-nums">
            {String(index).padStart(2, '0')}
          </span>
        )}
        {icon && <span className="text-sm opacity-90">{icon}</span>}
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-white text-[0.95rem] tracking-tight truncate">{title}</h3>
          {sub && <p className="label mt-0.5">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

// ── Badge ──────────────────────────────────────────────────────────────────
export function Badge({ children, tone = 'muted', className = '' }) {
  const tones = {
    muted:    'border-border text-muted',
    gold:     'border-gold/35 text-gold bg-gold/5',
    teal:     'border-teal/35 text-teal bg-teal/5',
    positive: 'border-positive/40 text-positive bg-positive/5',
    warning:  'border-warning/40 text-warning bg-warning/5',
    negative: 'border-negative/40 text-negative bg-negative/5',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[0.62rem] uppercase tracking-widest ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

// ── Horizontal meter ───────────────────────────────────────────────────────
export function Meter({ value, max = 100, color = '#E8B86D', height = 6 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="w-full rounded-full bg-border/60 overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all duration-700"
           style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Stat cell ──────────────────────────────────────────────────────────────
export function Stat({ label, value, sub, color = 'var(--white)', hint }) {
  return (
    <div className="px-4 py-4">
      <p className="label">{label}</p>
      <p className="font-display font-bold text-2xl tracking-tight tnum mt-1.5" style={{ color }} title={hint}>
        {value}
      </p>
      {sub && <p className="text-muted text-[0.72rem] mt-1 leading-snug">{sub}</p>}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
export function Empty({ label = 'No data for this run' }) {
  return (
    <div className="flex items-center justify-center py-8 text-center">
      <p className="text-muted text-xs font-mono">{label}</p>
    </div>
  )
}
