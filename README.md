# MarketMind — Market Intelligence, Verified

An AI market-research platform. Drop a startup idea and a 7-agent CrewAI pipeline
sizes the market, maps competitors, profiles customers, models the financials,
and returns a **scored, decision-grade investment memo** — rendered as an
interactive analyst dashboard, not a wall of text.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![React](https://img.shields.io/badge/React-Frontend-blue)
![CrewAI](https://img.shields.io/badge/CrewAI-Multi--Agent-black)
![Cerebras](https://img.shields.io/badge/Cerebras-GLM--4.7-orange)

---

## What makes it more than a demo

| Area | What it does |
|------|--------------|
| **Structured insight** | The crew's markdown report is synthesised into a typed `MarketAnalysis` (TAM/SAM/SOM, competitor matrix, segments + WTP, 3-yr financials, SWOT, GTM, risk register, opportunity score). Robust LLM→heuristic fallback means the dashboard **always** renders. |
| **Real progress** | Progress is driven by **CrewAI task callbacks**, not a fake timer — the UI shows the agent that is genuinely running. |
| **Persistence** | Jobs live in **SQLite**, so analyses survive a server restart (Render dynos cycle often). |
| **Stronger model** | Reasoning runs on **Cerebras `zai-glm-4.7`** (GLM-4.7) with `gemma-4-31b` for fast extraction — both free/fast — instead of an 8B model, with every model overridable by env var. |
| **Analyst dashboard** | React + Recharts: opportunity gauge, score radar, TAM/SAM/SOM funnel, growth curve, competitor positioning scatter, financial projection chart, SWOT grid, GTM timeline, risk register, data-reliability audit. |
| **Verified sourcing** | A fact-checker marks unsourced claims `UNVERIFIED`; a reliability agent produces a real 0–100 confidence score surfaced in the UI. |
| **Shareable reports** | `/?job=<id>` deep-links restore any completed report. |
| **Instant cache** | Near-duplicate ideas return a cached analysis via lightweight similarity (no heavy vector DB — free-tier friendly). |

---

## Architecture

```
Browser ── React SPA (frontend/dist, served at / )
   │  POST /api/run                       ┌───────────── FastAPI (backend/main.py) ─────────────┐
   │  GET  /api/status/{id}  ◀── polls ──▶│ SQLite job store (backend/store.py)                 │
   │                                       │ background thread → CrewAI pipeline (backend/crew) │
   │                                       │   7 agents, task callbacks → real progress          │
   │                                       │ synthesis (backend/synthesize.py) → MarketAnalysis  │
   │                                       │ cache (backend/vector_store.py, JSON similarity)    │
   └───────────────────────────────────────┴─────────────────────────────────────────────────────┘
```

**Pipeline:** Market Research → Competitive Intelligence → Customer Insights →
Product Strategy → Fact Verification → Business Synthesis → Reliability Audit →
(Structured Synthesis).

---

## Setup

### Backend
```bash
cd <project root>
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env (in project root or backend/)
CEREBRAS_API_KEY=...          # required — powers the agents
SERPER_API_KEY=...            # optional — enables live web search
# Optional model overrides:
# MM_REASONING_MODEL=cerebras/zai-glm-4.7
# MM_FAST_MODEL=cerebras/gemma-4-31b

# Run from the PROJECT ROOT (paths are root-relative):
python -m uvicorn backend.main:app --host 0.0.0.0 --port 10000
```
API docs: `http://localhost:10000/docs`

### Frontend
```bash
cd frontend
npm install
npm run build        # outputs frontend/dist (committed & served by the backend at /)
# or for hot-reload dev (proxies /api → :8000):
npm run dev
```

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/run` | Start a run — `{ "product_idea": "..." }` |
| GET | `/api/status/{job_id}` | Poll status, progress, report **and structured `analysis`** |
| GET | `/api/history` | Recent runs |
| DELETE | `/api/history` | Clear history |
| GET | `/api/agents` | Pipeline definition |
| GET | `/api/vectordb/stats` · `/ideas` · `DELETE /clear` | Cache inspection |
| GET | `/health` | Health + job/cache counts |

`GET /api/status/{id}` now returns `progress_pct`, `step_label`, `elapsed_seconds`
and a full `analysis` object (the dashboard data) in addition to the markdown `report`.

---

## Deployment (Render free tier)

- Single **Python** service. Build the frontend (`npm run build`) and **commit
  `frontend/dist`** so the service can serve it with no Node step.
- Start command: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Kept lightweight on purpose: SQLite + stdlib, JSON similarity cache (no
  torch/chromadb), lazy imports — fits in 512 MB.
