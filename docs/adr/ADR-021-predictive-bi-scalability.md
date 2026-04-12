# ADR-021: Estrategia de Escalabilidad - Predictive BI Engine

**Fecha:** 2026-04-12  
**Estado:** Propuesto  
**Decisor:** Arquitectura Opsly  
**Contexto:** Capa 2 - Predictive Business Intelligence Engine

---

## Problema

¿Cómo evitar que el cálculo de insights consuma toda la capacidad de la base de datos cuando tengamos 1000+ tenants?

## Factores Considerados

1. **Volumen de datos:** Cada tenant genera eventos (transacciones, mensajes, logs) que se agregan para generar insights
2. **Frecuencia:** Los insights se regeneran periódicamente (diario/horario)
3. **Multi-tenant:** Los datos de un tenant nunca deben contaminar las predicciones de otro
4. **Costo:** Minimizar llamadas a LLMs externos; usar matemáticas estadísticas locales
5. **Latencia:** Los insights deben estar disponibles rápidamente cuando el usuario los solicite

## Opciones Consideradas

### Opción 1: Cálculo en Tiempo Real (DESCARTADA)

**Descripción:** Calcular insights en el momento que el usuario los solicita.

**Pros:**
- Siempre datos actualizados
- Sin almacenamiento de predicciones

**Contras:**
- ❌ Latencia alta en primera consulta
- ❌ Picos de CPU/DB impredecibles
- ❌ Timeout en requests HTTP
- ❌ No escala con 1000 tenants concurrentes

### Opción 2: Cálculo Batch Programado (SELECCIONADA)

**Descripción:** Generar insights en background jobs programados (BullMQ), guardar en tabla `tenant_insights`, servir desde cache.

**Pros:**
- ✅ Consultas rápidas (< 100ms)
- ✅ Consumo predecible de recursos
- ✅ Aislado por tenant
- ✅ Reintentos automáticos en caso de fallo
- ✅ Priorización por plan (enterprise primero)

**Contras:**
- ⚠️ Datos pueden tener hasta X horas de antigüedad
- ⚠️ Requiere infraestructura de colas

### Opción 3: Materialized Views + pgvector (FUTURA)

**Descripción:** Usar PostgreSQL materialized views para pre-calcular agregaciones y pgvector para clustering de comportamientos.

**Pros:**
- ✅ Consultas SQL optimizadas
- ✅ Pattern matching vectorial

**Contras:**
- ⚠️ Requiere extensión pgvector habilitada
- ⚠️ Más complejo de mantener

---

## Decisión

**Seleccionamos Opción 2: Cálculo Batch Programado con BullMQ**

Implementación en fases:

### Fase 1: MVP (100 tenants)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Scheduler  │────▶│ BullMQ Job  │────▶│  Insights   │
│  (Cron)     │     │  Worker     │     │  Table      │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Redis Cache  │
                    │ (5 min TTL)  │
                    └──────────────┘
```

**Configuración:**
- Worker concurrency: 5
- Job retry: 3 intentos con backoff exponencial
- Lock por tenant para evitar duplicación
- Insights activos: TTL 24h

### Fase 2: Escalado (100-1000 tenants)

```
┌─────────────────────────────────────────────────────────┐
│                    Redis Queue                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ priority│  │ priority│  │ priority│                 │
│  │ queue_0 │  │ queue_1 │  │ queue_2 │                 │
│  │(entrp.) │  │(busin.) │  │(startup)│                 │
│  └─────────┘  └─────────┘  └─────────┘                 │
└─────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Worker Pool │  │ Worker Pool │  │ Worker Pool │
│  (5 proc)   │  │  (3 proc)   │  │  (1 proc)   │
└─────────────┘  └─────────────┘  └─────────────┘
```

**Mejoras:**
- Colas separadas por prioridad (plan del tenant)
- Más workers para tenants enterprise
- Rate limiting por tenant
- Circuit breaker para queries pesadas

### Fase 3: Paralelización (1000+ tenants)

```
┌─────────────────────────────────────────────────────────┐
│                    Kubernetes / VMs                      │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Worker     │  │  Worker     │  │  Worker     │     │
│  │  Pod 1      │  │  Pod 2      │  │  Pod N      │     │
│  │  (5 conc.)  │  │  (5 conc.)  │  │  (5 conc.)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│              ┌───────────────────────┐                  │
│              │   Shared Redis Queue  │                  │
│              └───────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

**Características:**
- Auto-scaling basado en queue depth
- Workers en containers separados
- Límite de concurrencia global
- Sharding de Redis para alta disponibilidad

---

## Arquitectura de Base de Datos

### Particionamiento de Tablas

```sql
-- Particionar por tenant_id (hash)
CREATE TABLE platform.tenant_insights (
    ...
)
PARTITION BY HASH (tenant_id);

-- Crear 16 particiones
CREATE TABLE platform.tenant_insights_0 PARTITION OF platform.tenant_insights
    FOR VALUES WITH (MODULUS 16, REMAINDER 0);
-- ... hasta 15
```

### Índices Optimizados

