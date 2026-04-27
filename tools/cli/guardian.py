from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class GuardianDecision:
    allowed: bool
    reason: str


class GuardianSystem:
    """
    Guardrails mínimos de evolución:
    - bloquea paths sensibles
    - limita intentos de auto-evolución
    - requiere dry-run por defecto
    """

    def __init__(self, max_attempts: int = 3) -> None:
        self.max_attempts = max_attempts
        self._blocked_fragments = (
            ".env",
            "secrets",
            "credentials",
            "token",
            "private_key",
            "id_rsa",
        )

    def validate_change_request(
        self, target_paths: list[str], attempt: int, dry_run: bool
    ) -> GuardianDecision:
        if attempt > self.max_attempts:
            return GuardianDecision(False, f"Max attempts exceeded ({self.max_attempts}).")
        if not dry_run:
            return GuardianDecision(False, "Non dry-run evolution disabled in this phase.")
        for path in target_paths:
            lowered = path.lower()
            if any(fragment in lowered for fragment in self._blocked_fragments):
                return GuardianDecision(False, f"Blocked sensitive path: {path}")
        return GuardianDecision(True, "Allowed by guardian policy.")

    def detect_protocol_drift(self, current: dict[str, Any], baseline: dict[str, Any]) -> dict[str, Any]:
        drift: dict[str, Any] = {"changed": False, "details": []}
        for key in ("agent_mode", "provider_set", "retry_policy", "safety_level"):
            if current.get(key) != baseline.get(key):
                drift["changed"] = True
                drift["details"].append(
                    {"field": key, "from": baseline.get(key), "to": current.get(key)}
                )
        return drift
