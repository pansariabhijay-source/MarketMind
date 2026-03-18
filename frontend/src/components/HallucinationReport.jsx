import React from 'react'

// ── Flexible Parsers ──────────────────────────────────────────────────────────

function parseRiskScore(text) {
  const m = text.match(/(?:Hallucination\s+Risk\s+(?:Score)?|Risk\s+Score)[:\s*#]*([A-Z]+)/i)
  return m ? m[1].toUpperCase() : null
}

// Extract a section by any of several possible headings
function parseSection(text, ...patterns) {
  for (const pattern of patterns) {
    const regex = new RegExp(`(?:##?#?\\s+)?${pattern}[:\\s]*([\\s\\S]*?)(?=(?:##?#?\\s+[A-Z])|$)`, 'i')
    const m = text.match(regex)
    if (m && m[1].trim()) return m[1].trim()
  }
  return null
}

// Parse ANY table-like structure — pipe tables, or even "Key | Value" text
function parseAnyTable(text) {
  if (!text) return null

  // Try pipe table first
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const pipeLines = lines.filter(l => l.includes('|'))

  if (pipeLines.length >= 2) {
    const parse = row => row.split('|').map(c => c.trim()).filter(Boolean)
    // Find header line (first non-separator line)
    const headerLine = pipeLines.find(l => !l.match(/^[\|\-\s]+$/))
    if (!headerLine) return null
    const headers = parse(headerLine)
    const headerIdx = pipeLines.indexOf(headerLine)
    const dataLines = pipeLines.slice(headerIdx + 1).filter(l => !l.match(/^[\|\-\s]+$/))
    const rows = dataLines.map(parse).filter(r => r.length >= 1)
    if (rows.length > 0) return { headers, rows }
  }

  return null
}

// Extract key-value pairs from text like "Total Claims: 10"
function parseKeyValues(text) {
  if (!text) return []
  const pairs = []
  const lines = text.split('\n').filter(Boolean)
  for (const line of lines) {
    const m = line.match(/[-•*]?\s*([^:|\n]+?):\s*([^\n]+)/)
    if (m) pairs.push({ key: m[1].trim(), value: m[2].trim() })
  }
  return pairs
}

function parseBullets(text) {
  if (!text) return []
  return text.split('\n')
    .map(l => l.replace(/^[-•*▸\d.]+\s*/, '').trim())
    .filter(l => l.length > 10)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBanner({ score }) {
  const config = {
    LOW:    { color: 'text-teal', bg: 'bg-teal/8', border: 'border-teal/25', icon: '🟢', bar: 'bg-teal', pct: 85 },
    MEDIUM: { color: 'text-gold', bg: 'bg-gold/8', border: 'border-gold/25', icon: '🟡', bar: 'bg-gold', pct: 55 },
    HIGH:   { color: 'text-rose', bg: 'bg-rose/8', border: 'border-rose/25', icon: '🔴', bar: 'bg-rose', pct: 25 },
  }
  const c = config[score] || config['MEDIUM']
  return (
    <div className={`px-6 py-5 rounded-2xl border ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{c.icon}</span>
          <div>
            <p className={`font-display font-bold text-lg ${c.color}`}>Hallucination Risk: {score}</p>
            <p className="text-soft text-xs mt-0.5">
              {score === 'LOW'    && 'Most claims verified and cross-referenced across all agents'}
              {score === 'MEDIUM' && 'Some claims have weak or vague sources — review carefully'}
              {score === 'HIGH'   && 'Several claims unverified — treat this report with caution'}
            </p>
          </div>
        </div>
        <div className={`w-14 h-14 rounded-full border-4 ${c.border} flex items-center justify-center`}>
          <span className={`font-display font-extrabold text-lg ${c.color}`}>{c.pct}</span>
        </div>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${c.pct}%` }} />
      </div>
    </div>
  )
}

function MetricsGrid({ text }) {
  // Try table first, then key-value pairs
  const table = parseAnyTable(text)
  let items = []

  if (table) {
    // If 2 columns, treat as key-value
    if (table.headers.length === 2) {
      items = table.rows.map(r => ({ key: r[0] || '', value: r[1] || '-' }))
    } else {
      items = table.rows.map(r => ({ key: r[0] || '', value: r[1] || '-' }))
    }
  } else {
    items = parseKeyValues(text)
  }

  if (!items.length) return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <p className="text-muted text-sm">Metrics not available for this run</p>
    </div>
  )

  const getValueColor = (key, val) => {
    const n = parseInt(val)
    if (isNaN(n)) return 'text-bright'
    const k = key.toLowerCase()
    if (k.includes('reliability')) return n >= 75 ? 'text-teal' : n >= 50 ? 'text-gold' : 'text-rose'
    if (k.includes('unverified') && k.includes('rate')) return n <= 20 ? 'text-teal' : n <= 40 ? 'text-gold' : 'text-rose'
    if (k.includes('contradiction')) return n === 0 ? 'text-teal' : n <= 2 ? 'text-gold' : 'text-rose'
    if (k.includes('verified') && !k.includes('un')) return 'text-teal'
    if (k.includes('unverified')) return n === 0 ? 'text-teal' : 'text-rose'
    return 'text-bright'
  }

  const metricEmoji = (key) => {
    const k = key.toLowerCase()
    if (k.includes('total')) return '📊'
    if (k.includes('unverified') && k.includes('rate')) return '📈'
    if (k.includes('unverified')) return '⚠️'
    if (k.includes('verified')) return '✅'
    if (k.includes('reliability')) return '🎯'
    if (k.includes('contradiction')) return '⚡'
    if (k.includes('primary')) return '📗'
    if (k.includes('secondary')) return '📙'
    if (k.includes('missing')) return '📕'
    return '📌'
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div key={i} className="bg-surface border border-border rounded-xl px-4 py-4 hover:border-gold/20 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <span>{metricEmoji(item.key)}</span>
            <span className="font-mono text-muted text-xs uppercase tracking-wider leading-tight">{item.key}</span>
          </div>
          <p className={`font-display font-extrabold text-2xl tracking-tight ${getValueColor(item.key, item.value)}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function AgentScoresTable({ text }) {
  const table = parseAnyTable(text)

  if (!table || table.rows.length === 0) return (
    <div className="bg-surface border border-border rounded-xl p-4 text-center">
      <p className="text-muted text-sm">Agent scores not available for this run</p>
    </div>
  )

  const getScoreColor = (val) => {
    const n = parseInt(val)
    if (isNaN(n)) return { text: 'text-soft', bar: 'bg-muted' }
    return n >= 8 ? { text: 'text-teal', bar: 'bg-teal' }
         : n >= 5 ? { text: 'text-gold', bar: 'bg-gold' }
         :          { text: 'text-rose', bar: 'bg-rose' }
  }

  // Find score column index
  const scoreIdx = table.headers.findIndex(h => h.toLowerCase().includes('score'))
  const agentIdx = 0
  const claimsIdx  = table.headers.findIndex(h => h.toLowerCase().includes('claim'))
  const verIdx     = table.headers.findIndex(h => h.toLowerCase() === 'verified')
  const unverIdx   = table.headers.findIndex(h => h.toLowerCase().includes('unverif'))

  return (
    <div className="space-y-2">
      {table.rows.map((row, i) => {
        const agent  = row[agentIdx]   || `Agent ${i+1}`
        const score  = scoreIdx >= 0   ? row[scoreIdx]  : row[row.length-1]
        const claims = claimsIdx >= 0  ? row[claimsIdx] : '-'
        const ver    = verIdx >= 0     ? row[verIdx]    : '-'
        const unver  = unverIdx >= 0   ? row[unverIdx]  : '-'
        const { text: scoreText, bar: scoreBar } = getScoreColor(score)
        const scoreNum  = parseInt(score) || 0
        const barWidth  = Math.min((scoreNum / 10) * 100, 100)

        return (
          <div key={i} className="bg-surface border border-border rounded-xl px-5 py-4 hover:border-gold/20 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-bold text-sm text-bright">{agent}</span>
              <span className={`font-display font-extrabold text-xl ${scoreText}`}>{score}</span>
            </div>
            <div className="h-1.5 bg-border rounded-full mb-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${scoreBar}`} style={{ width: `${barWidth}%` }} />
            </div>
            <div className="flex items-center gap-4">
              {claims !== '-' && <span className="font-mono text-xs text-muted">Claims <span className="text-bright font-bold">{claims}</span></span>}
              {ver    !== '-' && <span className="font-mono text-xs text-muted">✓ <span className="text-teal font-bold">{ver}</span></span>}
              {unver  !== '-' && <span className="font-mono text-xs text-muted">⚠ <span className="text-rose font-bold">{unver}</span></span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContradictionsBlock({ text }) {
  if (!text) return (
    <div className="flex items-center gap-3 px-5 py-4 bg-teal/5 border border-teal/20 rounded-xl">
      <span className="text-xl">✅</span>
      <p className="font-display font-bold text-sm text-teal">No contradictions detected</p>
    </div>
  )

  const isClean = /none\s+detected|no\s+contradiction|0\s+contradiction/i.test(text)
  if (isClean) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-teal/5 border border-teal/20 rounded-xl">
        <span className="text-xl">✅</span>
        <p className="font-display font-bold text-sm text-teal">No contradictions detected across agents</p>
      </div>
    )
  }

  // Remove table noise and get real lines
  const lines = text.split('\n')
    .map(l => l.replace(/\|[-\s|]+\|/g, '').replace(/^\|/, '').trim())
    .filter(l => l.length > 15 && !l.match(/^[-|]+$/))

  if (!lines.length) return (
    <div className="flex items-center gap-3 px-5 py-4 bg-teal/5 border border-teal/20 rounded-xl">
      <span className="text-xl">✅</span>
      <p className="font-display font-bold text-sm text-teal">No contradictions detected</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {lines.slice(0, 5).map((line, i) => (
        <div key={i} className="flex gap-3 px-5 py-3 bg-rose/5 border border-rose/15 rounded-xl">
          <span className="text-rose mt-0.5 shrink-0">⚡</span>
          <p className="text-soft text-sm leading-relaxed">{line}</p>
        </div>
      ))}
    </div>
  )
}

function RecommendationBlock({ text }) {
  if (!text) return null
  const clean = text.replace(/^#+\s+.*$/m, '').trim()
  const isYes = /\bYES\b/i.test(clean)
  const isNo  = /\bNO\b/i.test(clean) && !isYes

  // Strip the YES/NO and show just the explanation
  const explanation = clean.replace(/YES|NO/gi, '').replace(/^[\s–—:•*-]+/, '').trim()

  return (
    <div className={`flex items-start gap-4 px-5 py-4 rounded-xl border ${
      isYes ? 'bg-teal/5 border-teal/20' :
      isNo  ? 'bg-rose/5 border-rose/20' : 'bg-surface border-border'
    }`}>
      <span className="text-2xl mt-0.5">{isYes ? '✅' : isNo ? '❌' : '❓'}</span>
      <div>
        <p className={`font-display font-bold text-sm mb-1.5 ${isYes ? 'text-teal' : isNo ? 'text-rose' : 'text-bright'}`}>
          {isYes ? 'Recommendation Supported by Verified Data' :
           isNo  ? 'Recommendation Not Fully Supported' :
                   'Recommendation Validity Unclear'}
        </p>
        {explanation && <p className="text-soft text-sm leading-relaxed">{explanation}</p>}
      </div>
    </div>
  )
}

function CaveatsBlock({ text }) {
  if (!text) return null
  const lines = parseBullets(text)
  if (!lines.length) return null
  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-3 px-4 py-3 bg-gold/4 border border-gold/15 rounded-xl">
          <span className="font-mono text-gold shrink-0 mt-0.5 font-bold text-xs">{String(i+1).padStart(2,'0')}</span>
          <p className="text-soft text-sm leading-relaxed">{line}</p>
        </div>
      ))}
    </div>
  )
}

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-base">{icon}</span>
      <h3 className="font-display font-bold text-xs uppercase tracking-widest text-gold">{title}</h3>
      <div className="flex-1 h-px bg-gold/15" />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HallucinationReport({ report }) {
  const riskScore = parseRiskScore(report)

  // Very flexible section parsing — tries many possible heading variations
  const errorText   = parseSection(report, 'Error Metrics', 'Metrics', 'Error\\s+Analysis')
  const agentText   = parseSection(report, 'Agent\\s+(?:Reliability\\s+)?Scores?', 'Agent\\s+Analysis', 'Reliability\\s+Scores?')
  const contraText  = parseSection(report, 'Key\\s+Contradictions?', 'Contradictions?(?:\\s+Detected)?(?:\\s+List)?', 'Conflicts?')
  const recText     = parseSection(report, 'Recommendation\\s+(?:Validity|Valid\\?|Backed)', 'Recommendation\\s+Analysis', 'Final\\s+Validity')
  const caveatText  = parseSection(report, 'Key\\s+Caveats?', 'Caveats?', 'Important\\s+Notes?', 'Data\\s+Quality')

  return (
    <div className="space-y-8">

      {riskScore && <RiskBanner score={riskScore} />}

      {/* Confidence legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-muted text-xs uppercase tracking-widest">Confidence</span>
        {[
          { label: '🟢 HIGH',       cls: 'border-teal/30 text-teal bg-teal/5' },
          { label: '🟡 MEDIUM',     cls: 'border-gold/30 text-gold bg-gold/5' },
          { label: '🔴 LOW',        cls: 'border-rose/30 text-rose bg-rose/5' },
          { label: '⚠️ UNVERIFIED', cls: 'border-rose/30 text-rose bg-rose/5' },
        ].map(l => (
          <span key={l.label} className={`font-mono text-xs px-3 py-1 rounded-full border ${l.cls}`}>{l.label}</span>
        ))}
      </div>

      <div className="h-px bg-gradient-to-r from-gold/30 via-gold/10 to-transparent" />

      <div><SectionHeading icon="📊" title="Error Metrics" /><MetricsGrid text={errorText} /></div>
      <div><SectionHeading icon="🤖" title="Agent Reliability Scores" /><AgentScoresTable text={agentText} /></div>
      <div><SectionHeading icon="⚡" title="Contradictions" /><ContradictionsBlock text={contraText} /></div>
      <div><SectionHeading icon="🎯" title="Recommendation Validity" /><RecommendationBlock text={recText} /></div>
      <div><SectionHeading icon="⚠️" title="Key Caveats" /><CaveatsBlock text={caveatText} /></div>

    </div>
  )
}
