from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class EnqueueResult:
    ok: bool
    request_id: str
    job_id: str | None
    status: str
    detail: str


class OrchestratorBridge:
    """
    Puente ligero hacia el orchestrator HTTP interno.
    Endpoint actual soportado:
    - POST /internal/enqueue-ollama
    - POST /internal/enqueue-sandbox
    - GET /internal/openclaw-job?job_id=...
    - GET /internal/job/:jobId
    """

    def __init__(
        self,
        base_url: str | None = None,
        admin_token: str | None = None,
    ) -> None:
        self._base_url = (base_url or os.getenv("ORCHESTRATOR_BASE_URL") or "http://127.0.0.1:3011").rstrip(
            "/"
        )
        self._admin_token = admin_token or os.getenv("PLATFORM_ADMIN_TOKEN", "")

    def enqueue_ollama_job(
        self,
        *,
        tenant_slug: str,
        prompt: str,
        request_id: str,
        plan: str = "startup",
        agent_role: str = "executor",
        metadata: dict[str, Any] | None = None,
        dry_run: bool = True,
    ) -> EnqueueResult:
        payload: dict[str, Any] = {
            "tenant_slug": tenant_slug,
            "prompt": prompt,
            "task_type": "summarize",
            "plan": plan,
            "request_id": request_id,
            "agent_role": agent_role,
            "metadata": metadata or {},
        }
        if dry_run:
            return EnqueueResult(
                ok=True,
                request_id=request_id,
                job_id=None,
                status="dry-run",
                detail=f"Simulated enqueue to {self._base_url}/internal/enqueue-ollama",
            )

        if self._admin_token.strip() == "":
            return EnqueueResult(
                ok=False,
                request_id=request_id,
                job_id=None,
                status="blocked",
                detail="PLATFORM_ADMIN_TOKEN is required for non dry-run enqueue.",
            )

        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            url=f"{self._base_url}/internal/enqueue-ollama",
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._admin_token}",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=20) as response:  # noqa: S310
                raw = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8")
            return EnqueueResult(
                ok=False,
                request_id=request_id,
                job_id=None,
                status="failed",
                detail=f"HTTP {exc.code}: {detail}",
            )
        except Exception as exc:  # noqa: BLE001
            return EnqueueResult(
                ok=False,
                request_id=request_id,
                job_id=None,
                status="failed",
                detail=str(exc),
            )

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return EnqueueResult(
                ok=False,
                request_id=request_id,
                job_id=None,
                status="failed",
                detail=f"Invalid JSON response: {raw[:240]}",
            )

        job_id_raw = parsed.get("job_id")
        return EnqueueResult(
            ok=bool(parsed.get("ok")),
            request_id=str(parsed.get("request_id", request_id)),
            job_id=str(job_id_raw) if job_id_raw is not None else None,
            status="enqueued" if parsed.get("ok") else "failed",
            detail="Accepted by orchestrator." if parsed.get("ok") else json.dumps(parsed, ensure_ascii=False),
        )

    def get_job_status(self, *, job_id: str, dry_run: bool = True) -> dict[str, Any]:
        if dry_run:
            return {"job_id": job_id, "state": "dry-run", "service": "orchestrator"}
        if self._admin_token.strip() == "":
            return {"job_id": job_id, "state": "blocked", "error": "PLATFORM_ADMIN_TOKEN missing"}

        request = urllib.request.Request(  # noqa: S310
            url=f"{self._base_url}/internal/openclaw-job?job_id={job_id}",
            method="GET",
            headers={"Authorization": f"Bearer {self._admin_token}"},
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:  # noqa: S310
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            return {"job_id": job_id, "state": "error", "error": str(exc)}

    def enqueue_sandbox_job(
        self,
        *,
        tenant_slug: str,
        command: str,
        request_id: str,
        image: str = "alpine:latest",
        timeout: int = 300,
        allow_network: bool = False,
        dry_run: bool = True,
    ) -> EnqueueResult:
        payload: dict[str, Any] = {
            "tenant_slug": tenant_slug,
            "command": command,
            "image": image,
            "timeout": timeout,
            "allowNetwork": allow_network,
            "request_id": request_id,
        }
        if dry_run:
            return EnqueueResult(
                ok=True,
                request_id=request_id,
                job_id=None,
                status="dry-run",
                detail=f"Simulated enqueue to {self._base_url}/internal/enqueue-sandbox",
            )
        if self._admin_token.strip() == "":
            return EnqueueResult(
                ok=False,
                request_id=request_id,
                job_id=None,
                status="blocked",
                detail="PLATFORM_ADMIN_TOKEN is required for non dry-run enqueue.",
            )
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            url=f"{self._base_url}/internal/enqueue-sandbox",
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._admin_token}",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:  # noqa: S310
                raw = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8")
            return EnqueueResult(
                ok=False,
                request_id=request_id,
                job_id=None,
                status="failed",
                detail=f"HTTP {exc.code}: {detail}",
            )
        except Exception as exc:  # noqa: BLE001
            return EnqueueResult(
                ok=False,
                request_id=request_id,
                job_id=None,
                status="failed",
                detail=str(exc),
            )
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return EnqueueResult(
                ok=False,
                request_id=request_id,
                job_id=None,
                status="failed",
                detail=f"Invalid JSON response: {raw[:240]}",
            )
        job_id_raw = parsed.get("job_id")
        return EnqueueResult(
            ok=bool(parsed.get("success")),
            request_id=str(parsed.get("request_id", request_id)),
            job_id=str(job_id_raw) if job_id_raw is not None else None,
            status="enqueued" if parsed.get("success") else "failed",
            detail="Accepted by orchestrator." if parsed.get("success") else json.dumps(parsed, ensure_ascii=False),
        )

    def get_job_status_by_path(self, *, job_id: str, dry_run: bool = True) -> dict[str, Any]:
        if dry_run:
            return {"job_id": job_id, "state": "dry-run", "service": "orchestrator"}
        if self._admin_token.strip() == "":
            return {"job_id": job_id, "state": "blocked", "error": "PLATFORM_ADMIN_TOKEN missing"}
        request = urllib.request.Request(  # noqa: S310
            url=f"{self._base_url}/internal/job/{job_id}",
            method="GET",
            headers={"Authorization": f"Bearer {self._admin_token}"},
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:  # noqa: S310
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            return {"job_id": job_id, "state": "error", "error": str(exc)}
