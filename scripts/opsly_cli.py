#!/usr/bin/env python3
"""
Opsly Python CLI automation helpers.

Focused on operational automations that are frequently needed from terminal:
- health check
- deploy run status/watch
- secret rotation validation
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import sys
from typing import Any


def run_cmd(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, capture_output=True, check=check)


def cmd_health(args: argparse.Namespace) -> int:
    curl_cmd = ["curl", "-sfk", f"{args.api_url.rstrip('/')}/api/health"]
    try:
        result = run_cmd(curl_cmd, check=True)
    except subprocess.CalledProcessError as exc:
        print("ERROR: health check failed.", file=sys.stderr)
        print(exc.stderr or exc.stdout, file=sys.stderr)
        return 1

    raw = result.stdout.strip()
    if args.json:
        print(raw)
        return 0

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        print(raw)
        return 0

    status = payload.get("status", "unknown")
    checks = payload.get("checks", {})
    print(f"health: {status}")
    if isinstance(checks, dict):
        for key, value in checks.items():
            print(f"- {key}: {value}")
    return 0


def cmd_deploy_status(args: argparse.Namespace) -> int:
    cmd = [
        "gh",
        "api",
        f"repos/{args.repo}/actions/runs/{args.run_id}",
        "--jq",
        "{status:.status,conclusion:.conclusion,event:.event,head_branch:.head_branch,updated:.updated_at,url:.html_url}",
    ]
    try:
        result = run_cmd(cmd, check=True)
    except subprocess.CalledProcessError as exc:
        print("ERROR: cannot read deploy run.", file=sys.stderr)
        print(exc.stderr or exc.stdout, file=sys.stderr)
        return 2
    print(result.stdout.strip())
    return 0


def cmd_deploy_watch(args: argparse.Namespace) -> int:
    cmd = ["gh", "run", "watch", str(args.run_id), "--exit-status"]
    try:
        subprocess.run(cmd, check=True)
        return 0
    except subprocess.CalledProcessError as exc:
        # gh already prints details; return non-zero to make this CI-friendly.
        return exc.returncode or 1


def cmd_deploy_last(args: argparse.Namespace) -> int:
    cmd = [
        "gh",
        "run",
        "list",
        "--workflow",
        args.workflow,
        "--limit",
        "1",
        "--json",
        "databaseId,status,conclusion,url,headBranch,createdAt,event",
    ]
    try:
        result = run_cmd(cmd, check=True)
    except subprocess.CalledProcessError as exc:
        print("ERROR: cannot list workflow runs.", file=sys.stderr)
        print(exc.stderr or exc.stdout, file=sys.stderr)
        return 2

    runs: list[dict[str, Any]] = json.loads(result.stdout)
    if not runs:
        print("ERROR: no runs found for workflow.", file=sys.stderr)
        return 1
    run = runs[0]
    print(
        json.dumps(
            {
                "run_id": run.get("databaseId"),
                "status": run.get("status"),
                "conclusion": run.get("conclusion"),
                "branch": run.get("headBranch"),
                "event": run.get("event"),
                "created_at": run.get("createdAt"),
                "url": run.get("url"),
            },
            indent=2,
        )
    )
    return 0


def cmd_secret_rotation(args: argparse.Namespace) -> int:
    checker_cmd = [
        "python3",
        "scripts/utils/check-secret-rotation.py",
        "--repo",
        args.repo,
        "--max-age-days",
        str(args.max_age_days),
        "--warn-age-days",
        str(args.warn_age_days),
    ]
    if args.secrets:
        checker_cmd.extend(["--secrets", *args.secrets])
    if args.json:
        checker_cmd.append("--json")

    try:
        # preserve exit code semantics from checker script.
        completed = subprocess.run(checker_cmd, check=False)
        return completed.returncode
    except Exception as exc:  # pragma: no cover - defensive
        print(f"ERROR: failed to run secret checker: {exc}", file=sys.stderr)
        return 2


def discover_scripts(root: Path) -> list[Path]:
    found: list[Path] = []
    for pattern in ("*.sh", "*.py", "*.js", "*.mjs"):
        found.extend(root.glob(pattern))
    for sub in ("infra", "deploy", "tenant", "ops", "utils", "ci"):
        subdir = root / sub
        if not subdir.exists():
            continue
        for pattern in ("*.sh", "*.py", "*.js", "*.mjs"):
            found.extend(subdir.glob(pattern))
    return sorted(set(found))


def cmd_scripts_list(args: argparse.Namespace) -> int:
    root = Path("scripts").resolve()
    if not root.exists():
        print("ERROR: scripts directory not found.", file=sys.stderr)
        return 2

    scripts = discover_scripts(root)
    if args.category:
        scripts = [
            p
            for p in scripts
            if (args.category == "root" and p.parent == root) or p.parent.name == args.category
        ]

    if args.json:
        payload = [
            {
                "name": p.stem,
                "category": "root" if p.parent == root else p.parent.name,
                "path": str(p.relative_to(root.parent)),
            }
            for p in scripts
        ]
        print(json.dumps(payload, indent=2))
        return 0

    for p in scripts:
        category = "root" if p.parent == root else p.parent.name
        print(f"{p.stem:35} {category:10} {p.relative_to(root.parent)}")
    return 0


def resolve_script(root: Path, token: str) -> Path | None:
    candidate = Path(token)
    if candidate.exists():
        return candidate.resolve()

    for p in discover_scripts(root):
        if p.name == token or p.stem == token:
            return p
    return None


def runner_for_script(path: Path) -> list[str]:
    suffix = path.suffix.lower()
    if suffix == ".sh":
        return ["bash", str(path)]
    if suffix == ".py":
        return ["python3", str(path)]
    if suffix in (".js", ".mjs"):
        return ["node", str(path)]
    raise ValueError(f"Unsupported script type: {suffix}")


def cmd_script_run(args: argparse.Namespace) -> int:
    root = Path("scripts").resolve()
    script = resolve_script(root, args.script)
    if script is None:
        print(f"ERROR: script '{args.script}' not found.", file=sys.stderr)
        return 2

    try:
        cmd = runner_for_script(script)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    passthrough = list(args.args or [])
    if passthrough and passthrough[0] == "--":
        passthrough = passthrough[1:]
    cmd.extend(passthrough)
    print(f"Running: {' '.join(cmd)}")
    completed = subprocess.run(cmd, check=False)
    return int(completed.returncode)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Opsly Python CLI automations.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_health = sub.add_parser("health", help="Check API health endpoint.")
    p_health.add_argument("--api-url", default="https://api.ops.smiletripcare.com")
    p_health.add_argument("--json", action="store_true", help="Print raw JSON response.")
    p_health.set_defaults(func=cmd_health)

    p_last = sub.add_parser("deploy-last", help="Show latest workflow run metadata.")
    p_last.add_argument("--workflow", default="deploy.yml", help="Workflow file name.")
    p_last.set_defaults(func=cmd_deploy_last)

    p_deploy_status = sub.add_parser("deploy-status", help="Show a specific deploy run status.")
    p_deploy_status.add_argument("run_id", type=int)
    p_deploy_status.add_argument("--repo", default="cloudsysops/opsly")
    p_deploy_status.set_defaults(func=cmd_deploy_status)

    p_deploy_watch = sub.add_parser("deploy-watch", help="Watch a deploy run until completion.")
    p_deploy_watch.add_argument("run_id", type=int)
    p_deploy_watch.set_defaults(func=cmd_deploy_watch)

    p_secrets = sub.add_parser("secret-rotation", help="Validate secret rotation age policy.")
    p_secrets.add_argument("--repo", default="cloudsysops/opsly")
    p_secrets.add_argument("--max-age-days", type=int, default=90)
    p_secrets.add_argument("--warn-age-days", type=int, default=75)
    p_secrets.add_argument("--json", action="store_true")
    p_secrets.add_argument("--secrets", nargs="*", default=[])
    p_secrets.set_defaults(func=cmd_secret_rotation)

    p_scripts_list = sub.add_parser("scripts-list", help="List automation scripts.")
    p_scripts_list.add_argument(
        "--category",
        choices=["root", "infra", "deploy", "tenant", "ops", "utils", "ci"],
    )
    p_scripts_list.add_argument("--json", action="store_true")
    p_scripts_list.set_defaults(func=cmd_scripts_list)

    p_script_run = sub.add_parser("script-run", help="Run existing script by name/path.")
    p_script_run.add_argument("script", help="Script stem/name/path.")
    p_script_run.add_argument("args", nargs=argparse.REMAINDER, help="Pass-through script args.")
    p_script_run.set_defaults(func=cmd_script_run)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
