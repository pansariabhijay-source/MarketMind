import React from 'react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from 'recharts'
import { C, verdictColor, scoreColor } from '../../theme.js'
import { Panel, Badge, Meter } from '../ui.jsx'

// Semicircular opportunity-score gauge (custom SVG for a distinctive look).
function Gauge({ score }) {
  const R = 88, CX = 100, CY = 100, sw = 14
  const start = Math.PI, end = 0
  const angle = start + (end - start) * (score / 100)
  const polar = (a) => [CX + R * Math.cos(a), CY - R * Math.sin(a)]
  const [sx, sy] = polar(start)
  const [ex, ey] = polar(angle)
  const [tx, ty] = polar(end)
  const large = 0 // always <180deg for a semicircle segment
  const col = scoreColor(score)
  return (
    <svg viewBox="0 0 200 118" className="w-full max-w-[280px]">
      {/* track */}
      <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${tx} ${ty}`}
            fill="none" stroke={C.border} strokeWidth={sw} strokeLinecap="round" />
      {/* value arc */}
      <path d={`M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`}
            fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${col}66)` }} />
      <text x="100" y="86" textAnchor="middle"
            className="font-display" fontSize="42" fontWeight="700" fill={C.white}>
        {score}
      </text>
      <text x="100" y="104" textAnchor="middle"
            className="font-mono" fontSize="9" letterSpacing="2" fill={C.muted}>
        / 100 SCORE
      </text>
    </svg>
  )
}

const SCORE_AXES = [
  ['market_attractiveness', 'Market'],
  ['competitive_intensity', 'Whitespace'],
  ['customer_urgency', 'Urgency'],
  ['differentiation', 'Edge'],
  ['execution_feasibility', 'Feasibility'],
]

export default function Scorecard({ a }) {
  const vColor = verdictColor(a.verdict)
  const vTone = a.verdict === 'GO' ? 'positive' : a.verdict === 'NO-GO' ? 'negative' : 'warning'
  const radarData = SCORE_AXES.map(([k, label]) => ({
    axis: label, value: a.score_breakdown?.[k] ?? 0,
  }))

  return (
    <Panel className="overflow-hidden">
      {/* top ribbon */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface/40">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: C.positive }} />
          <span className="label">Investment Memo</span>
        </div>
        <Badge tone="gold">Confidence {a.confidence_pct}%</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px]">
        {/* Gauge + verdict */}
        <div className="flex flex-col items-center justify-center gap-4 p-6 border-b lg:border-b-0 lg:border-r border-border">
          <Gauge score={a.opportunity_score} />
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
                 style={{ borderColor: `${vColor}55`, background: `${vColor}12`, color: vColor }}>
              <span className="font-display font-bold text-lg tracking-tight">{a.verdict}</span>
            </div>
            <p className="text-soft text-xs mt-3 leading-relaxed max-w-[240px]">{a.verdict_rationale}</p>
          </div>
        </div>

        {/* Headline + summary */}
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-border flex flex-col">
          <Badge tone={vTone} className="self-start mb-3">Verdict · {a.verdict}</Badge>
          <h2 className="font-display font-bold text-white text-lg leading-snug tracking-tight mb-3">
            {a.headline || a.idea}
          </h2>
          <div className="hairline mb-3" />
          <p className="text-soft text-[0.86rem] leading-relaxed overflow-y-auto max-h-[220px] pr-1">
            {a.executive_summary || 'Executive summary unavailable for this run.'}
          </p>
        </div>

        {/* Radar breakdown */}
        <div className="p-5">
          <p className="label mb-1">Score Breakdown</p>
          <div className="h-[190px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="axis" tick={{ fill: C.muted, fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                <Radar dataKey="value" stroke={C.gold} fill={C.gold} fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-1">
            {SCORE_AXES.map(([k, label]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-[0.66rem] text-muted font-mono w-20 shrink-0">{label}</span>
                <Meter value={a.score_breakdown?.[k] ?? 0} color={scoreColor(a.score_breakdown?.[k] ?? 0)} height={4} />
                <span className="text-[0.66rem] text-soft font-mono w-6 text-right tnum">{a.score_breakdown?.[k] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
