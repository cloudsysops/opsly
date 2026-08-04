---
status: in-progress
owner: operations
last_review: 2026-08-04
type: design
tags:
  - opsly/architecture
  - agent-execution
---

# Agent Execution Improvements — Plan Maestro (2026-08)

**Objetivo:** consolidar las mejoras incrementales en ejecución de agentes para garantizar confiabilidad, observabilidad y recuperación automática en producción.

**Rama de trabajo:** `claude/agent-execution-improvement-o02qo3`

**Timeline:** 3 semanas (Sprint 26-27)

---

## 1. Error Classification y Repair Queue (Incremento 1)

### Problema
- Los workers fallan y reintentan a ciegas sin distinguir si el error es **recuperable**.
- No hay diferenciación entre: créditos agotados, timeout, rate limit, error de configuración, irrecuperable.
- Falta mecanismo de **escalada inteligente** a operadores cuando sea necesario.

### Solución
Implementar la arquitectura de repair queue definida en `docs/orchestrator/REPAIR-QUEUE.md`:

**Módulo nuevo:** `lib/orchestrator-error-classifier`
```typescript
// lib/orchestrator-error-classifier/src/types.ts
export type ErrorCategory = 
  | 'credits_exhausted'
  | 'rate_limit'
  | 'timeout'
  | 'config_error'
  | 'provider_error'
  | 'irrecuperable'
  | 'unknown';

export type RepairStrategy = 
  | 'auto_retry'          // Reintentar automáticamente
  | 'operator_review'     // Requiere intervención humana
  | 'fail_fast';          // No reparable

export interface ClassifiedError {
  category: ErrorCategory;
  strategy: RepairStrategy;
  message: string;
  isRecoverable: boolean;
  suggestedAction: string;
  metadata: Record<string, unknown>;
}
```

**Worker mejorado:**
```typescript
// apps/orchestrator/src/workers/enhanced-worker-base.ts
export abstract class EnhancedWorkerBase extends BaseWorker {
  protected async handleJobFailure(
    job: Job<OrchestratorJob>,
    error: Error
  ): Promise<void> {
    const classified = classifyError(error, job.data);
    
    if (classified.strategy === 'operator_review') {
      await this.enqueueRepair(job, classified);
    } else if (classified.strategy === 'auto_retry') {
      throw error; // BullMQ manejará el reintento
    } else {
      await this.logFailure(job, classified);
    }
  }
  
  private async enqueueRepair(
    job: Job<OrchestratorJob>,
    classified: ClassifiedError
  ): Promise<void> {
    const repairJob = {
      ...job.data,
      type: 'repair',
      repairMetadata: {
        originalJobId: job.id,
        category: classified.category,
        originalError: classified.message,
        suggestedAction: classified.suggestedAction,
        timestamp: Date.now(),
      }
    };
    
    await queue.add('repair', repairJob, {
      priority: 100, // Alta prioridad para repairs
      attempts: 1,   // Sin reintento automático
      delay: 5000,   // Esperar 5s antes de procesar
    });
  }
}
```

### Entregables
- ✅ `lib/orchestrator-error-classifier/` — tipos + `classifyError`
- ✅ `ClassificationRules` — política por categoría (créditos → auto_retry, config → operator_review, etc.)
- ✅ Worker enhancement mixin — `EnhancedWorkerBase`
- ✅ `RepairWorker` en orchestrator — maneja jobs en cola `repair`
- ✅ Tests — casos de error por categoría (`__tests__/error-classifier.test.ts`)

---

## 2. Observabilidad Estructurada Mejorada (Incremento 2)

### Problema
- Logs parcialmente estructurados; falta contexto correlativo para traces distribuidas.
- Sin métricas de latencia por categoría de error.
- Sin visibilidad de ciclos repair (cuántos jobs entran en repair, cuántos se resuelven).

### Solución
Extender `lib/observability` con capacidades de tracing distribuido y métricas por worker:

**Tipos nuevos:**
```typescript
// lib/observability/src/distributed-tracing.ts
export interface ExecutionTrace {
  traceId: string;          // Correlaciona todos los logs
  spanId: string;           // Identificador del span
  parentSpanId?: string;    // Para traces anidadas
  duration_ms: number;
  status: 'success' | 'error' | 'cancelled';
  worker: string;
  job_type: OrchestratorJob['type'];
  tenant_slug: string;
  request_id: string;
  error?: {
    category: ErrorCategory;
    message: string;
  };
}

export interface WorkerMetrics {
  worker: string;
  totalJobs: number;
  successCount: number;
  errorCount: number;
  repairCount: number;
  avgDuration_ms: number;
  errorsByCategory: Record<ErrorCategory, number>;
}
```

