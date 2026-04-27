from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class MemorySnapshot:
    hot_facts: list[str]
    warm_lessons: list[dict[str, str]]
    cold_events: list[dict[str, Any]]


class MemoryStore:
    def __init__(self, workspace_root: Path, tenant_id: str) -> None:
        base = workspace_root / "tools" / "workspaces" / tenant_id / "memory"
        self._hot_path = base / "hot.json"
        self._warm_path = base / "warm.json"
        self._cold_path = base / "cold.json"
        base.mkdir(parents=True, exist_ok=True)
        self._ensure_files()

    def _ensure_files(self) -> None:
        defaults = {
            self._hot_path: {"facts": []},
            self._warm_path: {"lessons": []},
            self._cold_path: {"events": []},
        }
        for path, payload in defaults.items():
            if not path.exists():
                path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _read_json(self, path: Path) -> dict[str, Any]:
        return json.loads(path.read_text(encoding="utf-8"))

    def _write_json(self, path: Path, payload: dict[str, Any]) -> None:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def snapshot(self) -> MemorySnapshot:
        hot = self._read_json(self._hot_path).get("facts", [])
        warm = self._read_json(self._warm_path).get("lessons", [])
        cold = self._read_json(self._cold_path).get("events", [])
        return MemorySnapshot(hot_facts=hot, warm_lessons=warm, cold_events=cold)

    def add_hot_fact(self, fact: str) -> None:
        payload = self._read_json(self._hot_path)
        facts = payload.setdefault("facts", [])
        if fact not in facts:
            facts.append(fact)
            self._write_json(self._hot_path, payload)

    def add_warm_lesson(self, prompt: str, conclusion: str) -> None:
        payload = self._read_json(self._warm_path)
        lessons = payload.setdefault("lessons", [])
        lessons.append({"prompt": prompt.strip(), "lesson": conclusion.strip()})
        self._write_json(self._warm_path, payload)

    def add_cold_event(self, event: dict[str, Any]) -> None:
        payload = self._read_json(self._cold_path)
        events = payload.setdefault("events", [])
        events.append(event)
        self._write_json(self._cold_path, payload)
