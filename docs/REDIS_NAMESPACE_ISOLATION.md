# Redis Namespace Isolation en Opsly

## Visión General

Sistema de aislamiento per-tenant en Redis mediante namespaces prefijados. Garantiza que los datos de un tenant nunca se filtren a otro, incluso con bugs en el código.

## Patrón Global de Claves

```
tenant:{slug}:{service}:{data_type}:{identifier}
```

Donde:
- `tenant:` - prefijo literal
- `{slug}` - identificador único del tenant (ej: `acme`, `beta-corp`)
- `{service}` - componente de Opsly (`ctx`, `jobs`, `llm`)
- `{data_type}:{identifier}` - específico de cada servicio

## Servicios y Namespaces

### 1. Context Builder (`ctx`)

**Ubicación**: `/home/user/opsly/apps/context-builder/src/builder.ts`

Almacena sesiones y knowledge indexes (RAG).

```
tenant:{slug}:ctx:session:{sessionId}      # Conversaciones del usuario
tenant:{slug}:ctx:rag:{ragId}              # Knowledge base indexada
```

**Configuración**:
```env
CONTEXT_BUILDER_REDIS_NAMESPACE=ctx        # Namespace suffix (default: "ctx")
```

**API**:
- `getSessionContext(tenantSlug, sessionId)` - Obtener sesión
- `saveSessionContext(context)` - Guardar sesión (con TTL de 1 hora)
- `saveRAG(tenantSlug, ragId, ragData)` - Guardar RAG (TTL: 30 días)
- `loadRAG(tenantSlug, ragId)` - Cargar RAG
- `listRAGs(tenantSlug)` - Listar RAGs
- `deleteRAG(tenantSlug, ragId)` - Eliminar RAG

**Implementación**:
```typescript
// Internamente usa NamespacedRedis
async function getNamespacedRedis(tenantSlug: string): Promise<NamespacedRedis> {
  const redis = await getRedisClient();
  return new NamespacedRedis(redis, tenantSlug, CONTEXT_BUILDER_REDIS_NAMESPACE);
}

// Cada operación aplica namespace automáticamente
const ns = await getNamespacedRedis('acme');
await ns.setEx(`session:session-123`, 3600, JSON.stringify(data));
// Clave final en Redis: tenant:acme:ctx:session:session-123
```

### 2. LLM Gateway (`llm`)

**Ubicación**: `/home/user/opsly/apps/llm-gateway/src/cache.ts`

Almacena cache de respuestas LLM.

```
tenant:{slug}:llm:cache:{promptHash}       # Respuestas cacheadas
```

**Configuración**:
```env
LLM_GATEWAY_TENANT_AWARE=true              # Enable tenant-aware (default: false)
LLM_GATEWAY_REDIS_NAMESPACE=llm            # Namespace suffix (default: "llm")
```

**API**:
- `cacheGet(tenantSlug, promptHash)` - Obtener del cache
- `cacheSet(tenantSlug, promptHash, response)` - Guardar en cache (TTL: 2 horas)
- `getCacheStats(tenantSlug)` - Estadísticas del cache

**Características**:
- Backward compatible: legacy mode cuando `LLM_GATEWAY_TENANT_AWARE=false`
- En modo tenant-aware usa `NamespacedRedis`
- TTL configurable via `LLM_CACHE_TTL_SECONDS`

### 3. Orchestrator (`jobs`) - En Desarrollo

**Ubicación**: `/home/user/opsly/apps/orchestrator/src/engine.ts`

```
tenant:{slug}:jobs:job:{jobId}             # Datos del job
```

**Validación**: Cada job requiere `tenant_slug` como campo obligatorio.

```typescript
validateJobTenantIsolation(job, context);  // Lanza error si tenant_slug vacío
```

## Clase NamespacedRedis

Helper type-safe para Redis operations con namespace automático.

**Ubicación**: `apps/{service}/src/lib/redis-namespace-helper.ts`

