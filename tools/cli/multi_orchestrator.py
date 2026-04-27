from __future__ import annotations

import json
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_PROVIDER_COMMANDS: dict[str, list[str]] = {
    "claude": ["claude", "--print"],
    "opencode": ["opencode", "--prompt"],
    "cursor": ["cursor-agent", "run"],
    "copilot": ["github-copilot-cli", "prompt"],
}


@dataclass(frozen=True)
class ProviderResult:
    provider: str
    success: bool
    exit_code: int
    output: str
    error: str


class MultiAgentOrchestrator:
    def __init__(self, workspace_root: Path) -> None:
        self._workspace_root = workspace_root

    def run_prompt(
        self,
        prompt: str,
        providers: list[str],
        timeout_seconds: int = 120,
    ) -> list[ProviderResult]:
        results: list[ProviderResult] = []
        with ThreadPoolExecutor(max_workers=max(1, len(providers))) as executor:
            future_map = {
                executor.submit(self._run_provider, provider, prompt, timeout_seconds): provider
                for provider in providers
            }
            for future in as_completed(future_map):
                results.append(future.result())
        return sorted(results, key=lambda item: item.provider)

    def _run_provider(self, provider: str, prompt: str, timeout_seconds: int) -> ProviderResult:
        command = DEFAULT_PROVIDER_COMMANDS.get(provider)
        if command is None:
            return ProviderResult(
                provider=provider,
                success=False,
                exit_code=127,
                output="",
                error=f"Proveedor no soportado: {provider}",
            )

        binary = command[0]
        if shutil.which(binary) is None:
            return ProviderResult(
                provider=provider,
                success=False,
                exit_code=127,
                output="",
                error=f"No encontrado en PATH: {binary}",
            )

        full_cmd = [*command, prompt]
        try:
            completed = subprocess.run(  # noqa: S603
                full_cmd,
                cwd=self._workspace_root,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return ProviderResult(
                provider=provider,
                success=False,
                exit_code=124,
                output="",
                error=f"Timeout ({timeout_seconds}s)",
            )
        except Exception as exc:  # noqa: BLE001
            return ProviderResult(
                provider=provider,
                success=False,
                exit_code=1,
                output="",
                error=str(exc),
            )

        return ProviderResult(
            provider=provider,
            success=completed.returncode == 0,
            exit_code=completed.returncode,
            output=(completed.stdout or "").strip(),
            error=(completed.stderr or "").strip(),
        )

    @staticmethod
    def to_markdown(results: list[ProviderResult], prompt: str) -> str:
        lines = ["# Multi-Agent Run", "", f"**Prompt:** {prompt}", ""]
        lines.append("| Provider | Status | Exit |")
        lines.append("|---|---:|---:|")
        for item in results:
            status = "OK" if item.success else "FAIL"
            lines.append(f"| {item.provider} | {status} | {item.exit_code} |")
        lines.append("")
        for item in results:
            lines.append(f"## {item.provider}")
            if item.success:
                lines.append("```text")
                lines.append(item.output[:4000] if item.output else "(sin salida)")
                lines.append("```")
            else:
                lines.append(f"- error: `{item.error or 'sin detalle'}`")
            lines.append("")
        return "\n".join(lines)

    @staticmethod
    def to_json(results: list[ProviderResult], prompt: str) -> str:
        payload: dict[str, Any] = {
            "prompt": prompt,
            "results": [
                {
                    "provider": item.provider,
                    "success": item.success,
                    "exit_code": item.exit_code,
                    "output": item.output,
                    "error": item.error,
                }
                for item in results
            ],
        }
        return json.dumps(payload, ensure_ascii=False, indent=2)
