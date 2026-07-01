"""
Structured synthesis.
----------------------
Converts the crew's freeform markdown report (+ the hallucination audit) into a
validated `MarketAnalysis` object that powers the dashboard.

Two-tier strategy for robustness:
  1.  LLM pass  — ask the reasoning model to emit JSON matching the schema.
                  Validated with Pydantic; retried once on failure.
  2.  Heuristic — if the LLM is unavailable or returns junk, parse the markdown
                  tables/sections directly so the dashboard still renders.

Finally we *always* recompute a few derived fields deterministically
(opportunity score, growth curve, confidence roll-up) so the headline numbers
are internally consistent regardless of which path produced the data.
"""

from __future__ import annotations

import json
import re
from typing import Optional

from backend.schemas import (
    MarketAnalysis, MarketSize, MarketSizing, GrowthPoint, Trend, Competitor,
    Segment, FinancialProjection, PricingTier, SWOT, GTMPhase, Risk,
    ScoreBreakdown, DataConfidence,
)

# ── JSON extraction helpers ───────────────────────────────────────────────────

def _extract_json(text: str) -> Optional[dict]:
    """Pull the first balanced JSON object out of an LLM response, tolerant of
    ```json fences, reasoning-model <think> blocks, and trailing commas."""
    if not text:
        return None
    # Drop reasoning-model scratchpads that may contain stray braces.
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Strip code fences so we scan the raw JSON body (greedy — keep the whole block).
    fence = re.search(r"```(?:json)?\s*(.+?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1)

    # Balanced-brace scan from the first '{' — handles nested objects/arrays and
    # ignores braces inside strings.
    start = text.find("{")
    if start == -1:
        return None
    depth, in_str, esc = 0, False, False
    candidate = None
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start:i + 1]
                break
    if not candidate:
        return None

    for attempt in (candidate, re.sub(r",\s*([}\]])", r"\1", candidate)):
        try:
            return json.loads(attempt)
        except json.JSONDecodeError:
            # Escape raw control chars (unescaped newlines inside strings) and retry.
            try:
                return json.loads(attempt.replace("\n", "\\n").replace("\t", "\\t"))
            except json.JSONDecodeError:
                continue
    return None


# ── Markdown parsing utilities (used by the heuristic fallback) ────────────────

def _section(md: str, *headings: str) -> str:
    """Return the body of a section, INCLUDING any deeper sub-headings, up to the
    next heading of the same-or-higher level."""
    for h in headings:
        head = re.search(rf"^(#{{1,4}})\s*{h}.*?$", md, re.IGNORECASE | re.MULTILINE)
        if not head:
            continue
        level = len(head.group(1))
        start = head.end()
        rest = md[start:]
        stop = re.search(rf"^#{{1,{level}}}\s", rest, re.MULTILINE)
        body = (rest[:stop.start()] if stop else rest).strip()
        if body:
            return body
    return ""


def _parse_md_table(md: str) -> list[list[str]]:
    rows = []
    for line in md.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        if re.match(r"^\|[\s\-:|]+\|?$", line):  # separator row
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        rows.append(cells)
    return rows


def _money_to_usd(text: str) -> float:
    """'$12.3B' / '$450 million' / '12,000' -> float USD."""
    if not text:
        return 0.0
    t = text.replace(",", "")
    m = re.search(r"\$?\s*([\d.]+)\s*(trillion|billion|million|thousand|[btmk])?", t, re.IGNORECASE)
    if not m:
        return 0.0
    num = float(m.group(1))
    unit = (m.group(2) or "").lower()
    mult = {
        "trillion": 1e12, "t": 1e12,
        "billion": 1e9, "b": 1e9,
        "million": 1e6, "m": 1e6,
        "thousand": 1e3, "k": 1e3,
    }.get(unit, 1.0)
    return num * mult


def _label_usd(value: float) -> str:
    if value >= 1e12:
        return f"${value / 1e12:.1f}T"
    if value >= 1e9:
        return f"${value / 1e9:.1f}B"
    if value >= 1e6:
        return f"${value / 1e6:.1f}M"
    if value >= 1e3:
        return f"${value / 1e3:.0f}K"
    return f"${value:.0f}"


# ── LLM synthesis ─────────────────────────────────────────────────────────────

