import React from 'react'
import { C, riskColor } from '../../theme.js'
import { Panel, SectionTitle, Badge, Meter, Empty } from '../ui.jsx'

export default function Reliability({ a, index }) {
  const c = a.confidence || {}
  const rc = riskColor(c.risk_level || 'MEDIUM')
  const total = c.total_claims || 0
  const verifiedPct = total ? Math.round((c.verified_claims / total) * 100) : 0

  return (
    <Panel className="p-6" hover>
      <SectionTitle index={index} icon="✅" title="Data Reliability" sub="verification audit"
        right={<Badge tone={c.risk_level === 'LOW' ? 'positive' : c.risk_level === 'HIGH' ? 'negative' : 'warning'}>
          Risk {c.risk_level || 'MEDIUM'}
        </Badge>} />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* reliability meter */}
        <div className="rounded-lg border border-border bg-surface/40 p-5 flex flex-col items-center justify-center text-center">
          <div className="relative w-28 h-28 mb-3">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke={C.border} strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={rc} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(c.overall_score || 0) / 100 * 264} 264`}
                      style={{ filter: `drop-shadow(0 0 4px ${rc}66)` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-bold text-2xl text-white tnum">{c.overall_score || 0}</span>
              <span className="label">/ 100</span>
            </div>
          </div>
          <p className="text-soft text-xs leading-relaxed max-w-[220px]">
            {c.risk_level === 'LOW' && 'Most claims sourced and cross-verified across agents.'}
            {c.risk_level === 'MEDIUM' && 'Some claims have weak sourcing — review before acting.'}
            {c.risk_level === 'HIGH' && 'Several claims unverified — treat with caution.'}
          </p>
        </div>

        <div className="space-y-4">
          {/* claim stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Total Claims', total, C.bright],
              ['Verified', c.verified_claims || 0, C.positive],
              ['Unverified', c.unverified_claims || 0, C.negative],
            ].map(([label, val, col]) => (
              <div key={label} className="rounded-lg border border-border bg-surface/40 px-3 py-3">
                <p className="label">{label}</p>
                <p className="font-display font-bold text-xl tnum mt-1" style={{ color: col }}>{val}</p>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div>
              <div className="flex justify-between mb-1"><span className="label">Verified Share</span><span className="text-soft text-[0.68rem] tnum">{verifiedPct}%</span></div>
              <Meter value={verifiedPct} color={C.positive} height={5} />
            </div>
          )}

          {/* contradictions */}
          {c.contradictions?.length > 0 ? (
            <div>
              <p className="label mb-2">Contradictions Detected</p>
              <div className="space-y-1.5">
                {c.contradictions.slice(0, 4).map((x, i) => (
                  <div key={i} className="flex gap-2 rounded-md border border-negative/20 bg-negative/5 px-3 py-2">
                    <span style={{ color: C.negative }} className="shrink-0">⚡</span>
                    <p className="text-soft text-[0.74rem] leading-snug">{x}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-positive/20 bg-positive/5 px-3 py-2">
              <span style={{ color: C.positive }}>✓</span>
              <p className="text-positive text-[0.76rem] font-medium">No contradictions detected across agents</p>
            </div>
          )}

          {/* caveats */}
          {c.caveats?.length > 0 && (
            <div>
              <p className="label mb-2">Key Caveats</p>
              <ul className="space-y-1">
                {c.caveats.slice(0, 4).map((x, i) => (
                  <li key={i} className="text-muted text-[0.74rem] flex gap-2 leading-snug">
                    <span className="text-gold/60 font-mono text-[0.62rem] mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>{x}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {a.sources?.length > 0 && (
        <>
          <div className="hairline my-5" />
          <p className="label mb-2">Sources Referenced</p>
          <div className="flex flex-wrap gap-1.5">
            {a.sources.slice(0, 12).map((s, i) => (
              <span key={i} className="px-2 py-1 rounded border border-border text-muted text-[0.66rem] font-mono">{s}</span>
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}
