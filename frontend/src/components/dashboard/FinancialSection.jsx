import React from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { C, fmtUSD, fmtNum } from '../../theme.js'
import { Panel, SectionTitle, Empty } from '../ui.jsx'

export default function FinancialSection({ a, index }) {
  const fin = (a.financials || []).map(f => ({
    period: f.period, revenue: f.revenue_usd, cost: f.costs_usd,
    profit: (f.revenue_usd || 0) - (f.costs_usd || 0), customers: f.customers,
  }))
  if (!fin.length) {
    return (
      <Panel className="p-6" hover>
        <SectionTitle index={index} icon="📈" title="Financial Projection" sub="3-year outline" />
        <Empty label="No financial projection for this run" />
      </Panel>
    )
  }
  const last = fin[fin.length - 1]

  return (
    <Panel className="p-6" hover>
      <SectionTitle index={index} icon="📈" title="Financial Projection" sub="revenue · cost · customers" />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-surface/40 px-4 py-3">
          <p className="label">Yr{fin.length} Revenue</p>
          <p className="font-display font-bold text-xl tnum mt-1" style={{ color: C.gold }}>{fmtUSD(last.revenue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface/40 px-4 py-3">
          <p className="label">Yr{fin.length} Profit</p>
          <p className="font-display font-bold text-xl tnum mt-1" style={{ color: last.profit >= 0 ? C.positive : C.negative }}>{fmtUSD(last.profit)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface/40 px-4 py-3">
          <p className="label">Yr{fin.length} Customers</p>
          <p className="font-display font-bold text-xl tnum mt-1 text-bright">{fmtNum(last.customers)}</p>
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={fin} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={{ stroke: C.border }} />
            <YAxis yAxisId="l" tickFormatter={fmtUSD} tickLine={false} axisLine={false} width={46} />
            <YAxis yAxisId="r" orientation="right" tickFormatter={fmtNum} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10 }}
                     formatter={(v, n) => n === 'Customers' ? [fmtNum(v), n] : [fmtUSD(v), n]} />
            <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: C.muted }} />
            <Bar yAxisId="l" dataKey="revenue" name="Revenue" fill={C.gold} radius={[3, 3, 0, 0]} maxBarSize={34} />
            <Bar yAxisId="l" dataKey="cost" name="Cost" fill={C.border} radius={[3, 3, 0, 0]} maxBarSize={34} />
            <Line yAxisId="r" type="monotone" dataKey="customers" name="Customers" stroke={C.teal} strokeWidth={2} dot={{ r: 3, fill: C.teal }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
