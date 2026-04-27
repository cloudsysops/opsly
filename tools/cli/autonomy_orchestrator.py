from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .autonomy_types import BackendComponentSpec, BuildResult


@dataclass
class SelfBuildPlan:
    objective: str
    components: list[BackendComponentSpec]


class SelfBuildingOrchestrator:
    """
    Fase inicial de auto-construcción:
    - detecta componentes backend faltantes por objetivo
    - prepara un plan ejecutable
    - ejecuta en modo dry-run seguro por defecto
    """

    def analyze_missing_components(self, objective: str) -> list[BackendComponentSpec]:
        text = objective.lower()
        specs: list[BackendComponentSpec] = []

        if any(token in text for token in ("auth", "login", "jwt", "usuario")):
            specs.append(
                BackendComponentSpec(
                    name="auth-system",
                    description="Autenticación con sesión y tokens para usuarios.",
                    required_endpoints=("/auth/register", "/auth/login", "/auth/refresh"),
                    dependencies=("bcrypt", "jwt", "database"),
                )
            )

        if any(token in text for token in ("queue", "job", "worker", "cola")):
            specs.append(
                BackendComponentSpec(
                    name="job-orchestration",
                    description="Pipeline de jobs para ejecución asíncrona.",
                    required_endpoints=("/jobs/submit", "/jobs/{id}", "/jobs/{id}/cancel"),
                    dependencies=("redis", "bullmq"),
                )
            )

        if any(token in text for token in ("metrics", "monitor", "observabilidad", "sre")):
            specs.append(
                BackendComponentSpec(
                    name="observability-core",
                    description="Métricas y healthchecks para runtime y backend.",
                    required_endpoints=("/health", "/metrics/system", "/metrics/tenant/{slug}"),
                    dependencies=("prometheus", "structured-logs"),
                )
            )

        if len(specs) == 0:
            specs.append(
                BackendComponentSpec(
                    name="core-api-foundation",
                    description="Base mínima de API con status, errores y contrato OpenAPI.",
                    required_endpoints=("/health", "/version"),
                    dependencies=("zod", "openapi"),
                )
            )
        return specs

    def create_plan(self, objective: str, max_components: int) -> SelfBuildPlan:
        components = self.analyze_missing_components(objective)
        return SelfBuildPlan(objective=objective, components=components[:max_components])

    def execute_plan(self, plan: SelfBuildPlan, dry_run: bool = True) -> list[BuildResult]:
        results: list[BuildResult] = []
        for spec in plan.components:
            if dry_run:
                results.append(
                    BuildResult(
                        component=spec,
                        success=True,
                        notes="Dry-run: componente analizado y listo para generación segura en sandbox.",
                    )
                )
                continue
            # En la siguiente fase se conecta a un sandbox real (E2B/Blaxel/Modal).
            results.append(
                BuildResult(
                    component=spec,
                    success=False,
                    notes="Modo no dry-run aún no implementado; usar dry-run para planificación segura.",
                )
            )
        return results

    @staticmethod
    def summarize_results(results: Iterable[BuildResult]) -> str:
        lines = []
        for item in results:
            status = "OK" if item.success else "BLOCKED"
            lines.append(f"- [{status}] {item.component.name}: {item.notes}")
        return "\n".join(lines)
