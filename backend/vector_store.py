"""
Lightweight Store for MarketMind
-------------------------------------
Replaces memory-heavy ChromaDB+PyTorch with a simple JSON file.
This prevents Out Of Memory (OOM) crashes on Render Free Tier (512MB RAM).
Uses difflib for string similarity scoring.
"""

import json
import os
from datetime import datetime
from typing import Optional
from difflib import SequenceMatcher

STORE_FILE = "reports/lightweight_store.json"

# Make sure directory exists
os.makedirs(os.path.dirname(STORE_FILE), exist_ok=True)

def _load_store() -> dict:
    if not os.path.exists(STORE_FILE):
        return {"reports": [], "knowledge": []}
    try:
        with open(STORE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"reports": [], "knowledge": []}

def _save_store(data: dict):
    with open(STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

CACHE_THRESHOLD = 0.82

def search_similar_report(product_idea: str) -> Optional[dict]:
    try:
        store = _load_store()
        reports = store.get("reports", [])
        if not reports:
            return None

        best_match = None
        best_score = 0.0
        
        # Simple text similarity (0.0 to 1.0)
        for r in reports:
            score = SequenceMatcher(None, product_idea.lower(), r["product_idea"].lower()).ratio()
            if score > best_score:
                best_score = score
                best_match = r
                
        if best_match and best_score >= CACHE_THRESHOLD:
            return {
                "similarity":           round(best_score, 3),
                "original_idea":        best_match.get("product_idea"),
                "report":               best_match.get("report"),
                "hallucination_report": best_match.get("hallucination_report"),
                "created_at":           best_match.get("created_at"),
                "job_id":               best_match.get("job_id"),
            }
        return None
    except Exception as e:
        print(f"[Store] Search error: {e}")
        return None

def store_report(
    job_id:               str,
    product_idea:         str,
    report:               str,
    hallucination_report: Optional[str] = None
):
    try:
        store = _load_store()
        store["reports"].append({
            "job_id":               job_id,
            "product_idea":         product_idea,
            "report":               report[:5000],
            "hallucination_report": (hallucination_report or "")[:3000],
            "created_at":           datetime.utcnow().isoformat(),
        })
        _save_store(store)
        print(f"[Store] Saved report for: {product_idea[:50]}")
    except Exception as e:
        print(f"[Store] Store error: {e}")

def store_agent_knowledge(
    product_idea: str,
    agent_name:   str,
    content:      str
):
    try:
        store = _load_store()
        store["knowledge"].append({
            "product_idea": product_idea,
            "agent":        agent_name,
            "content":      content,
            "created_at":   datetime.utcnow().isoformat(),
        })
        _save_store(store)
    except Exception as e:
        print(f"[Store] Knowledge store error: {e}")

def get_relevant_context(query: str, n_results: int = 1) -> str:
    try:
        store = _load_store()
        knowledge = store.get("knowledge", [])
        if not knowledge:
            return ""

        scored = []
        for k in knowledge:
            # Match query against both the stored content and the idea
            score1 = SequenceMatcher(None, query.lower(), k["content"].lower()).ratio()
            score2 = SequenceMatcher(None, query.lower(), k["product_idea"].lower()).ratio()
            score = max(score1, score2)
            if score > 0.4:  # lower threshold for keywords
                scored.append((score, k))
                
        scored.sort(key=lambda x: x[0], reverse=True)
        top_results = [k for score, k in scored[:n_results]]

        if not top_results:
            return ""

        context_parts = []
        for k in top_results:
            context_parts.append(
                f"[Past research on '{k.get('product_idea', 'unknown')}' "
                f"by {k.get('agent', 'unknown')}]\n{k.get('content')}"
            )
        return "\n\n---\n\n".join(context_parts)
    except Exception as e:
        print(f"[Store] Context retrieval error: {e}")
        return ""

def get_all_stored_ideas() -> list:
    try:
        store = _load_store()
        return [
            {
                "product_idea": r.get("product_idea"),
                "created_at":   r.get("created_at"),
                "job_id":       r.get("job_id"),
            }
            for r in store.get("reports", [])
        ]
    except Exception as e:
        print(f"[Store] List error: {e}")
        return []

def get_stats() -> dict:
    try:
        store = _load_store()
        return {
            "total_reports":   len(store.get("reports", [])),
            "total_knowledge": len(store.get("knowledge", [])),
        }
    except:
        return {"total_reports": 0, "total_knowledge": 0}
