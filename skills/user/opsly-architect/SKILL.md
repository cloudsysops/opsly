# Opsly Architect Skill

> **Triggers:** `arquitectura`, `adr`, `riesgo`, `tradeoff`, `decision`, `diseño`, `escalabilidad`
> **Priority:** MEDIUM
> **Skills relacionados:** `opsly-bootstrap`, `opsly-api`, `opsly-infra`, `opsly-orchestrator`

## Cuándo usar

Al tomar decisiones estructurales: nuevos módulos, cambios de contrato entre servicios, diseño de flujo multi-agente o endurecimiento de seguridad/operación.

## Marco de decisión

1. Contexto actual (`AGENTS.md`, `VISION.md`, ADRs existentes).
2. Opciones viables (2-3, no más).
3. Tradeoffs (costo, complejidad, riesgo operativo, compatibilidad).
4. Recomendación concreta.
5. Plan incremental validable.

## Reglas

- Priorizar compatibilidad hacia atrás.
- Extender arquitectura actual antes de crear sistemas paralelos.
- No introducir nueva complejidad de infraestructura sin evidencia.
- Si una decisión cambia contratos públicos, actualizar OpenAPI y tests.
- Documentar en ADR cuando el impacto es transversal.

## Errores comunes

| Error                 | Causa                      | Solución                                       |
| --------------------- | -------------------------- | ---------------------------------------------- |
| Diseño "big-bang"     | Ignora incrementalismo     | Partir en slices verificables                  |
| Propuesta sin pruebas | Se decide por intuición    | Adjuntar criterios y señales                   |
| Rompe compatibilidad  | Falta análisis de callers  | Revisar consumidores antes de cambiar contrato |
| Duplica sistemas      | No revisó código existente | Mapear primero los módulos ya presentes        |
