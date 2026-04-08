#!/usr/bin/env python3
"""Workflow mínimo: notebook → quiz JSON."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path


async def run(
    notebook_id: str,
    tenant_slug: str,
    output_path: str,
    difficulty : str = "medium",
) -> dict:
    import os

    if os.environ.get("NOTEBOOKLM_ENABLED", "").strip().lower() not in ("1", "true", "yes"):
        return {"success": False, "error": "NOTEBOOKLM_ENABLED is not true"}

    from notebooklm import NotebookLMClient

    try:
        from notebooklm.types import QuizDifficulty
    except ImportError:
        QuizDifficulty = None  # type: ignore[misc,assignment]

    diff_map = (
        {"easy": QuizDifficulty.EASY, "medium": QuizDifficulty.MEDIUM, "hard": QuizDifficulty.HARD}
        if QuizDifficulty
        else {}
    )
    diff = diff_map.get(difficulty.lower(), None)

    async with await NotebookLMClient.from_storage() as client:
        kwargs = {"difficulty": diff} if diff is not None else {}
        status = await client.artifacts.generate_quiz(notebook_id, **kwargs)
        final = await client.artifacts.wait_for_completion(
            notebook_id,
            status.task_id,
            timeout=300,
            poll_interval=5,
        )
        if not getattr(final, "is_complete", False):
            return {"success": False, "error": str(getattr(final, "status", "timeout"))}
        await client.artifacts.download_quiz(
            notebook_id,
            output_path,
            output_format="json",
        )
        raw = Path(output_path).read_text(encoding="utf-8")
        return {
            "success": True,
            "notebook_id": notebook_id,
            "quiz": json.loads(raw),
            "tenant_slug": tenant_slug,
        }


if __name__ == "__main__":
    nb, slug, outp = sys.argv[1], sys.argv[2], sys.argv[3]
    diff = sys.argv[4] if len(sys.argv) > 4 else "medium"
    print(json.dumps(asyncio.run(run(nb, slug, outp, diff))))
