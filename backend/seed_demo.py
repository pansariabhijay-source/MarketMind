"""Dev-only: seed the SQLite store with rich demo jobs so the dashboard can be
reviewed without running the full crew. Run:  python3 -m backend.seed_demo"""
from datetime import datetime, timezone, timedelta
from backend import store
from backend.schemas import MarketAnalysis
from backend.synthesize import _finalize

store.init_db()

IDEA = "A subscription meal-kit service for tier-2 Indian cities focused on regional cuisines"

analysis = _finalize(MarketAnalysis(
    idea=IDEA,
    headline="A large, fast-growing tier-2 meal-kit market with weak incumbents and a clear regional-cuisine wedge",
    verdict="CONDITIONAL",
    verdict_rationale="Strong demand and whitespace, but thin margins and cold-chain logistics make disciplined unit economics essential before scaling.",
    opportunity_score=71,
    confidence_pct=68,
    executive_summary=("Tier-2 Indian cities are underserved by existing meal-kit and cloud-kitchen players "
        "who concentrate on metros. Rising disposable income, dual-income households and smartphone penetration "
        "are driving convenience spend, while no incumbent owns the regional-cuisine positioning. The opportunity "
        "is real but margin-sensitive: cold-chain logistics and perishable inventory demand tight operations. "
        "Recommendation is CONDITIONAL — validate unit economics in 2-3 anchor cities before a broader rollout."),
    score_breakdown={"market_attractiveness": 78, "competitive_intensity": 74,
                     "customer_urgency": 66, "differentiation": 72, "execution_feasibility": 61},
    market={
        "tam": {"value_usd": 4.2e9, "label": "$4.2B", "methodology": "India meal-kit + ready-to-cook TAM, top-down", "source": "Statista"},
        "sam": {"value_usd": 6.3e8, "label": "$630M", "methodology": "Tier-2 households with convenience spend", "source": "Estimated"},
        "som": {"value_usd": 3.2e7, "label": "$32M", "methodology": "~5% of SAM captured across 3 years", "source": "Estimated"},
        "cagr_pct": 17.4, "cagr_source": "Mordor Intelligence",
    },
    trends=[
        {"title": "Convenience spend rising in tier-2", "detail": "Dual-income households in tier-2 cities are increasing food-convenience spend ~20% YoY.", "source": "RedSeer"},
        {"title": "Regional cuisine premiumisation", "detail": "Consumers pay a premium for authentic regional recipes over generic north-Indian fare.", "source": "NRAI"},
        {"title": "Cold-chain build-out", "detail": "Third-party cold-chain coverage in tier-2 has doubled since 2021, lowering entry barriers.", "source": "IBEF"},
    ],
    competitors=[
        {"name": "FreshMenu", "offering": "Ready-to-eat + kits (metro)", "pricing": "₹250–450/meal", "funding": "$17M", "strength": "Brand recall", "weakness": "Metro-only, no regional focus", "market_share": 62, "innovation": 55, "verified": True},
        {"name": "InnerChef", "offering": "Meal kits + gourmet", "pricing": "₹300+/kit", "funding": "$8M", "strength": "Recipe quality", "weakness": "Scaled back operations", "market_share": 40, "innovation": 48, "verified": True},
        {"name": "Local cloud kitchens", "offering": "Regional ready-to-eat", "pricing": "₹150–300", "funding": "Unknown", "strength": "Local taste, cheap", "weakness": "No kit format, inconsistent", "market_share": 55, "innovation": 30, "verified": False},
        {"name": "BigBasket (bbInstant)", "offering": "Grocery + some kits", "pricing": "Grocery pricing", "funding": "$1B+", "strength": "Distribution + supply", "weakness": "Kits are a side product", "market_share": 80, "innovation": 60, "verified": True},
    ],
    market_gap="No player owns the 'authentic regional-cuisine meal-kit' position in tier-2 cities with reliable cold-chain delivery.",
    segments=[
        {"name": "Young dual-income couples", "description": "25–35, both working, cook 3–4x/week", "pain_points": ["No time to plan/shop", "Bored of delivery food", "Want home-cooked authenticity"], "willingness_to_pay": "₹1,200–1,800/wk", "size_label": "~2.1M households", "buying_trigger": "New job / moving cities", "priority": "primary"},
        {"name": "Nuclear families w/ kids", "description": "30–45, one primary cook, value nutrition", "pain_points": ["Repetitive menus", "Nutrition concerns", "Grocery wastage"], "willingness_to_pay": "₹1,800–2,500/wk", "size_label": "~1.4M households", "buying_trigger": "Health event / diet goal", "priority": "secondary"},
    ],
    icp="Time-poor, dual-income tier-2 couples (25–35) who value authentic regional home cooking but lack time to shop and plan.",
    differentiators=[
        "Region-specific recipe kits vs FreshMenu's generic metro menu",
        "Cold-chain reliability in tier-2 where local kitchens are inconsistent",
        "Weekly rotating regional menus curated with local chefs",
    ],
    mvp_features=["Weekly regional menu picker", "Pre-portioned kit delivery", "15-min recipe cards", "Subscription pause/skip", "Cold-chain tracking"],
    pricing_tiers=[
        {"name": "Solo", "price": "₹899/wk", "target": "Individuals", "features": ["3 kits/week", "Standard menus", "Skip anytime"]},
        {"name": "Duo", "price": "₹1,499/wk", "target": "Couples", "features": ["5 kits/week", "Regional rotation", "Priority slots", "Skip anytime"]},
        {"name": "Family", "price": "₹2,299/wk", "target": "Families of 4", "features": ["7 kits/week", "Kid-friendly options", "Nutrition tags", "Dedicated support"]},
    ],
    financials=[
        {"period": "Year 1", "customers": 4500, "revenue_usd": 520000, "costs_usd": 610000},
        {"period": "Year 2", "customers": 18000, "revenue_usd": 2400000, "costs_usd": 2200000},
        {"period": "Year 3", "customers": 46000, "revenue_usd": 6800000, "costs_usd": 5400000},
    ],
    swot={
        "strengths": ["Clear regional positioning", "Subscription retention", "Local chef network"],
        "weaknesses": ["Perishable inventory risk", "Thin gross margins", "Cold-chain capex"],
        "opportunities": ["First-mover in tier-2", "Corporate meal partnerships", "Private-label spices"],
        "threats": ["BigBasket entering kits", "Food inflation", "Low switching costs"],
    },
    gtm=[
        {"phase": "Months 0–3", "focus": "Validate 2 anchor cities", "channels": ["Instagram", "Society WhatsApp groups", "Local influencers"], "goal": "500 paying subscribers, <₹400 CAC"},
        {"phase": "Months 3–9", "focus": "Prove retention + unit economics", "channels": ["Referral loops", "Performance ads", "Kirana tie-ups"], "goal": "60% M3 retention, contribution-positive"},
        {"phase": "Months 9–18", "focus": "Expand to 6 cities", "channels": ["Regional PR", "Corporate wellness", "App store"], "goal": "18k subscribers, breakeven trajectory"},
    ],
    risks=[
        {"title": "Cold-chain failures spoil perishable kits", "severity": "high", "likelihood": "medium", "mitigation": "Insulated packaging + 3PL SLAs + spoilage insurance"},
        {"title": "Gross margins too thin to scale", "severity": "high", "likelihood": "medium", "mitigation": "Private-label sourcing, dynamic menu costing"},
        {"title": "Incumbent (BigBasket) enters regional kits", "severity": "medium", "likelihood": "medium", "mitigation": "Build brand + retention moat early"},
        {"title": "Low switching costs churn subscribers", "severity": "medium", "likelihood": "high", "mitigation": "Loyalty rewards + menu personalisation"},
    ],
    sources=["Statista", "Mordor Intelligence", "RedSeer", "NRAI", "IBEF"],
), IDEA)
analysis.confidence.risk_level = "MEDIUM"
analysis.confidence.overall_score = 68
analysis.confidence.total_claims = 34
analysis.confidence.verified_claims = 27
analysis.confidence.unverified_claims = 7
analysis.confidence.contradictions = ["Local cloud-kitchen pricing is cited inconsistently across sources (₹150 vs ₹300)."]
analysis.confidence.caveats = [
    "Segment sizes are modelled estimates, not survey data.",
    "Cold-chain cost assumptions vary widely by city and should be validated locally.",
    "Competitor funding figures reflect last public disclosures and may be stale.",
]

