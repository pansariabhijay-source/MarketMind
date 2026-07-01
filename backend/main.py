"""
MarketMind API
==============
FastAPI service that orchestrates the CrewAI research pipeline, tracks REAL
progress via task callbacks, persists jobs to SQLite, and synthesises a typed
analysis for the dashboard.

Endpoints
  POST   /api/run               start a run
  GET    /api/status/{job_id}   poll status + report + structured analysis
  GET    /api/history           recent runs
  DELETE /api/history           clear history
  GET    /api/agents            pipeline definition
  GET    /api/vectordb/*        cache inspection
  GET    /health                health + db stats
"""

from __future__ import annotations

import os
import re
import threading
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend import store
from backend.schemas import RunRequest, JobStatus, MarketAnalysis

os.makedirs("reports", exist_ok=True)
store.init_db()

app = FastAPI(title="MarketMind API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pipeline definition (order matches crew task order) ────────────────────────
AGENT_STEPS = [
    {"id": 0, "key": "market",      "label": "Market Research",          "desc": "Sizing TAM · SAM · SOM",       "icon": "🔍"},
    {"id": 1, "key": "competitive", "label": "Competitive Intelligence", "desc": "Mapping the field",            "icon": "🏆"},
    {"id": 2, "key": "customer",    "label": "Customer Insights",        "desc": "Segments · WTP · triggers",    "icon": "👥"},
    {"id": 3, "key": "strategy",    "label": "Product Strategy",         "desc": "MVP · pricing · GTM",          "icon": "🗺️"},
    {"id": 4, "key": "factcheck",   "label": "Fact Verification",        "desc": "Sourcing every claim",         "icon": "✅"},
    {"id": 5, "key": "synthesis",   "label": "Business Synthesis",       "desc": "Scoring the opportunity",      "icon": "📊"},
    {"id": 6, "key": "audit",       "label": "Reliability Audit",        "desc": "Cross-verifying outputs",      "icon": "🛡️"},
    {"id": 7, "key": "structuring", "label": "Structuring Insights",     "desc": "Building the dashboard",       "icon": "✨"},
]
TOTAL_STEPS = len(AGENT_STEPS)

# Serialise crew runs: the pipeline is heavy and the progress callback is process
# global, so we run one analysis at a time (matches free-tier capacity anyway).
_crew_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_agent_text(text: str | None) -> str | None:
    """Strip CrewAI scaffolding the model sometimes leaks into output files."""
    if not text:
        return text
    text = re.sub(r"^\s*(I now can give a great answer\.?|Thought:.*|Final Answer:?|"
                  r"\*\*Final Answer\*\*:?)\s*", "", text, flags=re.IGNORECASE | re.MULTILINE)
    return text.strip()


# ── Background worker ──────────────────────────────────────────────────────────

def run_crew_in_thread(job_id: str, product_idea: str):
    from backend.vector_store import search_similar_report

    # 1) Cache check
    cached = search_similar_report(product_idea)
    if cached:
        print(f"[cache HIT] {cached['similarity']} — returning cached analysis")
        store.update_job(
            job_id,
            status="completed", completed_at=_now(), current_step=TOTAL_STEPS - 1,
            step_label="Done (cached)", progress_pct=100,
            report=cached["report"], hallucination_report=cached["hallucination_report"],
            analysis=cached.get("analysis"),
            from_cache=True, cache_similarity=cached["similarity"],
            original_idea=cached["original_idea"],
        )
        return

    started = datetime.now(timezone.utc)
    store.update_job(job_id, status="running", current_step=0,
                     step_label=AGENT_STEPS[0]["label"], progress_pct=2)

    with _crew_lock:
        try:
            from backend.crew import MarketResearchCrew, set_progress_callback
            from backend.vector_store import get_relevant_context

            # Real progress: advance the step each time a crew task completes.
            completed = {"n": 0}

            def on_task(_task_output):
                completed["n"] += 1
                step = min(completed["n"], TOTAL_STEPS - 1)
                pct = round(step / TOTAL_STEPS * 100)
                label = AGENT_STEPS[step]["label"] if step < TOTAL_STEPS else "Finalising"
                store.update_job(job_id, current_step=step, step_label=label,
                                 progress_pct=pct,
                                 elapsed_seconds=(datetime.now(timezone.utc) - started).total_seconds())

            set_progress_callback(on_task)

            context = get_relevant_context(product_idea)
            enriched = product_idea
            if context:
                enriched = f"{product_idea}\n\n[Relevant past research:\n{context[:1000]}]"

            result = MarketResearchCrew().crew().kickoff(inputs={"product_idea": enriched})
            set_progress_callback(None)

            # 2) Collect outputs
            report = None
            try:
                with open("reports/report.md", "r", encoding="utf-8") as f:
                    report = f.read()
            except Exception:
                report = getattr(result, "raw", str(result))
            report = _clean_agent_text(report)

            audit = None
            try:
                with open("reports/hallucination_report.md", "r", encoding="utf-8") as f:
                    audit = f.read()
            except Exception:
                audit = ""
            audit = _clean_agent_text(audit)

            # 3) Structured synthesis (step 7)
            store.update_job(job_id, current_step=TOTAL_STEPS - 1,
                             step_label=AGENT_STEPS[-1]["label"], progress_pct=92)
            from backend.synthesize import synthesize
            analysis = synthesize(product_idea, report or "", audit or "", use_llm=True)

            store.update_job(
                job_id, status="completed", completed_at=_now(),
                current_step=TOTAL_STEPS - 1, step_label="Complete", progress_pct=100,
                report=report, hallucination_report=audit,
                analysis=analysis.model_dump(),
                elapsed_seconds=(datetime.now(timezone.utc) - started).total_seconds(),
            )

            # 4) Persist to cache
            if report:
                from backend.vector_store import store_report, store_agent_knowledge
                store_report(job_id, product_idea, report, audit, analysis.model_dump())
                store_agent_knowledge(product_idea, "full_report", report[:2000])

        except Exception as e:  # noqa: BLE001
            import traceback; traceback.print_exc()
            set_progress_callback(None) if "set_progress_callback" in dir() else None
            store.update_job(job_id, status="failed", error=str(e), completed_at=_now())


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.post("/api/run", response_model=JobStatus)
def start_run(req: RunRequest):
    idea = (req.product_idea or "").strip()
    if not idea:
        raise HTTPException(status_code=400, detail="product_idea cannot be empty")
    if len(idea) < 8:
        raise HTTPException(status_code=400, detail="Describe the idea in a bit more detail")

    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id, "status": "pending", "product_idea": idea,
        "created_at": _now(), "completed_at": None, "current_step": None,
        "step_label": "Queued", "progress_pct": 0, "report": None,
        "hallucination_report": None, "analysis": None, "error": None,
        "from_cache": False, "cache_similarity": None, "original_idea": None,
        "elapsed_seconds": 0,
    }
    store.save_job(job)
    threading.Thread(target=run_crew_in_thread, args=(job_id, idea), daemon=True).start()
    return job


