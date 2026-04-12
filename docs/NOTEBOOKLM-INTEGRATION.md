# NotebookLM + Hermes (Opsly)

## Qué es

**NotebookLM** (Google) se usa como **hub de documentación asistida por IA** de forma **experimental** (ADR-014).  
No existe una **API REST pública estable** tipo `notebooklm.google.com/api/v1/...` para producción; en Opsly la integración real pasa por **`notebooklm-py`** y el wrapper TypeScript `executeNotebookLM` (`@intcloudsysops/notebooklm-agent`).

## Arquitectura en el monorepo

| Pieza | Rol |
|-------|-----|
| `apps/agents/notebooklm` | Cliente Python (`client.py`) + `executeNotebookLM` |
| `apps/orchestrator/src/lib/notebooklm-client.ts` | Facade Hermes: `ask`, `add_source` (texto), cache 5 min |
| `apps/orchestrator/src/hermes/ContextEnricher.ts` | Enriquece `HermesTask` con consulta NotebookLM + recortes locales (`ARCHITECTURE.md`, etc.) |
| `apps/orchestrator/src/hermes/DecisionEngine.ts` | `routeWithContext` ajusta prioridad con resumen NotebookLM |
| `apps/api/app/api/notebooklm/query/route.ts` | POST para admin (mismo backend `ask`) |
| `apps/admin/app/notebooklm/page.tsx` | UI mínima de consulta |

## Variables de entorno

Ver `.env.example` (sección NotebookLM). Lo esencial:

- `NOTEBOOKLM_ENABLED=true`
- `NOTEBOOKLM_NOTEBOOK_ID` — ID del notebook (UI Google o acción `create_notebook`)
- `NOTEBOOKLM_DEFAULT_TENANT_SLUG` — default `platform`
- `OPSLY_REPO_ROOT` — raíz del repo si el orchestrator no corre desde el clon (para leer markdown locales)

**No** se usa `NOTEBOOKLM_API_KEY` en código: la autenticación sigue el flujo de `notebooklm-py` (almacenamiento de sesión Google).

## Hermes: flujo

1. Tarea `PENDING` → `ContextEnricher` consulta NotebookLM (si disponible) + lee fragmentos locales.
2. `DecisionEngine.routeWithContext` enruta a colas BullMQ existentes.
3. Job `cursor` incluye `notebooklm_context` / `notebooklm_answer` en el payload para `CursorWorker`.
4. Si NotebookLM falla, el sistema **sigue** con contexto local y mensaje de fallback (degradación).

## Scripts

```bash
npm run docs:code-snapshots   # genera docs/CODE-SNAPSHOTS.md
npm run docs:to-notebooklm    # sube markdown al notebook (add_source texto)
npm run notebooklm:sync       # ambos
node scripts/query-notebooklm.mjs "tu pregunta"
```

## API

- `POST /api/notebooklm/query` con `{ "question": "...", "context": "..." }` — requiere sesión admin (mismo patrón que otras rutas admin).

**Nota:** el contenedor de la API debe incluir **Python 3** + `notebooklm-py` y credenciales si se desea ejecutar consultas en producción; en muchos despliegues solo el **orchestrator** o un worker dedicado tendrá ese runtime.

## CI

Workflow `.github/workflows/notebooklm-sync.yml`: cron diario + `workflow_dispatch`. Requiere secretos configurados y, en la práctica, un runner con Python + auth (o dejar el paso como documentación y ejecutar sync manualmente desde un entorno preparado).

## Referencias

- `docs/adr/ADR-014-notebooklm-agent.md`
- `docs/HERMES-INTEGRATION.md`
- `skills/user/opsly-notebooklm/SKILL.md`

---

## Related Documents
[[MASTER-PLAN]] | [[ARCHITECTURE]] | [[HERMES-SPRINT-PLAN]] | [[NOTEBOOKLM-INTEGRATION]]
