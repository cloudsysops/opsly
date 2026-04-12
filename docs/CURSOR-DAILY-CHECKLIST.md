# Checklist diario — sesiones Cursor / agentes

Copiar el bloque **“Hoy”** al iniciar la sesión. Contexto: [`AGENTS.md`](../AGENTS.md), [`ROADMAP.md`](../ROADMAP.md), [`SPRINT-TRACKER.md`](../SPRINT-TRACKER.md).

## Antes de empezar

- [ ] Rama acordada (`main` o `feat/*`); `git status` revisado.
- [ ] `git pull` si trabajás sobre `main` compartido.
- [ ] Objetivo **una** tarea concreta (fila en `SPRINT-TRACKER.md` o issue).

## Durante

- [ ] Cambios acotados al objetivo (evitar refactors masivos no pedidos).
- [ ] Tras cambios sustanciavos: `npm run type-check`.
- [ ] Tests del workspace afectado: `npm run test --workspace=@intcloudsysops/<workspace>`.

## Antes de PR / commit

- [ ] `npm run type-check` verde.
- [ ] Sin `any` nuevo; sin secretos en código.
- [ ] Mensaje de commit claro: `feat(…):`, `fix(…):`, `docs(…):`, etc.
- [ ] Descripción del PR: qué, por qué, cómo validar.

## Recordatorio Opsly

- Tráfico LLM: por **LLM Gateway** / OpenClaw según [`AGENTS.md`](../AGENTS.md).
- Incluir `tenant_slug` y `request_id` donde aplique.

## Plantilla “Hoy”

```
Fecha: YYYY-MM-DD
Sprint: ver SPRINT-TRACKER.md / AGENTS.md
Tarea:
Validación ejecutada:
Bloqueantes:
```
