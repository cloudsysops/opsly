# MASTER PLAN — Estado actual
## Última actualización: 2026-04-08 (Fase 10: Drive OAuth + automatización n8n/Discord + CI Docker)
## FASE ACTUAL: 10 — Google Cloud + BigQuery (en progreso)

## Progreso por fase
| Fase | Nombre | Estado | Commit |
|------|--------|--------|--------|
| 1 | Infraestructura base | ✅ Completa | — |
| 2 | Portal + invitaciones | ✅ Completa | — |
| 3 | OpenClaw MCP | ✅ Completa | — |
| 4 | LLM Gateway Beast Mode | ✅ Completa | — |
| 5 | Feedback + ML | ✅ Completa | — |
| 6 | OAuth 2.0 + PKCE | ✅ Completa | — |
| 7 | Skills Claude Supremo | ✅ Completa | — |
| 8 | Sprint nocturno | ✅ Completa | `c5cac32` |
| 9 | Activación producción | ✅ Completa (operativa) | `dbb28c9` |
| 10 | Google Cloud + BigQuery | 🔄 En progreso | — |
| 11 | Fine-tuning + Agentes | ⏳ Pendiente | — |
| 12 | Monetización | ⏳ Pendiente | — |

## Próximo paso inmediato
1. **Drive:** en la carpeta destino (`docs/GOOGLE-CLOUD-SETUP.md`), compartir como **Editor** con el `client_email` del JSON del service account (ej. `opsly-drive-sync@opslyquantum.iam.gserviceaccount.com`). Sin eso la API responde **HTTP 403** aunque el token OAuth sea válido.
2. **Doppler:** subir JSON completo sin truncar: `doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON --project ops-intcloudsysops --config prd < ruta/al.json` (la UI puede cortar el valor). Opcional local: `GOOGLE_SERVICE_ACCOUNT_JSON_FILE` en `.env.local`.
3. **Fase 10 datos:** `GOOGLE_CLOUD_PROJECT_ID`, `BIGQUERY_DATASET`, `VERTEX_AI_REGION` en `prd` + `./scripts/check-tokens.sh`.
4. Tras push: confirmar run verde de workflow **Deploy** (fix Docker builder `package.json` raíz en `apps/api` y `apps/mcp`).

## Hecho recientemente (Master Plan / Fase 10)
- **OAuth service account:** corrección de `google_base64url_encode` (heredoc robaba stdin → JWT inválido → `invalid_request`). Token de acceso OK.
- **`drive-sync`:** retornos HTTP correctos en conteo; mensaje claro ante **403** (permiso Drive).
- **`google-auth`:** `GOOGLE_SERVICE_ACCOUNT_JSON_FILE`, normalización JSON/base64, POST token con `--data-urlencode`.
- **CI Docker:** `apps/api/Dockerfile` y `apps/mcp/Dockerfile` copian `package.json`/`package-lock.json` al stage `builder` para `npm run -w`.
- **n8n / Discord → GitHub:** `scripts/dispatch-discord-command.sh`, menciones `@cursor`/`@claude`, plantilla y guías actualizadas; `scripts/autonomous-plan-discord-agent.sh` (heartbeat + resumen plan).
- **Docs/QA:** `docs/GOOGLE-CLOUD-SETUP.md`, `check-tokens` valida estructura de `GOOGLE_SERVICE_ACCOUNT_JSON`, `.gitignore` `supabase/.temp/`.

## Bloqueantes activos
- **Drive 403** hasta compartir la carpeta con el service account (acción humana en Google Drive).
- Faltan en Doppler `prd`: `GOOGLE_CLOUD_PROJECT_ID`, `BIGQUERY_DATASET`, `VERTEX_AI_REGION`.
- Workflow **Deploy**: pendiente confirmar **success** tras este commit (fallos previos por build Docker / imágenes opcionales).
- Pull GHCR parcial en VPS puede seguir afectando servicios opcionales (`mcp`, `context-builder`).

## Métricas del proyecto
- Tenants activos: 3 (según contexto AGENTS)
- Tests pasando: mcp 26/26, llm-gateway 17/17, orchestrator 8/8, ml 4/4, api 126/126
- Cobertura: —
- Último deploy: failure (workflow), pero servicios base (`api/admin/portal`) operativos en VPS
- MRR actual: $—

