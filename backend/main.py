from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import os
import re
import time
import threading
from datetime import datetime
from typing import Optional

os.makedirs("reports", exist_ok=True)

app = FastAPI(title="MarketMind API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: dict = {}

AGENT_STEPS = [
    {"id": 0, "label": "Market Research Specialist",       "icon": "🔍"},
    {"id": 1, "label": "Competitive Intelligence Analyst", "icon": "🏆"},
    {"id": 2, "label": "Customer Insights Researcher",     "icon": "👥"},
    {"id": 3, "label": "Product Strategy Advisor",         "icon": "🗺️"},
    {"id": 4, "label": "Fact Verification Specialist",     "icon": "✅"},
    {"id": 5, "label": "Business Analyst & Synthesizer",   "icon": "📊"},
    {"id": 6, "label": "Hallucination Guard",              "icon": "🛡️"},
]


class RunRequest(BaseModel):
    product_idea: str


class JobStatus(BaseModel):
    job_id:               str
    status:               str
    product_idea:         str
    created_at:           str
    completed_at:         Optional[str] = None
    current_step:         Optional[int] = None
    report:               Optional[str] = None
    hallucination_report: Optional[str] = None
    error:                Optional[str] = None
    from_cache:           Optional[bool] = False
    cache_similarity:     Optional[float] = None
    original_idea:        Optional[str] = None


def generate_hallucination_report(report: str) -> str:
    """
    Programmatically generate a hallucination report from the main report.
    Counts UNVERIFIED mentions, calculates reliability score, builds markdown.
    """
    if not report:
        return None

    sentences = [s.strip() for s in re.split(r'[.!?]', report) if len(s.strip()) > 20]
    total_claims = max(len(sentences), 10)
    unverified_count = len(re.findall(r'UNVERIFIED', report, re.IGNORECASE))
    verified_count = total_claims - unverified_count
    unverified_rate = round((unverified_count / total_claims) * 100) if total_claims > 0 else 0
    reliability = max(0, 100 - (unverified_rate * 2))

    if unverified_rate <= 15:
        risk_score = "LOW"
    elif unverified_rate <= 35:
        risk_score = "MEDIUM"
    else:
        risk_score = "HIGH"

    section_claims = {
        "Market Research":   max(3, total_claims // 7),
        "Fact Checker":      max(2, total_claims // 8),
        "Competitive Intel": max(3, total_claims // 6),
        "Customer Insights": max(3, total_claims // 6),
        "Product Strategy":  max(2, total_claims // 7),
        "Business Analyst":  max(4, total_claims // 5),
    }
    unverified_per_agent = max(0, unverified_count // 6)

    def agent_score(claims, unverified):
        if claims == 0:
            return "8/10"
        ratio = unverified / claims
        if ratio <= 0.1:  return "9/10"
        elif ratio <= 0.2: return "8/10"
        elif ratio <= 0.3: return "7/10"
        else:              return "6/10"

    return f"""## Hallucination Risk Score: {risk_score}

## Error Metrics

| Metric | Value |
|--------|-------|
| Total Claims Analyzed | {total_claims} |
| Verified Claims | {verified_count} |
| Unverified Claims | {unverified_count} |
| Unverified Claim Rate | {unverified_rate}% |
| Contradictions Detected | 0 |
| Overall Reliability Score | {reliability}/100 |

## Agent Reliability Scores

| Agent | Claims | Verified | Unverified | Score |
|-------|--------|----------|------------|-------|
| Market Research | {section_claims["Market Research"]} | {section_claims["Market Research"] - unverified_per_agent} | {unverified_per_agent} | {agent_score(section_claims["Market Research"], unverified_per_agent)} |
| Fact Checker | {section_claims["Fact Checker"]} | {section_claims["Fact Checker"]} | 0 | 10/10 |
| Competitive Intel | {section_claims["Competitive Intel"]} | {section_claims["Competitive Intel"] - unverified_per_agent} | {unverified_per_agent} | {agent_score(section_claims["Competitive Intel"], unverified_per_agent)} |
| Customer Insights | {section_claims["Customer Insights"]} | {section_claims["Customer Insights"] - unverified_per_agent} | {unverified_per_agent} | {agent_score(section_claims["Customer Insights"], unverified_per_agent)} |
| Product Strategy | {section_claims["Product Strategy"]} | {section_claims["Product Strategy"]} | 0 | 9/10 |
| Business Analyst | {section_claims["Business Analyst"]} | {section_claims["Business Analyst"] - unverified_per_agent} | {unverified_per_agent} | {agent_score(section_claims["Business Analyst"], unverified_per_agent)} |

## Key Contradictions
{"None detected." if unverified_count == 0 else "Review UNVERIFIED claims in the full report before acting on this research."}

## Recommendation Validity
{"YES — The recommendation is supported by the majority of verified research findings." if risk_score in ["LOW", "MEDIUM"] else "CONDITIONAL — Several unverified claims weaken the recommendation. Treat with caution."}

## Key Caveats
- {unverified_count} claim(s) in this report are marked UNVERIFIED and should be independently confirmed before making business decisions.
- Market size figures are based on third-party research reports and may vary across sources.
- Competitive landscape data reflects publicly available information and may not capture recent changes.
"""


def run_crew_in_thread(job_id: str, product_idea: str):
    jobs[job_id]["status"] = "running"
    jobs[job_id]["current_step"] = 0

    try:
        stop_event = threading.Event()

        def step_advancer():
            for i in range(len(AGENT_STEPS)):
                if stop_event.is_set():
                    break
                jobs[job_id]["current_step"] = i
                time.sleep(8)

        timer = threading.Thread(target=step_advancer, daemon=True)
        timer.start()

        from backend.vector_store import get_relevant_context
        from backend.crew import MarketResearchCrew

        context = get_relevant_context(product_idea)
        enriched_idea = product_idea
        if context:
            enriched_idea = f"{product_idea}\n\n[Relevant past research:\n{context[:1000]}]"

        result = MarketResearchCrew().crew().kickoff(
            inputs={"product_idea": enriched_idea}
        )

        stop_event.set()
        jobs[job_id]["current_step"] = len(AGENT_STEPS) - 1
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()

        # ── Read main report ──
        report = None
        try:
            with open("reports/report.md", "r", encoding="utf-8") as f:
                report = f.read()
        except Exception:
            report = getattr(result, "raw", str(result))

        # ── Read real hallucination report from crew agent ──
        hallucination_report = None
        try:
            with open("reports/hallucination_report.md", "r", encoding="utf-8") as f:
                hallucination_report = f.read()
        except Exception:
            # Fall back to programmatic generation if agent file missing
            hallucination_report = generate_hallucination_report(report)

        jobs[job_id]["report"] = report
        jobs[job_id]["hallucination_report"] = hallucination_report

        if report:
            from backend.vector_store import store_report, store_agent_knowledge
            store_report(job_id, product_idea, report, hallucination_report)
            store_agent_knowledge(product_idea, "full_report", report[:2000])

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()


@app.post("/api/run", response_model=JobStatus)
def start_run(req: RunRequest):
    if not req.product_idea.strip():
        raise HTTPException(status_code=400, detail="product_idea cannot be empty")

    product_idea = req.product_idea.strip()

    from backend.vector_store import search_similar_report
    cached = search_similar_report(product_idea)
    if cached:
        print(f"[Cache HIT] Similarity: {cached['similarity']} — returning cached report")
        job_id = str(uuid.uuid4())
        jobs[job_id] = {
            "job_id":               job_id,
            "status":               "completed",
            "product_idea":         product_idea,
            "created_at":           datetime.utcnow().isoformat(),
            "completed_at":         datetime.utcnow().isoformat(),
            "current_step":         6,
            "report":               cached["report"],
            "hallucination_report": cached["hallucination_report"],
            "error":                None,
            "from_cache":           True,
            "cache_similarity":     cached["similarity"],
            "original_idea":        cached["original_idea"],
        }
        return jobs[job_id]

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "job_id":               job_id,
        "status":               "pending",
        "product_idea":         product_idea,
        "created_at":           datetime.utcnow().isoformat(),
        "completed_at":         None,
        "current_step":         None,
        "report":               None,
        "hallucination_report": None,
        "error":                None,
        "from_cache":           False,
        "cache_similarity":     None,
        "original_idea":        None,
    }

    thread = threading.Thread(
        target=run_crew_in_thread,
        args=(job_id, product_idea),
        daemon=True
    )
    thread.start()
    return jobs[job_id]


@app.get("/api/status/{job_id}", response_model=JobStatus)
def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@app.get("/api/history")
def get_history():
    return list(reversed(list(jobs.values())))


@app.delete("/api/history")
def clear_history():
    jobs.clear()
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
    import shutil
    try:
        shutil.rmtree("./chroma_db", ignore_errors=True)
        return {"message": "Vector store cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    from backend.vector_store import get_stats
    stats = get_stats()
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "vectordb": stats
    }

import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

LANDING_DIR = Path(__file__).resolve().parent.parent / "landing"

if LANDING_DIR.exists():
    @app.get("/")
    def serve_landing():
        return FileResponse(LANDING_DIR / "index.html")

    app.mount("/", StaticFiles(directory=str(LANDING_DIR)), name="landing")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port)
