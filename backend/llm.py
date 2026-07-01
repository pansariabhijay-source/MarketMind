"""
Central LLM configuration for MarketMind.
------------------------------------------
One place to control which models the crew and the synthesis step use.
Defaults to Cerebras llama-3.3-70b (free, fast, strong reasoning) but every
model is overridable via environment variables so you can swap providers
without touching code.
"""

import os

# Reasoning model — used by the synthesis / business-analysis steps that need
# to weigh evidence and produce structured output.
REASONING_MODEL = os.getenv("MM_REASONING_MODEL", "cerebras/zai-glm-4.7")
# Fast model — used by the research/extraction agents that mostly summarise
# tool output. Kept smaller for throughput on the free tier.
FAST_MODEL = os.getenv("MM_FAST_MODEL", "cerebras/gemma-4-31b")

# Kept near-deterministic to minimise fabrication. Override via env if needed.
REASONING_TEMPERATURE = float(os.getenv("MM_REASONING_TEMP", "0.1"))
FAST_TEMPERATURE = float(os.getenv("MM_FAST_TEMP", "0.0"))


def build_crew_llms():
    """Return (fast_llm, reasoning_llm) as CrewAI LLM objects. Imported lazily
    so the rest of the app (and tests) don't need crewai installed."""
    from crewai import LLM

    fast = LLM(model=FAST_MODEL, temperature=FAST_TEMPERATURE, max_tokens=2560)
    # Larger budget so the business-analyst report can include EVERY section
    # (financials, GTM, SWOT, recommendation) rather than truncating — otherwise
    # the grounded synthesis has nothing to extract for those sections.
    reasoning = LLM(model=REASONING_MODEL, temperature=REASONING_TEMPERATURE, max_tokens=8192)
    return fast, reasoning


def structured_complete(prompt: str, system: str = "", max_tokens: int = 4096) -> str:
    """Single-shot completion against the reasoning model, used by the synthesis
    step. Uses CrewAI's LLM wrapper (which bundles litellm) so we don't depend on
    litellm being importable as a top-level package."""
    from crewai import LLM

    # Low temperature → near-deterministic structuring, minimal fabrication, while
    # keeping enough signal for reliable extraction of the full schema.
    llm = LLM(model=REASONING_MODEL, temperature=0.1, max_tokens=max_tokens)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return llm.call(messages)
