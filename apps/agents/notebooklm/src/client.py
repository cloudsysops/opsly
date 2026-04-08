#!/usr/bin/env python3
"""NotebookLM Agent para Opsly — cliente notebooklm-py (API no oficial)."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path


def _enabled() -> bool:
    return os.environ.get("NOTEBOOKLM_ENABLED", "").strip().lower() in ("1", "true", "yes")


async def _wait_done(client, notebook_id: str, status, timeout: int = 300) -> None:
    final = await client.artifacts.wait_for_completion(
        notebook_id,
        status.task_id,
        timeout=timeout,
        poll_interval=5,
    )
    if not getattr(final, "is_complete", False):
        raise RuntimeError(getattr(final, "status", "generation incomplete"))


def _quiz_difficulty(command: dict):
    try:
        from notebooklm.types import QuizDifficulty
    except ImportError:
        return None
    diff = str(command.get("difficulty", "medium")).lower()
    mapping = {
        "easy": QuizDifficulty.EASY,
        "medium": QuizDifficulty.MEDIUM,
        "hard": QuizDifficulty.HARD,
    }
    return mapping.get(diff, QuizDifficulty.MEDIUM)


async def process_command(command: dict) -> dict:
    if not _enabled():
        return {
            "success": False,
            "error": "NOTEBOOKLM_ENABLED is not true; habilitar en Doppler/env tras login Google.",
        }

    action = command.get("action")
    tenant_slug = command.get("tenant_slug", "unknown")

    try:
        from notebooklm import NotebookLMClient
    except ImportError as exc:
        return {
            "success": False,
            "error": f"notebooklm-py no instalado: {exc}",
        }

    async with await NotebookLMClient.from_storage() as client:
        if action == "create_notebook":
            name = command.get("name", "Notebook")
            nb = await client.notebooks.create(f"{tenant_slug} - {name}")
            return {"success": True, "notebook_id": nb.id, "tenant_slug": tenant_slug}

        if action == "add_source":
            nb_id = command["notebook_id"]
            source_type = command.get("source_type", "url")
            if source_type == "url":
                await client.sources.add_url(nb_id, command["url"])
            elif source_type == "text":
                await client.sources.add_text(
                    nb_id,
                    command.get("title", "Documento"),
                    command["text"],
                )
            elif source_type == "file":
                path = Path(command["path"])
                await client.sources.add_file(nb_id, path)
            else:
                return {"success": False, "error": f"source_type: {source_type}"}
            return {"success": True, "notebook_id": nb_id}

        if action == "generate_podcast":
            nb_id = command["notebook_id"]
            output_path = command.get("output_path", f"/tmp/{tenant_slug}-podcast.mp3")
            instructions = command.get("instructions", "")
            status = await client.artifacts.generate_audio(
                nb_id,
                instructions=instructions or None,
            )
            await _wait_done(client, nb_id, status)
            await client.artifacts.download_audio(nb_id, output_path)
            return {
                "success": True,
                "output_path": output_path,
                "tenant_slug": tenant_slug,
            }

        if action == "generate_slides":
            nb_id = command["notebook_id"]
            output_path = command.get("output_path", f"/tmp/{tenant_slug}-slides.pdf")
            status = await client.artifacts.generate_slide_deck(nb_id)
            await _wait_done(client, nb_id, status)
            await client.artifacts.download_slide_deck(nb_id, output_path)
            return {
                "success": True,
                "output_path": output_path,
                "tenant_slug": tenant_slug,
            }

        if action == "generate_quiz":
            nb_id = command["notebook_id"]
            diff = _quiz_difficulty(command)
            if diff is not None:
                status = await client.artifacts.generate_quiz(nb_id, difficulty=diff)
            else:
                status = await client.artifacts.generate_quiz(nb_id)
            await _wait_done(client, nb_id, status)
            out_json = command.get("quiz_output_path", f"/tmp/{tenant_slug}-quiz.json")
            await client.artifacts.download_quiz(nb_id, out_json, output_format="json")
            raw = Path(out_json).read_text(encoding="utf-8")
            return {
                "success": True,
                "quiz": json.loads(raw),
                "tenant_slug": tenant_slug,
                "quiz_path": out_json,
            }

        if action == "generate_mindmap":
            nb_id = command["notebook_id"]
            out_path = command.get("output_path", f"/tmp/{tenant_slug}-mindmap.json")
            result = await client.artifacts.generate_mind_map(nb_id)
            if hasattr(result, "task_id"):
                await _wait_done(client, nb_id, result)
            elif isinstance(result, dict) and result.get("task_id"):

                class _St:
                    pass

                st = _St()
                st.task_id = result["task_id"]
                await _wait_done(client, nb_id, st)
            await client.artifacts.download_mind_map(nb_id, out_path)
            return {"success": True, "output_path": out_path, "tenant_slug": tenant_slug}

        if action == "generate_infographic":
            nb_id = command["notebook_id"]
            output_path = command.get(
                "output_path",
                f"/tmp/{tenant_slug}-infographic.png",
            )
            orientation = command.get("orientation", "portrait")
            status = await client.artifacts.generate_infographic(
                nb_id,
                orientation=orientation,
            )
            await _wait_done(client, nb_id, status)
            await client.artifacts.download_infographic(nb_id, output_path)
            return {
                "success": True,
                "output_path": output_path,
                "tenant_slug": tenant_slug,
            }

        if action == "ask":
            nb_id = command["notebook_id"]
            result = await client.chat.ask(nb_id, command["question"])
            return {
                "success": True,
                "answer": result.answer,
                "tenant_slug": tenant_slug,
            }

        if action == "research":
            nb_id = command["notebook_id"]
            query = command["query"]
            mode = command.get("mode", "fast")
            source = command.get("research_source", "web")
            start = await client.research.start(nb_id, query, source=source, mode=mode)
            task_id = start.get("task_id", "")
            imported = 0
            if command.get("auto_import"):
                while True:
                    st = await client.research.poll(nb_id)
                    if st.get("status") == "completed":
                        srcs = st.get("sources") or []
                        if srcs and task_id:
                            imp = await client.research.import_sources(
                                nb_id, task_id, srcs[:10]
                            )
                            imported = len(imp)
                        break
                    await asyncio.sleep(10)
            else:
                while True:
                    st = await client.research.poll(nb_id)
                    if st.get("status") == "completed":
                        break
                    await asyncio.sleep(10)
            return {
                "success": True,
                "sources_added": imported,
                "tenant_slug": tenant_slug,
                "task_id": task_id,
            }

        return {"success": False, "error": f"Acción desconocida: {action}"}


def main() -> None:
    raw = sys.stdin.read() if len(sys.argv) < 2 else sys.argv[1]
    command = json.loads(raw)
    result = asyncio.run(process_command(command))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