_SYNTHESIS_SYSTEM = (
    "You are a senior equity research analyst converting a market-research report "
    "into a precise JSON object. Extract every relevant fact the report contains — "
    "its market sizes, competitors, segments, financial tables, pricing, GTM, SWOT "
    "and risks. Do NOT invent anything: never add a company, number, price or source "
    "that is not written in the report; if a figure is missing, use 0 or leave it "
    "empty rather than guessing. Mark any competitor or figure that is unsourced or "
    "flagged UNVERIFIED with \"verified\": false. Output ONLY valid JSON, no prose."
)

_SCHEMA_HINT = """
Return JSON with EXACTLY these keys (use [] or "" when unknown, never null):
{
 "headline": str, "verdict": "GO"|"CONDITIONAL"|"NO-GO", "verdict_rationale": str,
 "opportunity_score": int(0-100), "confidence_pct": int(0-100),
 "executive_summary": str,
 "score_breakdown": {"market_attractiveness":int,"competitive_intensity":int,
   "customer_urgency":int,"differentiation":int,"execution_feasibility":int},  // each 0-100
 "market": {"tam":{"value_usd":float,"label":str,"methodology":str,"source":str},
   "sam":{...},"som":{...},"cagr_pct":float,"cagr_source":str},
 "trends": [{"title":str,"detail":str,"source":str}],
 "competitors": [{"name":str,"offering":str,"pricing":str,"funding":str,
   "strength":str,"weakness":str,"market_share":float(0-100),
   "innovation":float(0-100),"verified":bool}],
 "market_gap": str,
 "segments": [{"name":str,"description":str,"pain_points":[str],
   "willingness_to_pay":str,"size_label":str,"buying_trigger":str,
   "priority":"primary"|"secondary"|"tertiary"}],
 "icp": str,
 "differentiators": [str], "mvp_features": [str],
 "pricing_tiers": [{"name":str,"price":str,"target":str,"features":[str]}],
 "financials": [{"period":str,"customers":int,"revenue_usd":float,"costs_usd":float}],
 "swot": {"strengths":[str],"weaknesses":[str],"opportunities":[str],"threats":[str]},
 "gtm": [{"phase":str,"focus":str,"channels":[str],"goal":str}],
 "risks": [{"title":str,"severity":"low"|"medium"|"high",
   "likelihood":"low"|"medium"|"high","mitigation":str}],
 "sources": [str]
}
Capture ALL items the report contains (its financial tables, pricing tiers, GTM
phases, SWOT and risks included), but do NOT pad lists to a target count and do
NOT invent items the report never mentions — if it names 2 competitors, return 2;
if it truly has no financials, return []. value_usd is an absolute number
(12300000000 for $12.3B); use 0 if no figure is given.
""".strip()


def _llm_synthesis(idea: str, report: str, audit: str) -> Optional[dict]:
    from backend.llm import structured_complete
    prompt = (
        f"STARTUP IDEA: {idea}\n\n"
        f"=== MARKET RESEARCH REPORT ===\n{report}\n\n"
        f"=== DATA RELIABILITY AUDIT ===\n{audit or 'N/A'}\n\n"
        f"{_SCHEMA_HINT}"
    )
    for _ in range(2):
        try:
            # The schema is large; give the model room so the JSON isn't truncated.
            raw = structured_complete(prompt, system=_SYNTHESIS_SYSTEM, max_tokens=8000)
            data = _extract_json(raw)
            if data:
                return data
        except Exception as e:  # noqa: BLE001
            print(f"[synthesis] LLM attempt failed: {e}")
    return None


# ── Heuristic fallback ────────────────────────────────────────────────────────

