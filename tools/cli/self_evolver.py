from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Iterable

from .guardian import GuardianDecision, GuardianSystem


@dataclass(frozen=True)
class EvolutionProposal:
    title: str
    target_paths: tuple[str, ...]
    rationale: str


@dataclass(frozen=True)
class EvolutionResult:
    proposal: EvolutionProposal
    decision: GuardianDecision
    executed: bool
    note: str


class SelfEvolver:
    def __init__(self, guardian: GuardianSystem) -> None:
        self.guardian = guardian

    def propose(self, objective: str) -> list[EvolutionProposal]:
        text = objective.lower()
        proposals: list[EvolutionProposal] = []
        if any(token in text for token in ("memory", "memoria", "context")):
            proposals.append(
                EvolutionProposal(
                    title="Consolidate memory layers",
                    target_paths=("tools/cli/memory_store.py", "tools/cli/main.py"),
                    rationale="Improve hot/warm/cold memory retention and indexing.",
                )
            )
        if any(token in text for token in ("security", "seguridad", "guardrail", "sandbox")):
            proposals.append(
                EvolutionProposal(
                    title="Harden guardian checks",
                    target_paths=("tools/cli/guardian.py",),
                    rationale="Strengthen blocked paths and policy validation.",
                )
            )
        if any(token in text for token in ("multi", "orchestr", "consensus")):
            proposals.append(
                EvolutionProposal(
                    title="Improve multi-agent consensus",
                    target_paths=("tools/cli/multi_orchestrator.py",),
                    rationale="Add scoring and synthesis across providers.",
                )
            )
        if len(proposals) == 0:
            proposals.append(
                EvolutionProposal(
                    title="General reliability pass",
                    target_paths=("tools/cli/main.py", "tools/cli/client.py"),
                    rationale="Increase resilience and diagnostics.",
                )
            )
        return proposals

    def execute(
        self, proposals: list[EvolutionProposal], dry_run: bool = True, attempt: int = 1
    ) -> list[EvolutionResult]:
        results: list[EvolutionResult] = []
        for proposal in proposals:
            decision = self.guardian.validate_change_request(
                list(proposal.target_paths), attempt=attempt, dry_run=dry_run
            )
            executed = decision.allowed and dry_run
            note = (
                f"Dry-run approved at {int(time.time())}"
                if executed
                else f"Skipped: {decision.reason}"
            )
            results.append(
                EvolutionResult(
                    proposal=proposal,
                    decision=decision,
                    executed=executed,
                    note=note,
                )
            )
        return results

    @staticmethod
    def summarize(results: Iterable[EvolutionResult]) -> str:
        lines: list[str] = []
        for item in results:
            status = "OK" if item.executed else "BLOCKED"
            lines.append(
                f"- [{status}] {item.proposal.title} -> {', '.join(item.proposal.target_paths)} | {item.note}"
            )
        return "\n".join(lines)