```typescript
export class NamespacedRedis {
  constructor(redis: RedisClientType, tenantSlug: string, service: string);

  async get(key: string): Promise<string | null>
  async set(key: string, value: string): Promise<void>
  async setEx(key: string, ttlSeconds: number, value: string): Promise<void>
  async del(key: string | string[]): Promise<number>
  async exists(key: string): Promise<boolean>
  async keys(pattern: string): Promise<string[]>
  async ttl(key: string): Promise<number>
  async expire(key: string, ttlSeconds: number): Promise<boolean>
}
```

**Comportamiento**:
- Input: `"session:123"`
- Namespace: `"acme"`, Service: `"ctx"`
- Output Redis: `"tenant:acme:ctx:session:123"`

Retorna siempre claves relativas (sin el namespace).

## Tests

### Context Builder
- **Archivo**: `apps/context-builder/__tests__/redis-namespace.test.ts`
- **Verifica**:
  - Aislamiento entre tenants
  - TTL y expiración
  - KEYS pattern matching

### LLM Gateway
- **Archivo**: `apps/llm-gateway/__tests__/cache-namespace.test.ts`
- **Verifica**:
  - Cache per-tenant
  - Aislamiento entre tenants
  - Estadísticas

## Validación

### Script de Validación

**Ubicación**: `/home/user/opsly/scripts/validate-redis-namespace.sh`

```bash
./scripts/validate-redis-namespace.sh
```

**Funcionalidades**:
1. Verificación de conexión a Redis
2. Descubrimiento de tenants
3. Estadísticas por servicio
4. Detección de colisiones
5. Reporte global

**Salida esperada**:
```
✓ Validación EXITOSA: Namespace correctamente aislado

Patrones esperados:
  - tenant:{slug}:ctx:session:{id}
  - tenant:{slug}:ctx:rag:{id}
  - tenant:{slug}:llm:cache:{hash}
```

## Buenas Prácticas

### Para Desarrolladores

1. **Siempre usar NamespacedRedis**:
```typescript
// ✓ Correcto
const ns = await getNamespacedRedis(tenantSlug);
await ns.set('key', value);

// ✗ Incorrecto
const redis = await getRedisClient();
await redis.set(`tenant:${tenantSlug}:...`, value); // Bypassa namespace
```

2. **Validar tenant_slug en Jobs**:
```typescript
validateJobTenantIsolation(job, 'function_name');
```

3. **No hardcodear namespaces**:
```typescript
// ✓ Correcto
return new NamespacedRedis(redis, tenantSlug, SERVICE);

// ✗ Incorrecto - hardcoded tenant
return new NamespacedRedis(redis, 'acme', SERVICE);
```

### Para Operaciones

1. **Monitorear regularmente**:
```bash
./scripts/validate-redis-namespace.sh
```

2. **Configurar env vars**:
```env
LLM_GATEWAY_TENANT_AWARE=true
CONTEXT_BUILDER_REDIS_NAMESPACE=ctx
```

## Migración desde Código Antiguo

### Contexto Builder
- ✅ Completamente migrado a NamespacedRedis
- ✅ Todas las funciones actualizadas

### LLM Gateway
- ✅ Soporte dual (legacy + tenant-aware)
- ✅ Activar con `LLM_GATEWAY_TENANT_AWARE=true`

### Orchestrator
- En desarrollo
- Validación automática de tenant_slug

## Ventajas

1. **Seguridad**: Aislamiento per-tenant garantizado
2. **Escalabilidad**: Patrón consistente para nuevos servicios
3. **Observabilidad**: Fácil validar y auditar namespaces
4. **Backward compatible**: Funciona con código existente

## Troubleshooting

**P: Cómo sé si un servicio está usando namespaces?**
R: Busca `NamespacedRedis` o `buildTenantKey` en el archivo.

**P: ¿Qué pasa si tengo código antiguo sin namespaces?**
R: Usa `buildTenantKey()` para construir claves compatibles.

**P: ¿Puedo migrar gradualmente?**
R: Sí, LLM Gateway soporta legacy mode. Set `LLM_GATEWAY_TENANT_AWARE=false`.

## Véase También

- `.env.example` - Variables de configuración
- `scripts/validate-redis-namespace.sh` - Script de validación
- Tests en `__tests__/redis-namespace*.test.ts`
