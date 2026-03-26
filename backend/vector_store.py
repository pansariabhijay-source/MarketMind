"""
ChromaDB Vector Store for MarketMind
-------------------------------------
Handles:
- Storing completed reports as embeddings
- Semantic search for similar past research
- Feeding verified context to agents
- Similarity scoring (0-1) for cache hits
"""

import hashlib
import json
from datetime import datetime
from typing import Optional

# ── Lazy Setup ────────────────────────────────────────────────────────────────
# All heavy objects are lazy-loaded on first use so that uvicorn can bind
# the port immediately on Render (avoids port-scan timeout).

_client = None
_embedding_fn = None
_reports_collection = None
_knowledge_collection = None


def _get_client():
    global _client
    if _client is None:
        import chromadb
        _client = chromadb.PersistentClient(path="./chroma_db")
    return _client


def _get_embedding_fn():
    global _embedding_fn
    if _embedding_fn is None:
        from chromadb.utils import embedding_functions
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
    return _embedding_fn


def _get_reports_collection():
    global _reports_collection
    if _reports_collection is None:
        _reports_collection = _get_client().get_or_create_collection(
            name="market_reports",
            embedding_function=_get_embedding_fn(),
            metadata={"hnsw:space": "cosine"}
        )
    return _reports_collection


def _get_knowledge_collection():
    global _knowledge_collection
    if _knowledge_collection is None:
        _knowledge_collection = _get_client().get_or_create_collection(
            name="research_knowledge",
            embedding_function=_get_embedding_fn(),
            metadata={"hnsw:space": "cosine"}
        )
    return _knowledge_collection

# ── Similarity threshold ───────────────────────────────────────────────────────
# Above this = cache hit (return existing report)
# Below this = run fresh crew
CACHE_THRESHOLD = 0.82


# ── Helper ────────────────────────────────────────────────────────────────────

def make_id(text: str) -> str:
    """Generate a stable unique ID from text"""
    return hashlib.md5(text.encode()).hexdigest()


# ── Core functions ────────────────────────────────────────────────────────────

def search_similar_report(product_idea: str) -> Optional[dict]:
    """
    Search for a semantically similar past report.
    Returns the cached report if similarity > CACHE_THRESHOLD, else None.

    Example:
        search_similar_report("AI chatbot for call centers")
        → returns cached report for "Voice AI for customer support"
          if similarity score > 0.82
    """
    try:
        count = _get_reports_collection().count()
        if count == 0:
            return None

        results = _get_reports_collection().query(
            query_texts=[product_idea],
            n_results=1,
            include=["documents", "metadatas", "distances"]
        )

        if not results["ids"][0]:
            return None

        # ChromaDB returns cosine distance (0 = identical, 2 = opposite)
        # Convert to similarity score (1 = identical, 0 = opposite)
        distance   = results["distances"][0][0]
        similarity = 1 - (distance / 2)

        if similarity >= CACHE_THRESHOLD:
            metadata = results["metadatas"][0][0]
            return {
                "similarity":           round(similarity, 3),
                "original_idea":        metadata.get("product_idea"),
                "report":               metadata.get("report"),
                "hallucination_report": metadata.get("hallucination_report"),
                "created_at":           metadata.get("created_at"),
                "job_id":               metadata.get("job_id"),
            }

        return None

    except Exception as e:
        print(f"[VectorDB] Search error: {e}")
        return None


def store_report(
    job_id:               str,
    product_idea:         str,
    report:               str,
    hallucination_report: Optional[str] = None
):
    """
    Store a completed report in ChromaDB.
    The product_idea is embedded so future similar queries can find it.

    Example:
        store_report("abc123", "Voice AI for support", "# Report...")
    """
    try:
        doc_id = make_id(product_idea)

        # Store the idea as the document (this gets embedded for search)
        # Store full reports in metadata (not embedded — too large)
        _get_reports_collection().upsert(
            ids=[doc_id],
            documents=[product_idea],
            metadatas=[{
                "job_id":               job_id,
                "product_idea":         product_idea,
                "report":               report[:5000],  # ChromaDB metadata limit
                "hallucination_report": (hallucination_report or "")[:3000],
                "created_at":           datetime.utcnow().isoformat(),
            }]
        )
        print(f"[VectorDB] Stored report for: {product_idea[:50]}")

    except Exception as e:
        print(f"[VectorDB] Store error: {e}")


def store_agent_knowledge(
    product_idea: str,
    agent_name:   str,
    content:      str
):
    """
    Store individual agent findings in the knowledge base.
    Agents can query this before searching the web — reusing verified data.

    Example:
        store_agent_knowledge("Voice AI", "market_research", "Market is $4.9B...")
    """
    try:
        doc_id = make_id(f"{product_idea}_{agent_name}")
        _get_knowledge_collection().upsert(
            ids=[doc_id],
            documents=[content],
            metadatas=[{
                "product_idea": product_idea,
                "agent":        agent_name,
                "created_at":   datetime.utcnow().isoformat(),
            }]
        )
    except Exception as e:
        print(f"[VectorDB] Knowledge store error: {e}")


def get_relevant_context(query: str, n_results: int = 1) -> str:
    """
    Retrieve relevant past research findings for a query.
    Used to inject verified context into agent prompts.

    Example:
        get_relevant_context("SaaS market size trends")
        → Returns 3 most relevant past findings as a string
    """
    try:
        count = _get_knowledge_collection().count()
        if count == 0:
            return ""

        results = _get_knowledge_collection().query(
            query_texts=[query],
            n_results=min(n_results, count),
            include=["documents", "metadatas", "distances"]
        )

        if not results["documents"][0]:
            return ""

        context_parts = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        ):
            similarity = 1 - (dist / 2)
            if similarity > 0.75:  # Only include reasonably similar findings
                context_parts.append(
                    f"[Past research on '{meta.get('product_idea', 'unknown')}' "
                    f"by {meta.get('agent', 'unknown')} — similarity {similarity:.0%}]\n{doc}"
                )

        return "\n\n---\n\n".join(context_parts)

    except Exception as e:
        print(f"[VectorDB] Context retrieval error: {e}")
        return ""


def get_all_stored_ideas() -> list:
    """
    Get all stored product ideas — used for the UI 'Similar Reports' feature.
    """
    try:
        count = _get_reports_collection().count()
        if count == 0:
            return []

        results = _get_reports_collection().get(
            include=["metadatas"]
        )
        return [
            {
                "product_idea": m.get("product_idea"),
                "created_at":   m.get("created_at"),
                "job_id":       m.get("job_id"),
            }
            for m in results["metadatas"]
        ]
    except Exception as e:
        print(f"[VectorDB] List error: {e}")
        return []


def get_stats() -> dict:
    """Return stats about the vector store"""
    try:
        return {
            "total_reports":   _get_reports_collection().count(),
            "total_knowledge": _get_knowledge_collection().count(),
        }
    except:
        return {"total_reports": 0, "total_knowledge": 0}
