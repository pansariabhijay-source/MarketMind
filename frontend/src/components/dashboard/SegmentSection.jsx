import React from 'react'
import { C } from '../../theme.js'
import { Panel, SectionTitle, Badge, Empty } from '../ui.jsx'

const priorityTone = { primary: 'gold', secondary: 'teal', tertiary: 'muted' }

export default function SegmentSection({ a, index }) {
  const segs = a.segments || []
  return (
    <Panel className="p-6" hover>
      <SectionTitle index={index} icon="👥" title="Customer Segments" sub="who buys & why now"
        right={a.icp ? <Badge tone="gold">ICP defined</Badge> : null} />

      {a.icp && (
        <div className="rounded-lg border border-gold/20 bg-gold/5 p-3.5 mb-4">
          <p className="label text-gold/80 mb-1">Ideal Customer Profile</p>
          <p className="text-bright text-[0.85rem] leading-relaxed">{a.icp}</p>
        </div>
      )}

      {segs.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {segs.slice(0, 3).map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface/40 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-semibold text-white text-[0.9rem] truncate pr-2">{s.name || `Segment ${i + 1}`}</span>
                <Badge tone={priorityTone[s.priority] || 'muted'}>{s.priority || 'segment'}</Badge>
              </div>
              {s.description && <p className="text-muted text-[0.74rem] mb-2 leading-snug">{s.description}</p>}

              {s.pain_points?.length > 0 && (
                <div className="mb-2.5">
                  <p className="label mb-1">Pain Points</p>
                  <ul className="space-y-1">
                    {s.pain_points.slice(0, 3).map((p, j) => (
                      <li key={j} className="text-soft text-[0.74rem] flex gap-1.5 leading-snug">
                        <span style={{ color: C.negative }} className="shrink-0">•</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <div>
                  <p className="label">Willing to Pay</p>
                  <p className="font-display font-semibold text-[0.82rem] mt-0.5" style={{ color: C.positive }}>{s.willingness_to_pay || '—'}</p>
                </div>
                <div>
                  <p className="label">Size</p>
                  <p className="text-bright text-[0.82rem] mt-0.5 tnum">{s.size_label || '—'}</p>
                </div>
              </div>
              {s.buying_trigger && (
                <p className="text-muted text-[0.68rem] mt-2 leading-snug"><span className="text-gold/70">Trigger:</span> {s.buying_trigger}</p>
              )}
            </div>
          ))}
        </div>
      ) : <Empty label="No segment data for this run" />}
    </Panel>
  )
}