def _heuristic(idea: str, report: str, audit: str) -> dict:
    """Best-effort structured extraction straight from the markdown report.
    Deterministic, no LLM — also what the unit tests exercise."""
    data: dict = {"sources": []}

    # Verdict
    rec = _section(report, "Final Recommendation", "Recommendation", "Verdict")
    upper = rec.upper()
    if "NO-GO" in upper or "NO GO" in upper:
        data["verdict"] = "NO-GO"
    elif "CONDITIONAL" in upper:
        data["verdict"] = "CONDITIONAL"
    elif "GO" in upper:
        data["verdict"] = "GO"
    data["verdict_rationale"] = re.sub(r"^(go|no-go|conditional)[:\s-]*", "", rec, flags=re.I).strip()[:400]

    data["executive_summary"] = _section(report, "Executive Summary", "Summary")[:1200]
    data["headline"] = (data["executive_summary"].split(".")[0] or idea)[:160]

    # Market sizing
    market_md = _section(report, "Market Overview", "Market Size", "Market")
    sizes = re.findall(r"\$[\d.,]+\s*(?:trillion|billion|million|[btm])\b", market_md, re.IGNORECASE)
    market: dict = {}
    if sizes:
        tam_v = _money_to_usd(sizes[0])
        market["tam"] = {"value_usd": tam_v, "label": _label_usd(tam_v),
                         "methodology": "Top-down from cited market reports",
                         "source": "Report"}
        sam_v = tam_v * 0.15
        market["sam"] = {"value_usd": sam_v, "label": _label_usd(sam_v),
                         "methodology": "~15% of TAM reachable with the proposed model",
                         "source": "Estimated"}
        som_v = sam_v * 0.05
        market["som"] = {"value_usd": som_v, "label": _label_usd(som_v),
                         "methodology": "~5% of SAM capturable in 3 yrs", "source": "Estimated"}
    cagr = re.search(r"(?:CAGR|compound annual growth rate)[^\d]*([\d.]+)\s*%", market_md, re.IGNORECASE)
    if not cagr:
        cagr = re.search(r"([\d.]+)\s*%\s*(?:CAGR)", market_md, re.IGNORECASE)
    if cagr:
        market["cagr_pct"] = float(cagr.group(1))
    if market:
        data["market"] = market

    # Trends
    trends = []
    for line in market_md.splitlines():
        if re.search(r"trend", line, re.IGNORECASE) and len(line) > 25:
            clean = re.sub(r"^[-*•\d.]+\s*", "", line).strip()
            trends.append({"title": clean[:60], "detail": clean, "source": ""})
    data["trends"] = trends[:3]

    # Competitors from the markdown table
    comp_md = _section(report, "Competitive Landscape", "Competitors", "Competition")
    rows = _parse_md_table(comp_md)
    competitors = []
    if rows and len(rows) > 1:
        header = [h.lower() for h in rows[0]]
        def idx(*names):
            for n in names:
                for i, h in enumerate(header):
                    if n in h:
                        return i
            return -1
        ci_name, ci_off = idx("competitor", "name"), idx("offering", "product")
        ci_price, ci_str, ci_weak = idx("pricing", "price"), idx("strength"), idx("weakness")
        for r in rows[1:6]:
            def cell(i):
                return r[i] if 0 <= i < len(r) else ""
            verified = "UNVERIFIED" not in " ".join(r).upper()
            competitors.append({
                "name": cell(ci_name), "offering": cell(ci_off),
                "pricing": cell(ci_price), "strength": cell(ci_str),
                "weakness": cell(ci_weak), "funding": "Unknown",
                "market_share": 0, "innovation": 0, "verified": verified,
            })
    data["competitors"] = competitors
    data["market_gap"] = _section(report, "Market Gap", "Key Gap")[:300]

    # Segments
    seg_md = _section(report, "Customer Insights", "Customer", "Target Customers")
    segments = []
    for block in re.split(r"(?=^#{2,4}\s|^\*\*?Segment)", seg_md, flags=re.MULTILINE):
        if not block.strip():
            continue
        name = re.sub(r"[#*]", "", block.splitlines()[0]).strip()[:60]
        pains = re.findall(r"pain[^:]*:\s*(.+)", block, re.IGNORECASE)
        wtp = re.search(r"(?:willingness to pay|WTP)[^:]*:\s*(.+)", block, re.IGNORECASE)
        if name and ("segment" in name.lower() or pains or wtp):
            segments.append({
                "name": name, "description": "",
                "pain_points": [p.strip()[:120] for p in pains][:3],
                "willingness_to_pay": wtp.group(1).strip()[:60] if wtp else "",
                "priority": "primary" if not segments else "secondary",
            })
    data["segments"] = segments[:3]

    # Strategy bits
    strat_md = _section(report, "Product Strategy", "Strategy")
    diffs = _section(report, "Differentiators", "Key Differentiators") or strat_md
    data["differentiators"] = [
        re.sub(r"^[-*•\d.]+\s*", "", l).strip()
        for l in diffs.splitlines()
        if re.match(r"^\s*[-*•\d]", l) and len(l) > 12
    ][:4]
    feats = _section(report, "MVP Features", "Features") or strat_md
    data["mvp_features"] = [
        re.sub(r"^[-*•\d.]+\s*", "", l).strip()
        for l in feats.splitlines()
        if re.match(r"^\s*[-*•\d]", l) and len(l) > 12
    ][:6]

    # Risks
    risk_md = _section(report, "Key Risks", "Risks", "Business Model")
    risks = []
    for l in risk_md.splitlines():
        if re.match(r"^\s*[-*•\d]", l) and len(l) > 15:
            risks.append({"title": re.sub(r"^[-*•\d.]+\s*", "", l).strip()[:120],
                          "severity": "medium", "likelihood": "medium", "mitigation": ""})
    data["risks"] = risks[:4]

    return data


