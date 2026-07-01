from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List, Callable, Optional
from dotenv import load_dotenv
import os

from backend.llm import build_crew_llms

load_dotenv()

# ── Models ────────────────────────────────────────────────────────────────────
# Configured centrally in backend/llm.py. Default: Cerebras llama-3.3-70b for
# reasoning, llama-3.1-8b for fast extraction. Override via MM_* env vars.
llm_fast, llm_full = build_crew_llms()

# ── Tools ─────────────────────────────────────────────────────────────────────
_serper_key = os.getenv("SERPER_API_KEY", "").strip()

if _serper_key:
    from crewai_tools import SerperDevTool
    toolkit = [SerperDevTool()]
    print("[crew] SerperDevTool loaded — web search enabled")
else:
    toolkit = []
    print("[crew] WARNING: SERPER_API_KEY not set — web search disabled")


# ── Progress callback plumbing ────────────────────────────────────────────────
# main.py registers a callback here; CrewAI invokes it after every task so the
# frontend gets REAL progress instead of a fake timer.
_PROGRESS: dict = {"cb": None}


def set_progress_callback(fn: Optional[Callable]) -> None:
    _PROGRESS["cb"] = fn


def _on_task_complete(task_output) -> None:
    cb = _PROGRESS.get("cb")
    if cb:
        try:
            cb(task_output)
        except Exception as e:  # noqa: BLE001
            print(f"[crew] progress callback error: {e}")


@CrewBase
class MarketResearchCrew():
    """Multi-agent market-research crew."""

    agents: List[BaseAgent]
    tasks: List[Task]

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    # ── Agents ──
    @agent
    def market_research_specialist(self) -> Agent:
        return Agent(config=self.agents_config["market_research_specialist"],
                     tools=toolkit, llm=llm_fast, use_system_prompt=True, max_iter=5)

    @agent
    def competitive_intelligence_analyst(self) -> Agent:
        return Agent(config=self.agents_config["competitive_intelligence_analyst"],
                     tools=toolkit, llm=llm_fast, use_system_prompt=True, max_iter=5)

    @agent
    def customer_insights_researcher(self) -> Agent:
        return Agent(config=self.agents_config["customer_insights_researcher"],
                     tools=toolkit, llm=llm_fast, use_system_prompt=True, max_iter=5)

    @agent
    def product_strategy_advisor(self) -> Agent:
        # Strategy benefits from the stronger reasoning model.
        return Agent(config=self.agents_config["product_strategy_advisor"],
                     llm=llm_full, use_system_prompt=True, max_iter=2)

    @agent
    def fact_checker(self) -> Agent:
        return Agent(config=self.agents_config["fact_checker"],
                     llm=llm_fast, use_system_prompt=True, max_iter=1)

    @agent
    def business_analyst(self) -> Agent:
        return Agent(config=self.agents_config["business_analyst"],
                     llm=llm_full, use_system_prompt=True, max_iter=2)

    @agent
    def hallucination_guard(self) -> Agent:
        return Agent(config=self.agents_config["hallucination_guard"],
                     llm=llm_full, use_system_prompt=True, max_iter=1)

    # ── Tasks ──
    @task
    def market_research_task(self) -> Task:
        return Task(config=self.tasks_config["market_research_task"],
                    callback=_on_task_complete)

    @task
    def competitive_intelligence_task(self) -> Task:
        return Task(config=self.tasks_config["competitive_intelligence_task"],
                    context=[self.market_research_task()],
                    callback=_on_task_complete)

    @task
    def customer_insights_task(self) -> Task:
        return Task(config=self.tasks_config["customer_insights_task"],
                    context=[self.market_research_task(), self.competitive_intelligence_task()],
                    callback=_on_task_complete)

    @task
    def product_strategy_task(self) -> Task:
        return Task(config=self.tasks_config["product_strategy_task"],
                    context=[self.market_research_task(), self.competitive_intelligence_task(),
                             self.customer_insights_task()],
                    callback=_on_task_complete)

    @task
    def fact_check_task(self) -> Task:
        return Task(config=self.tasks_config["fact_check_task"], context=[
            self.market_research_task(), self.competitive_intelligence_task(),
            self.customer_insights_task(), self.product_strategy_task(),
        ], callback=_on_task_complete)

    @task
    def business_analyst_task(self) -> Task:
        return Task(config=self.tasks_config["business_analyst_task"],
                    context=[self.fact_check_task()],
                    output_file="reports/report.md",
                    callback=_on_task_complete)

    @task
    def hallucination_guard_task(self) -> Task:
        return Task(config=self.tasks_config["hallucination_guard_task"], context=[
            self.market_research_task(), self.competitive_intelligence_task(),
            self.customer_insights_task(), self.product_strategy_task(),
            self.fact_check_task(), self.business_analyst_task(),
        ], output_file="reports/hallucination_report.md",
           callback=_on_task_complete)

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=[
                self.market_research_specialist(),
                self.competitive_intelligence_analyst(),
                self.customer_insights_researcher(),
                self.product_strategy_advisor(),
                self.fact_checker(),
                self.business_analyst(),
                self.hallucination_guard(),
            ],
            tasks=[
                self.market_research_task(),
                self.competitive_intelligence_task(),
                self.customer_insights_task(),
                self.product_strategy_task(),
                self.fact_check_task(),
                self.business_analyst_task(),
                self.hallucination_guard_task(),
            ],
            process=Process.sequential,
            verbose=True,
            max_rpm=60,
            memory=False,
        )
