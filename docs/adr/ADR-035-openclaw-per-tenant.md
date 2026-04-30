# ADR-035 — OpenClaw (Context Builder + MCP) per-tenant para agentes IA dedicados

**Fecha:** 2026-04-30
**Estado:** PROPOSED

## Contexto

OpenClaw es el framework de orquestación multi-agente de Opsly. Actualmente, el **Orchestrator** y **LLM Gateway** son centrales (compartidos). El **Context Builder** y **MCP** están en infraestructura centralizada.

Con la emergencia de **agentes IA dedicados por tenant** (p. ej. opsAgent, billingAgent), aparece la necesidad de:

1. **Aislamiento de contexto**: cada tenant debe tener su propia "ventana de observabilidad" sobre sus recursos (n8n workflows, credenciales, eventos).
2. **Privacidad de clientes**: contexto de un tenant no debe ser visible a otros.
3. **Costos operativos**: minimizar RAM/CPU por tenant manteniendo eficiencia.
4. **Compatibilidad**: respetar ADR-001 (Docker Compose por tenant) y ADR-028 (onboarding pattern).

## Decisión

**Opción A: Orchestrator + LLM Gateway centrales; Context Builder + MCP per-tenant**

- El **Orchestrator** sigue siendo centralizado (orquesta todas las colas y asignación de tareas globales).
- El **LLM Gateway** permanece centralizado (cachea respuestas, enruta a proveedores).
- El **Context Builder** se despliega como **contenedor per-tenant** dentro del `docker-compose.tenant.yml`.
- El **MCP** se despliega como **contenedor per-tenant** dentro del mismo compose.
- Cada Context Builder + MCP tiene su **namespace Redis** (`tenant_{slug}:openclaw:*`) y acceso a su **schema Supabase** (`tenant_{slug}`).
- Conexión: Orchestrator → MCP per-tenant vía hostname interno del compose (p. ej. `mcp-{slug}:3003`).

## Rationale

1. **Privacidad**: datos sensibles del tenant (workflows n8n, credenciales, logs) nunca salen del contenedor/namespace del tenant.
2. **Bajo costo**: Context Builder + MCP consumen ~100MB RAM/tenant (sin impacto en maestro central).
3. **Escalabilidad incremental**: agregar tenants = agregar contenedores al compose, no replicas de servicios centrales.
4. **Compatible con ADR-001**: se integra naturalmente en `docker-compose.tenant.yml`.
5. **Compatible con ADR-028**: el patrón de onboarding se extiende sin cambios estructurales.
6. **Resiliencia**: fallo de MCP en un tenant no afecta a otros tenants.

## Consecuencias

### Estructurales

1. **Redis**: namespace aislado por tenant
   - Clave patrón: `tenant_{slug}:openclaw:*`
   - Context Builder almacena estado ephemeral aquí (no persistencia cross-tenant).

2. **Supabase**: schema aislado por tenant
   - `tenant_{slug}` schema ya existe por ADR-001
   - Se agrega tabla `openclaw_context_snapshots` y `openclaw_tool_logs` en cada schema.

3. **Docker Compose**: extensión `docker-compose.tenant.yml`
   ```yaml
   services:
     context-builder:
       image: opsly:context-builder
       environment:
         TENANT_SLUG: ${TENANT_SLUG}
         REDIS_NAMESPACE: tenant_${TENANT_SLUG}:openclaw
         SUPABASE_DB_URL: ${SUPABASE_URL}
         CONTEXT_BUILDER_PORT: 3012
     mcp:
       image: opsly:mcp
       environment:
         TENANT_SLUG: ${TENANT_SLUG}
         MCP_PORT: 3003
   ```

4. **Networking**: los containers se comunican vía hostname de compose (p. ej. `mcp-{slug}:3003`).

### Operacionales

1. **Monitoring/Alertas**: agregar dimensión `tenant_slug` a métricas de Context Builder + MCP.
2. **Logs**: flujo de logs por tenant vía `TENANT_SLUG` env var → agrupa en CloudWatch / Datadog.
3. **Debugging**: cada tenant tiene su propio `docker exec` context y logs independientes.

### Mitigaciones

1. **Feature flag**: `OPENCLAW_PER_TENANT_ENABLED` en Doppler permite rollback sin recompile.
   - Por defecto: `false` (comportamiento actual centralizado).
   - En rollout: activar por tenant vía flag dinámico en `platform.tenants.openclaw_enabled`.

2. **Validación de esquema**: tabla `openclaw_context_snapshots` debe cumplir RLS (`tenant_id` = `auth.uid()` equiv).

3. **Backwards compatibility**: Orchestrator sigue siendo centralizado; agentes antiguos siguen hablando al MCP/Context centralizado hasta que se migre.

## Alternativas

### Alternativa B: Todos los componentes centralizados (status quo)

**Pros:**
- Simplicidad actual.
- Operación única.

**Contras:**
- Privacidad débil (contexto compartido).
- Escalamiento = más recursos en VPS monolítico.
- Riesgo de data leakage entre tenants en Context Builder.

### Alternativa C: Kubernetes con namespaces

**Pros:**
- Aislamiento máximo.
- Escalabilidad teórica infinita.

**Contras:**
- Complejidad operativa (viola decisión ADR-001).
- No justificado en fase actual (max ~50 tenants en 2026).
- Overhead de aprendizaje y mantenimiento.

## Pasos de Implementación

1. **Crear tabla en cada schema tenant** (`openclaw_context_snapshots`).
2. **Extender `docker-compose.tenant.yml`** con servicios `context-builder` + `mcp` per-tenant.
3. **Actualizar variables Doppler**: `OPENCLAW_PER_TENANT_ENABLED`, `OPENCLAW_TENANT_AWARE_CONTEXT_BUILDER`.
4. **Agregar feature flag en `platform.tenants.openclaw_enabled`** (boolean).
5. **Migrar agentes piloto** (opsAgent, billingAgent) a usar Context Builder per-tenant.
6. **Tests**: validar aislamiento Redis/Supabase entre tenants.

## Líneas de cambio esperadas

- `apps/context-builder`: lógica de `TENANT_SLUG` env + namespace Redis
- `apps/mcp`: lógica de `TENANT_SLUG` + rutas de tenant-awareness
- `apps/orchestrator`: resolver MCP endpoint dinámicamente por tenant
- `infra/templates/docker-compose.tenant.yml.tpl`: agregar servicios
- `packages/schema`: migrations para `openclaw_*` tables
- `config/doppler-ci-required.txt`: validar `OPENCLAW_*` vars

## Referencias

- ADR-001: Docker Compose por tenant
- ADR-028: Patrón de onboarding por tenant
- `docs/00-architecture/ARCHITECTURE.md` (sección OpenClaw per-tenant)
- `.openclaw.md` (configuración OpenClaw)
