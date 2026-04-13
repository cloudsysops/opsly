# MCP Status Analysis — Opsly
**Fecha:** 2026-04-13  
**Estado:** ✅ Básico implementado | ⏳ Integraciones faltantes

---

## ✅ QUÉ ESTÁ IMPLEMENTADO

### 1. **MCP Server Core** (`apps/mcp/src/server.ts`)
- ✅ Clase `OpenClawMcpServer` con registro de tools
- ✅ Validación de input con Zod
- ✅ Verificación de scopes OAuth por tool
- ✅ 12 tools expuestas:
  - `get_tenants`, `get_tenant` (lectura)
  - `onboard_tenant`, `suspend_tenant`, `resume_tenant` (operaciones)
  - `send_invitation`, `get_health`, `get_metrics` (meta)
  - `execute_prompt`, `notebooklm` (orchestration)
  - `check_service_health`, `restart_container` (ops)

### 2. **Autenticación OAuth 2.0 + PKCE** 
- ✅ Descubrimiento: `GET /.well-known/oauth-authorization-server`
- ✅ Autorización: `GET /oauth/authorize` con code_challenge + code_verifier
- ✅ Token: `POST /oauth/token` con JWT (MCP_JWT_SECRET)
- ✅ Scopes definidos: `tenants:read|write`, `metrics:read`, `invitations:write`, `executor:write`, `agents:write`
- ✅ Compatibilidad hacia atrás: `PLATFORM_ADMIN_TOKEN` como `Bearer` = scope `*`

### 3. **Health & Observability**
- ✅ HTTP server en puerto `3003` (configurable `PORT`)
- ✅ Endpoint `GET /health` → `{ status: "ok", service: "mcp" }`
- ✅ Logging de inicio con tools disponibles

### 4. **Tests**
- ✅ OAuth tests: PKCE, JWT, well-known metadata
- ✅ Tool tests: 11 tests, 100% cobertura (`tenantsTools`, `onboardTool`, `metricsTool`, etc.)
- ✅ Security tests: validación de container names, scope enforcement

### 5. **Documentación**
- ✅ ADR-009: arquitectura MCP completa
- ✅ SKILL.md: plantilla de tools y reglas
- ✅ Scopes mapeados a tools en `server.ts`

---

## ⏳ QUÉ FALTA

### 1. **Transporte MCP Nativo** 🔴 CRÍTICO
**Problema:** El SDK MCP (`@modelcontextprotocol/sdk`) **no está integrado** en el flujo de comunicación.

Hoy:
```
Claude (via HTTP OAuth) → MCP Server (HTTP + OAuth) → Tools
```

Debería ser:
```
Claude (stdio/SSE) → MCP Transport (stdio/SSE) → MCP Server → Tools
```

**Qué falta:**
- Middleware para procesar mensajes MCP (call_tool, resources, etc.) en formato JSON-RPC 2.0
- Transporte stdio (para Cursor, Claude Desktop, CLI)
- Transporte SSE (para web, Claude.ai)
- Integración del `createServer()` MCP SDK con `handleHttp`

**Impacto:** Sin esto, el servidor **no funciona con Claude.ai** como MCP server registrado.

### 2. **Integración con Orchestrator** 🟡 IMPORTANTE
**Problema:** Las tools MCP ejecutan directamente contra la API, sin pasar por el orquestador.

Ejemplo: `onboard_tenant` → `POST /api/tenants` (síncrono), pero debería:
```
MCP callTool(onboard_tenant) 
  → orchestrator.enqueueJob({ type: "onboard", ... })
  → retorna job_id inmediatamente
  → cliente poll `/api/jobs/{job_id}` para resultado
```

**Consecuencias:**
- Tareas largas (restaure de backups, migraciones) bloquean la conexión MCP
- Sin reintentos/exponential backoff integrado
- Imposible hacer circuit-breaker a nivel orquestador

**Qué falta:**
```typescript
// apps/mcp/src/lib/orchestrator-client.ts (NOT IMPLEMENTED)
export async function enqueueToolJob(toolName: string, input: unknown): Promise<JobHandle> {
  // Llama a orchestrator.enqueue() via HTTP o evento Redis
}
```

### 3. **Caché de Tools de Lectura** 🟡 MEJORA
**Problema:** `get_tenants`, `get_metrics` se consultan **cada vez** contra la API, sin caché.

**Qué falta:**
```typescript
// apps/mcp/src/lib/tool-cache.ts (NOT IMPLEMENTED)
const cache = new Redis.Cache({
  ttl: { get_tenants: 60, get_metrics: 30, ... }
});
```

**Beneficio:** Reducir latencia y carga en API para tools idempotentes.

### 4. **Rate Limiting por Scope** 🟡 MEJORA
**Problema:** No hay límite de llamadas por token/scope.

**Qué falta:**
```typescript
// apps/mcp/src/auth/rate-limiter.ts (NOT IMPLEMENTED)
export function checkRateLimit(payload: JwtPayload): void {
  // 100 calls/min por scope, con sliding window en Redis
}
```

