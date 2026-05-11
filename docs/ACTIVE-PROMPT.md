# ACTIVE-PROMPT — Opsly / MAIA

# Modo seguro: este archivo queda comentado para evitar ejecución accidental por cursor-prompt-monitor.
# El monitor ejecuta únicamente líneas no comentadas; mantener instrucciones peligrosas como comentarios.

# Objetivo actual:
# - Activar MAIA Life Systems como paquete report-only: workers, workflows n8n, regla Cursor y monitor local.
# - Mantener todo tenant-scoped, auditable, idempotente y sin gasto recurrente sin aprobación explícita.

# Workers esperados:
# - maia_memory_write: persistir observaciones y memoria operativa.
# - maia_cost_gate: bloquear coste recurrente o coste estimado sin aprobación.
# - maia_validation: ejecutar checks allowlisted antes de cambios.
# - maia_claude_code: encolar prompts de implementación/revisión como JSONL local.
# - maia_auto_deploy: dry-run por defecto; producción requiere approved_by.
# - maia_self_heal: health_check por defecto; restart requiere approved_by.

# Próximo smoke recomendado:
# npm run validate-openapi
# npm run validate-skills
# npm run test --workspace=@intcloudsysops/orchestrator -- hive-cycle.test.ts
