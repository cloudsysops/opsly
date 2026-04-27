#!/usr/bin/env python3
"""
Check GitHub Actions secret rotation age.

Usage examples:
  python3 scripts/utils/check-secret-rotation.py \
    --repo cloudsysops/opsly \
    --max-age-days 90 \
    --warn-age-days 75 \
    --secrets TAILSCALE_AUTHKEY DOPPLER_TOKEN_PRD DOPPLER_TOKEN_STG

  # Check all repository secrets (no filter)
  python3 scripts/utils/check-secret-rotation.py --repo cloudsysops/opsly
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
import sys
from dataclasses import dataclass
from typing import Any


@dataclass
class SecretAge:
    name: str
    updated_at: dt.datetime
    age_days: int
    status: str  # ok | warn | expired


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate GitHub Actions secret rotation age.")
    parser.add_argument(
        "--repo",
        default="cloudsysops/opsly",
        help="GitHub repo in owner/name format (default: cloudsysops/opsly).",
    )
    parser.add_argument(
        "--max-age-days",
        type=int,
        default=90,
        help="Fail if a secret is older than this number of days (default: 90).",
    )
    parser.add_argument(
        "--warn-age-days",
        type=int,
        default=75,
        help="Warn if a secret is older than this number of days (default: 75).",
    )
    parser.add_argument(
        "--secrets",
        nargs="*",
        default=[],
        help="Optional list of secret names to check. If omitted, checks all repo secrets.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print JSON output instead of a text table.",
    )
    return parser.parse_args()


def run_gh_api(repo: str) -> dict[str, Any]:
    cmd = [
        "gh",
        "api",
        f"repos/{repo}/actions/secrets?per_page=100",
    ]
    try:
        output = subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as exc:
        print("ERROR: failed to call gh api for repository secrets.", file=sys.stderr)
        print(exc.output, file=sys.stderr)
        raise SystemExit(2) from exc

    try:
        payload = json.loads(output)
    except json.JSONDecodeError as exc:
        print("ERROR: invalid JSON from gh api.", file=sys.stderr)
        print(output, file=sys.stderr)
        raise SystemExit(2) from exc

    return payload


def parse_updated_at(ts: str) -> dt.datetime:
    # GitHub format: 2026-04-26T23:42:43Z
    return dt.datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)


def evaluate_secrets(
    payload: dict[str, Any],
    selected_names: set[str],
    warn_age_days: int,
    max_age_days: int,
) -> tuple[list[SecretAge], list[str]]:
    now = dt.datetime.now(dt.timezone.utc)
    rows: list[SecretAge] = []

    secrets: list[dict[str, Any]] = payload.get("secrets", [])
    existing_names = {item.get("name", "") for item in secrets}

    for item in secrets:
        name = item.get("name", "")
        if selected_names and name not in selected_names:
            continue

        updated_raw = item.get("updated_at")
        if not updated_raw:
            continue
        updated_at = parse_updated_at(updated_raw)
        age_days = int((now - updated_at).total_seconds() // 86400)

        status = "ok"
        if age_days > max_age_days:
            status = "expired"
        elif age_days > warn_age_days:
            status = "warn"

        rows.append(
            SecretAge(
                name=name,
                updated_at=updated_at,
                age_days=age_days,
                status=status,
            )
        )

    missing = sorted(name for name in selected_names if name not in existing_names)
    rows.sort(key=lambda row: row.age_days, reverse=True)
    return rows, missing


def print_table(rows: list[SecretAge], missing: list[str], max_age_days: int, warn_age_days: int) -> None:
    print(f"Rotation policy: warn>{warn_age_days}d fail>{max_age_days}d")
    print("status   age_days  updated_at            secret")
    print("-------  --------  --------------------  ------------------------------")
    for row in rows:
        updated = row.updated_at.strftime("%Y-%m-%d %H:%M UTC")
        print(f"{row.status:7}  {row.age_days:8}  {updated:20}  {row.name}")
    if missing:
        print("\nMissing secrets:")
        for name in missing:
            print(f"- {name}")


def main() -> int:
    args = parse_args()
    if args.warn_age_days >= args.max_age_days:
        print("ERROR: --warn-age-days must be less than --max-age-days.", file=sys.stderr)
        return 2

    payload = run_gh_api(args.repo)
    selected_names = set(args.secrets)
    rows, missing = evaluate_secrets(
        payload=payload,
        selected_names=selected_names,
        warn_age_days=args.warn_age_days,
        max_age_days=args.max_age_days,
    )

    expired = [row for row in rows if row.status == "expired"]
    warned = [row for row in rows if row.status == "warn"]

    if args.json:
        print(
            json.dumps(
                {
                    "repo": args.repo,
                    "warn_age_days": args.warn_age_days,
                    "max_age_days": args.max_age_days,
                    "expired_count": len(expired),
                    "warn_count": len(warned),
                    "missing_count": len(missing),
                    "rows": [
                        {
                            "name": row.name,
                            "updated_at": row.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "age_days": row.age_days,
                            "status": row.status,
                        }
                        for row in rows
                    ],
                    "missing": missing,
                },
                indent=2,
            )
        )
    else:
        print_table(rows, missing, args.max_age_days, args.warn_age_days)

    # Exit code semantics:
    # 0 = all good
    # 1 = warning/expired/missing (action required)
    if expired or warned or missing:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
