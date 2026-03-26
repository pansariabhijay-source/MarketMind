/* ═══════════════════════════════════════════════════════════════════════
   MarketMind Experience — Full SPA with Backend Integration
   ═══════════════════════════════════════════════════════════════════════ */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:10000/api'
  : `${window.location.origin}/api`;

class MarketMindExperience {
  constructor() {
    this.examples = [
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
      'EdTech platform for coding bootcamps',
      'Sleep tracking app with AI recommendations',
      'Organic meal kit delivery for tier-2 cities',
      'Smart expense management for remote teams',
      'Interior design studio with a German hardware brand',
    ];

    this.currentView = 'home';
    this.jobId = null;
    this.pollInterval = null;
    this.jobData = null;

    this.init();
  }

  init() {
    this.initLenis();
    this.initGSAP();
    this.initNav();
    this.initHero();
    this.initPipeline();
    this.initHowItWorks();
    this.initDashboard();
    this.initFeatures();
    this.initWhy();
    this.initCTA();
    this.initExamples();
    this.initInputEffects();
    this.initReportView();
  }

  /* ═══════ VIEW MANAGEMENT ═══════ */
  switchView(view) {
    this.currentView = view;
    const views = ['home', 'running', 'report'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = v === view ? '' : 'none';
    });

    // Toggle nav links
    document.querySelectorAll('.nav__link--home').forEach(l => {
      l.style.display = view === 'home' ? '' : 'none';
    });
    const newBtn = document.getElementById('nav-new-btn');
    if (newBtn) newBtn.style.display = view !== 'home' ? '' : 'none';

    window.scrollTo({ top: 0, behavior: 'instant' });