**Logging mejorado:**
```typescript
// apps/orchestrator/src/observability/enhanced-job-log.ts
export function logJobWithTrace(
  job: OrchestratorJob,
  event: 'job_start' | 'job_complete' | 'job_fail',
  metadata?: Record<string, unknown>,
  error?: Error
): void {
  const trace: ExecutionTrace = {
    traceId: job.request_id,
    spanId: generateSpanId(),
    duration_ms: Date.now() - job.startTime,
    status: event === 'job_complete' ? 'success' : event === 'job_fail' ? 'error' : 'pending',
    worker: job.type,
    job_type: job.type,
    tenant_slug: job.tenant_slug,
    request_id: job.request_id,
    ...(error && { error: {
      category: classifyError(error, job).category,
      message: error.message,
    }})
  };
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    trace,
    metadata,
  }));
}
```

**Dashboard metrices (tiempo real vía Redis):**
```typescript
// apps/orchestrator/src/metrics/worker-stats.ts
export class WorkerMetricsCollector {
  async getWorkerStats(worker: string): Promise<WorkerMetrics> {
    // Leer de Redis con TTL 5 minutos
    const key = `metrics:worker:${worker}`;
    return await redis.hgetall(key);
  }
  
  async recordJobCompletion(
    job: OrchestratorJob,
    duration_ms: number,
    status: 'success' | 'error'
  ): Promise<void> {
    const key = `metrics:worker:${job.type}`;
    await redis.hincrby(key, status === 'success' ? 'successCount' : 'errorCount', 1);
    await redis.lpush(
      `metrics:worker:${job.type}:durations`,
      duration_ms
    );
    await redis.expire(key, 300); // TTL 5 minutos
  }
}
```

### Entregables
- ✅ `lib/observability/distributed-tracing.ts` — tipos + logging mejorado
- ✅ `apps/orchestrator/src/metrics/worker-stats.ts` — recolector de métricas
- ✅ Integración en todos los workers — usar `logJobWithTrace`
- ✅ Health endpoint mejorado — `GET /health` devuelve métricas por worker
- ✅ Dashboard admin opcional — tabla de worker stats

---

## 3. Concurrency Optimization por Plan (Incremento 3)

### Problema
- Workers usan concurrency fija sin considerar el plan del tenant.
- Enterprise debería procesar más jobs en paralelo, Startup menos.
- No hay límites dinámicos según carga del sistema.

### Solución
Implementar política de concurrency dinámica:

```typescript
// apps/orchestrator/src/queue/concurrency-policy.ts
export interface ConcurrencyPolicy {
  plan: 'enterprise' | 'business' | 'startup';
  baseWorkerConcurrency: number;
  cpuThreshold: number;    // Si CPU > 80%, reducir
  memoryThreshold: number; // Si MEM > 85%, reducir
  maxBurst: number;        // Máximo temporal en picos
}

export async function getDynamicConcurrency(
  worker: string,
  tenantPlan: string,
  systemMetrics: SystemMetrics
): Promise<number> {
  const policy = CONCURRENCY_POLICIES[tenantPlan] || CONCURRENCY_POLICIES.startup;
  
  let concurrency = policy.baseWorkerConcurrency;
  
  // Reducir si hay presión en sistema
  if (systemMetrics.cpuUsage > policy.cpuThreshold) {
    concurrency = Math.max(1, concurrency - 1);
  }
  if (systemMetrics.memoryUsage > policy.memoryThreshold) {
    concurrency = Math.max(1, concurrency - 2);
  }
  
  return concurrency;
}

const CONCURRENCY_POLICIES: Record<string, ConcurrencyPolicy> = {
  enterprise: {
    plan: 'enterprise',
    baseWorkerConcurrency: 10,
    cpuThreshold: 80,
    memoryThreshold: 85,
    maxBurst: 15,
  },
  business: {
    plan: 'business',
    baseWorkerConcurrency: 5,
    cpuThreshold: 75,
    memoryThreshold: 80,
    maxBurst: 8,
  },
  startup: {
    plan: 'startup',
    baseWorkerConcurrency: 2,
    cpuThreshold: 70,
    memoryThreshold: 75,
    maxBurst: 3,
  },
};
```

