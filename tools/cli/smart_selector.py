from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SelectionResult:
    mode: str
    skills: tuple[str, ...]
    estimated_workers: int
    estimated_time_minutes: int


class SmartModeSkillSelector:
    def select_best_configuration(self, task_description: str) -> SelectionResult:
        text = task_description.lower()
        if any(token in text for token in ("security", "vulnerab", "scan", "pentest")):
            return SelectionResult(
                mode="security",
                skills=("web_scanning", "vulnerability_analysis", "report_generation"),
                estimated_workers=4,
                estimated_time_minutes=15,
            )
        if any(token in text for token in ("deploy", "infra", "terraform", "k8s", "kubernetes")):
            return SelectionResult(
                mode="devops",
                skills=("iac_plan", "rollout_control", "observability_checks"),
                estimated_workers=3,
                estimated_time_minutes=12,
            )
        if any(token in text for token in ("adr", "design", "arquitect", "architecture")):
            return SelectionResult(
                mode="architect",
                skills=("tradeoff_analysis", "adr_drafting", "api_contract_design"),
                estimated_workers=2,
                estimated_time_minutes=10,
            )
        if any(token in text for token in ("docs", "runbook", "document")):
            return SelectionResult(
                mode="doc",
                skills=("doc_synthesis", "runbook_update"),
                estimated_workers=1,
                estimated_time_minutes=8,
            )
        return SelectionResult(
            mode="developer",
            skills=("implementation", "tests", "refactor"),
            estimated_workers=2,
            estimated_time_minutes=10,
        )
