import React from 'react'
import { C } from '../../theme.js'
import { Panel, SectionTitle, Empty } from '../ui.jsx'

export default function StrategySection({ a, index }) {
  const diffs = a.differentiators || []
  const feats = a.mvp_features || []
  const tiers = a.pricing_tiers || []
  const nothing = !diffs.length && !feats.length && !tiers.length

  return (
    <Panel className="p-6" hover>
      <SectionTitle index={index} icon="🗺️" title="Product Strategy" sub="edge · MVP · pricing" />
      {nothing ? <Empty label="No strategy data for this run" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            {diffs.length > 0 && (
              <div>
                <p className="label mb-2">Differentiators</p>
                <div className="space-y-2">
                  {diffs.slice(0, 4).map((d, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="font-mono text-[0.66rem] text-gold tnum mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <p className="text-soft text-[0.8rem] leading-snug">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {feats.length > 0 && (
              <div>
                <p className="label mb-2">MVP Scope</p>
                <div className="flex flex-wrap gap-1.5">
                  {feats.slice(0, 6).map((f, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md border border-border bg-surface/50 text-bright text-[0.72rem] leading-snug">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {tiers.length > 0 && (
            <div>
              <p className="label mb-2">Pricing Tiers</p>
              <div className="space-y-2.5">
                {tiers.slice(0, 3).map((t, i) => (
                  <div key={i} className="rounded-lg border border-border bg-surface/40 p-3.5"
                       style={i === 1 ? { borderColor: `${C.gold}44` } : undefined}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-display font-semibold text-white text-[0.85rem]">{t.name || `Tier ${i + 1}`}</span>
                      <span className="font-display font-bold text-lg" style={{ color: C.gold }}>{t.price || '—'}</span>
                    </div>
                    {t.target && <p className="text-muted text-[0.7rem] mb-2">{t.target}</p>}
                    {t.features?.length > 0 && (
                      <ul className="space-y-0.5">
                        {t.features.slice(0, 4).map((f, j) => (
                          <li key={j} className="text-soft text-[0.72rem] flex gap-1.5 leading-snug">
                            <span style={{ color: C.teal }} className="shrink-0">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