**Integración en workers:**
```typescript
// apps/orchestrator/src/workers/cursor-worker.ts
export class CursorWorker extends EnhancedWorkerBase {
  private concurrencyPolicy: ConcurrencyPolicy;
  
  constructor(connection: Redis) {
    const initialConcurrency = CONCURRENCY_POLICIES.startup.baseWorkerConcurrency;
    
    super('openclaw', handler, {
      connection,
      concurrency: initialConcurrency,
    });
    
    // Ajustar concurrency cada 30s
    this.setupConcurrencyWatcher();
  }
  
  private setupConcurrencyWatcher() {
    setInterval(async () => {
      const metrics = await getSystemMetrics();
      const tenantPlan = await resolveTenantPlan(this.job?.data?.tenant_slug);
      
      const newConcurrency = await getDynamicConcurrency(
        'cursor',
        tenantPlan,
        metrics
      );
      
      if (newConcurrency !== this.opts.concurrency) {
        await this.worker.setOptions({ concurrency: newConcurrency });
      }
    }, 30_000);
  }
}
```

### Entregables
- ✅ `apps/orchestrator/src/queue/concurrency-policy.ts` — política y resolver dinámico
- ✅ `EnhancedWorkerBase` refactor — incluir `setupConcurrencyWatcher`
- ✅ Tests — casos de reducción por CPU/memoria
- ✅ Health endpoint — exponer concurrency actual por worker

---

## 4. Garantías de Idempotencia (Incremento 4)

### Problema
- `idempotency_key` se maneja a nivel de BullMQ `jobId`, pero no hay validación en workers.
- Sin mecanismo de **deduplicación en base de datos** para side-effects.
- Reintentos pueden causar efectos duplicados (notificaciones, llamadas API).

### Solución
Implementar idempotencia con almacenamiento de resultados:

```typescript
// lib/idempotency-store/src/idempotency-service.ts
export interface IdempotencyRecord {
  idempotency_key: string;
  tenant_slug: string;
  request_id: string;
  result: unknown;
  error?: Error;
  createdAt: Date;
  expiresAt: Date;
}

export class IdempotencyService {
  async recordCompletion(
    idempotencyKey: string,
    tenantSlug: string,
    requestId: string,
    result: unknown,
    ttlSeconds = 3600
  ): Promise<void> {
    const key = `idempotency:${tenantSlug}:${idempotencyKey}`;
    await redis.set(
      key,
      JSON.stringify({
        idempotency_key: idempotencyKey,
        tenant_slug: tenantSlug,
        request_id: requestId,
        result,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      }),
      'EX',
      ttlSeconds
    );
  }
  
  async getResult(
    idempotencyKey: string,
    tenantSlug: string
  ): Promise<unknown | null> {
    const key = `idempotency:${tenantSlug}:${idempotencyKey}`;
    const record = await redis.get(key);
    return record ? JSON.parse(record).result : null;
  }
}
```

**Worker con idempotencia:**
```typescript
// apps/orchestrator/src/workers/notify-worker.ts
export class NotifyWorker extends EnhancedWorkerBase {
  private idempotencyService = new IdempotencyService();
  
  async handler(job: Job<OrchestratorJob>): Promise<void> {
    // Verificar si ya se ejecutó
    if (job.data.idempotency_key) {
      const cached = await this.idempotencyService.getResult(
        job.data.idempotency_key,
        job.data.tenant_slug
      );
      
      if (cached !== null) {
        job.log(`✓ Idempotent skip: already notified`);
        return cached;
      }
    }
    
    // Ejecutar acción
    const result = await notifyDiscord(job.data);
    
    // Guardar resultado
    if (job.data.idempotency_key) {
      await this.idempotencyService.recordCompletion(
        job.data.idempotency_key,
        job.data.tenant_slug,
        job.data.request_id,
        result
      );
    }
    
    return result;
  }
}
```

### Entregables
- ✅ `lib/idempotency-store/` — servicio + tipos
- ✅ Integración en workers críticos — notify, drive, n8n
- ✅ TTL configurable por tenant
- ✅ Tests — deduplicación con múltiples reintentos

---

## 5. Circuit Breaker y Rate Limiting (Incremento 5)

### Problema
- Sin protección contra cascadas de errores.
- Sin rate limiting por tenant/worker.
- Un tenant problemático puede ralentizar a otros.

### Solución
Implementar circuit breaker pattern:

