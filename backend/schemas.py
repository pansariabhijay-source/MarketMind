"""
Typed schemas for MarketMind.
---------------------------------
The crew produces a rich markdown report; a synthesis pass converts that report
(plus the raw agent outputs) into this strongly-typed structure so the frontend
can render real visualizations (funnels, charts, scorecards) instead of plain text.

Every field has a safe default so a partial / failed synthesis still yields a
renderable object — the dashboard degrades gracefully rather than crashing.
"""

from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ── Building blocks ───────────────────────────────────────────────────────────

class MarketSize(BaseModel):
    """A single market-size figure with the reasoning behind it."""
    value_usd: float = Field(0, description="Size in USD (absolute, not millions/billions)")
    label: str = Field("", description="Human label e.g. '$12.3B'")
    methodology: str = Field("", description="One sentence on how this was derived")
    source: str = Field("", description="Named source, or 'Estimated' if modelled")


class MarketSizing(BaseModel):
    tam: MarketSize = Field(default_factory=MarketSize, description="Total Addressable Market")
    sam: MarketSize = Field(default_factory=MarketSize, description="Serviceable Available Market")
    som: MarketSize = Field(default_factory=MarketSize, description="Serviceable Obtainable Market (yr 1-3)")
    cagr_pct: float = Field(0, description="Forward CAGR as a percentage, e.g. 19.9")
    cagr_source: str = Field("", description="Source for the CAGR figure")


class GrowthPoint(BaseModel):
    year: str
    market_usd: float = Field(0, description="Projected market size in USD for that year")


class Trend(BaseModel):
    title: str = ""
    detail: str = ""
    source: str = ""


class Competitor(BaseModel):
    name: str = ""
    offering: str = ""
    pricing: str = ""
    funding: str = Field("", description="Known funding / scale, or 'Unknown'")
    strength: str = ""
    weakness: str = ""
    # 0-100 axes used for the positioning scatter plot
    market_share: float = Field(0, description="Relative market presence, 0-100")
    innovation: float = Field(0, description="Product/innovation strength, 0-100")
    verified: bool = Field(True, description="False if the competitor data is UNVERIFIED")


class Segment(BaseModel):
    name: str = ""
    description: str = ""
    pain_points: List[str] = Field(default_factory=list)
    willingness_to_pay: str = ""
    size_label: str = Field("", description="Rough segment size e.g. '120k businesses'")
    buying_trigger: str = ""
    priority: Literal["primary", "secondary", "tertiary"] = "secondary"


class FinancialProjection(BaseModel):
    period: str = Field("", description="e.g. 'Year 1'")
    customers: int = 0
    revenue_usd: float = 0
    costs_usd: float = 0

    @property
    def profit_usd(self) -> float:  # pragma: no cover - convenience only
        return self.revenue_usd - self.costs_usd


class PricingTier(BaseModel):
    name: str = ""
    price: str = ""
    target: str = ""
    features: List[str] = Field(default_factory=list)


class SWOT(BaseModel):
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    threats: List[str] = Field(default_factory=list)


class GTMPhase(BaseModel):
    phase: str = Field("", description="e.g. 'Months 0-3'")
    focus: str = ""
    channels: List[str] = Field(default_factory=list)
    goal: str = ""


class Risk(BaseModel):
    title: str = ""
    severity: Literal["low", "medium", "high"] = "medium"
    likelihood: Literal["low", "medium", "high"] = "medium"
    mitigation: str = ""


class ScoreBreakdown(BaseModel):
    """0-100 sub-scores that roll up into the headline opportunity score."""
    market_attractiveness: int = 0
    competitive_intensity: int = Field(0, description="Higher = LESS crowded / more favourable")
    customer_urgency: int = 0
    differentiation: int = 0
    execution_feasibility: int = 0


class DataConfidence(BaseModel):
    overall_score: int = Field(0, description="0-100 reliability of the underlying data")
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    total_claims: int = 0
    verified_claims: int = 0
    unverified_claims: int = 0
    contradictions: List[str] = Field(default_factory=list)
    caveats: List[str] = Field(default_factory=list)


# ── Top-level analysis ────────────────────────────────────────────────────────

class MarketAnalysis(BaseModel):
    """The full structured analysis powering the dashboard."""

    idea: str = ""
    headline: str = Field("", description="One punchy sentence framing the opportunity")
    verdict: Literal["GO", "CONDITIONAL", "NO-GO"] = "CONDITIONAL"
    verdict_rationale: str = ""
    opportunity_score: int = Field(0, description="0-100 headline score")
    confidence_pct: int = Field(0, description="0-100 confidence in the verdict")

    executive_summary: str = ""
    score_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)

    market: MarketSizing = Field(default_factory=MarketSizing)
    growth_projection: List[GrowthPoint] = Field(default_factory=list)
    trends: List[Trend] = Field(default_factory=list)

    competitors: List[Competitor] = Field(default_factory=list)
    market_gap: str = ""

    segments: List[Segment] = Field(default_factory=list)
    icp: str = Field("", description="Ideal Customer Profile, one sentence")

    differentiators: List[str] = Field(default_factory=list)
    mvp_features: List[str] = Field(default_factory=list)
    pricing_tiers: List[PricingTier] = Field(default_factory=list)
    financials: List[FinancialProjection] = Field(default_factory=list)

    swot: SWOT = Field(default_factory=SWOT)
    gtm: List[GTMPhase] = Field(default_factory=list)
    risks: List[Risk] = Field(default_factory=list)

    confidence: DataConfidence = Field(default_factory=DataConfidence)
    sources: List[str] = Field(default_factory=list)


# ── API request / response models ─────────────────────────────────────────────

class RunRequest(BaseModel):
    product_idea: str


class JobStatus(BaseModel):
    job_id: str
    status: str  # pending | running | completed | failed
    product_idea: str
    created_at: str
    completed_at: Optional[str] = None
    current_step: Optional[int] = None
    step_label: Optional[str] = None
    progress_pct: Optional[int] = None
    report: Optional[str] = None
    hallucination_report: Optional[str] = None
    analysis: Optional[MarketAnalysis] = None
    error: Optional[str] = None
    from_cache: Optional[bool] = False
    cache_similarity: Optional[float] = None
    original_idea: Optional[str] = None
    elapsed_seconds: Optional[float] = None
