#!/usr/bin/env python3
"""
VPS Docker housekeeping — Opsly.

Limpieza preventiva alineada con docs/01-development/RETENTION-POLICY.md.
Nunca ejecuta `docker system prune --volumes` (riesgo para redes/volúmenes de tenants).

Uso en VPS:
  python3 scripts/ops/vps_docker_housekeeping.py [--dry-run] [--light|--auto|--emergency] [--aggressive]

Desde Mac (vía SSH al repo en /opt/opsly):
  doppler run --project ops-intcloudsysops --config prd -- \\
    python3 scripts/ops/vps_docker_housekeeping.py --remote-ssh

  ./scripts/vps-docker-housekeeping.sh --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LOG_DIR = Path(os.environ.get("OPSLY_ROOT", "/opt/opsly")) / "logs"
DEFAULT_SSH = os.environ.get("VPS_SSH_TARGET", "vps-dragon@100.120.151.91")
DEFAULT_REMOTE_REPO = os.environ.get("OPSLY_ROOT", "/opt/opsly")

CRITICAL_CONTAINER_PATTERNS = (
    "peskids",
    "n8n_peskids",
    "uptime_peskids",
    "opsly_llm_gateway",
    "opsly_orchestrator",
    "infra-redis",
    "traefik",
    "infra-app",
)

PUBLIC_SMOKE_URLS = (
    "https://peskids.op-sly.com",
    "https://n8n-peskids.op-sly.com",
)


@dataclass
class DiskSnapshot:
    use_pct: int
    size: str
    used: str
    avail: str


@dataclass
class StepResult:
    name: str
    command: str
    ok: bool
    output: str


@dataclass
class HousekeepingReport:
    started_at: str
    mode: str
    dry_run: bool
    disk_before: DiskSnapshot | None = None
    disk_after: DiskSnapshot | None = None
    docker_df_before: str = ""
    docker_df_after: str = ""
    steps: list[StepResult] = field(default_factory=list)
    service_checks: dict[str, str] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(msg: str) -> None:
    print(msg, flush=True)


def parse_disk_usage() -> DiskSnapshot:
    proc = subprocess.run(
        ["df", "-h", "/"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"df failed: {proc.stderr.strip()}")
    line = proc.stdout.strip().splitlines()[-1]
    parts = line.split()
    if len(parts) < 6:
        raise RuntimeError(f"unexpected df output: {line}")
    use_raw = parts[4].rstrip("%")
    use_pct = int(use_raw) if use_raw.isdigit() else -1
    return DiskSnapshot(
        use_pct=use_pct,
        size=parts[1],
        used=parts[2],
        avail=parts[3],
    )


def docker_system_df() -> str:
    proc = subprocess.run(
        ["docker", "system", "df"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return proc.stderr.strip() or "docker system df failed"
    return proc.stdout.strip()


class HousekeepingRunner:
    def __init__(
        self,
        *,
        dry_run: bool,
        light: bool,
        aggressive: bool,
        emergency: bool,
        log_file: Path | None,
    ) -> None:
        self.dry_run = dry_run
        self.light = light
        self.aggressive = aggressive
        self.emergency = emergency
        self.log_file = log_file

    def _append_log(self, line: str) -> None:
        if self.log_file is None:
            return
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        with self.log_file.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")

    def run_shell(self, name: str, command: str) -> StepResult:
        if self.dry_run:
            msg = f"[DRY-RUN] {command}"
            log(msg)
            self._append_log(msg)
            return StepResult(name=name, command=command, ok=True, output="dry-run")

        log(f"→ {command}")
        self._append_log(f"[{utc_now_iso()}] {command}")
        proc = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=False,
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        output = output.strip()
        ok = proc.returncode == 0
        if output:
            log(output[:4000])
        self._append_log(output[:8000])
        return StepResult(name=name, command=command, ok=ok, output=output)

    def run_docker(self, name: str, args: Sequence[str]) -> StepResult:
        command = "docker " + " ".join(shlex.quote(a) for a in args)
        if self.dry_run:
            msg = f"[DRY-RUN] {command}"
            log(msg)
            self._append_log(msg)
            return StepResult(name=name, command=command, ok=True, output="dry-run")

        log(f"→ {command}")
        self._append_log(f"[{utc_now_iso()}] {command}")
        proc = subprocess.run(
            ["docker", *args],
            capture_output=True,
            text=True,
            check=False,
        )
        output = ((proc.stdout or "") + (proc.stderr or "")).strip()
        ok = proc.returncode == 0
        if output:
            log(output[:4000])
        self._append_log(output[:8000])
        return StepResult(name=name, command=command, ok=ok, output=output)

    def docker_steps(self) -> list[StepResult]:
        steps: list[StepResult] = []

        if self.emergency:
            steps.append(self.run_docker("builder-prune-all", ["builder", "prune", "-af"]))
            steps.append(
                self.run_docker("image-prune-unused", ["image", "prune", "-af"])
            )
        else:
            steps.append(
                self.run_docker(
                    "image-prune-7d",
                    ["image", "prune", "-a", "--filter", "until=168h", "-f"],
                )
            )
            steps.append(self.run_docker("builder-prune-all", ["builder", "prune", "-af"]))

        steps.append(self.run_docker("container-prune", ["container", "prune", "-f"]))
        steps.append(self.run_docker("network-prune", ["network", "prune", "-f"]))

        if self.aggressive:
            steps.append(self.run_docker("volume-prune", ["volume", "prune", "-f"]))

        return steps

    def system_steps(self) -> list[StepResult]:
        if self.light:
            return []

        steps: list[StepResult] = []
        steps.append(
            self.run_shell(
                "log-files-7d",
                "find /var/log -type f -name '*.log' -mtime +7 -delete 2>/dev/null || true",
            )
        )
        steps.append(
            self.run_shell(
                "log-gz-3d",
                "find /var/log -type f -name '*.gz' -mtime +3 -delete 2>/dev/null || true",
            )
        )
        steps.append(
            self.run_shell(
                "journal-vacuum",
                "journalctl --vacuum-time=3d 2>/dev/null || true",
            )
        )
        steps.append(
            self.run_shell(
                "tmp-7d",
                "find /tmp /var/tmp -type f -mtime +7 -delete 2>/dev/null || true",
            )
        )
        steps.append(self.run_shell("apt-clean", "apt-get clean -y 2>/dev/null || true"))
        steps.append(
            self.run_shell(
                "pip-cache",
                "rm -rf /root/.cache/pip/* 2>/dev/null || true",
            )
        )

        for container in ("infra-app-1", "infra-app-2", "opsly_portal", "opsly_admin"):
            steps.append(
                self.run_shell(
                    f"npm-cache-{container}",
                    f"docker exec {container} npm cache clean --force 2>/dev/null || true",
                )
            )

        return steps

    def verify_services(self) -> dict[str, str]:
        checks: dict[str, str] = {}
        proc = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}\t{{.Status}}"],
            capture_output=True,
            text=True,
            check=False,
        )
        running = proc.stdout if proc.returncode == 0 else ""
        for pattern in CRITICAL_CONTAINER_PATTERNS:
            if re.search(rf"(?m)^{re.escape(pattern)}", running) or pattern in running:
                checks[f"container:{pattern}"] = "ok"
            else:
                checks[f"container:{pattern}"] = "missing"

        if shutil.which("curl"):
            for url in PUBLIC_SMOKE_URLS:
                curl = subprocess.run(
                    [
                        "curl",
                        "-sS",
                        "-o",
                        "/dev/null",
                        "-w",
                        "%{http_code}",
                        "--max-time",
                        "15",
                        url,
                    ],
                    capture_output=True,
                    text=True,
                    check=False,
                )
                code = (curl.stdout or "000").strip()
                checks[f"http:{url}"] = code if curl.returncode == 0 else "error"

        return checks

    def run(self, mode: str) -> HousekeepingReport:
        report = HousekeepingReport(
            started_at=utc_now_iso(),
            mode=mode,
            dry_run=self.dry_run,
        )

        if not shutil.which("docker"):
            report.errors.append("docker not in PATH")
            return report

        try:
            report.disk_before = parse_disk_usage()
            report.docker_df_before = docker_system_df()
        except OSError as exc:
            report.errors.append(str(exc))
            return report

        log(
            f"Disk before: {report.disk_before.use_pct}% "
            f"({report.disk_before.used}/{report.disk_before.size}, "
            f"free {report.disk_before.avail})"
        )

        report.steps.extend(self.docker_steps())
        report.steps.extend(self.system_steps())

        try:
            report.disk_after = parse_disk_usage()
            report.docker_df_after = docker_system_df()
            log(
                f"Disk after: {report.disk_after.use_pct}% "
                f"(free {report.disk_after.avail})"
            )
        except OSError as exc:
            report.errors.append(str(exc))

        report.service_checks = self.verify_services()
        return report


def resolve_mode(
    *,
    light: bool,
    aggressive: bool,
    emergency: bool,
    auto: bool,
    disk: DiskSnapshot | None,
) -> str:
    if emergency:
        return "emergency"
    if aggressive:
        return "aggressive"
    if light:
        return "light"
    if auto and disk is not None and disk.use_pct >= 0:
        if disk.use_pct >= 95:
            return "aggressive"
        if disk.use_pct >= 85:
            return "emergency"
        if disk.use_pct >= 75:
            return "full"
        return "light"
    return "full"


def apply_mode_flags(
    mode: str,
) -> tuple[bool, bool, bool, bool]:
    if mode == "light":
        return True, False, False, False
    if mode == "emergency":
        return False, False, True, False
    if mode == "aggressive":
        return False, True, True, True
    return False, False, False, False


def notify_discord(title: str, body: str, level: str) -> None:
    script = REPO_ROOT / "scripts" / "utils" / "notify-discord.sh"
    if not script.is_file():
        log("notify-discord.sh not found; skip Discord")
        return
    subprocess.run(
        [str(script), title, body, level],
        check=False,
    )


def print_recommendations() -> None:
    lines = [
        "=== Automatizaciones recomendadas (Opsly) ===",
        "",
        "1. Disco + Docker (este script)",
        "   - Cron cada 6h: --light",
        "   - Diario 03:00 UTC: --auto --notify-discord",
        "   - Domingo 04:00 UTC: --aggressive (solo si revisas volúmenes huérfanos)",
        "   - Archivo: infra/cron/opsly-cleanup",
        "",
        "2. Alertas disco (ya existe)",
        "   - scripts/disk-alert.sh cada 5 min → Discord + limpieza en EMERGENCY (95%)",
        "",
        "3. Salud IA / OpenClaw",
        "   - scripts/validate-ai-health-all.sh (VPS + worker + Redis + gateway)",
        "   - doppler run -- ./scripts/agents-autopilot.sh (Hermes / cola Ollama)",
        "",
        "4. Smoke tenants producción",
        "   - Cron: curl peskids + n8n + portal health; encolar self-heal si 502/504",
        "   - POST /api/maia/self-heal en orchestrator (ya implementado)",
        "",
        "5. Secretos y tokens",
        "   - scripts/utils/check-tokens.sh semanal (Doppler prd)",
        "   - scripts/utils/check-secret-rotation.py (GitHub Actions secrets)",
        "",
        "6. Conocimiento / Brain",
        "   - npm run index-knowledge tras git pull en VPS",
        "   - SessionStart hook obsidian:sync (ya en .claude/hooks)",
        "",
        "7. Backups",
        "   - .github/workflows/backup.yml + verificar retención en docs/01-development/RETENTION-POLICY.md",
        "",
        "8. Imágenes GHCR",
        "   - Watchtower ya corre; evitar tags `:latest` huérfanas sin contenedor",
        "",
        "Comando unificado desde Mac:",
        "  ./scripts/vps-docker-housekeeping.sh --auto --notify-discord",
    ]
    print("\n".join(lines))


def ensure_remote_script(host: str) -> Path:
    remote_repo = DEFAULT_REMOTE_REPO
    remote_path = f"{remote_repo}/scripts/ops/vps_docker_housekeeping.py"
    check = subprocess.run(
        [
            "ssh",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=20",
            host,
            f"test -f {shlex.quote(remote_path)}",
        ],
        check=False,
    )
    if check.returncode == 0:
        return Path(remote_path)

    local_script = REPO_ROOT / "scripts" / "ops" / "vps_docker_housekeeping.py"
    if not local_script.is_file():
        raise FileNotFoundError(f"Local script missing: {local_script}")

    log(f"Syncing {local_script.name} → {host}:{remote_path}")
    subprocess.run(
        [
            "ssh",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=20",
            host,
            f"mkdir -p {shlex.quote(remote_repo)}/scripts/ops",
        ],
        check=False,
    )
    scp = subprocess.run(
        [
            "scp",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=20",
            str(local_script),
            f"{host}:{remote_path}",
        ],
        check=False,
    )
    if scp.returncode != 0:
        raise RuntimeError("scp failed; run git pull on VPS or deploy script manually")
    subprocess.run(
        [
            "ssh",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=20",
            host,
            f"chmod 755 {shlex.quote(remote_path)}",
        ],
        check=False,
    )
    return Path(remote_path)


def run_via_ssh(host: str, remote_args: list[str]) -> int:
    remote_repo = DEFAULT_REMOTE_REPO
    try:
        ensure_remote_script(host)
    except OSError as exc:
        log(f"ERROR: {exc}")
        return 2

    quoted = " ".join(shlex.quote(a) for a in remote_args)
    remote_cmd = (
        f"cd {shlex.quote(remote_repo)} && "
        f"python3 scripts/ops/vps_docker_housekeeping.py {quoted}"
    )
    proc = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=20", host, remote_cmd],
        check=False,
    )
    return proc.returncode


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="VPS Docker housekeeping (Opsly).")
    parser.add_argument("--dry-run", action="store_true", help="Show actions only.")
    parser.add_argument("--light", action="store_true", help="Docker prune only.")
    parser.add_argument(
        "--aggressive",
        action="store_true",
        help="Include docker volume prune (orphan volumes).",
    )
    parser.add_argument(
        "--emergency",
        action="store_true",
        help="Max Docker reclaim (all unused images + build cache).",
    )
    parser.add_argument(
        "--auto",
        action="store_true",
        help="Pick mode from disk usage (see RETENTION-POLICY).",
    )
    parser.add_argument(
        "--notify-discord",
        action="store_true",
        help="Send summary to Discord if DISCORD_WEBHOOK_URL is set.",
    )
    parser.add_argument("--json", action="store_true", help="Print JSON report on stdout.")
    parser.add_argument(
        "--log-file",
        default=str(DEFAULT_LOG_DIR / "vps-docker-housekeeping.log"),
        help="Append execution log to this file.",
    )
    parser.add_argument(
        "--remote-ssh",
        nargs="?",
        const=DEFAULT_SSH,
        default=None,
        metavar="USER@HOST",
        help="Run on VPS via SSH instead of locally.",
    )
    parser.add_argument(
        "--recommend",
        action="store_true",
        help="Print automation recommendations and exit.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)

    if args.recommend:
        print_recommendations()
        return 0

    forward_args: list[str] = []
    if args.dry_run:
        forward_args.append("--dry-run")
    if args.light:
        forward_args.append("--light")
    if args.aggressive:
        forward_args.append("--aggressive")
    if args.emergency:
        forward_args.append("--emergency")
    if args.auto:
        forward_args.append("--auto")
    if args.notify_discord:
        forward_args.append("--notify-discord")
    if args.json:
        forward_args.append("--json")
    if args.log_file:
        forward_args.extend(["--log-file", args.log_file])

    if args.remote_ssh is not None:
        host = args.remote_ssh or DEFAULT_SSH
        log(f"Remote SSH: {host}")
        return run_via_ssh(host, forward_args)

    disk_before: DiskSnapshot | None = None
    try:
        disk_before = parse_disk_usage()
    except OSError:
        disk_before = None

    mode = resolve_mode(
        light=args.light,
        aggressive=args.aggressive,
        emergency=args.emergency,
        auto=args.auto,
        disk=disk_before,
    )
    light, aggressive, emergency, _ = apply_mode_flags(mode)

    log_file = Path(args.log_file) if args.log_file else None
    runner = HousekeepingRunner(
        dry_run=args.dry_run,
        light=light,
        aggressive=aggressive,
        emergency=emergency,
        log_file=log_file,
    )

    log(f"Mode: {mode} (dry_run={args.dry_run})")
    report = runner.run(mode)

    if args.json:
        print(json.dumps(asdict(report), indent=2, default=str))

    failed = [s for s in report.steps if not s.ok]
    if failed:
        report.errors.append(f"{len(failed)} step(s) failed")

    if args.notify_discord and report.disk_before and report.disk_after:
        reclaimed = report.disk_before.use_pct - report.disk_after.use_pct
        body = (
            f"Modo {mode}. Disco {report.disk_before.use_pct}% → "
            f"{report.disk_after.use_pct}% (Δ {reclaimed} pp). "
            f"Libre: {report.disk_after.avail}."
        )
        level = "success" if reclaimed > 0 else "warning"
        notify_discord("VPS housekeeping", body, level)

    if report.errors:
        for err in report.errors:
            log(f"ERROR: {err}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
