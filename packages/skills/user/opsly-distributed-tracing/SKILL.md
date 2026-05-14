# Opsly Distributed Tracing Skill

> **Triggers:** `distributed tracing`, `tracing`, `opentelemetry`, `otel`, `traceparent`, `span`, `jaeger`, `tempo`, `request correlation`, `latency`, `p99`, `baggage`, `tenant_slug`, `request_id`
> **Priority:** CRITICAL
> **Skills relacionados:** `opsly-observability`, `opsly-telemetry`, `opsly-llm`, `opsly-api`, `opsly-orchestrator`, `opsly-architect`

## Cuándo usar

Úsalo cuando una petición cruza más de un servicio, necesitas aislar cuellos de botella, o quieres atribuir latencia y coste a una traza concreta. También aplica para auditoría por tenant y para depurar flujos OpenClaw / LLM Gateway sin perder `tenant_slug` ni `request_id`.

Si solo hace falta logging o métricas simples, usa `opsly-observability` o `opsly-telemetry` antes de añadir trazas nuevas.

## Qué hacer

1. Elegir el punto de entrada: API HTTP, worker BullMQ, adapter de LLM, cliente externo o proceso batch.
2. Inicializar OpenTelemetry una sola vez por proceso y antes de importar el framework principal.
3. Propagar contexto W3C (`traceparent`, `tracestate`) y conservar `tenant_slug` + `request_id` en atributos o baggage.
4. Crear un span raíz por request/job y spans hijos para DB, colas, llamadas HTTP y llamadas a LLM.
5. Añadir atributos de coste donde exista uso de IA: `llm.provider`, `llm.model`, `llm.tokens_in`, `llm.tokens_out`, `cost.usd`.
6. Exportar vía OTLP o el backend acordado, sin hardcodear endpoints ni credenciales.

## Patrones recomendados

```ts
import { context, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('opsly-api');

export async function withRequestSpan<T>(name: string, attrs: Record<string, unknown>, fn: () => Promise<T>) {
  const span = tracer.startSpan(name, { attributes: attrs });
  try {
    return await context.with(trace.setSpan(context.active(), span), fn);
  } catch (error) {
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
```

- Preferir `setAttributes`, `addEvent`, `recordException` y `setStatus` sobre logs sueltos.
- Usar nombres estables: `http.server`, `http.client`, `db.query`, `queue.consume`, `llm.call`.
- Reusar helpers existentes del repo antes de crear un bootstrap nuevo, especialmente en `apps/api/lib/observability-tracing.ts` y `lib/observability/tracing.ts`.

## Reglas

- No crear spans por cada línea de código ni por cada loop interno.
- No registrar secretos, prompts completos, tokens de acceso o payloads con PII sin redacción.
- No usar atributos de cardinalidad alta si no son necesarios para diagnóstico.
- No duplicar `request_id`: se propaga, no se inventa en cada hop.
- No mezclar coste de negocio con coste técnico: el coste de IA va en la traza, el resumen agregado va al sistema de métricas.

## Salida esperada

Al responder con una implementación, deja claro:

1. qué servicios quedaron instrumentados;
2. qué backend de trazas se usa;
3. qué atributos de correlación y coste se capturan;
4. cómo se valida la propagación end-to-end;
5. qué queda pendiente si hay un salto de contexto o un span hueco.

## Verificación

Casos mínimos a comprobar:

- una request HTTP conserva el mismo trace al pasar por API -> orchestrator -> LLM Gateway;
- un job en cola hereda `tenant_slug` y `request_id`;
- una llamada LLM publica `llm.model` y `cost.usd`;
- un fallo de downstream marca error en el span sin perder el trace padre;
- un campo sensible no aparece en atributos ni eventos.

## Seguimiento

Si la base del proceso aún no tiene OpenTelemetry, primero bootstrap del runtime y luego instrumentación por servicio. Si ya existe, solo amplía spans y propagación en los límites que falten.
