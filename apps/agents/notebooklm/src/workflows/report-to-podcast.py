#!/usr/bin/env python3
"""Workflow: PDF de reporte → podcast + slides + infografía (LocalRank / tenants)."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path


async def report_to_content(
    pdf_path: str,
    tenant_slug: str,
    client_name: str,
    output_dir: str = "/tmp",
) -> dict:
    if os.environ.get("NOTEBOOKLM_ENABLED", "").strip().lower() not in ("1", "true", "yes"):
        return {
            "success": False,
            "error": "NOTEBOOKLM_ENABLED is not true",
        }

    from datetime import date

    from notebooklm import NotebookLMClient

    async def wait_done(cli, nb_id: str, status) -> None:
        final = await cli.artifacts.wait_for_completion(
            nb_id,
            status.task_id,
            timeout=300,
            poll_interval=5,
        )
        if not getattr(final, "is_complete", False):
            raise RuntimeError(getattr(final, "status", "incomplete"))

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    async with await NotebookLMClient.from_storage() as client:
        nb = await client.notebooks.create(f"{client_name} - Reporte {date.today()}")
        await client.sources.add_file(nb.id, Path(pdf_path))

        st_audio = await client.artifacts.generate_audio(
            nb.id,
            instructions="Resumen ejecutivo para el CEO, máximo 10 minutos",
        )
        st_slides = await client.artifacts.generate_slide_deck(nb.id)
        st_info = await client.artifacts.generate_infographic(
            nb.id,
            orientation="portrait",
        )

        await asyncio.gather(
            wait_done(client, nb.id, st_audio),
            wait_done(client, nb.id, st_slides),
            wait_done(client, nb.id, st_info),
        )

        podcast_path = str(out / f"{tenant_slug}-podcast.mp3")
        slides_path = str(out / f"{tenant_slug}-slides.pdf")
        infographic_path = str(out / f"{tenant_slug}-infographic.png")

        await client.artifacts.download_audio(nb.id, podcast_path)
        await client.artifacts.download_slide_deck(nb.id, slides_path)
        await client.artifacts.download_infographic(nb.id, infographic_path)

        return {
            "success": True,
            "notebook_id": nb.id,
            "outputs": {
                "podcast": podcast_path,
                "slides": slides_path,
                "infographic": infographic_path,
            },
            "tenant_slug": tenant_slug,
            "client_name": client_name,
        }


def main() -> None:
    pdf = sys.argv[1]
    slug = sys.argv[2]
    name = sys.argv[3]
    odir = sys.argv[4] if len(sys.argv) > 4 else "/tmp"
    result = asyncio.run(report_to_content(pdf, slug, name, odir))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
