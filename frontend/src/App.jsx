import React, { useState, useEffect } from 'react'
import LivePipeline from './components/LivePipeline.jsx'
import Dashboard from './components/Dashboard.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import AnimatedBg from './components/AnimatedBg.jsx'
import { useJob } from './hooks/useJob.js'
import { startRun, getHistory, clearHistory, getStatus } from './api.js'
import { C, verdictColor } from './theme.js'

const ALL_EXAMPLES = [
  'AI-powered legal document review for SMBs',
  'Personalized nutrition app using CGM data',
  'B2B SaaS for construction project management',
  'AI tutor for competitive exam preparation',
  'Organic meal kit delivery for tier-2 cities',
  'Interior design studio partnering with a German hardware brand',
  'Predictive maintenance SaaS for factories',
  'Smart inventory management for restaurants',
  'Carbon footprint tracker for enterprises',
  'Voice AI for customer support automation',
  'Real-time fraud detection for fintech',
  'Sleep tracking app with AI recommendations',
]
const rand = (n = 4) => [...ALL_EXAMPLES].sort(() => Math.random() - 0.5).slice(0, n)

const PIPELINE_PREVIEW = [
  ['01', 'Market Research', 'TAM · SAM · SOM'],
  ['02', 'Competitive Intel', 'Positioning map'],
  ['03', 'Customer Insights', 'ICP · WTP'],
  ['04', 'Product Strategy', 'MVP · pricing'],
  ['05', 'Fact Verification', 'Source every claim'],
  ['06', 'Business Synthesis', 'Opportunity score'],
  ['07', 'Reliability Audit', 'Cross-verify'],
]