@app.get("/api/status/{job_id}", response_model=JobStatus)
def get_status(job_id: str):
    job = store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/history")
def get_history():
    return store.list_jobs(limit=100)


@app.delete("/api/history")
def clear_history():
    store.clear_jobs()
    return {"message": "History cleared"}


@app.get("/api/agents")
def get_agents():
    return AGENT_STEPS


@app.get("/api/vectordb/stats")
def vectordb_stats():
    from backend.vector_store import get_stats
    return get_stats()


@app.get("/api/vectordb/ideas")
def vectordb_ideas():
    from backend.vector_store import get_all_stored_ideas
    return get_all_stored_ideas()


@app.delete("/api/vectordb/clear")
def vectordb_clear():
    from backend.vector_store import clear_store
    clear_store()
    return {"message": "Vector store cleared"}


@app.get("/health")
def health():
    from backend.vector_store import get_stats
    return {
        "status": "ok",
        "timestamp": _now(),
        "jobs": store.count_jobs(),
        "vectordb": get_stats(),
    }


# ── Static frontend ────────────────────────────────────────────────────────────
# The React app (frontend/dist) is THE product surface, served at the root.
# The legacy vanilla `landing/` folder is kept in the repo for reference but is
# no longer served. Build with `npm run build` in frontend/ and commit dist/.
from pathlib import Path
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
APP_DIR = ROOT / "frontend" / "dist"
LANDING_DIR = ROOT / "landing"

if APP_DIR.exists():
    # Legacy marketing page still reachable at /landing for reference.
    if LANDING_DIR.exists():
        app.mount("/landing", StaticFiles(directory=str(LANDING_DIR), html=True), name="landing")
    # SPA at root (must be mounted LAST so /api/* keeps priority).
    app.mount("/", StaticFiles(directory=str(APP_DIR), html=True), name="app")
elif LANDING_DIR.exists():
    # Fallback: no built React app -> serve the legacy landing at root.
    app.mount("/", StaticFiles(directory=str(LANDING_DIR), html=True), name="landing")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port)
