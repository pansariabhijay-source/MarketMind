import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import HallucinationReport from './HallucinationReport.jsx'

function parseRiskScore(report) {
  if (!report) return null
  const m = report.match(/Hallucination Risk Score[:\s*]*([A-Z]+)/i)
  return m ? m[1].toUpperCase() : null
}

export default function ReportViewer({ report, hallucinationReport, productIdea, completedAt, fromCache, cacheSimilarity, originalIdea }) {
  const [activeTab, setActiveTab] = useState('report')
  const [copied, setCopied]       = useState(false)

  const riskScore = useMemo(() => parseRiskScore(hallucinationReport), [hallucinationReport])

  const riskBadge = riskScore === 'LOW'    ? 'text-teal border-teal/40 bg-teal/10' :
                    riskScore === 'MEDIUM' ? 'text-gold border-gold/40 bg-gold/10' :
                    riskScore === 'HIGH'   ? 'text-rose border-rose/40 bg-rose/10' :
                                            'text-muted border-border'

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab === 'report' ? report : hallucinationReport)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const content  = activeTab === 'report' ? report : hallucinationReport
    const blob     = new Blob([content], { type: 'text/markdown' })
    const url      = URL.createObjectURL(blob)
    const a        = document.createElement('a')
    a.href         = url
    a.download     = `${activeTab === 'report' ? 'report' : 'hallucination'}-${productIdea.slice(0,30).replace(/\s+/g,'-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>

      {/* Cache hit banner */}
      {fromCache && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-teal/20 bg-teal/5 mb-5">
          <span className="text-xl">⚡</span>
          <div>
            <p className="font-display font-bold text-xs text-teal uppercase tracking-widest">
              Instant Result — Retrieved from Vector DB
            </p>
            <p className="text-soft text-xs mt-0.5">
              {Math.round((cacheSimilarity || 0) * 100)}% similar to past research on "{originalIdea}"
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            <span className="font-mono text-teal text-xs tracking-widest uppercase">Report Ready</span>
            {riskScore && (
              <span className={`font-mono text-xs px-2.5 py-0.5 rounded-full border ${riskBadge}`}>
                Risk: {riskScore}
              </span>
            )}
          </div>
          <h2 className="font-display font-extrabold text-xl text-white tracking-tight leading-tight">
            {productIdea.toUpperCase()}
          </h2>
          {completedAt && (
            <p className="font-mono text-muted text-xs mt-1">
              Generated {new Date(completedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="font-mono text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:border-gold/40 hover:text-gold transition-all"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="font-mono text-xs px-3 py-1.5 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition-all"
          >
            ↓ .md
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-bold border transition-all ${
            activeTab === 'report'
              ? 'bg-gold/10 border-gold/40 text-gold'
              : 'border-border text-muted hover:border-line hover:text-soft'
          }`}
        >
          📊 Full Report
        </button>
        <button
          onClick={() => setActiveTab('hallucination')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-bold border transition-all ${
            activeTab === 'hallucination'
              ? 'bg-teal/10 border-teal/40 text-teal'
              : 'border-border text-muted hover:border-line hover:text-soft'
          }`}
        >
          🛡️ Hallucination Report
          {riskScore && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${riskBadge}`}>
              {riskScore}
            </span>
          )}
        </button>
      </div>

      <div className="h-px bg-gradient-to-r from-gold/30 via-gold/10 to-transparent mb-6" />

      {/* Content */}
      {activeTab === 'report' && report && (
        <div className="report-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
        </div>
      )}

      {activeTab === 'hallucination' && (
        hallucinationReport
          ? <HallucinationReport report={hallucinationReport} />
          : (
            <div className="text-center py-16">
              <p className="font-mono text-muted text-xs tracking-widest uppercase">
                Hallucination report not available
              </p>
            </div>
          )
      )}

    </div>
  )
}
