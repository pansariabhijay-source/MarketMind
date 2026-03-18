import React, { useState, useEffect } from 'react'
import AgentPipeline from './components/AgentPipeline.jsx'
import ReportViewer from './components/ReportViewer.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import WaitingGame from './components/WaitingGame.jsx'
import AnimatedBg from './components/AnimatedBg.jsx'
import { useJob } from './hooks/useJob.js'
import { startRun, getHistory, clearHistory } from './api.js'

const ALL_EXAMPLES = [
  'AI-powered legal document review for SMBs',
  'Personalized nutrition app using CGM data',
  'B2B SaaS for construction project management',
  'Voice AI for customer support automation',
  'AI tutor for competitive exam preparation',
  'Mental health journaling app with AI insights',
  'Automated invoice processing for SMEs',
  'AI-powered recruitment screening tool',
  'Smart inventory management for restaurants',
  'Carbon footprint tracker for enterprises',
  'AI co-pilot for financial advisors',
  'No-code AI workflow builder for startups',
  'Real-time fraud detection for fintech',
  'AI-driven personalized skincare diagnostics',
  'Predictive maintenance SaaS for factories',
  'Interior design studio partnership with a German hardware brand',
  'EdTech platform for coding bootcamps',
  'Sleep tracking app with AI recommendations',
  'Organic meal kit delivery for tier-2 cities',
  'Smart expense management for remote teams',
]

function getRandomExamples(count = 4) {
  return [...ALL_EXAMPLES].sort(() => Math.random() - 0.5).slice(0, count)
}

const AGENTS_META = [
  { label: 'Market Research',     desc: 'TAM · SAM · Trends' },
  { label: 'Fact Verification',   desc: 'Source validation' },
  { label: 'Competitive Intel',   desc: '5+ competitor map' },
  { label: 'Customer Insights',   desc: 'ICP · Pain points' },
  { label: 'Product Strategy',    desc: 'MVP · Roadmap' },
  { label: 'Business Analysis',   desc: 'Go / No-Go verdict' },
  { label: 'Hallucination Guard', desc: 'Cross-verify outputs' },
]

const AGENT_NAMES = [
  'Market Research Specialist',
  'Fact Verification Specialist',
  'Competitive Intelligence Analyst',
  'Customer Insights Researcher',
  'Product Strategy Advisor',
  'Business Analyst',
  'Hallucination Guard',
]

