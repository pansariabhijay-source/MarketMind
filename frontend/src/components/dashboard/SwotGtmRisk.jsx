import React from 'react'
import { C } from '../../theme.js'
import { Panel, SectionTitle, Badge, Empty } from '../ui.jsx'

const sevTone = { high: 'negative', medium: 'warning', low: 'teal' }

export function SwotSection({ a, index }) {
  const s = a.swot || {}
  const quads = [
    { key: 'strengths', label: 'Strengths', color: C.positive, sign: '+' },
    { key: 'weaknesses', label: 'Weaknesses', color: C.negative, sign: '−' },
    { key: 'opportunities', label: 'Opportunities', color: C.gold, sign: '↗' },
    { key: 'threats', label: 'Threats', color: C.warning, sign: '⚠' },
  ]
  const empty = quads.every(q => !(s[q.key]?.length))
  return (
    <Panel className="p-6" hover>
      <SectionTitle index={index} icon="⚖️" title="SWOT Analysis" sub="internal · external" />
      {empty ? <Empty label="No SWOT data for this run" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quads.map((q) => (
            <div key={q.key} className="rounded-lg border border-border bg-surface/40 p-4"
                 style={{ borderTop: `2px solid ${q.color}` }}>
              <p className="font-mono text-[0.66rem] uppercase tracking-widest mb-2" style={{ color: q.color }}>{q.label}</p>
              <ul className="space-y-1.5">
                {(s[q.key] || []).slice(0, 4).map((item, i) => (
                  <li key={i} className="text-soft text-[0.76rem] flex gap-2 leading-snug">
                    <span style={{ color: q.color }} className="shrink-0">{q.sign}</span>{item}
                  </li>
                ))}
                {!(s[q.key]?.length) && <li className="text-muted text-[0.72rem]">—</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

export function GtmSection({ a, index }) {
  const gtm = a.gtm || []
  return (
    <Panel className="p-6" hover>
      <SectionTitle index={index} icon="🚀" title="Go-To-Market" sub="phased rollout" />
      {gtm.length ? (
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
          <div className="space-y-4">
            {gtm.slice(0, 4).map((p, i) => (
              <div key={i} className="relative">
                <span className="absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full border-2"
                      style={{ borderColor: C.gold, background: C.void }} />
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-display font-semibold text-white text-[0.85rem]">{p.phase || `Phase ${i + 1}`}</span>
                  {p.channels?.slice(0, 3).map((ch, j) => (
                    <span key={j} className="px-1.5 py-0.5 rounded border border-border text-muted text-[0.62rem] font-mono">{ch}</span>
                  ))}
                </div>
                {p.focus && <p className="text-soft text-[0.76rem] leading-snug">{p.focus}</p>}
                {p.goal && <p className="text-muted text-[0.7rem] mt-1"><span className="text-teal/80">Goal:</span> {p.goal}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : <Empty label="No GTM plan for this run" />}
    </Panel>
  )
}

export function RiskSection({ a, index }) {
  const risks = a.risks || []
  return (
    <Panel className="p-6" hover>
      <SectionTitle index={index} icon="🛡️" title="Risk Register" sub="severity · mitigation" />
      {risks.length ? (
        <div className="space-y-2">
          {risks.slice(0, 5).map((r, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface/40 p-3.5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="text-bright text-[0.82rem] font-medium leading-snug">{r.title}</p>
                <div className="flex gap-1.5 shrink-0">
                  <Badge tone={sevTone[r.severity] || 'muted'}>{r.severity}</Badge>
                </div>
              </div>
              {r.mitigation && (
                <p className="text-muted text-[0.72rem] leading-snug"><span className="text-teal/80">Mitigation:</span> {r.mitigation}</p>
              )}
            </div>
          ))}
        </div>
      ) : <Empty label="No risks flagged for this run" />}
    </Panel>
  )
}
