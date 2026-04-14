## PROTOCOLO — INICIO DE SESIÓN

1. **Leer AGENTS.md** (URL raw abajo) — fuente de verdad operativa
2. **Leer VISION.md** — norte del producto
3. **Verificar estado VPS** (solo Tailscale: `ssh vps-dragon@100.120.151.91 "docker ps"`)
4. **Verificar vars Doppler** críticas (`DISCORD_WEBHOOK_URL`, `RESEND_API_KEY`, `GITHUB_TOKEN`)
5. **No ejecutar nada** hasta confirmar reporte de gaps

---

# Claude en Opsly

## URLs raw
- AGENTS.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
- VISION.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md

## Skills (por prioridad)

| Priority | Skill | Uso |
|----------|-------|-----|
| CRITICAL | `opsly-context` | **SIEMPRE** al inicio |
| CRITICAL | `opsly-quantum` | Orquestación segura |
| HIGH | `opsly-architect-senior` | Diagnóstico arquitectónico |
| HIGH | `opsly-api` | Rutas `apps/api/` |
| HIGH | `opsly-bash` | Scripts `scripts/` |
| HIGH | `opsly-llm` | Llamadas LLM |
| HIGH | `opsly-mcp` | Tools MCP |
| HIGH | `opsly-supabase` | Migraciones |
| HIGH | `opsly-tenant` | Onboarding tenants |
| MEDIUM | `opsly-discord` | Notificaciones |
| MEDIUM | `opsly-feedback-ml` | Feedback + ML |
| MEDIUM | `opsly-agent-teams` | BullMQ teams |
| MEDIUM | `opsly-notebooklm` | Contenido |
| MEDIUM | `opsly-google-cloud` | GCP |
| MEDIUM | `opsly-simplify` | Docker optimization |

## Reglas absolutas

- **NUNCA** K8s, Swarm, nginx (salvo ADR)
- **NUNCA** secretos en código
- **NUNCA** `any` en TS
- **NUNCA** saltarse `validate-config.sh` antes de deploy
- **NUNCA** terraform apply sin plan
- **SIEMPRE** leer AGENTS.md al iniciar
- **SIEMPRE** git add + git commit tras cada tarea completada (no acumular cambios)

## Stack

| Servicio | Puerto |
|----------|--------|
| api | 3000 |
| admin | 3001 |
| portal | 3002 |
| mcp | 3003 |
| llm-gateway | 3010 |
| orchestrator | 3011 |
| context-builder | 3012 |

## Infraestructura

- VPS: `/opt/opsly` — SSH **solo Tailscale** `vps-dragon@100.120.151.91`
- IP pública: `157.245.223.7` (solo HTTP/HTTPS)
- Doppler: `ops-intcloudsysops` / `prd`
- Supabase: `jkwykpldnitavhmtuzmo`
- GitHub: `cloudsysops/opsly`

## División roles

| Herramienta | Rol |
|-------------|-----|
| Claude (tú) | Arquitectura, decisiones, desbloqueos |
| Cursor | Ejecución, código, commits |
| AGENTS.md | Memoria compartida entre sesiones |

## Antes de proponer código

1. Verificar si existe en `lib/` → reutilizar
2. Función >50 líneas → dividir
3. Query Supabase → Repository pattern en `lib/repositories/`
4. Crear recurso → Factory pattern en `lib/factories/`
5. Números mágicos → `lib/constants.ts`