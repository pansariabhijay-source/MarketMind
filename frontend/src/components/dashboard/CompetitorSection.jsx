import React from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, ReferenceLine,
} from 'recharts'
import { C } from '../../theme.js'
import { Panel, SectionTitle, Badge, Empty } from '../ui.jsx'

export default function CompetitorSection({ a, index }) {
  const comps = a.competitors || []
  if (!comps.length) {
    return (
      <Panel className="p-6" hover>
        <SectionTitle index={index} icon="🏆" title="Competitive Landscape" sub="positioning & players" />
        <Empty label="No competitor data for this run" />
      </Panel>
    )
  }

  const plotable = comps.filter(c => c.market_share > 0 || c.innovation > 0)
  const scatter = plotable.map(c => ({ x: c.market_share, y: c.innovation, name: c.name }))

  return (
    <Panel className="p-6" hover>
      <SectionTitle index={index} icon="🏆" title="Competitive Landscape" sub={`${comps.length} tracked players`}
        right={<Badge tone="teal">{comps.filter(c => c.verified).length} verified</Badge>} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6">
        {/* Positioning map */}
        <div>
          <p className="label mb-2">Positioning · Presence vs Innovation</p>
          {scatter.length ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 12, right: 16, bottom: 4, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <ReferenceLine x={50} stroke={C.line} strokeDasharray="2 4" />
                  <ReferenceLine y={50} stroke={C.line} strokeDasharray="2 4" />
                  <XAxis type="number" dataKey="x" name="Presence" domain={[0, 100]}
                         tickLine={false} axisLine={{ stroke: C.border }} label={{ value: 'Market Presence →', position: 'insideBottom', offset: -2, fill: C.muted, fontSize: 9 }} />
                  <YAxis type="number" dataKey="y" name="Innovation" domain={[0, 100]}
                         tickLine={false} axisLine={false} width={30} />
                  <ZAxis range={[120, 120]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3', stroke: C.line }}
                           contentStyle={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10 }}
                           formatter={(v, n) => [v, n]} />
                  <Scatter data={scatter} fill={C.gold}>
                    <LabelList dataKey="name" position="top" style={{ fill: C.soft, fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] rounded-lg border border-dashed border-border flex items-center justify-center">
              <p className="text-muted text-xs font-mono px-6 text-center">Positioning scores unavailable — see competitor detail →</p>
            </div>
          )}
          {a.market_gap && (
            <div className="mt-3 rounded-lg border border-gold/25 bg-gold/5 p-3">
              <p className="label text-gold/80 mb-1">Market Gap</p>
              <p className="text-soft text-[0.78rem] leading-relaxed">{a.market_gap}</p>
            </div>
          )}
        </div>

        {/* Competitor detail */}
        <div className="space-y-2.5">
          {comps.slice(0, 5).map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface/40 p-3.5 panel-hover">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-display font-semibold text-bright text-sm truncate">{c.name || `Competitor ${i + 1}`}</span>
                  {!c.verified && <Badge tone="negative">Unverified</Badge>}
                </div>
                <span className="font-mono text-[0.68rem] text-gold shrink-0">{c.pricing || '—'}</span>
              </div>
              {c.offering && <p className="text-muted text-[0.72rem] mb-2 leading-snug">{c.offering}</p>}
              <div className="grid grid-cols-2 gap-2 text-[0.7rem]">
                <div className="flex gap-1.5"><span style={{ color: C.positive }}>+</span><span className="text-soft leading-snug">{c.strength || '—'}</span></div>
                <div className="flex gap-1.5"><span style={{ color: C.negative }}>−</span><span className="text-soft leading-snug">{c.weakness || '—'}</span></div>
              </div>
              {c.funding && c.funding !== 'Unknown' && (
                <p className="text-muted/70 text-[0.64rem] mt-2 font-mono">Funding: {c.funding}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}