```typescript
// lib/circuit-breaker/src/breaker.ts
export enum CircuitState {
  Closed,   // Normal
  Open,     // Bloqueado
  HalfOpen, // Probando recuperación
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Fallos antes de abrir
  successThreshold: number;    // Éxitos para cerrar
  timeout: number;             // ms antes de half-open
  name: string;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.Closed;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.Open) {
      if (Date.now() - (this.lastFailureTime || 0) > this.config.timeout) {
        this.state = CircuitState.HalfOpen;
      } else {
        throw new Error(`Circuit breaker ${this.config.name} is OPEN`);
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HalfOpen) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.Closed;
        this.successCount = 0;
      }
    }
  }
  
  private onFailure() {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.Open;
    }
  }
}
```

**Integración con workers:**
```typescript
// apps/orchestrator/src/workers/n8n-worker.ts
const n8nCircuitBreaker = new CircuitBreaker({
  name: 'n8n-api',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60_000,
});

export class N8nWorker extends EnhancedWorkerBase {
  async handler(job: Job<OrchestratorJob>): Promise<void> {
    return await n8nCircuitBreaker.execute(async () => {
      return await triggerN8nWorkflow(job.data);
    });
  }
}
```

### Entregables
- ✅ `lib/circuit-breaker/` — implementación + tipos
- ✅ Integración en workers de terceros — n8n, drive
- ✅ Health endpoint — estado de circuit breakers
- ✅ Tests — transiciones de estado

---

## 6. Integración y Testing (Incremento 6)

### End-to-End Testing
```typescript
// apps/orchestrator/__tests__/e2e/agent-execution-improvement.test.ts
describe('Agent Execution Improvements', () => {
  describe('Error Classification', () => {
    it('should classify credits_exhausted and enqueue repair', async () => {
      const job = createTestJob({ tenant_slug: 'test' });
      const error = new Error('Insufficient credits');
      
      const classified = classifyError(error, job);
      expect(classified.category).toBe('credits_exhausted');
      expect(classified.strategy).toBe('operator_review');
      expect(classified.isRecoverable).toBe(true);
    });
  });
  
  describe('Idempotency', () => {
    it('should skip duplicate calls with same idempotency_key', async () => {
      const idempotencyKey = 'test-key-123';
      
      // First call
      await notifyWorker.handler({
        data: { idempotency_key: idempotencyKey, tenant_slug: 'test' },
      });
      
      // Second call with same key
      const result2 = await notifyWorker.handler({
        data: { idempotency_key: idempotencyKey, tenant_slug: 'test' },
      });
      
      expect(result2).toBe(result1); // Cached
    });
  });
  
  describe('Dynamic Concurrency', () => {
    it('should reduce concurrency when CPU > threshold', async () => {
      mockSystemMetrics({ cpuUsage: 85, memoryUsage: 50 });
      
      const concurrency = await getDynamicConcurrency(
        'cursor',
        'enterprise',
        systemMetrics
      );
      
      expect(concurrency).toBeLessThan(10); // enterprise base = 10
    });
  });
  
  describe('Circuit Breaker', () => {
    it('should open after failure threshold', async () => {
      const breaker = new CircuitBreaker({
        name: 'test',
        failureThreshold: 3,
        successThreshold: 1,
        timeout: 1000,
      });
      
      // 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {}
      }
      
      expect(breaker.getState()).toBe(CircuitState.Open);
      
      // Next call should fail immediately
      await expect(breaker.execute(() => Promise.resolve())).rejects.toThrow();
    });
  });
});
```

---

## 7. Roadmap de Implementación

| Semana | Incremento | Deliverables | PR |
|--------|-----------|--------------|-----|
| 26.1   | 1         | Error classifier, RepairWorker, tests | #??? |
| 26.2   | 2         | Distributed tracing, worker metrics | #??? |
| 26.3   | 3         | Concurrency policy, dynamic adjustment | #??? |
| 27.1   | 4         | Idempotency store, worker integration | #??? |
| 27.2   | 5         | Circuit breaker, health endpoints | #??? |
| 27.3   | 6         | E2E tests, documentation, demo | #??? |

---

## 8. Métricas de Éxito

- ✅ **90% de jobs completados sin manual intervention** (mejora de error classification)
- ✅ **0 duplicate notifications** (idempotency enforcement)
- ✅ **<5% de jobs en repair** (baseline: establecer en primera semana)
- ✅ **100% type-check + test coverage** (lib modules + workers)
- ✅ **Latencia p95 < 10s** para jobs simples (notify, webhook)

---

## 9. Referencias

- `docs/orchestrator/REPAIR-QUEUE.md` — diseño base
- `docs/00-architecture/ORCHESTRATOR.md` — arquitectura workers
- `AGENTS.md` — estado operativo
- `docs/adr/ADR-020-orchestrator-worker-separation.md` — decisión de arquitectura

---

*Última actualización: 2026-08-04*
