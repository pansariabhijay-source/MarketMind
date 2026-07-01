import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { C, fmtUSD } from '../../theme.js'
import { Panel, SectionTitle, Badge, Empty } from '../ui.jsx'

function Funnel({ market }) {
  const rows = [
    { key: 'TAM', label: 'Total Addressable', d: market.tam, w: 100, color: C.gold },
    { key: 'SAM', label: 'Serviceable Available', d: market.sam, w: 66, color: C.teal },
    { key: 'SOM', label: 'Obtainable (3-yr)', d: market.som, w: 34, color: C.positive },
  ]
  const has = rows.some(r => r.d?.value_usd > 0)
  if (!has) return <Empty label="Market sizing not available" />
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.key} className="group">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[0.66rem] tracking-widest" style={{ color: r.color }}>{r.key}</span>
            <span className="text-muted text-[0.66rem]">{r.label}</span>
          </div>
          <div className="relative h-11 rounded-lg bg-surface/60 border border-border overflow-hidden">
            <div className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                 style={{ width: `${r.w}%`, background: `linear-gradient(90deg, ${r.color}30, ${r.color}12)`, borderRight: `2px solid ${r.color}` }}>
              <span className="font-display font-bold text-white text-base tnum">
                {r.d?.label || fmtUSD(r.d?.value_usd)}
              </span>
            </div>
          </div>
          {r.d?.methodology && (
            <p className="text-muted text-[0.68rem] mt-1 leading-snug">{r.d.methodology}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function MarketSection({ a, index }) {
  const m = a.market || {}
  const growth = (a.growth_projection || []).map(g => ({ year: g.year, market: g.market_usd }))

  return (
    <Panel className="p-6" hover>
      <SectionTitle index={index} icon="🔍" title="Market Opportunity" sub="TAM · SAM · SOM · growth"
        right={m.cagr_pct ? <Badge tone="teal">CAGR {m.cagr_pct}%</Badge> : null} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Funnel market={m} />

        <div>
          <p className="label mb-2">Projected Market Size</p>
          {growth.length > 1 ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mkt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.gold} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.gold} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: C.border }} />
                  <YAxis tickFormatter={fmtUSD} tickLine={false} axisLine={false} width={48} />
                  <Tooltip formatter={(v) => [fmtUSD(v), 'Market']} labelStyle={{ color: C.soft }}
                           contentStyle={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10 }} />
                  <Area type="monotone" dataKey="market" stroke={C.gold} strokeWidth={2} fill="url(#mkt)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty label="Growth projection unavailable" />}
          {m.cagr_source && <p className="text-muted text-[0.68rem] mt-2">Source: {m.cagr_source}</p>}
        </div>
      </div>

      {a.trends?.length > 0 && (
        <>
          <div className="hairline my-5" />
          <p className="label mb-3">Key Trends</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {a.trends.slice(0, 3).map((t, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface/40 p-4">
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="font-mono text-gold text-[0.66rem] tnum">↗</span>
                  <p className="font-display font-semibold text-bright text-[0.82rem] leading-snug">{t.title}</p>
                </div>
                <p className="text-muted text-[0.72rem] leading-relaxed">{t.detail}</p>
                {t.source && <p className="text-muted/70 text-[0.64rem] mt-2 font-mono">— {t.source}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}
