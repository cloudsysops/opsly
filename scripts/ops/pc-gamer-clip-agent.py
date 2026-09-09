#!/usr/bin/env python3
"""Safe PC Gamer clip-agent coordinator.

The canonical media pipeline remains Content Studio (TypeScript + FFmpeg).
This Python entrypoint owns local-job validation and orchestration only; it
never publishes or sends content externally.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Sequence

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm"}


def build_pipeline_command(repo_root: Path, tenant: str, media_file: Path) -> list[str]:
    return [
        "npx",
        "tsx",
        "scripts/content-os-cli.ts",
        "prepare-highlight",
        "--tenant",
        tenant,
        "--file",
        str(media_file),
    ]


def validate_media_file(media_file: Path) -> None:
    if not media_file.exists():
        raise ValueError(f"media file does not exist: {media_file}")
    if not media_file.is_file():
        raise ValueError(f"media path is not a file: {media_file}")
    if media_file.suffix.lower() not in VIDEO_EXTENSIONS:
        raise ValueError(f"unsupported media extension: {media_file.suffix}")
    if media_file.stat().st_size <= 0:
        raise ValueError(f"media file is empty: {media_file}")


def parse_project_id(stdout: str) -> str:
    lines = [line.strip() for line in stdout.splitlines() if line.strip()]
    if not lines:
        raise RuntimeError("Content Studio returned no project id")
    project_id = lines[-1]
    if any(char.isspace() for char in project_id):
        raise RuntimeError("Content Studio returned an invalid project id")
    return project_id


def run_clip_job(repo_root: Path, tenant: str, media_file: Path) -> dict[str, object]:
    validate_media_file(media_file)
    completed = subprocess.run(
        build_pipeline_command(repo_root, tenant, media_file),
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
        env={**os.environ, "OPSLY_CONTENT_PUBLISHING": "disabled"},
    )
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout).strip()[-2000:]
        raise RuntimeError(f"Content Studio failed ({completed.returncode}): {detail}")
    return {
        "ok": True,
        "agent": "pc-gamer-clip-agent",
        "provider": "local-content-studio",
        "tenant": tenant,
        "project_id": parse_project_id(completed.stdout),
        "source": str(media_file),
        "approval_required": True,
        "publishing": "disabled",
    }


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tenant", default="icso-gaming-tbd")
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[2],
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        result = run_clip_job(args.repo_root.resolve(), args.tenant, args.file.resolve())
    except (OSError, RuntimeError, ValueError) as error:
        print(json.dumps({"ok": False, "agent": "pc-gamer-clip-agent", "error": str(error)}))
        return 1
    print(json.dumps(result, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
