from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ResearchResult:
    ok: bool
    status_code: int
    payload: dict[str, Any]
    error: str | None = None


class ResearchClient:
    def __init__(self, base_url: str | None = None) -> None:
        self._base_url = (base_url or os.getenv("LLM_GATEWAY_BASE_URL") or "http://127.0.0.1:3010").rstrip("/")

    def search(
        self,
        *,
        tenant_slug: str,
        query: str,
        max_results: int = 5,
        include_raw: bool = False,
    ) -> ResearchResult:
        payload = {
            "tenant_slug": tenant_slug,
            "query": query,
            "max_results": max_results,
            "include_raw": include_raw,
        }
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url=f"{self._base_url}/v1/search",
            method="POST",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as response:  # noqa: S310
                data = json.loads(response.read().decode("utf-8"))
                return ResearchResult(ok=True, status_code=response.status, payload=data)
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8")
            parsed: dict[str, Any]
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = {"raw": raw}
            return ResearchResult(
                ok=False,
                status_code=exc.code,
                payload=parsed,
                error=f"HTTP {exc.code}",
            )
        except Exception as exc:  # noqa: BLE001
            return ResearchResult(ok=False, status_code=0, payload={}, error=str(exc))