### 5. **Observability MCP** 🟡 MEJORA
**Problema:** No hay métricas de tools (Prometheus).

**Qué falta:**
```typescript
// apps/mcp/src/monitoring/metrics.ts (NOT IMPLEMENTED)
// Métricas: 
// - mcp_tool_calls_total{tool, scope, status}
// - mcp_tool_duration_seconds{tool}
// - mcp_auth_failures_total{reason}
```

**Referencia:** `apps/orchestrator/src/monitoring/` → copiar patrón.

### 6. **Validación de Business Logic** 🟡 MEJORA
**Problema:** Zod solo valida tipos, no reglas de negocio.

Ejemplo:
```typescript
// onboard_tenant.ts — Hoy:
inputSchema: z.object({ slug: z.string(), ... })

// Debería:
if (!isValidSlug(slug)) throw new InvalidSlugError();
if (tenantExists(slug)) throw new TenantAlreadyExistsError();
```

### 7. **Error Handling Estandarizado** 🟡 MEJORA
**Problema:** Los errores no tienen formato MCP estándar.

Hoy: `throw new Error("...")`  
Debería: 
```typescript
{
  error: {
    code: "tenant_not_found" | "unauthorized" | "rate_limited",
    message: "...",
    data?: { ... }
  }
}
```

### 8. **Documentación de Integración Claude.ai** 🔴 CRÍTICO
**Problema:** No hay guía sobre **cómo registrar este MCP en Claude.ai**.

**Qué falta:**
```markdown
# Registrar MCP en Claude.ai

1. Ve a https://claude.ai/settings/mcp
2. Agrega:
   - Name: Opsly OpenClaw
   - URL: https://mcp.ops.smiletripcare.com
   - Client ID: claude-ai
   - Redirect: https://claude.ai/oauth/callback
3. Aprueba los scopes solicitados
```

---

## 🎯 MEJORÍAS RECOMENDADAS (Prioridad)

| Mejora | Prioridad | Tipo | Estimado | Bloqueante |
|--------|-----------|------|----------|-----------|
| Transporte MCP stdio | 🔴 P0 | Feature | 8h | SÍ (Claude.ai) |
| Integración orchestrator | 🔴 P0 | Arch | 6h | No, pero importante |
| Documentación Claude.ai | 🔴 P0 | Docs | 2h | SÍ (UX) |
| Caché Redis | 🟡 P1 | Perf | 3h | No |
| Rate limiting | 🟡 P1 | Security | 4h | No |
| Métricas Prometheus | 🟡 P1 | Observability | 3h | No |
| Validación BL | 🟡 P1 | Quality | 5h | No |
| Error handling MCP | 🟡 P1 | Quality | 2h | No |

---

## 📋 Checklist de Implementación

### Phase 1: Transporte MCP (Bloqueante)
- [ ] Reemplazar `http-health.ts` con `mcp-stdio-transport.ts` (stdio)
- [ ] Agregar handler para `callTool` (JSON-RPC 2.0)
- [ ] Agregar handler para `listTools`
- [ ] Agregar handler para `listResources` (opcional, para docs)
- [ ] Tests: stdio<→MCP roundtrip

### Phase 2: Orchestrator Integration
- [ ] `apps/mcp/src/lib/orchestrator-client.ts` → job enqueueing
- [ ] Marcar tools como `async_capable: true` en schema
- [ ] Tests: job lifecycle (enqueue → poll → result)

### Phase 3: Performance
- [ ] Redis cache wrapper para tools read-only
- [ ] Rate limiter OAuth scope-based
- [ ] Prometheus metrics exporter

### Phase 4: Quality & Docs
- [ ] Error handling unificado
- [ ] Validation layer (BL)
- [ ] Claude.ai integration guide
- [ ] Runbook: troubleshooting MCP

---

## 🔗 Referencias

- **ADR-009:** `docs/adr/ADR-009-openclaw-mcp-architecture.md`
- **MCP Spec:** https://spec.modelcontextprotocol.io/
- **Current Skills:** `skills/user/opsly-mcp/SKILL.md`
- **Orchestrator:** `apps/orchestrator/src/` (patrón de jobs)
- **Tests:** `apps/mcp/__tests__/`

---

## 📌 Notas Operativas

1. **Socket stdio:** Si implementas, necesitarás cambiar cómo arranca el servidor:
   ```bash
   # Hoy: PORT=3003 npm start (HTTP + OAuth)
   # Luego: npm start (stdio, sin puerto)
   ```

2. **Backward compatibility:** Mantener HTTP OAuth para:
   - Tests locales
   - Herramientas externas (cURL, scripts)
   - Otros clientes que no sean MCP-aware

3. **Deployment:** El servidor MCP debería:
   - Escuchar en stdio (producción)
   - Exponer HTTP health en puerto privado (liveness probe)
   - No exponer OAuth HTTP en producc directamente (solo via proxy)

---

**Próximo paso:** Implementar Phase 1 (transporte stdio) para que el MCP funcione con Claude.ai.
