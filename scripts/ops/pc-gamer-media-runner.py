#!/usr/bin/env python3
"""Opsly PC Gamer media runner.

Standard-library only wrapper around ffmpeg/ffprobe/nvidia-smi.
No production credentials, no database access, no release authority.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def require_binary(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise SystemExit(f"required binary not found: {name}")
    return path


def run_json(cmd: list[str]) -> dict[str, Any]:
    proc = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return json.loads(proc.stdout)


def probe_gpu() -> dict[str, Any]:
    nvidia = shutil.which("nvidia-smi")
    if not nvidia:
        return {"available": False, "vendor": "unknown"}

    proc = subprocess.run(
        [
            nvidia,
            "--query-gpu=name,memory.total,memory.used,utilization.gpu,temperature.gpu",
            "--format=csv,noheader,nounits",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    line = proc.stdout.strip().splitlines()[0]
    name, mem_total, mem_used, util, temp = [part.strip() for part in line.split(",")]
    return {
        "available": True,
        "vendor": "nvidia",
        "model": name,
        "vram_total_mb": int(float(mem_total)),
        "vram_used_mb": int(float(mem_used)),
        "utilization_pct": float(util),
        "temperature_c": float(temp),
    }


def probe_media(path: Path) -> dict[str, Any]:
    ffprobe = require_binary("ffprobe")
    return run_json(
        [
            ffprobe,
            "-v",
            "error",
            "-show_format",
            "-show_streams",
            "-of",
            "json",
            str(path),
        ]
    )


def ensure_output(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def transcode(input_path: Path, output_path: Path, width: int | None) -> dict[str, Any]:
    ffmpeg = require_binary("ffmpeg")
    ensure_output(output_path)
    args = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(input_path),
    ]
    if width:
        args += ["-vf", f"scale={width}:-2"]
    args += [
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "21",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        str(output_path),
    ]
    subprocess.run(args, check=True)
    return {
        "action": "transcode",
        "input": str(input_path),
        "output": str(output_path),
        "probe": probe_media(output_path),
    }


def thumbnail(input_path: Path, output_path: Path, second: float) -> dict[str, Any]:
    ffmpeg = require_binary("ffmpeg")
    ensure_output(output_path)
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            str(second),
            "-i",
            str(input_path),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(output_path),
        ],
        check=True,
    )
    return {
        "action": "thumbnail",
        "input": str(input_path),
        "output": str(output_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Opsly PC Gamer media runner")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("gpu-probe")

    p_probe = sub.add_parser("media-probe")
    p_probe.add_argument("input", type=Path)

    p_transcode = sub.add_parser("transcode")
    p_transcode.add_argument("input", type=Path)
    p_transcode.add_argument("output", type=Path)
    p_transcode.add_argument("--width", type=int, default=None)

    p_thumb = sub.add_parser("thumbnail")
    p_thumb.add_argument("input", type=Path)
    p_thumb.add_argument("output", type=Path)
    p_thumb.add_argument("--second", type=float, default=1.0)

    args = parser.parse_args()

    if args.cmd == "gpu-probe":
        result = {"runtime": "pc-gamer-media", "gpu": probe_gpu()}
    elif args.cmd == "media-probe":
        result = {"runtime": "pc-gamer-media", "media": probe_media(args.input)}
    elif args.cmd == "transcode":
        result = transcode(args.input, args.output, args.width)
    elif args.cmd == "thumbnail":
        result = thumbnail(args.input, args.output, args.second)
    else:
        raise SystemExit("unsupported command")

    print(json.dumps(result, separators=(",", ":"), default=str))


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "media_command_failed",
                    "returncode": exc.returncode,
                }
            ),
            file=sys.stderr,
        )
        raise SystemExit(exc.returncode)
