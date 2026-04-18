/**
 * Trazas OAR para X-Ray: publicación fire-and-forget en Redis (Pub/Sub).
 *
 * @see docs/design/OAR.md — Fase 6 Tracing
 */

import type { Redis } from "ioredis";

/** Canal Pub/Sub para reconstruir el árbol de decisión del agente. */
export const OAR_TRACE_CHANNEL = "opsly:oar:trace";

export type OarTraceEventType =
  | "strategy_start"
  | "llm_call"
  | "tool_call"
  | "reflection_loop"
  | "reflection_result"
  | "strategy_end";

export class OarTracer {
  constructor(private readonly redis: Redis) {}

  /**
   * Publica un evento JSON en {@link OAR_TRACE_CHANNEL}. No lanza; errores de red se ignoran.
   */
  trace(
    sessionId: string,
    tenantSlug: string,
    eventType: OarTraceEventType,
    metadata: Record<string, unknown>,
  ): void {
    try {
      const envelope = {
        timestamp: new Date().toISOString(),
        sessionId,
        tenantSlug,
        eventType,
        metadata,
      };
      const payload = JSON.stringify(envelope);
      void this.redis.publish(OAR_TRACE_CHANNEL, payload).catch(() => undefined);
    } catch {
      /* JSON u otro error: no bloquear el runtime */
    }
  }
}

/** No-op si `tracer` es `undefined`. */
export function traceOar(
  tracer: OarTracer | undefined,
  sessionId: string,
  tenantSlug: string,
  eventType: OarTraceEventType,
  metadata: Record<string, unknown>,
): void {
  if (tracer === undefined) {
    return;
  }
  tracer.trace(sessionId, tenantSlug, eventType, metadata);
}