```sql
-- Índice compuesto para consultas frecuentes
CREATE INDEX idx_insights_tenant_active 
    ON platform.tenant_insights (tenant_id, status) 
    WHERE status = 'active';

-- Índice para limpieza periódica
CREATE INDEX idx_insights_expires 
    ON platform.tenant_insights (expires_at) 
    WHERE expires_at IS NOT NULL;
```

### Cleanup Automatizado

```sql
-- Función para limpiar insights expirados
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS INTEGER AS $$
DECLARE
    deleted INTEGER;
BEGIN
    DELETE FROM platform.tenant_insights
    WHERE expires_at < NOW() - INTERVAL '7 days'
      AND status != 'actioned';
    
    GET DIAGNOSTICS deleted = ROW_COUNT;
    RETURN deleted;
END;
$$ LANGUAGE plpgsql;

-- Vacuum automático
VACUUM ANALYZE platform.tenant_insights;
```

---

## Estrategia de Costos

### Computation Budget por Tenant

```typescript
interface TenantComputationBudget {
  max_computation_time_ms: number;
  max_data_points: number;
  max_insights_per_cycle: number;
}

// Por plan
const BUDGETS = {
  startup: { max_computation_time_ms: 500, max_data_points: 1000, max_insights_per_cycle: 5 },
  business: { max_computation_time_ms: 2000, max_data_points: 10000, max_insights_per_cycle: 10 },
  enterprise: { max_computation_time_ms: 10000, max_data_points: 100000, max_insights_per_cycle: 20 }
};
```

### Rate Limiting

```typescript
// Límite de jobs por tenant por hora
const RATE_LIMITS = {
  startup: { max_jobs_per_hour: 2, max_concurrent: 1 },
  business: { max_jobs_per_hour: 5, max_concurrent: 2 },
  enterprise: { max_jobs_per_hour: 20, max_concurrent: 5 }
};
```

---

## Monitoreo

### Métricas Clave

```typescript
const METRICS = {
  // Latencia
  'insight.generation.duration': 'histogram',
  'insight.generation.tenant.count': 'counter',
  
  // Errores
  'insight.generation.errors': 'counter',
  'insight.generation.timeout': 'counter',
  
  // Queue
  'insight.queue.depth': 'gauge',
  'insight.queue.wait_time': 'histogram',
  
  // Calidad
  'insight.action.rate': 'counter', // Cuántos insights son "actioned"
  'insight.dismiss.rate': 'counter' // Cuántos son "dismissed"
};
```

### Alertas

```yaml
alerts:
  - name: HighQueueDepth
    condition: queue_depth > 1000
    severity: warning
    
  - name: GenerationLatencyHigh
    condition: p95_generation_time > 5s
    severity: warning
    
  - name: HighErrorRate
    condition: error_rate > 5%
    severity: critical
```

---

## Privacidad y Aislamiento

### Reglas Fijas

1. **Nunca cruzar datos entre tenants** - Cada insight se calcula solo con datos del tenant
2. **RLS activo en todas las tablas** - Row Level Security en PostgreSQL
3. **Service role nunca expuesto al cliente** - Solo en server-side
4. **Logs sin PII** - Emails, nombres, etc. nunca en logs

### Implementación

```typescript
// El worker NUNCA hace JOIN entre tenants
async function generateInsights(tenantId: string) {
  // 1. Obtener SOLO datos del tenant específico
  const metrics = await getTenantMetrics(tenantId); // WHERE tenant_id = ?
  
  // 2. Calcular insights SOLO para ese tenant
  const insights = calculateInsights(metrics); // Sin acceso a otros datos
  
  // 3. Guardar SOLO con el tenant_id correcto
  await saveInsights(tenantId, insights); // INSERT ... tenant_id = ?
  
  return insights;
}
```

---

## Cronograma de Implementación

| Fase | Alcance | Tiempo | Complexity |
|------|---------|--------|------------|
| 1 | MVP - BullMQ worker básico | 1 semana | Baja |
| 2 | Priorización por plan | 2-3 días | Baja |
| 3 | Rate limiting | 1 semana | Media |
| 4 | Auto-scaling config | 1 semana | Alta |
| 5 | Particionamiento BD | 2 días | Media |
| 6 | Monitoreo completo | 1 semana | Media |

---

## Consecuencias

### Positivas

- ✅ Consultas de insights < 100ms (desde cache)
- ✅ Consumo de recursos predecible y controlable
- ✅ Aislamiento total entre tenants
- ✅ Priorización natural por plan (más recursos = enterprise)
- ✅ Retry automático en caso de fallos

### Negativas

- ⚠️ Insights pueden tener hasta 24h de antigüedad (acceptable para BI)
- ⚠️ Requiere mantener infraestructura Redis + BullMQ
- ⚠️ Complejidad operacional adicional

### Mitigaciones para Negativas

- Para casos de uso críticos: permitir "generación on-demand" como acción manual
- Cache corto (5 min) para lecturas frecuentes
- Dashboard de monitoreo para observar estado de colas

---

## Referencias

- [BullMQ Documentation](https://docs.bullmq.io/)
- [PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [ADR-009 OpenClaw MCP Architecture](./ADR-009-openclaw-mcp-architecture.md)
- [Capa 2 Spec](./CAPA-2-PREDICTIVE-BI-SPEC.md)
