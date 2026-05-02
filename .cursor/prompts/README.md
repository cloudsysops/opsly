# Prompts Cursor (Opsly)

Uso recomendado para **automatizar** el puente arquitectura → implementación:

| Archivo | Cuándo usarlo |
|--------|----------------|
| `local-services-tech-builder.md` | Vertical Local Services (Week 1: migración 0046, API, book, tests). **Incluye trato como tenant Opsly nuevo** (`local-services`). `@` en chat + regla `local-services-builder` al editar esas rutas. |
| `tenants/local-services/piloto-automatizaciones.md` | Tenant **Equipa** (`local-services`): productivo + automatizaciones. Combinar con el tech-builder. |
| `legalvial-phase2b-automation.md` | Tenant LegalVial + Drive import (ver comentarios dentro del archivo). |

## Flujo sugerido (con arquitectos)

1. Decisión/architecture: ADR o nota en `AGENTS.md` / PR description.
2. **Un prompt versionado** en `.cursor/prompts/<vertical>.md` con alcance, orden y checklist (como `local-services-tech-builder.md`).
3. Regla opcional en `.cursor/rules/<vertical>.mdc` con `globs` para que Cursor **inyecte** reglas al abrir archivos de esa vertical (`alwaysApply: false`).
4. En cada sesión Agent: `@AGENTS.md` + `@tenant-context` o equivalente + `@.cursor/prompts/<vertical>.md`.

No sustituye revisión humana ni PR; reduce deriva entre “lo acordado” y “lo implementado”.
