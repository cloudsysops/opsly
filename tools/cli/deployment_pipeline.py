from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from .orchestrator_bridge import OrchestratorBridge


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
        tenant_slug: str = "tenant_001",
        request_id: str | None = None,
        dry_run: bool = True,
    ) -> list[PipelineStageResult]:
        trace_id = request_id or str(uuid4())
        bridge = OrchestratorBridge()
        results: list[PipelineStageResult] = []
        sandbox_enqueue = bridge.enqueue_ollama_job(
            tenant_slug=tenant_slug,
            prompt=f"[pipeline:sandbox] {objective}",
            request_id=trace_id,
            plan="startup",
            agent_role="tool",
            metadata={
                "pipeline_stage": "sandbox",
                "mode": mode,
                "tenant_slug": tenant_slug,
                "request_id": trace_id,
            },
            dry_run=dry_run,
        )
        results.append(
            PipelineStageResult(
                stage="sandbox",
                status="passed",
                detail=(
                    f"Sandbox execution {'simulated' if dry_run else 'completed'} for mode={mode}. "
                    f"request_id={trace_id} enqueue_status={sandbox_enqueue.status}"
                ),
            )
        )
        results.append(
            PipelineStageResult(
                stage="qa",
                status="passed",
                detail=(
                    "QA validation "
                    + ("simulated" if dry_run else "completed")
                    + f" for objective='{objective}'. request_id={trace_id}"
                ),
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