    // Re-init lenis for the new view height
    if (this.lenis) {
      this.lenis.resize();
    }
  }

  goHome() {
    this.stopPolling();
    this.jobId = null;
    this.jobData = null;
    this.switchView('home');
    document.getElementById('hero-input').value = '';
    document.getElementById('hero-input').focus();
  }

  /* ═══════ API ═══════ */
  async startRun(productIdea) {
    const res = await fetch(`${API_BASE}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_idea: productIdea }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getStatus(jobId) {
    const res = await fetch(`${API_BASE}/status/${jobId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  startPolling(jobId) {
    this.jobId = jobId;
    this.pollInterval = setInterval(async () => {
      try {
        const data = await this.getStatus(jobId);
        this.jobData = data;
        this.updateRunningView(data);

        if (data.status === 'completed') {
          this.stopPolling();
          this.showReport(data);
        } else if (data.status === 'failed') {
          this.stopPolling();
          this.showRunningError(data.error);
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    }, 2000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /* ═══════ SUBMIT ═══════ */
  async handleSubmit() {
    const input = document.getElementById('hero-input');
    const errorEl = document.getElementById('hero-error');
    const runBtn = document.getElementById('hero-run-btn');
    const idea = input.value.trim();

    if (!idea) return;

    this.addToHistory(idea);

    errorEl.style.display = 'none';
    runBtn.disabled = true;
    runBtn.querySelector('span:first-child').textContent = '●●● INIT';

    try {
      const job = await this.startRun(idea);

      // If cache hit — show report immediately
      if (job.status === 'completed') {
        this.jobData = job;
        this.showReport(job);
      } else {
        // Show running view
        document.getElementById('running-idea').textContent = idea;
        this.resetRunningPipeline();
        this.switchView('running');
        this.startPolling(job.job_id);
      }
    } catch (e) {
      errorEl.textContent = 'Failed to connect to backend. Is the server running on port 10000?';
      errorEl.style.display = 'block';
    } finally {
      runBtn.disabled = false;
      runBtn.querySelector('span:first-child').textContent = 'RUN ANALYSIS';
    }
  }

  /* ═══════ HISTORY ═══════ */
  loadHistory() {
    try {
      const historyItems = JSON.parse(localStorage.getItem('mm_history') || '[]');
      const container = document.getElementById('hero-history');
      const list = document.getElementById('hero-history-list');
      
      if (historyItems.length > 0) {
        container.style.display = 'block';
        list.innerHTML = '';
        historyItems.forEach(item => {
          const btn = document.createElement('button');
          btn.className = 'hero__history-item';
          btn.textContent = item.length > 40 ? item.substring(0, 40) + '...' : item;
          btn.title = item;
          btn.onclick = () => {
            document.getElementById('hero-input').value = item;
            document.getElementById('hero-input').focus();
          };
          list.appendChild(btn);
        });

        document.getElementById('history-clear-btn').onclick = () => {
          localStorage.removeItem('mm_history');
          container.style.display = 'none';
        };
      } else {
        container.style.display = 'none';
      }
    } catch(e) { console.error('History load failed', e); }
  }

  addToHistory(idea) {
    try {
      let items = JSON.parse(localStorage.getItem('mm_history') || '[]');
      items = items.filter(i => i.toLowerCase() !== idea.toLowerCase());
      items.unshift(idea);
      if (items.length > 5) items = items.slice(0, 5);
      localStorage.setItem('mm_history', JSON.stringify(items));
      this.loadHistory();
    } catch(e) { console.error('History save failed', e); }
  }

  /* ═══════ RUNNING VIEW ═══════ */
  resetRunningPipeline() {
    document.querySelectorAll('.running__agent').forEach(a => {
      a.classList.remove('active', 'done');
      a.querySelector('.running__agent-status').textContent = 'waiting';
    });
    document.getElementById('running-progress').style.width = '0%';
    document.getElementById('running-error').style.display = 'none';
  }

  updateRunningView(data) {
    const step = data.current_step ?? 0;
    const agents = document.querySelectorAll('.running__agent');
    const progress = document.getElementById('running-progress');

    agents.forEach((agent, i) => {
      const status = agent.querySelector('.running__agent-status');
      agent.classList.remove('active', 'done');

      if (i < step) {
        agent.classList.add('done');
        status.textContent = 'done ✓';
      } else if (i === step) {
        agent.classList.add('active');
        status.textContent = 'running';
      } else {
        status.textContent = 'waiting';
      }
    });

    progress.style.width = `${((step + 1) / 7) * 100}%`;
  }

  showRunningError(error) {
    const errorEl = document.getElementById('running-error');
    const errorText = document.getElementById('running-error-text');
    errorText.textContent = error || 'An unknown error occurred.';
    errorEl.style.display = 'block';
  }

  /* ═══════ REPORT VIEW ═══════ */
  showReport(data) {
    this.jobData = data;

    // Title
    document.getElementById('report-title').textContent = (data.product_idea || '').toUpperCase();

    // Meta
    if (data.completed_at) {
      document.getElementById('report-meta').textContent =
        'Generated ' + new Date(data.completed_at).toLocaleString();
    }

    // Risk badge
    const riskBadge = document.getElementById('report-risk-badge');
    const riskMatch = (data.hallucination_report || '').match(/Hallucination\s+Risk\s+Score[:\s*#]*([A-Z]+)/i);
    if (riskMatch) {
      const risk = riskMatch[1].toUpperCase();
      riskBadge.textContent = 'Risk: ' + risk;
      riskBadge.className = 'report__risk-badge ' + risk.toLowerCase();
    } else {
      riskBadge.textContent = '';
      riskBadge.className = 'report__risk-badge';
    }

    // Cache banner
    const cacheBanner = document.getElementById('report-cache-banner');
    if (data.from_cache) {
      cacheBanner.style.display = 'flex';
      document.getElementById('report-cache-text').textContent =
        `${Math.round((data.cache_similarity || 0) * 100)}% similar to past research on "${data.original_idea}"`;
    } else {
      cacheBanner.style.display = 'none';
    }

    // Render markdown report
    const reportMd = document.getElementById('report-markdown');
    reportMd.innerHTML = marked.parse(data.report || '*No report content available.*');

    // Render hallucination report — structured cards, not raw markdown
    const halMd = document.getElementById('hallucination-markdown');
    halMd.innerHTML = this.renderHallucinationHTML(data.hallucination_report || '');

    // Reset tabs
    document.getElementById('tab-report').classList.add('active');
    document.getElementById('tab-hallucination').classList.remove('active');
    document.getElementById('report-content').style.display = '';
    document.getElementById('hallucination-content').style.display = 'none';

    this.switchView('report');
  }

  /* ═══════ HALLUCINATION REPORT RENDERER ═══════ */
  renderHallucinationHTML(text) {
    if (!text || text.trim().length < 20) {
      return '<div class="hal-empty">No hallucination report available for this run.</div>';
    }

    // — Parsers —
    const parseRisk = (t) => {
      const m = t.match(/(?:Hallucination\s+Risk\s+(?:Score)?|Risk\s+Score)[:\s*#]*([A-Z]+)/i);
      return m ? m[1].toUpperCase() : null;
    };

    const parseSection = (t, ...patterns) => {
      for (const p of patterns) {
        // Stop matching at next \n## or \n**Word** or \nWord:
        const re = new RegExp(`(?:##?#?\\s+|\\*\\*)?${p}(?:\\*\\*)?[:\\s]*\\n?([\\s\\S]*?)(?=\\n##?#?\\s+|\\n\\*\\*[A-Z]|\\n[A-Z][A-Za-z\\s]+:|$)`, 'i');
        const m = t.match(re);
        if (m && m[1].trim()) return m[1].trim();
      }
      return null;
    };

    const parseTable = (t) => {
      if (!t) return null;
      const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
      const pipeLines = lines.filter(l => l.includes('|'));
      if (pipeLines.length >= 2) {
        const parse = row => row.split('|').map(c => c.replace(/\*\*/g, '').trim()).filter(Boolean);
        const headerLine = pipeLines.find(l => !l.match(/^[|\-\s]+$/));
        if (!headerLine) return null;
        const headers = parse(headerLine);
        const hIdx = pipeLines.indexOf(headerLine);
        const rows = pipeLines.slice(hIdx + 1).filter(l => !l.match(/^[|\-\s]+$/)).map(parse).filter(r => r.length >= 1);
        if (rows.length > 0) return { headers, rows };
      }
      return null;
    };

    const parseKV = (t) => {
      if (!t) return [];
      return t.split('\n').filter(Boolean).map(l => {
        // Prevent matching huge paragraphs that happen to contain a colon
        const m = l.match(/^[-•*]?\s*([^:|\n]{2,30}?):\s*([^\n]{1,40})$/);
        return m ? { key: m[1].replace(/\*\*/g, '').trim(), value: m[2].replace(/\*\*/g, '').trim() } : null;
      }).filter(Boolean);
    };

    const parseBullets = (t) => {
      if (!t) return [];
      return t.split('\n').map(l => l.replace(/^[-•*▸\d.]+\s*/, '').replace(/\*\*/g, '').trim()).filter(l => l.length > 10);
    };

    // — Extract sections —
    const risk = parseRisk(text);
    const errorText = parseSection(text, 'Error Metrics', 'Metrics', 'Error\\s+Analysis');
    const agentText = parseSection(text, 'Agent\\s+(?:Reliability\\s+)?Scores?', 'Agent\\s+Analysis', 'Reliability\\s+Scores?');
    const contraText = parseSection(text, 'Key\\s+Contradictions?', 'Contradictions?(?:\\s+Detected)?', 'Conflicts?');
    const recText = parseSection(text, 'Recommendation\\s+(?:Validity|Valid\\?|Backed)', 'Recommendation', 'Final\\s+Validity');
    const caveatText = parseSection(text, 'Key\\s+Caveats?', 'Caveats?', 'Important\\s+Notes?');

    let html = '';

    // — Risk Banner —
    if (risk) {
      const cfg = {
        LOW:    { icon: '🟢', color: 'var(--teal)',  bg: 'rgba(62,207,180,0.06)',  border: 'rgba(62,207,180,0.25)',  pct: 85, desc: 'Most claims verified and cross-referenced across all agents' },
        MEDIUM: { icon: '🟡', color: 'var(--gold)',   bg: 'rgba(212,168,67,0.06)',  border: 'rgba(212,168,67,0.25)',  pct: 55, desc: 'Some claims have weak or vague sources — review carefully' },
        HIGH:   { icon: '🔴', color: 'var(--rose)',   bg: 'rgba(240,96,96,0.06)',   border: 'rgba(240,96,96,0.25)',   pct: 25, desc: 'Several claims unverified — treat this report with caution' },
      };
      const c = cfg[risk] || cfg['MEDIUM'];
      html += `
        <div class="hal-risk" style="background:${c.bg}; border:1px solid ${c.border};">
          <div class="hal-risk__top">
            <div class="hal-risk__left">
              <span class="hal-risk__icon">${c.icon}</span>
              <div>
                <div class="hal-risk__title" style="color:${c.color}">Hallucination Risk: ${risk}</div>
                <div class="hal-risk__desc">${c.desc}</div>
              </div>
            </div>
            <div class="hal-risk__score" style="border-color:${c.border}; color:${c.color}">${c.pct}</div>
          </div>
          <div class="hal-risk__bar-bg"><div class="hal-risk__bar" style="width:${c.pct}%; background:${c.color}"></div></div>
        </div>`;
    }

    // — Confidence Legend —
    html += `
      <div class="hal-legend">
        <span class="hal-legend__label">CONFIDENCE</span>
        <span class="hal-legend__chip" style="color:var(--teal); border-color:rgba(62,207,180,0.3); background:rgba(62,207,180,0.05)">🟢 HIGH</span>
        <span class="hal-legend__chip" style="color:var(--gold); border-color:rgba(212,168,67,0.3); background:rgba(212,168,67,0.05)">🟡 MEDIUM</span>
        <span class="hal-legend__chip" style="color:var(--rose); border-color:rgba(240,96,96,0.3); background:rgba(240,96,96,0.05)">🔴 LOW</span>
        <span class="hal-legend__chip" style="color:var(--rose); border-color:rgba(240,96,96,0.3); background:rgba(240,96,96,0.05)">⚠️ UNVERIFIED</span>
      </div>
      <div class="hal-divider"></div>`;

    // — Error Metrics —
    html += '<div class="hal-section"><div class="hal-section__head"><span>📊</span><span class="hal-section__title">Error Metrics</span><div class="hal-section__line"></div></div>';
    const table = parseTable(errorText);
    let metrics = [];
    if (table && table.headers.length === 2) {
      metrics = table.rows.map(r => ({ key: r[0] || '', value: r[1] || '-' }));
    } else {
      metrics = parseKV(errorText);
    }
    if (metrics.length > 0) {
      html += '<div class="hal-metrics">';
      const emojiMap = (k) => {
        const kl = k.toLowerCase();
        if (kl.includes('total')) return '📊';
        if (kl.includes('unverified') && kl.includes('rate')) return '📈';
        if (kl.includes('unverified')) return '⚠️';
        if (kl.includes('verified')) return '✅';
        if (kl.includes('reliability')) return '🎯';
        if (kl.includes('contradiction')) return '⚡';
        return '📌';
      };
      const colorize = (k, v) => {
        const n = parseInt(v);
        if (isNaN(n)) return 'var(--bright)';
        const kl = k.toLowerCase();
        if (kl.includes('reliability')) return n >= 75 ? 'var(--teal)' : n >= 50 ? 'var(--gold)' : 'var(--rose)';
        if (kl.includes('unverified') && kl.includes('rate')) return n <= 20 ? 'var(--teal)' : n <= 40 ? 'var(--gold)' : 'var(--rose)';
        if (kl.includes('unverified')) return n === 0 ? 'var(--teal)' : 'var(--rose)';
        if (kl.includes('verified') && !kl.includes('un')) return 'var(--teal)';
        return 'var(--bright)';
      };
      metrics.forEach(m => {
        html += `
          <div class="hal-metric-card">
            <div class="hal-metric-card__head"><span>${emojiMap(m.key)}</span><span class="hal-metric-card__label">${m.key}</span></div>
            <div class="hal-metric-card__value" style="color:${colorize(m.key, m.value)}">${m.value}</div>
          </div>`;
      });
      html += '</div>';
    } else {
      html += '<div class="hal-empty-section">Metrics not available for this run</div>';
    }
    html += '</div>';

    // — Agent Scores —
    html += '<div class="hal-section"><div class="hal-section__head"><span>🤖</span><span class="hal-section__title">Agent Reliability Scores</span><div class="hal-section__line"></div></div>';
    const agentTable = parseTable(agentText);
    if (agentTable && agentTable.rows.length > 0) {
      const scoreIdx = agentTable.headers.findIndex(h => h.toLowerCase().includes('score'));
      html += '<div class="hal-agents">';
      agentTable.rows.forEach(row => {
        const name = row[0] || 'Agent';
        const score = scoreIdx >= 0 ? row[scoreIdx] : row[row.length - 1];
        const n = parseInt(score) || 0;
        const color = n >= 8 ? 'var(--teal)' : n >= 5 ? 'var(--gold)' : 'var(--rose)';
        const pct = Math.min((n / 10) * 100, 100);
        html += `
          <div class="hal-agent-row">
            <div class="hal-agent-row__top">
              <span class="hal-agent-row__name">${name}</span>
              <span class="hal-agent-row__score" style="color:${color}">${score}</span>
            </div>
            <div class="hal-agent-row__bar-bg"><div class="hal-agent-row__bar" style="width:${pct}%; background:${color}"></div></div>
          </div>`;
      });
      html += '</div>';
    } else {
      html += '<div class="hal-empty-section">Agent scores not available for this run</div>';
    }
    html += '</div>';

    // — Contradictions —
    html += '<div class="hal-section"><div class="hal-section__head"><span>⚡</span><span class="hal-section__title">Contradictions</span><div class="hal-section__line"></div></div>';
    const isClean = !contraText || /none\s+detected|no\s+contradiction|0\s+contradiction/i.test(contraText);
    if (isClean) {
      html += '<div class="hal-clean"><span>✅</span><span>No contradictions detected across agents</span></div>';
    } else {
      const lines = contraText.split('\n').map(l => l.replace(/\|[-\s|]+\|/g, '').replace(/^\|/, '').trim()).filter(l => l.length > 15 && !l.match(/^[-|]+$/));
      if (lines.length === 0) {
        html += '<div class="hal-clean"><span>✅</span><span>No contradictions detected</span></div>';
      } else {
        lines.slice(0, 5).forEach(line => {
          html += `<div class="hal-contradiction"><span>⚡</span><span>${line}</span></div>`;
        });
      }
    }
    html += '</div>';

    // — Recommendation Validity —
    html += '<div class="hal-section"><div class="hal-section__head"><span>🎯</span><span class="hal-section__title">Recommendation Validity</span><div class="hal-section__line"></div></div>';
    if (recText) {
      const isYes = /\bYES\b/i.test(recText);
      const isNo = /\bNO\b/i.test(recText) && !isYes;
      const explanation = recText.replace(/YES|NO/gi, '').replace(/^[\s–—:•*-]+/, '').trim();
      const color = isYes ? 'var(--teal)' : isNo ? 'var(--rose)' : 'var(--gold)';
      const bg = isYes ? 'rgba(62,207,180,0.05)' : isNo ? 'rgba(240,96,96,0.05)' : 'rgba(212,168,67,0.05)';
      const borderC = isYes ? 'rgba(62,207,180,0.2)' : isNo ? 'rgba(240,96,96,0.2)' : 'rgba(212,168,67,0.2)';
      const icon = isYes ? '✅' : isNo ? '❌' : '❓';
      const label = isYes ? 'Recommendation Supported by Verified Data' : isNo ? 'Recommendation Not Fully Supported' : 'Recommendation Validity Unclear';
      html += `
        <div class="hal-rec" style="background:${bg}; border:1px solid ${borderC};">
          <span class="hal-rec__icon">${icon}</span>
          <div>
            <div class="hal-rec__title" style="color:${color}">${label}</div>
            ${explanation ? `<div class="hal-rec__text">${explanation}</div>` : ''}
          </div>
        </div>`;
    } else {
      html += '<div class="hal-empty-section">Recommendation analysis not available</div>';
    }
    html += '</div>';

    // — Key Caveats —
    html += '<div class="hal-section"><div class="hal-section__head"><span>⚠️</span><span class="hal-section__title">Key Caveats</span><div class="hal-section__line"></div></div>';
    const caveats = parseBullets(caveatText);
    if (caveats.length > 0) {
      caveats.forEach((c, i) => {
        html += `
          <div class="hal-caveat">
            <span class="hal-caveat__num">${String(i + 1).padStart(2, '0')}</span>
            <span>${c}</span>
          </div>`;
      });
    } else if (caveatText && caveatText.trim().length > 15) {
      html += `<div class="hal-caveat"><span class="hal-caveat__num">01</span><span>${caveatText.replace(/^[-•*]+\s*/, '').trim()}</span></div>`;
    } else {
      html += '<div class="hal-empty-section">No caveats noted</div>';
    }
    html += '</div>';

    return html;
  }

  initReportView() {
    // Tab switching
    const tabReport = document.getElementById('tab-report');
    const tabHal = document.getElementById('tab-hallucination');
    const contentReport = document.getElementById('report-content');
    const contentHal = document.getElementById('hallucination-content');

    if (tabReport && tabHal) {
      tabReport.addEventListener('click', () => {
        tabReport.classList.add('active');
        tabHal.classList.remove('active');
        contentReport.style.display = '';
        contentHal.style.display = 'none';
      });
      tabHal.addEventListener('click', () => {
        tabHal.classList.add('active');
        tabReport.classList.remove('active');
        contentHal.style.display = '';
        contentReport.style.display = 'none';
      });
    }

    // Copy
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const activeTab = document.getElementById('tab-report').classList.contains('active') ? 'report' : 'hallucination';
        const text = activeTab === 'report' ? this.jobData?.report : this.jobData?.hallucination_report;
        if (text) {
          navigator.clipboard.writeText(text);
          copyBtn.textContent = '✓ Copied';
          setTimeout(() => copyBtn.textContent = 'Copy', 2000);
        }
      });
    }

    // Download
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const activeTab = document.getElementById('tab-report').classList.contains('active') ? 'report' : 'hallucination';
        const text = activeTab === 'report' ? this.jobData?.report : this.jobData?.hallucination_report;
        if (text) {
          const blob = new Blob([text], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${activeTab}-${(this.jobData?.product_idea || 'report').slice(0, 30).replace(/\s+/g, '-')}.md`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }

    // New analysis buttons
    const reportNewBtn = document.getElementById('report-new-btn');
    if (reportNewBtn) reportNewBtn.addEventListener('click', () => this.goHome());

    const navNewBtn = document.getElementById('nav-new-btn');
    if (navNewBtn) navNewBtn.addEventListener('click', () => this.goHome());

    const runningErrorBtn = document.getElementById('running-error-btn');
    if (runningErrorBtn) runningErrorBtn.addEventListener('click', () => this.goHome());
  }

  /* ═══════ LENIS SMOOTH SCROLL ═══════ */
  initLenis() {
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    this.lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  /* ═══════ GSAP BASE ═══════ */
  initGSAP() {
    gsap.registerPlugin(ScrollTrigger);

    const heroEls = document.querySelectorAll('[data-animate="fade-up"]');
    heroEls.forEach((el) => {
      const delay = parseFloat(el.dataset.delay || 0) * 0.15;
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay: 0.3 + delay,
        ease: 'power3.out',
      });
    });
  }

  /* ═══════ NAVIGATION ═══════ */
  initNav() {
    const nav = document.getElementById('nav');
    ScrollTrigger.create({
      start: 'top -80',
      onUpdate: (self) => {
        nav.classList.toggle('scrolled', self.progress > 0);
      },
    });

    // Logo goes home
    const logoBtn = document.getElementById('logo-home');
    if (logoBtn) {
      logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.goHome();
      });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        if (this.currentView !== 'home') return;
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          this.lenis.scrollTo(target, { offset: -60 });
        }
      });
    });
  }

  /* ═══════ HERO ═══════ */
  initHero() {
    const glow1 = document.querySelector('.hero__glow--1');
    const glow2 = document.querySelector('.hero__glow--2');

    if (glow1 && glow2) {
      gsap.to(glow1, {
        y: 150,
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
      gsap.to(glow2, {
        y: -100,
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
    }
  }

  /* ═══════ PIPELINE (Landing Showcase) ═══════ */
  initPipeline() {
    const cards = document.querySelectorAll('.pipeline__card');
    const pulse = document.getElementById('pipeline-pulse');

    ScrollTrigger.create({
      trigger: '.pipeline',
      start: 'top 70%',
      onEnter: () => {
        cards.forEach((card, i) => {
          gsap.to(card, {
            opacity: 1, y: 0, duration: 0.6, delay: i * 0.12, ease: 'power2.out',
            onStart: () => card.classList.add('active'),
          });
          if (pulse) {
            gsap.to(pulse, { width: `${((i + 1) / cards.length) * 100}%`, duration: 0.5, delay: i * 0.12, ease: 'power2.out' });
          }
        });
      },
      once: true,
    });

    const track = document.getElementById('pipeline-track');
    if (track) {
      let isDown = false, startX, scrollLeft;
      track.addEventListener('mousedown', (e) => { isDown = true; track.style.cursor = 'grabbing'; startX = e.pageX - track.offsetLeft; scrollLeft = track.parentElement.scrollLeft; });
      track.addEventListener('mouseleave', () => { isDown = false; track.style.cursor = 'grab'; });
      track.addEventListener('mouseup', () => { isDown = false; track.style.cursor = 'grab'; });
      track.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - track.offsetLeft; track.parentElement.scrollLeft = scrollLeft - (x - startX) * 1.5; });
      track.style.cursor = 'grab';
      track.parentElement.style.overflowX = 'auto';
      track.parentElement.style.scrollbarWidth = 'none';
    }
  }

  /* ═══════ HOW IT WORKS ═══════ */
  initHowItWorks() {
    document.querySelectorAll('.how__step').forEach((step) => {
      gsap.to(step, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: step, start: 'top 80%', once: true } });
      if (step.dataset.step === '2') {
        const dots = step.querySelectorAll('.how__agent-dot');
        ScrollTrigger.create({
          trigger: step, start: 'top 70%', once: true,
          onEnter: () => dots.forEach((dot, di) => setTimeout(() => dot.classList.add('active'), di * 200)),
        });
      }
    });
  }

  /* ═══════ DASHBOARD ═══════ */
  initDashboard() {
    document.querySelectorAll('.dashboard__stat-value').forEach((el) => {
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      ScrollTrigger.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: () => {
          const obj = { val: 0 };
          gsap.to(obj, { val: target, duration: 2, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.val).toLocaleString() + (suffix ? ` ${suffix}` : ''); } });
        },
      });
    });

    ScrollTrigger.create({
      trigger: '.dashboard__chart', start: 'top 80%', once: true,
      onEnter: () => document.querySelectorAll('.chart__bar').forEach((bar, i) => setTimeout(() => bar.classList.add('animated'), i * 80)),
    });
  }

  /* ═══════ FEATURES ═══════ */
  initFeatures() {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, i) => {
      gsap.from(card, { opacity: 0, y: 40, duration: 0.7, delay: i * 0.08, ease: 'power2.out', scrollTrigger: { trigger: card, start: 'top 85%', once: true } });
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
        card.style.transform = `translateY(-4px) perspective(500px) rotateY(${x * 0.2}deg) rotateX(${-y * 0.2}deg)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ═══════ WHY ═══════ */
  initWhy() {
    const left = document.querySelector('.why__left');
    const right = document.querySelector('.why__right');
    if (left) gsap.from(left, { opacity: 0, x: -40, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: left, start: 'top 80%', once: true } });
    if (right) gsap.from(right, { opacity: 0, x: 40, duration: 0.8, delay: 0.2, ease: 'power2.out', scrollTrigger: { trigger: right, start: 'top 80%', once: true } });
    document.querySelectorAll('.why__comparison').forEach((comp, i) => {
      gsap.from(comp, { opacity: 0, y: 20, duration: 0.6, delay: i * 0.1, ease: 'power2.out', scrollTrigger: { trigger: comp, start: 'top 90%', once: true } });
    });
  }

  /* ═══════ CTA ═══════ */
  initCTA() {
    const ctaTitle = document.querySelector('.cta__title');
    if (ctaTitle) gsap.from(ctaTitle, { opacity: 0, y: 50, scale: 0.95, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: ctaTitle, start: 'top 80%', once: true } });
    const ctaButton = document.querySelector('.cta__button');
    if (ctaButton) gsap.from(ctaButton, { opacity: 0, y: 30, duration: 0.7, delay: 0.3, ease: 'power2.out', scrollTrigger: { trigger: ctaButton, start: 'top 90%', once: true } });
  }

  /* ═══════ EXAMPLES ═══════ */
  initExamples() {
    this.renderExamples();
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        this.renderExamples();
        const grid = document.getElementById('examples-grid');
        if (grid) gsap.from(grid.children, { opacity: 0, y: 10, duration: 0.3, stagger: 0.05, ease: 'power2.out' });
      });
    }
  }

  renderExamples() {
    const grid = document.getElementById('examples-grid');
    if (!grid) return;
    const shuffled = [...this.examples].sort(() => Math.random() - 0.5).slice(0, 4);
    grid.innerHTML = shuffled.map(ex =>
      `<button class="hero__example-btn">${ex}</button>`
    ).join('');
    grid.querySelectorAll('.hero__example-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('hero-input').value = btn.textContent;
        document.getElementById('hero-input').focus();
      });
    });
  }

  /* ═══════ INPUT EFFECTS ═══════ */
  initInputEffects() {
    const input = document.getElementById('hero-input');
    const runBtn = document.getElementById('hero-run-btn');

    if (runBtn) {
      runBtn.addEventListener('click', () => this.handleSubmit());
    }
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          this.handleSubmit();
        }
      });
    }
  }
}

/* ═══════ BOOT ═══════ */
document.addEventListener('DOMContentLoaded', () => {
  new MarketMindExperience();
});