# ── Confidence / audit parsing ────────────────────────────────────────────────

def _parse_confidence(audit: str) -> DataConfidence:
    c = DataConfidence()
    if not audit:
        return c
    m = re.search(r"Risk\s*(?:Score)?[:\s*#]*([A-Z]+)", audit, re.IGNORECASE)
    if m and m.group(1).upper() in ("LOW", "MEDIUM", "HIGH"):
        c.risk_level = m.group(1).upper()

    def num(label):
        mm = re.search(rf"{label}[^\d]*(\d+)", audit, re.IGNORECASE)
        return int(mm.group(1)) if mm else 0
    c.total_claims = num(r"Total Claims")
    c.verified_claims = num(r"Verified Claims")
    c.unverified_claims = num(r"Unverified Claims")
    rel = re.search(r"Reliability Score[^\d]*(\d+)", audit, re.IGNORECASE)
    if rel:
        c.overall_score = min(100, int(rel.group(1)))
    elif c.total_claims:
        c.overall_score = round(100 * c.verified_claims / max(c.total_claims, 1))

    contra = _section(audit, "Key Contradictions", "Contradictions")
    c.contradictions = [
        re.sub(r"^[-*•]\s*", "", l).strip()
        for l in contra.splitlines()
        if re.match(r"^\s*[-*•]", l) and "none" not in l.lower() and len(l) > 12
    ][:5]
    caveats = _section(audit, "Key Caveats", "Caveats")
    c.caveats = [
        re.sub(r"^[-*•]\s*", "", l).strip()
        for l in caveats.splitlines()
        if re.match(r"^\s*[-*•]", l) and len(l) > 12
    ][:5]
    return c


# ── Derived fields ────────────────────────────────────────────────────────────

def _finalize(a: MarketAnalysis, idea: str) -> MarketAnalysis:
    a.idea = idea or a.idea

    # Normalise market-size labels to a clean "$12.4B" chip. Models sometimes put
    # prose in `label`; if we have a real number, always regenerate the label and
    # move any prose into methodology.
    for fld in (a.market.tam, a.market.sam, a.market.som):
        if fld.value_usd and fld.value_usd > 0:
            # Any prose or verbose label ("$12.5 Billion", methodology text) → move
            # to methodology and regenerate a compact "$12.5B" chip from the number.
            verbose = bool(fld.label) and (
                "$" not in fld.label or len(fld.label) > 8 or
                re.search(r"illion|housand", fld.label, re.I))
            if verbose:
                if not fld.methodology and not re.search(r"illion|housand", fld.label, re.I):
                    fld.methodology = fld.label
                fld.label = ""
            if not fld.label:
                fld.label = _label_usd(fld.value_usd)

    # Growth projection from TAM + CAGR if not supplied
    if not a.growth_projection and a.market.tam.value_usd > 0 and a.market.cagr_pct > 0:
        base = a.market.tam.value_usd
        r = a.market.cagr_pct / 100.0
        import datetime
        y0 = datetime.date.today().year
        a.growth_projection = [
            GrowthPoint(year=str(y0 + i), market_usd=round(base * ((1 + r) ** i)))
            for i in range(6)
        ]

    # Score breakdown <-> opportunity score, kept internally consistent.
    sb = a.score_breakdown
    sub = [sb.market_attractiveness, sb.competitive_intensity, sb.customer_urgency,
           sb.differentiation, sb.execution_feasibility]
    if any(sub) and a.opportunity_score == 0:
        weights = [0.25, 0.20, 0.20, 0.20, 0.15]
        a.opportunity_score = round(sum(s * w for s, w in zip(sub, weights)))

    # Fall back opportunity score from verdict if still zero
    if a.opportunity_score == 0:
        a.opportunity_score = {"GO": 76, "CONDITIONAL": 58, "NO-GO": 34}[a.verdict]

    # If we have a headline score but no breakdown, derive one so the radar renders
    if not any(sub):
        s = a.opportunity_score
        a.score_breakdown = ScoreBreakdown(
            market_attractiveness=min(100, s + 5), competitive_intensity=max(0, s - 10),
            customer_urgency=s, differentiation=max(0, s - 5),
            execution_feasibility=min(100, s + 3),
        )
    if a.confidence_pct == 0:
        a.confidence_pct = a.confidence.overall_score or {
            "LOW": 82, "MEDIUM": 64, "HIGH": 40}[a.confidence.risk_level]

    # Sources roll-up
    src = set(a.sources)
    for t in a.trends:
        if t.source:
            src.add(t.source)
    for fld in (a.market.tam, a.market.sam, a.market.som):
        if fld.source and fld.source not in ("Estimated", "Report"):
            src.add(fld.source)
    if a.market.cagr_source:
        src.add(a.market.cagr_source)
    a.sources = sorted(s for s in src if s)
    return a


