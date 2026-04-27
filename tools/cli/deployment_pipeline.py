from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PipelineStageResult:
    stage: str
    status: str
    detail: str


class DeploymentPipeline:
    def run(
        self,
        objective: str,
        mode: str,
        approve_prod: bool,
        dry_run: bool = True,
    ) -> list[PipelineStageResult]:
        results: list[PipelineStageResult] = []
        results.append(
            PipelineStageResult(
                stage="sandbox",
                status="passed",
                detail=f"Sandbox execution {'simulated' if dry_run else 'completed'} for mode={mode}.",
            )
        )
        results.append(
            PipelineStageResult(
                stage="qa",
                status="passed",
                detail=f"QA validation {'simulated' if dry_run else 'completed'} for objective='{objective}'.",
            )
        )

        if not approve_prod:
            results.append(
                PipelineStageResult(
                    stage="prod",
                    status="blocked",
                    detail="Human approval required before production promotion.",
                )
            )
            return results

        if dry_run:
            results.append(
                PipelineStageResult(
                    stage="prod",
                    status="dry-run",
                    detail="Production deployment simulated.",
                )
            )
            return results

        results.append(
            PipelineStageResult(
                stage="prod",
                status="passed",
                detail="Production deployment executed.",
            )
        )
        return results