export default function App() {
  const [input, setInput]       = useState('')
  const [jobId, setJobId]       = useState(null)
  const [history, setHistory]   = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [view, setView]         = useState('home')
  const [examples, setExamples] = useState(() => getRandomExamples())

  const liveJob = useJob(jobId)

  useEffect(() => {
    if (!liveJob) return
    setSelectedJob(liveJob)
    setHistory(prev => {
      const exists = prev.find(j => j.job_id === liveJob.job_id)
      if (exists) return prev.map(j => j.job_id === liveJob.job_id ? liveJob : j)
      return [liveJob, ...prev]
    })
    if (liveJob.status === 'running' || liveJob.status === 'pending') setView('running')
    if (liveJob.status === 'completed') setView('report')
    if (liveJob.status === 'failed') setError(liveJob.error)
  }, [liveJob])

  useEffect(() => { getHistory().then(setHistory).catch(() => {}) }, [])

  const handleSubmit = async () => {
    if (!input.trim() || loading) return
    setError(null)
    setLoading(true)
    try {
      const job = await startRun(input.trim())
      setJobId(job.job_id)
      setView('running')
    } catch (e) {
      setError('Failed to connect to backend. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectHistory = (job) => {
    setSelectedJob(job)
    setJobId(null)
    setView(job.status === 'completed' ? 'report' : 'running')
  }

  const handleClearHistory = async () => {
    await clearHistory()
    setHistory([])
    if (view === 'history') setView('home')
  }

  const handleNew = () => {
    setInput('')
    setJobId(null)
    setSelectedJob(null)
    setError(null)
    setExamples(getRandomExamples())
    setView('home')
  }

  const activeJob = liveJob || selectedJob
  const currentAgentName = AGENT_NAMES[activeJob?.current_step ?? 0] ?? 'Initializing...'

  return (
    <div className="min-h-screen bg-void font-body">

      {/* Animated background — home + running only */}
      {(view === 'home' || view === 'running') && <AnimatedBg />}

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-border bg-void/90 backdrop-blur-xl">
        <div className="w-full max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between">
          <button onClick={handleNew} className="flex items-center gap-3 group">
            <div className="w-6 h-6 border border-gold/50 flex items-center justify-center group-hover:border-gold transition-colors">
              <div className="w-2 h-2 bg-gold" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white">MARKETMIND</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={handleNew} className={`px-4 py-1.5 text-xs font-mono tracking-widest uppercase transition-all ${view==='home'?'text-gold border-b border-gold':'text-muted hover:text-soft'}`}>
              New
            </button>
            <span className="text-border">|</span>
            <button onClick={() => setView('history')} className={`px-4 py-1.5 text-xs font-mono tracking-widest uppercase transition-all ${view==='history'?'text-gold border-b border-gold':'text-muted hover:text-soft'}`}>
              History [{history.length}]
            </button>
          </div>
        </div>
      </nav>

      {/* ── HOME ── */}
      {view === 'home' && (
        <div className="pt-12 min-h-screen relative">
          <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-16">

            <div className="flex items-center gap-3 mb-16 animate-fade-up opacity-0 stagger-1">
              <div className="flex items-center gap-2 px-3 py-1 border border-teal/30 bg-teal/5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                <span className="font-mono text-teal text-xs tracking-widest uppercase">System Online</span>
              </div>
              <span className="font-mono text-muted text-xs">7 Agents · Sequential Pipeline · Hallucination Guard Active</span>
            </div>

            <div className="mb-16">
              <h1 className="font-display text-[clamp(3.5rem,10vw,8rem)] font-extrabold leading-none tracking-tight text-white animate-fade-up opacity-0 stagger-2">
                MARKET
              </h1>
              <div className="flex items-end gap-6 flex-wrap">
                <h1 className="font-display text-[clamp(3.5rem,10vw,8rem)] font-extrabold leading-none tracking-tight text-gold-gradient animate-fade-up opacity-0 stagger-3">
                  INTEL
                </h1>
                <p className="text-soft text-sm mb-4 max-w-xs leading-relaxed animate-fade-up opacity-0 stagger-4">
                  Drop your idea. Seven AI agents research the market, map competitors, profile customers and deliver a verified report.
                </p>
              </div>
            </div>

            {/* Input */}
            <div className="animate-fade-up opacity-0 stagger-4">
              <div className="border border-border bg-card/80 backdrop-blur-sm relative hover:border-gold/30 transition-colors duration-300">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gold" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gold" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gold" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gold" />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-gold text-xs tracking-widest uppercase">Input</span>
                    <span className="font-mono text-muted text-xs animate-blink">_</span>
                  </div>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter'&&(e.metaKey||e.ctrlKey)) handleSubmit() }}
                    placeholder="Describe your startup idea in detail..."
                    rows={3}
                    className="w-full bg-transparent text-bright placeholder-muted text-sm font-body resize-none focus:outline-none leading-relaxed"
                  />
                  {error && <p className="text-rose text-xs font-mono mt-2">{error}</p>}
                </div>
                <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-surface/50">
                  <span className="font-mono text-muted text-xs">Ctrl+Enter to run</span>
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim()||loading}
                    className="flex items-center gap-3 px-6 py-2 bg-gold text-void font-mono font-bold text-xs tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bright transition-colors"
                  >
                    {loading ? <><span className="animate-pulse">●●●</span> INIT</> : <>RUN ANALYSIS →</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="mt-8 animate-fade-up opacity-0 stagger-5">
              <div className="flex items-center gap-4 mb-3">
                <span className="font-mono text-muted text-xs tracking-widest uppercase">Suggested</span>
                <div className="flex-1 h-px bg-border" />
                <button onClick={() => setExamples(getRandomExamples())} className="font-mono text-xs text-muted hover:text-gold transition-colors tracking-widest uppercase">↻ Shuffle</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {examples.map(ex => (
                  <button key={ex} onClick={() => setInput(ex)} className="text-left px-4 py-2.5 border border-border text-soft text-xs hover:border-gold/50 hover:text-bright hover:bg-gold/5 transition-all font-body leading-snug">
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent grid */}
            <div className="mt-16 animate-fade-up opacity-0 stagger-6">
              <div className="flex items-center gap-4 mb-5">
                <span className="font-mono text-muted text-xs tracking-widest uppercase">Pipeline</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {AGENTS_META.map((a, i) => (
                  <div key={a.label} className="border border-border p-3 hover:border-gold/30 hover:bg-gold/3 transition-all">
                    <div className="font-mono text-gold text-xs mb-2">0{i+1}</div>
                    <div className="font-body font-semibold text-bright text-xs leading-tight mb-1">{a.label}</div>
                    <div className="font-mono text-muted text-xs leading-tight">{a.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RUNNING ── */}
      {view === 'running' && activeJob && (
        <div className="pt-12 min-h-screen relative">
          <div className="relative z-10 max-w-5xl mx-auto px-6 pt-12 pb-16">

            {/* Top status */}
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-teal animate-pulse" />
              <span className="font-mono text-teal text-xs tracking-widest uppercase">Analysis Running</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-white tracking-tight mb-8 leading-tight">
              {activeJob.product_idea.toUpperCase()}
            </h2>

            {/* Two columns: pipeline + game */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

              {/* Pipeline */}
              <div className="border border-border bg-card/80 backdrop-blur-sm p-5">
                <AgentPipeline currentStep={activeJob.current_step} status={activeJob.status} />
              </div>

              {/* Game */}
              <div className="border border-border bg-card/80 backdrop-blur-sm p-6 flex items-center justify-center">
                <WaitingGame agentName={currentAgentName} />
              </div>
            </div>

            {activeJob.status === 'failed' && (
              <div className="mt-4 border border-rose/30 bg-rose/5 p-4">
                <p className="text-rose text-sm font-mono">{activeJob.error}</p>
                <button onClick={handleNew} className="mt-2 text-xs text-muted hover:text-white font-mono">← ABORT / NEW</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REPORT ── */}
      {view === 'report' && activeJob?.report && (
        <div className="pt-12 min-h-screen">
          <div className="max-w-screen-xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            <aside className="space-y-4">
              <div className="border border-border bg-card p-4">
                <AgentPipeline currentStep={6} status="completed" />
              </div>
              <div className="border border-border bg-card p-4">
                <HistoryPanel history={history} onSelect={handleSelectHistory} onClear={handleClearHistory} activeJobId={activeJob.job_id} />
              </div>
              <button onClick={handleNew} className="w-full py-3 border border-border text-muted hover:border-gold/50 hover:text-gold font-mono text-xs tracking-widest uppercase transition-all">
                + New Analysis
              </button>
            </aside>
            <main className="border border-border bg-card p-8 min-h-[600px]">
              <ReportViewer
                report={activeJob.report}
                hallucinationReport={activeJob.hallucination_report}
                productIdea={activeJob.product_idea}
                fromCache={activeJob.from_cache}
                cacheSimilarity={activeJob.cache_similarity}
                originalIdea={activeJob.original_idea}
                completedAt={activeJob.completed_at}
              />
            </main>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {view === 'history' && (
        <div className="pt-12 min-h-screen grid-bg vignette relative">
          <div className="relative z-10 max-w-2xl mx-auto px-6 pt-16">
            <h2 className="font-display text-5xl font-extrabold text-white tracking-tight mb-8">HISTORY</h2>
            <div className="border border-border bg-card p-6">
              <HistoryPanel history={history} onSelect={handleSelectHistory} onClear={handleClearHistory} activeJobId={activeJob?.job_id} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
