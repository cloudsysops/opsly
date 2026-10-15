#!/usr/bin/env python3
"""
Canonical logical -> physical OBS scene mapping for Ops After Dark.

Logical names are the stable contract used by the remote allowlist in
docs/streaming/REMOTE-STREAM-CONTROL.md. Physical names are the scenes that
already exist in the operator's OBS collection.

This module is data and resolution only. It never creates, renames or deletes
a scene, and it never mutates OBS. Canonical scene definitions live in
docs/streaming/OBS-EVENT-AUTOMATION.md.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

MISSION_CONTROL_LIVE_URL = "http://127.0.0.1:4001/mission-control/live?mode=dev"


@dataclass(frozen=True)
class SceneBinding:
    logical: str
    physical: str
    remote_allowed: bool
    requires: tuple[str, ...] = ()
    requires_process: tuple[str, ...] = ()


LOGICAL_SCENES: Mapping[str, SceneBinding] = {
    "starting_soon": SceneBinding(
        logical="STARTING_SOON",
        physical="Iniciando Stream",
        remote_allowed=True,
    ),
    "gaming": SceneBinding(
        logical="GAMING",
        physical="Battlefield 6 — Día 2",
        remote_allowed=True,
        requires_process=("bf6.exe",),
    ),
    "coding": SceneBinding(
        logical="CODING",
        physical="Coding",
        remote_allowed=True,
    ),
    "factory_focus": SceneBinding(
        logical="FACTORY_FOCUS",
        physical="OAD_FACTORY_FOCUS",
        remote_allowed=True,
        requires=(MISSION_CONTROL_LIVE_URL,),
    ),
    "intermission": SceneBinding(
        logical="INTERMISSION",
        physical="Vuelvo en un momento",
        remote_allowed=True,
    ),
    "ending": SceneBinding(
        logical="ENDING",
        physical="Terminando Stream",
        remote_allowed=False,
    ),
}


ALIASES: Mapping[str, str] = {
    "start": "starting_soon",
    "starting": "starting_soon",
    "game": "gaming",
    "gameplay": "gaming",
    "code": "coding",
    "vibe": "coding",
    "factory": "factory_focus",
    "focus": "factory_focus",
    "brb": "intermission",
    "away": "intermission",
    "end": "ending",
}

REMOTE_ALLOWED: tuple[str, ...] = tuple(
    key for key, binding in LOGICAL_SCENES.items() if binding.remote_allowed
)

OPERATOR_ONLY: tuple[str, ...] = tuple(
    key for key, binding in LOGICAL_SCENES.items() if not binding.remote_allowed
)


def normalize(name: str) -> str:
    return name.strip().lower().replace("-", "_").replace(" ", "_")


def resolve(name: str) -> SceneBinding:
    """Resolve a logical scene name or alias. Fails closed on anything else."""
    if not isinstance(name, str) or not name.strip():
        raise ValueError(f"scene name required. Allowed: {', '.join(REMOTE_ALLOWED)}")

    key = normalize(name)
    key = ALIASES.get(key, key)

    binding = LOGICAL_SCENES.get(key)
    if binding is None:
        allowed = ", ".join(REMOTE_ALLOWED)
        raise ValueError(f"unknown scene {name!r}. Allowed: {allowed}")

    return binding


def resolve_remote(name: str) -> SceneBinding:
    """Resolve a scene name for the remote surface, rejecting operator-only scenes."""
    binding = resolve(name)
    if not binding.remote_allowed:
        raise PermissionError(
            f"scene {binding.logical} is operator-only and not on the remote allowlist"
        )
    return binding


def logical_for_physical(physical: str) -> str | None:
    for binding in LOGICAL_SCENES.values():
        if binding.physical == physical:
            return binding.logical
    return None


def describe(available_physical: set[str]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for key in (*REMOTE_ALLOWED, *OPERATOR_ONLY):
        binding = LOGICAL_SCENES[key]
        rows.append(
            {
                "logical": binding.logical,
                "physical": binding.physical,
                "remote_allowed": binding.remote_allowed,
                "available": binding.physical in available_physical,
                "requires": list(binding.requires),
                "requires_process": list(binding.requires_process),
            }
        )
    return rows