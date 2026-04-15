## PROTOCOLO — INICIO DE SESIÓN AUTÓNOMO

1. **Cargar skills automáticamente:**
   ```bash
   # Detectar skills para el contexto
   node scripts/skill-finder.js "inicio sesión" --autonomous
   ```

2. **Leer AGENTS.md** (URL raw abajo) — fuente de verdad operativa

3. **Leer VISION.md** — norte del producto

4. **Ejecutar checks en paralelo:**
   - VPS: `ssh vps-dragon@100.120.151.91 "docker ps --format '{{.Names}}\t{{.Status}}'"`
   - Doppler: `doppler run --project ops-intcloudsysops --config prd -- print-env | grep -E "DISCORD|RESEND|GITHUB|NOTEBOOKLM"`
   - Git: `git status && git log --oneline -3`

5. **Reporte de gaps** — si hay errores, parar y reportar

---

# Claude en Opsly — Sistema Autónomo

## Framework: OpenClaw

OpenClaw es el **framework de orquestación multi-agente** de Opsly. Ver `.openclaw.md` para configuración completa.

### Componentes OpenClaw

| Componente | Puerto |
|------------|--------|
| MCP Server | 3003 |
| Orchestrator | 3011 |
| LLM Gateway | 3010 |
| Context Builder | 3012 |

## Sistema de Skills (Auto-activación)

### CLI de Skills

```bash
# Buscar skills por query
node scripts/skill-finder.js "crear api route"

# Modo autónomo (genera cadena)
node scripts/skill-finder.js "mcp tool oauth" --autonomous

# Auto-cargar skills
node scripts/skill-loader.js --context "deploy"

# Validar todos los manifests
bash scripts/skill-autoload.sh validate

# Hook de autoload
source scripts/skill-hooks.sh
skill_autoload "mi query"
```

### Índice de Skills (v2.0)

| Priority | Skill | Triggers | Cross-Refs |
|----------|-------|----------|------------|
| CRITICAL | `opsly-context` | sesión, inicio, contexto | quantum, architect |
| CRITICAL | `opsly-quantum` | orquestación, diagnóstico, maestro | todos |
| CRITICAL | `opsly-autonomous` | autónomo, godmode, auto-fix | todos |
| HIGH | `opsly-architect-senior` | arquitectura, ADR, riesgo | context, quantum |
| HIGH | `opsly-api` | api, route, endpoint | supabase, mcp |
| HIGH | `opsly-bash` | script, bash, shell | tenant, discord |
| HIGH | `opsly-llm` | llm, ai, modelo, cache | feedback-ml, agent-teams |
| HIGH | `opsly-mcp` | mcp, tool, oauth | api, tenant |
| HIGH | `opsly-supabase` | sql, migration, rls | api, tenant |
| HIGH | `opsly-tenant` | onboard, tenant, n8n | api, supabase, discord |
| MEDIUM | `opsly-agent-teams` | bullmq, queue, job | quantum, api |
| MEDIUM | `opsly-discord` | discord, webhook, alerta | bash, tenant |
| MEDIUM | `opsly-feedback-ml` | feedback, ml, auto-implement | llm, api |
| MEDIUM | `opsly-google-cloud` | gcp, drive, bigquery | bash, llm |
| LOW | `opsly-notebooklm` | notebooklm, podcast, pdf | tenant, llm |
| LOW | `opsly-simplify` | docker, compose, optimize | bash |

### Templates Reutilizables

```bash
# En skills/templates/
template-api-route.md      # Ruta API con tests
template-bash-script.md    # Script idempotente
template-mcp-tool.md       # Tool MCP con OAuth
template-migration.md      # Migración SQL
template-test.md           # Tests Vitest
```

## Autonomía — Reglas de Ejecución

### Sin Confirmar (Auto-ejecutar)

- Búsqueda y lectura de archivos
- Creación de archivos según templates
- Ejecución de `npm run type-check`
- Tests unitarios con `npm run test`
- Validaciones con `npm run validate-*`
- Git status/log (lectura)

### Con Confirmación Requerida

- Deploy a producción (`--prod`)
- `docker system prune --volumes`
- `terraform apply`
- Modificación de `.env` o Doppler
- Creación de migración SQL nueva
-Cambios destructivos en Supabase
- Credentials en Doppler

### Escalation Automático

```
confidence < 0.3  →  Reportar y preguntar
intent = "deploy" →  Confirmar antes de ejecutar
domain = "unknown" → Solicitar contexto adicional
```

## URLs raw

- AGENTS.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
- VISION.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md

## Reglas Absolutas

- **NUNCA** K8s, Swarm, nginx (salvo ADR)
- **NUNCA** secretos en código
- **NUNCA** `any` en TypeScript
- **NUNCA** saltarse `validate-config.sh` antes de deploy
- **NUNCA** terraform apply sin plan
- **SIEMPRE** leer AGENTS.md al iniciar
- **SIEMPRE** git add + git commit tras cada tarea completada
- **SIEMPRE** usar OpenClaw como framework de trabajo
- **SIEMPRE** usar skill-finder para detectar skills necesarios

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

## División Roles

| Herramienta | Rol |
|-------------|-----|
| Claude (tú) | Arquitectura, decisiones, desbloqueos, autonomía |
| Cursor | Ejecución, código, commits |
| AGENTS.md | Memoria compartida entre sesiones |

## Antes de Proponer Código

1. Verificar si existe en `lib/` → reutilizar
2. Función >50 líneas → dividir
3. Query Supabase → Repository pattern en `lib/repositories/`
4. Crear recurso → Factory pattern en `lib/factories/`
5. Números mágicos → `lib/constants.ts`

## Workflow Autónimo Típico

```bash
# 1. Detectar skills necesarios
node scripts/skill-finder.js "crear migration supabase" --autonomous

# 2. Cargar skills
node scripts/skill-loader.js --context "crear migration"

# 3. Implementar usando templates
# Copiar de skills/templates/template-migration.md

# 4. Validar
npm run type-check
npm run test --workspace=@intcloudsysops/api

# 5. Commit
git add -A && git commit -m "feat(supabase): nueva migration"
```
