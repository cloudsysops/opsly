from __future__ import annotations

import asyncio
from dataclasses import dataclass
from uuid import uuid4

from .docker_provisioner import DockerProvisioner
from .orchestrator_bridge import OrchestratorBridge


@dataclass(frozen=True)
class SubtaskResult:
    worker_id: str
    subtask: str
    status: str
    output: str


class TaskCoordinator:
    def __init__(self, docker_provisioner: DockerProvisioner) -> None:
        self._docker = docker_provisioner

    async def execute_complex_task(
        self,
        task: str,
        workers_count: int = 3,
        dry_run: bool = True,
        tenant_slug: str = "tenant_001",
    ) -> list[SubtaskResult]:
        request_id = str(uuid4())
        subtasks = self._decompose(task, workers_count)
        worker_ids = self._docker.create_worker_pool(
            base_image="ubuntu:24.04",
            count=workers_count,
            dry_run=dry_run,
        )
        if len(worker_ids) == 0:
            worker_ids = [f"worker-fallback-{index + 1}" for index in range(workers_count)]

        jobs = []
        bridge = OrchestratorBridge()
        for index, subtask in enumerate(subtasks):
            worker_id = worker_ids[index % len(worker_ids)]
            jobs.append(
                asyncio.create_task(
                    self._execute_subtask(
                        worker_id=worker_id,
                        subtask=subtask,
                        dry_run=dry_run,
                        bridge=bridge,
                        request_id=request_id,
                        tenant_slug=tenant_slug,
                    )
                )
            )
        results = await asyncio.gather(*jobs)
        self._docker.cleanup_workers(worker_ids, dry_run=dry_run)
        return results

    @staticmethod
    def _decompose(task: str, workers_count: int) -> list[str]:
        base = [
            "analizar requerimientos",
            "ejecutar tarea principal",
            "validar resultados",
            "generar resumen final",
        ]
        needed = max(1, workers_count)
        return [f"{base[index % len(base)]}: {task}" for index in range(needed)]

    @staticmethod
    async def _execute_subtask(
        worker_id: str,
        subtask: str,
        dry_run: bool,
        bridge: OrchestratorBridge,
        request_id: str,
        tenant_slug: str,
    ) -> SubtaskResult:
        await asyncio.sleep(0 if dry_run else 1)
        enqueue_result = bridge.enqueue_ollama_job(
            tenant_slug=tenant_slug,
            prompt=subtask,
            request_id=request_id,
            plan="startup",
            agent_role="tool",
            metadata={
                "pipeline_stage": "workers",
                "worker_id": worker_id,
                "tenant_slug": tenant_slug,
                "request_id": request_id,
            },
            dry_run=dry_run,
        )
        return SubtaskResult(
            worker_id=worker_id,
            subtask=subtask,
            status="completed",
            output=f"{'dry-run' if dry_run else 'executed'} | enqueue={enqueue_result.status}",
        )
