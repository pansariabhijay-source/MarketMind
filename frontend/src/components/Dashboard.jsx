import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { verdictColor } from '../theme.js'
import { Badge } from './ui.jsx'
import Scorecard from './dashboard/Scorecard.jsx'
import MarketSection from './dashboard/MarketSection.jsx'
import CompetitorSection from './dashboard/CompetitorSection.jsx'
import SegmentSection from './dashboard/SegmentSection.jsx'
import StrategySection from './dashboard/StrategySection.jsx'
import FinancialSection from './dashboard/FinancialSection.jsx'
import { SwotSection, GtmSection, RiskSection } from './dashboard/SwotGtmRisk.jsx'
import Reliability from './dashboard/Reliability.jsx'

export default function Dashboard({ job }) {
  const a = job.analysis
  const [tab, setTab] = useState('dashboard')
  const [copied, setCopied] = useState(false)

  const copyReport = () => {
    navigator.clipboard.writeText(job.report || '')
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  const downloadReport = () => {
    const blob = new Blob([job.report || ''], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `marketmind-${(job.product_idea || 'report').slice(0, 40).replace(/\s+/g, '-')}.md`
    el.click(); URL.revokeObjectURL(url)
  }

  if (!a) {
    // Structured analysis missing — fall back to markdown only.
    return (
      <div className="report-content max-w-3xl">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.report || '_No report available._'}</ReactMarkdown>
      </div>
    )
  }

  const vColor = verdictColor(a.verdict)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: vColor }} />
            <span className="label" style={{ color: vColor }}>Report Ready</span>
            <span className="text-border">·</span>
            <span className="label">Score {a.opportunity_score}/100</span>
            {job.from_cache && <Badge tone="teal">⚡ Cached · {Math.round((job.cache_similarity || 0) * 100)}%</Badge>}
          </div>
          <h1 className="font-display font-bold text-white text-2xl md:text-[1.75rem] tracking-tight leading-tight">
            {job.product_idea}
          </h1>
          {job.completed_at && (
            <p className="label mt-1.5">
              Generated {new Date(job.completed_at).toLocaleString()}
              {job.elapsed_seconds ? ` · ${Math.round(job.elapsed_seconds)}s` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setTab('dashboard')}
              className={`px-3.5 py-1.5 text-[0.68rem] font-mono uppercase tracking-widest transition-colors ${tab === 'dashboard' ? 'bg-gold/10 text-gold' : 'text-muted hover:text-soft'}`}>
              Dashboard
            </button>
            <button onClick={() => setTab('report')}
              className={`px-3.5 py-1.5 text-[0.68rem] font-mono uppercase tracking-widest transition-colors border-l border-border ${tab === 'report' ? 'bg-gold/10 text-gold' : 'text-muted hover:text-soft'}`}>
              Full Report
            </button>
          </div>
          <button onClick={copyReport} className="px-3 py-1.5 rounded-lg border border-border text-muted hover:text-gold hover:border-gold/40 text-[0.68rem] font-mono transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button onClick={downloadReport} className="px-3 py-1.5 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 text-[0.68rem] font-mono transition-colors">
            ↓ .md
          </button>
        </div>
      </div>

      {tab === 'dashboard' ? (
        <div className="space-y-5">
          <Scorecard a={a} />
          <MarketSection a={a} index={1} />
          <CompetitorSection a={a} index={2} />
          <SegmentSection a={a} index={3} />
          <StrategySection a={a} index={4} />
          <FinancialSection a={a} index={5} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <SwotSection a={a} index={6} />
            <GtmSection a={a} index={7} />
          </div>
          <RiskSection a={a} index={8} />
          <Reliability a={a} index={9} />
        </div>
      ) : (
        <div className="panel p-6 md:p-8">
          <div className="report-content max-w-3xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.report || '_No report available._'}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
