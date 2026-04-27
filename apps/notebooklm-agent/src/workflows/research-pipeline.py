#!/usr/bin/env python3
"""Investigación web → importar fuentes al notebook."""

from __future__ import annotations

import asyncio
import json
import sys


async def run(
    notebook_id: str,
    query: str,
    tenant_slug: str,
    mode: str = "fast",
    max_sources: int = 5,
) -> dict:
    import os

    if os.environ.get("NOTEBOOKLM_ENABLED", "").strip().lower() not in ("1", "true", "yes"):
        return {"success": False, "error": "NOTEBOOKLM_ENABLED is not true"}

    from notebooklm import NotebookLMClient

    async with await NotebookLMClient.from_storage() as client:
        start = await client.research.start(notebook_id, query, source="web", mode=mode)
        task_id = start.get("task_id", "")
        while True:
            st = await client.research.poll(notebook_id)
            if st.get("status") == "completed":
                srcs = st.get("sources") or []
                imported = []
                if srcs and task_id:
                    imported = await client.research.import_sources(
                        notebook_id,
                        task_id,
                        srcs[:max_sources],
                    )
                return {
                    "success": True,
                    "notebook_id": notebook_id,
                    "sources_added": len(imported),
                    "tenant_slug": tenant_slug,
                }
            await asyncio.sleep(10)


if __name__ == "__main__":
    nb, q, slug = sys.argv[1], sys.argv[2], sys.argv[3]
    mode = sys.argv[4] if len(sys.argv) > 4 else "fast"
    print(json.dumps(asyncio.run(run(nb, q, slug, mode))))
