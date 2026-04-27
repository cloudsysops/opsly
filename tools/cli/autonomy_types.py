from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BackendComponentSpec:
    name: str
    description: str
    required_endpoints: tuple[str, ...]
    dependencies: tuple[str, ...]


@dataclass(frozen=True)
class BuildResult:
    component: BackendComponentSpec
    success: bool
    notes: str
