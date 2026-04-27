from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ToolSpec:
    name: str
    verify_bin: str
    install_command: tuple[str, ...]
    category: str


@dataclass(frozen=True)
class ModeConfig:
    name: str
    description: str
    tools: tuple[ToolSpec, ...]
    environment_vars: dict[str, str]
    permissions: tuple[str, ...]


@dataclass(frozen=True)
class ToolInstallResult:
    tool: str
    status: str
    detail: str


@dataclass(frozen=True)
class ModeSwitchResult:
    from_mode: str | None
    to_mode: str
    missing_tools: tuple[str, ...]
    installed_tools: tuple[ToolInstallResult, ...]
    active_tools: tuple[str, ...]


class ModeManager:
    def __init__(self, workspace_root: Path) -> None:
        self._workspace_root = workspace_root
        self._state_path = workspace_root / "tools" / "workspaces" / "modes" / "state.json"
        self._sandbox_root = workspace_root / "tools" / "workspaces" / "modes" / "sandboxes"
        self._state_path.parent.mkdir(parents=True, exist_ok=True)
        self._sandbox_root.mkdir(parents=True, exist_ok=True)
        self._configs = self._build_mode_configs()
        self._ensure_state()

    def _ensure_state(self) -> None:
        if self._state_path.exists():
            return
        payload = {"current_mode": None, "history": []}
        self._state_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _read_state(self) -> dict[str, Any]:
        return json.loads(self._state_path.read_text(encoding="utf-8"))

    def _write_state(self, payload: dict[str, Any]) -> None:
        self._state_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _build_mode_configs(self) -> dict[str, ModeConfig]:
        return {
            "devops": ModeConfig(
                name="devops",
                description="Infraestructura, despliegues, operaciones.",
                tools=(
                    ToolSpec("docker", "docker", ("brew", "install", "--cask", "docker"), "runtime"),
                    ToolSpec("kubectl", "kubectl", ("brew", "install", "kubectl"), "k8s"),
                    ToolSpec("helm", "helm", ("brew", "install", "helm"), "k8s"),
                    ToolSpec("terraform", "terraform", ("brew", "install", "terraform"), "iac"),
                ),
                environment_vars={"TF_VAR_environment": "dev"},
                permissions=("infrastructure:write", "deploy:execute"),
            ),
            "developer": ModeConfig(
                name="developer",
                description="Desarrollo diario y refactoring.",
                tools=(
                    ToolSpec("git", "git", ("brew", "install", "git"), "scm"),
                    ToolSpec("node", "node", ("brew", "install", "node"), "runtime"),
                    ToolSpec("python", "python3", ("brew", "install", "python"), "runtime"),
                    ToolSpec("gh", "gh", ("brew", "install", "gh"), "scm"),
                ),
                environment_vars={"NODE_ENV": "development"},
                permissions=("code:write", "tests:execute"),
            ),
            "security": ModeConfig(
                name="security",
                description="Escaneo y hardening de seguridad.",
                tools=(
                    ToolSpec("nmap", "nmap", ("brew", "install", "nmap"), "scanner"),
                    ToolSpec(
                        "sqlmap",
                        "sqlmap",
                        ("python3", "-m", "pip", "install", "sqlmap"),
                        "scanner",
                    ),
                ),
                environment_vars={"SECURITY_SCAN_DEPTH": "deep"},
                permissions=("security:scan",),
            ),
            "doc": ModeConfig(
                name="doc",
                description="Documentación técnica y runbooks.",
                tools=(
                    ToolSpec("markdownlint", "markdownlint", ("brew", "install", "markdownlint-cli"), "docs"),
                ),
                environment_vars={"DOC_MODE": "true"},
                permissions=("docs:write",),
            ),
            "architect": ModeConfig(
                name="architect",
                description="Diseño de arquitectura y ADRs.",
                tools=(
                    ToolSpec("python", "python3", ("brew", "install", "python"), "runtime"),
                ),
                environment_vars={"ARCH_MODE": "true"},
                permissions=("design:write",),
            ),
            "hacker": ModeConfig(
                name="hacker",
                description="Investigación avanzada y debugging profundo.",
                tools=(
                    ToolSpec("rg", "rg", ("brew", "install", "ripgrep"), "search"),
                    ToolSpec("jq", "jq", ("brew", "install", "jq"), "data"),
                ),
                environment_vars={"HACKER_MODE": "true"},
                permissions=("analysis:advanced",),
            ),
        }

    def list_modes(self) -> list[ModeConfig]:
        return [self._configs[key] for key in sorted(self._configs.keys())]

    def current_mode(self) -> str | None:
        return self._read_state().get("current_mode")

    def mode_config(self, mode: str) -> ModeConfig:
        if mode not in self._configs:
            allowed = ", ".join(sorted(self._configs.keys()))
            raise ValueError(f"Modo no soportado: {mode}. Permitidos: {allowed}")
        return self._configs[mode]

    def missing_tools(self, mode: str) -> list[ToolSpec]:
        config = self.mode_config(mode)
        return [tool for tool in config.tools if shutil.which(tool.verify_bin) is None]

    def switch_mode(
        self,
        mode: str,
        auto_install: bool,
        dry_run: bool,
    ) -> ModeSwitchResult:
        previous = self.current_mode()
        config = self.mode_config(mode)
        missing = self.missing_tools(mode)
        installed: list[ToolInstallResult] = []
        if auto_install and len(missing) > 0:
            installed = self.install_tools(missing, dry_run=dry_run)

        state = self._read_state()
        state["current_mode"] = mode
        history = state.setdefault("history", [])
        history.append({"from": previous, "to": mode})
        self._write_state(state)

        return ModeSwitchResult(
            from_mode=previous,
            to_mode=mode,
            missing_tools=tuple(tool.name for tool in missing),
            installed_tools=tuple(installed),
            active_tools=tuple(tool.name for tool in config.tools),
        )

    def install_tools(self, tools: list[ToolSpec], dry_run: bool) -> list[ToolInstallResult]:
        results: list[ToolInstallResult] = []
        for tool in tools:
            sandbox_dir = self._sandbox_root / f"install_{tool.name}"
            sandbox_dir.mkdir(parents=True, exist_ok=True)
            if dry_run:
                results.append(
                    ToolInstallResult(
                        tool=tool.name,
                        status="dry-run",
                        detail="Instalación simulada (no se ejecutó comando).",
                    )
                )
                continue
            try:
                completed = subprocess.run(  # noqa: S603
                    list(tool.install_command),
                    cwd=sandbox_dir,
                    capture_output=True,
                    text=True,
                    timeout=120,
                    check=False,
                )
            except Exception as exc:  # noqa: BLE001
                results.append(ToolInstallResult(tool=tool.name, status="error", detail=str(exc)))
                continue
            if completed.returncode == 0:
                results.append(ToolInstallResult(tool=tool.name, status="installed", detail="OK"))
            else:
                detail = (completed.stderr or completed.stdout or "unknown failure").strip()
                results.append(ToolInstallResult(tool=tool.name, status="failed", detail=detail[:240]))
        return results

    @staticmethod
    def to_json(result: ModeSwitchResult) -> str:
        return json.dumps(asdict(result), ensure_ascii=False, indent=2)