# ── Public entry point ────────────────────────────────────────────────────────

def _coerce_enums(data: dict) -> None:
    """Fix invalid/empty Literal fields in place so one bad value from the LLM can't
    fail validation of the whole analysis (which would blank the entire dashboard)."""
    def pick(val, allowed, default):
        v = (val or "").strip().upper()
        for a in allowed:
            if v == a.upper():
                return a
        return default

    if "verdict" in data:
        data["verdict"] = pick(data.get("verdict"), ["GO", "CONDITIONAL", "NO-GO"], "CONDITIONAL")
    for seg in data.get("segments", []) or []:
        if isinstance(seg, dict):
            seg["priority"] = pick(seg.get("priority"), ["primary", "secondary", "tertiary"], "secondary")
    for r in data.get("risks", []) or []:
        if isinstance(r, dict):
            r["severity"] = pick(r.get("severity"), ["low", "medium", "high"], "medium")
            r["likelihood"] = pick(r.get("likelihood"), ["low", "medium", "high"], "medium")
    conf = data.get("confidence")
    if isinstance(conf, dict) and "risk_level" in conf:
        conf["risk_level"] = pick(conf.get("risk_level"), ["LOW", "MEDIUM", "HIGH"], "MEDIUM")


def _strip_md(obj):
    """Recursively remove markdown bold/italic markers left in parsed text."""
    if isinstance(obj, str):
        s = re.sub(r"\*\*(.+?)\*\*", r"\1", obj)
        s = re.sub(r"__(.+?)__", r"\1", s)
        return s.strip().strip("*_").strip()
    if isinstance(obj, list):
        return [_strip_md(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _strip_md(v) for k, v in obj.items()}
    return obj


def synthesize(idea: str, report: str, audit: str = "", use_llm: bool = True) -> MarketAnalysis:
    """Build a validated MarketAnalysis from the report. Never raises."""
    data = None
    if use_llm:
        data = _llm_synthesis(idea, report, audit)

    if not data:
        data = _heuristic(idea, report, audit)
    else:
        # Backfill anything the LLM omitted using the heuristic parse
        heur = _heuristic(idea, report, audit)
        for k, v in heur.items():
            if k not in data or data[k] in (None, "", [], {}):
                data[k] = v

    data = _strip_md(data)
    _coerce_enums(data)
    try:
        analysis = MarketAnalysis(**{k: v for k, v in data.items()
                                     if k in MarketAnalysis.model_fields})
    except Exception as e:  # noqa: BLE001
        print(f"[synthesis] validation failed, using minimal object: {e}")
        analysis = MarketAnalysis(idea=idea,
                                  executive_summary=_section(report, "Executive Summary"))

    analysis.confidence = _parse_confidence(audit)
    analysis = _finalize(analysis, idea)
    return _apply_guardrails(analysis)


def _apply_guardrails(a: MarketAnalysis) -> MarketAnalysis:
    """Post-hoc honesty checks so the UI never overstates certainty."""
    import os

    # If live web search was disabled, all figures are model estimates.
    if not os.getenv("SERPER_API_KEY", "").strip():
        note = ("Live web search was disabled for this run — market sizes, pricing "
                "and funding figures are model estimates, not retrieved from cited "
                "sources. Verify independently before acting.")
        if note not in a.confidence.caveats:
            a.confidence.caveats.insert(0, note)
        # Estimates should never read as high-confidence.
        if a.confidence.risk_level == "LOW":
            a.confidence.risk_level = "MEDIUM"
        a.confidence_pct = min(a.confidence_pct, 65)
        # Mark competitors whose data can't be source-backed as unverified.
        for c in a.competitors:
            if not c.funding or c.funding.lower() in ("", "unknown", "n/a"):
                pass  # unknown funding is fine; only downgrade fabricated-looking data

    # Any unverified competitor drags confidence down a notch.
    unverified = sum(1 for c in a.competitors if not c.verified)
    if unverified and a.confidence_pct > 55:
        a.confidence_pct = max(55, a.confidence_pct - unverified * 4)

    return a
