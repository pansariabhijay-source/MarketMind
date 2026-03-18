import React from 'react'

const AGENTS = [
  { id: 0, label: 'Market Research',     short: 'Scanning market landscape' },
  { id: 1, label: 'Fact Verification',   short: 'Validating data sources' },
  { id: 2, label: 'Competitive Intel',   short: 'Mapping competitors' },
  { id: 3, label: 'Customer Insights',   short: 'Profiling customers' },
  { id: 4, label: 'Product Strategy',    short: 'Designing roadmap' },
  { id: 5, label: 'Business Analysis',   short: 'Synthesizing report' },
  { id: 6, label: 'Hallucination Guard', short: 'Cross-verifying outputs', isGuard: true },
]

export default function AgentPipeline({ currentStep, status }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-muted text-xs tracking-widest uppercase">Agent Pipeline</span>
        <span className={`font-mono text-xs tracking-widest uppercase px-2 py-0.5 border ${
          status === 'running'   ? 'border-teal/40 text-teal bg-teal/5' :
          status === 'completed' ? 'border-gold/40 text-gold bg-gold/5' :
          'border-border text-muted'
        }`}>
          {status === 'running' ? '● LIVE' : status?.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1">
        {AGENTS.map((agent) => {
          const isDone    = currentStep !== null && agent.id < currentStep
          const isActive  = currentStep === agent.id && status === 'running'
          const isAllDone = status === 'completed'
          const isPending = !isDone && !isActive && !isAllDone

          return (
            <div
              key={agent.id}
              className={`flex items-center gap-3 px-3 py-2.5 border transition-all duration-300 ${
                isAllDone && agent.isGuard ? 'border-gold/40 bg-gold/5' :
                isAllDone               ? 'border-teal/20 bg-teal/3' :
                isActive && agent.isGuard ? 'border-gold/50 bg-gold/5' :
                isActive                ? 'border-teal/50 bg-teal/5' :
                isDone                  ? 'border-border bg-surface/50' :
                'border-transparent'
              }`}
            >
              {/* Index */}
              <span className={`font-mono text-xs w-5 shrink-0 ${
                isAllDone ? (agent.isGuard ? 'text-gold' : 'text-teal') :
                isActive  ? (agent.isGuard ? 'text-gold' : 'text-teal') :
                isDone    ? 'text-muted' : 'text-border'
              }`}>
                {String(agent.id + 1).padStart(2, '0')}
              </span>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className={`font-body font-semibold text-xs transition-colors ${
                  isAllDone ? (agent.isGuard ? 'text-gold' : 'text-bright') :
                  isActive  ? 'text-white' :
                  isDone    ? 'text-soft' : 'text-muted'
                }`}>
                  {agent.label}
                  {agent.isGuard && (
                    <span className="ml-2 font-mono text-xs text-gold/60">[GUARD]</span>
                  )}
                </p>
                {isActive && (
                  <p className="text-xs text-muted font-mono mt-0.5 flex items-center gap-1">
                    {agent.short}
                    <span className="inline-flex gap-0.5 ml-1">
                      {[0,1,2].map(i => (
                        <span key={i} className={`w-1 h-1 rounded-full animate-bounce ${agent.isGuard ? 'bg-gold' : 'bg-teal'}`}
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                  </p>
                )}
              </div>

              {/* Status indicator */}
              <div className="shrink-0">
                {(isAllDone || isDone) ? (
                  <span className={`font-mono text-xs ${isAllDone && agent.isGuard ? 'text-gold' : 'text-teal'}`}>✓</span>
                ) : isActive ? (
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse inline-block ${agent.isGuard ? 'bg-gold' : 'bg-teal'}`} />
                ) : (
                  <span className="w-1.5 h-1.5 border border-border inline-block" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
