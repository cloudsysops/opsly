from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ProvisionResult:
    tool: str
    image_tag: str
    status: str
    detail: str
    access_command: str | None = None


class DockerProvisioner:
    def __init__(self, workspace_root: Path) -> None:
        self._workspace_root = workspace_root
        self._templates_path = workspace_root / "tools" / "workspaces" / "docker-templates"
        self._templates_path.mkdir(parents=True, exist_ok=True)

    def provision_tool(self, tool_name: str, mode: str, dry_run: bool = True) -> ProvisionResult:
        image_tag = f"orchestrator_{mode}_{tool_name}:latest"
        dockerfile_path = self._ensure_dockerfile(tool_name=tool_name, mode=mode)
        if dry_run:
            return ProvisionResult(
                tool=tool_name,
                image_tag=image_tag,
                status="dry-run",
                detail=f"Simulated build using {dockerfile_path}",
                access_command=f"docker run --rm -it {image_tag} /bin/sh",
            )

        if shutil.which("docker") is None:
            return ProvisionResult(
                tool=tool_name,
                image_tag=image_tag,
                status="blocked",
                detail="docker CLI not found in PATH",
            )

        build_cmd = [
            "docker",
            "build",
            "-f",
            str(dockerfile_path),
            "-t",
            image_tag,
            str(self._templates_path),
        ]
        completed = subprocess.run(  # noqa: S603
            build_cmd,
            cwd=self._workspace_root,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout or "build failed").strip()[:400]
            return ProvisionResult(tool=tool_name, image_tag=image_tag, status="failed", detail=detail)

        return ProvisionResult(
            tool=tool_name,
            image_tag=image_tag,
            status="running",
            detail="Image built successfully",
            access_command=f"docker run --rm -it {image_tag} /bin/sh",
        )

    def create_worker_pool(self, base_image: str, count: int, dry_run: bool = True) -> list[str]:
        if dry_run:
            return [f"worker-sim-{index + 1}" for index in range(count)]
        if shutil.which("docker") is None:
            return []

        workers: list[str] = []
        for index in range(count):
            name = f"orchestrator_worker_{index + 1}"
            cmd = ["docker", "run", "-d", "--name", name, base_image, "sleep", "3600"]
            completed = subprocess.run(  # noqa: S603
                cmd,
                cwd=self._workspace_root,
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )
            if completed.returncode == 0:
                workers.append(name)
        return workers

    def cleanup_workers(self, worker_ids: list[str], dry_run: bool = True) -> None:
        if dry_run:
            return
        if shutil.which("docker") is None:
            return
        for worker_id in worker_ids:
            subprocess.run(  # noqa: S603
                ["docker", "rm", "-f", worker_id],
                cwd=self._workspace_root,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

    def _ensure_dockerfile(self, tool_name: str, mode: str) -> Path:
        file_path = self._templates_path / f"{tool_name}.Dockerfile"
        if file_path.exists():
            return file_path
        file_path.write_text(self._generated_template(tool_name, mode), encoding="utf-8")
        return file_path

    @staticmethod
    def _generated_template(tool_name: str, mode: str) -> str:
        payload = {
            "tool_name": tool_name,
            "mode": mode,
            "note": "Generated template - adjust packages as needed.",
        }
        metadata = json.dumps(payload, ensure_ascii=False)
        return "\n".join(
            [
                "FROM ubuntu:24.04",
                "RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*",
                f'LABEL orchestrator.meta=\'{metadata}\'',
                'CMD ["/bin/sh"]',
                "",
            ]
        )
