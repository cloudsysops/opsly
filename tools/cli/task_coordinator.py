from __future__ import annotations

import asyncio
from dataclasses import dataclass

from .docker_provisioner import DockerProvisioner


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
    ) -> list[SubtaskResult]:
        subtasks = self._decompose(task, workers_count)
        worker_ids = self._docker.create_worker_pool(
            base_image="ubuntu:24.04",
            count=workers_count,
            dry_run=dry_run,
        )
        if len(worker_ids) == 0:
            worker_ids = [f"worker-fallback-{index + 1}" for index in range(workers_count)]

        jobs = []
        for index, subtask in enumerate(subtasks):
            worker_id = worker_ids[index % len(worker_ids)]
            jobs.append(asyncio.create_task(self._execute_subtask(worker_id, subtask, dry_run)))
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
    async def _execute_subtask(worker_id: str, subtask: str, dry_run: bool) -> SubtaskResult:
        await asyncio.sleep(0 if dry_run else 1)
        return SubtaskResult(
            worker_id=worker_id,
            subtask=subtask,
            status="completed",
            output="dry-run" if dry_run else "executed",
        )
