---
status: draft
owner: operations
last_review: 2026-05-24
type: package-doc
tags:
  - opsly/package
---

# Opsly agent verification (marketplace discipline)

> **Triggers:** `listo para merge`, `verificación antes de cerrar`, `evidencia antes de afirmar`, `smoke checklist`, `pre merge agente`, `type-check antes de commit`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-qa`, `opsly-context`, `opsly-skill-creator`
> **Origen:** disciplina tipo *verification-before-completion* (superpowers / agentes). Obligatoria antes de decir “listo” o pedir merge.

## Cuándo usar

- Al finalizar cualquier tarea de código, infra o docs que deba integrarse a `main`.
- Antes de **PR**, **push** o mensaje de “completado” al usuario.

## Evidencia mínima (Opsly)

Ejecutar y citar resultado (o adjuntar salida relevante sin secretos):

1. **`npm run type-check`** (raíz / turbo) — debe pasar.
2. **Tests del workspace tocado** — p. ej. `npm run test --workspace=@intcloudsysops/api` si se cambió `apps/api`.
3. **OpenAPI** — si se tocaron rutas HTTP del subset: `npm run validate-openapi`.
4. **Skills** — si se tocaron `skills/user/**`: `npm run validate-skills`.
5. **Sin secretos** — no nuevos en diff, logs ni mensajes.
6. **Zonas rojas** (`docs/03-agents/AGENT-GUARDRAILS.md`) — si aplica: PR + humano, no push directo a `main`.

## Frases prohibidas sin evidencia

- “Pasa todo” / “verde” / “production ready” sin haber corrido los comandos en esta sesión o sin referencia al CI.

## Relación con hooks

- El pre-commit local puede correr type-check + ESLint acotado; eso **no** reemplaza tests de workspace ni validate-openapi cuando apliquen.

---

## Enlaces relacionados

- [[packages/skills/README|skills]]
- [[README|Inicio]]