export default function App() {
  const [input, setInput] = useState('')
  const [jobId, setJobId] = useState(null)
  const [history, setHistory] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('home')
  const [examples, setExamples] = useState(rand)

  const liveJob = useJob(jobId)

  useEffect(() => {
    if (!liveJob) return
    setSelectedJob(liveJob)
    setHistory(prev => {
      const exists = prev.find(j => j.job_id === liveJob.job_id)
      return exists ? prev.map(j => j.job_id === liveJob.job_id ? liveJob : j) : [liveJob, ...prev]
    })
    if (liveJob.status === 'running' || liveJob.status === 'pending') setView('running')
    if (liveJob.status === 'completed') setView('report')
    if (liveJob.status === 'failed') { setError(liveJob.error); setView('running') }
  }, [liveJob])

  useEffect(() => { getHistory().then(setHistory).catch(() => {}) }, [])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const idea = params.get('idea')
    if (idea) { setInput(idea); window.history.replaceState({}, '', window.location.pathname) }
    // Deep-link to a specific report / run: /app/?job=<id>
    const jid = params.get('job')
    if (jid) {
      getStatus(jid).then(job => {
        setSelectedJob(job)
        if (job.status === 'completed') setView('report')
        else { setJobId(jid); setView('running') }
      }).catch(() => {})
    }
  }, [])

  const handleSubmit = async () => {
    if (!input.trim() || loading) return
    setError(null); setLoading(true)
    try {
      const job = await startRun(input.trim())
      setJobId(job.job_id); setView('running')
    } catch (e) {
      setError('Could not reach the backend. Is the server running?')
    } finally { setLoading(false) }
  }

  const selectHistory = (job) => {
    setSelectedJob(job); setJobId(job.status === 'completed' ? null : job.job_id)
    setView(job.status === 'completed' ? 'report' : 'running')
  }
  const doClear = async () => { await clearHistory(); setHistory([]); if (view === 'history') setView('home') }
  const goHome = () => { setInput(''); setJobId(null); setSelectedJob(null); setError(null); setExamples(rand()); setView('home') }

  const activeJob = liveJob || selectedJob

  return (
    <div className="min-h-screen bg-void font-body">
      {(view === 'home' || view === 'running') && <AnimatedBg />}

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 border-b border-border bg-void/85 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md border border-gold/40 flex items-center justify-center group-hover:border-gold transition-colors">
              <div className="w-2.5 h-2.5 rounded-sm bg-gold" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">MarketMind</span>
            <span className="hidden sm:inline label ml-1">Intelligence, Verified</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={goHome} className={`px-4 py-1.5 text-[0.68rem] font-mono tracking-widest uppercase transition-all rounded-md ${view === 'home' ? 'text-gold bg-gold/5' : 'text-muted hover:text-soft'}`}>New</button>
            <button onClick={() => setView('history')} className={`px-4 py-1.5 text-[0.68rem] font-mono tracking-widest uppercase transition-all rounded-md ${view === 'history' ? 'text-gold bg-gold/5' : 'text-muted hover:text-soft'}`}>
              History [{history.length}]
            </button>
          </div>
        </div>
      </nav>

      {/* HOME */}
      {view === 'home' && (
        <div className="pt-14 min-h-screen relative">
          <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-20">
            <div className="flex items-center gap-3 mb-12 animate-fade-up opacity-0 stagger-1">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-positive/25 bg-positive/5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.positive }} />
                <span className="font-mono text-[0.66rem] tracking-widest uppercase" style={{ color: C.positive }}>System Online</span>
              </div>
              <span className="label">7-agent pipeline · verified sourcing · GLM-4.7 · Cerebras</span>
            </div>

            <div className="mb-12">
              <h1 className="font-display text-[clamp(3rem,9vw,6.5rem)] font-bold leading-[0.92] tracking-tight text-white animate-fade-up opacity-0 stagger-2">
                Validate the
              </h1>
              <div className="flex items-end gap-6 flex-wrap">
                <h1 className="font-display text-[clamp(3rem,9vw,6.5rem)] font-bold leading-[0.92] tracking-tight text-gold-gradient animate-fade-up opacity-0 stagger-3">
                  opportunity.
                </h1>
                <p className="text-soft text-sm mb-3 max-w-xs leading-relaxed animate-fade-up opacity-0 stagger-4">
                  Drop a startup idea. Seven AI analysts size the market, map competitors, model the financials, and hand you a scored investment memo.
                </p>
              </div>
            </div>

            {/* Input */}
            <div className="animate-fade-up opacity-0 stagger-4">
              <div className="panel panel-hover relative">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-gold text-[0.66rem] tracking-widest uppercase">Your Idea</span>
                    <span className="font-mono text-muted text-xs animate-blink">_</span>
                  </div>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
                    placeholder="e.g. A subscription meal-kit service for tier-2 Indian cities focused on regional cuisines..."
                    rows={3}
                    className="w-full bg-transparent text-bright placeholder-muted text-sm resize-none focus:outline-none leading-relaxed"
                  />
                  {error && <p className="text-negative text-xs font-mono mt-2">{error}</p>}
                </div>
                <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-surface/40">
                  <span className="label">⌘/Ctrl + Enter to run</span>
                  <button onClick={handleSubmit} disabled={!input.trim() || loading}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gold text-void font-mono font-bold text-[0.68rem] tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all">
                    {loading ? <><span className="animate-pulse">●●●</span> Init</> : <>Run Analysis →</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="mt-7 animate-fade-up opacity-0 stagger-5">
              <div className="flex items-center gap-4 mb-3">
                <span className="label">Try one</span>
                <div className="flex-1 hairline" />
                <button onClick={() => setExamples(rand())} className="label hover:text-gold transition-colors">↻ Shuffle</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {examples.map(ex => (
                  <button key={ex} onClick={() => setInput(ex)}
                    className="text-left px-4 py-2.5 rounded-lg border border-border text-soft text-xs hover:border-gold/40 hover:text-bright hover:bg-gold/5 transition-all leading-snug">
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline preview */}
            <div className="mt-14 animate-fade-up opacity-0 stagger-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="label">The Pipeline</span>
                <div className="flex-1 hairline" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {PIPELINE_PREVIEW.map(([n, label, desc]) => (
                  <div key={n} className="panel panel-hover p-3">
                    <div className="font-mono text-gold text-[0.62rem] mb-2 tnum">{n}</div>
                    <div className="font-display font-semibold text-bright text-[0.72rem] leading-tight mb-1">{label}</div>
                    <div className="font-mono text-muted text-[0.6rem] leading-tight">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RUNNING */}
      {view === 'running' && activeJob && (
        <div className="pt-14 min-h-screen relative">
          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-16">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: activeJob.status === 'failed' ? C.negative : C.gold }} />
              <span className="font-mono text-[0.66rem] tracking-widest uppercase" style={{ color: activeJob.status === 'failed' ? C.negative : C.gold }}>
                {activeJob.status === 'failed' ? 'Analysis Failed' : 'Analysis Running'}
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight mb-8 leading-tight">
              {activeJob.product_idea}
            </h2>

            {activeJob.status === 'failed' ? (
              <div className="panel p-6 border-negative/30">
                <p className="text-negative text-sm font-mono mb-3">{activeJob.error || 'The pipeline hit an error.'}</p>
                <button onClick={goHome} className="text-xs text-muted hover:text-white font-mono">← Start over</button>
              </div>
            ) : (
              <LivePipeline job={activeJob} />
            )}
          </div>
        </div>
      )}

      {/* REPORT */}
      {view === 'report' && activeJob?.report && (
        <div className="pt-14 min-h-screen">
          <div className="max-w-screen-xl mx-auto px-6 py-8">
            <Dashboard job={activeJob} />
            <div className="mt-8 flex justify-center">
              <button onClick={goHome} className="px-6 py-3 rounded-lg border border-border text-muted hover:border-gold/40 hover:text-gold font-mono text-[0.68rem] tracking-widest uppercase transition-all">
                + New Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {view === 'history' && (
        <div className="pt-14 min-h-screen relative">
          <div className="relative z-10 max-w-3xl mx-auto px-6 pt-14">
            <h2 className="font-display text-4xl font-bold text-white tracking-tight mb-8">History</h2>
            <div className="panel p-6">
              <HistoryPanel history={history} onSelect={selectHistory} onClear={doClear} activeJobId={activeJob?.job_id} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
