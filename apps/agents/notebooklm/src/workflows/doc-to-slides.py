#!/usr/bin/env python3
"""Workflow mínimo: fuentes existentes en notebook → solo diapositivas PDF."""

from __future__ import annotations

import asyncio
import json
import sys


async def run(notebook_id: str, tenant_slug: str, output_path: str) -> dict:
    import os

    if os.environ.get("NOTEBOOKLM_ENABLED", "").strip().lower() not in ("1", "true", "yes"):
        return {"success": False, "error": "NOTEBOOKLM_ENABLED is not true"}

    from notebooklm import NotebookLMClient

    async with await NotebookLMClient.from_storage() as client:
        status = await client.artifacts.generate_slide_deck(notebook_id)
        final = await client.artifacts.wait_for_completion(
            notebook_id,
            status.task_id,
            timeout=300,
            poll_interval=5,
        )
        if not getattr(final, "is_complete", False):
            return {"success": False, "error": str(getattr(final, "status", "timeout"))}
        await client.artifacts.download_slide_deck(notebook_id, output_path)
        return {
            "success": True,
            "notebook_id": notebook_id,
            "output_path": output_path,
            "tenant_slug": tenant_slug,
        }


if __name__ == "__main__":
    nb, slug, outp = sys.argv[1], sys.argv[2], sys.argv[3]
    print(json.dumps(asyncio.run(run(nb, slug, outp))))