now = datetime.now(timezone.utc)
report_md = f"# {IDEA} — Market Research Report\n\n## Executive Summary\n{analysis.executive_summary}\n\n## Final Recommendation\nCONDITIONAL — {analysis.verdict_rationale}\n"

# Completed job
store.save_job({
    "job_id": "demo-completed", "status": "completed", "product_idea": IDEA,
    "created_at": (now - timedelta(minutes=4)).isoformat(), "completed_at": now.isoformat(),
    "current_step": 7, "step_label": "Complete", "progress_pct": 100,
    "report": report_md, "hallucination_report": "", "analysis": analysis.model_dump(),
    "error": None, "from_cache": False, "cache_similarity": None, "original_idea": None,
    "elapsed_seconds": 214,
})

# Running job (mid-pipeline) for the live view
store.save_job({
    "job_id": "demo-running", "status": "running",
    "product_idea": "AI-powered legal document review for SMBs",
    "created_at": now.isoformat(), "completed_at": None,
    "current_step": 3, "step_label": "Product Strategy", "progress_pct": 45,
    "report": None, "hallucination_report": None, "analysis": None, "error": None,
    "from_cache": False, "cache_similarity": None, "original_idea": None, "elapsed_seconds": 96,
})

print("Seeded demo-completed and demo-running jobs.")
