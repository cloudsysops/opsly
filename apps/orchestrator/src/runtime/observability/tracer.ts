/**
 * Trazas OAR para X-Ray: publicación fire-and-forget en Redis (Pub/Sub) y, opcionalmente,
 * envío a Langfuse (self-hosted) para visualización del grafo en la UI.
 *
 * @see docs/design/OAR.md — Fase 6 Tracing
 */

import type { Redis } from "ioredis";
import { Langfuse } from "langfuse";
import type {
  LangfuseGenerationClient,
  LangfuseSpanClient,
  LangfuseTraceClient,
} from "langfuse";

/** Canal Pub/Sub para reconstruir el árbol de decisión del agente. */
export const OAR_TRACE_CHANNEL = "opsly:oar:trace";

export type OarTraceEventType =
  | "strategy_start"
  | "llm_call"
  | "tool_call"
  | "reflection_loop"
  | "reflection_result"
  | "strategy_end";

/**
 * Metadatos de eventos X-Ray. Las claves `input` / `output` / `toolResult` alimentan Langfuse
 * (generaciones y observaciones); el resto se publica igual en Redis.
 */
export type OarTraceMetadata = Record<string, unknown> & {
  /** Prompt o cuerpo enviado al LLM (ReAct / planning / síntesis). */
  input?: unknown;
  /** Respuesta textual del LLM. */
  output?: unknown;
  /** Resultado de la herramienta (p. ej. `observation` del puerto de acciones). */
  toolResult?: unknown;
};

type SessionTraceState = {
  trace: LangfuseTraceClient;
  /** Última generación; solo se anidan `tool_call` bajo ella en estrategia ReAct. */
  lastGeneration: LangfuseGenerationClient | null;
  /** Span abierto para emparejar reflection_loop → reflection_result. */
  reflectionSpan: LangfuseSpanClient | null;
  strategyKind: "react" | "plan_execute" | "unknown";
};

function readString(meta: Record<string, unknown>, key: string): string | undefined {
  const v = meta[key];
  return typeof v === "string" ? v : undefined;
}

/** Entrada de la generación Langfuse: prioriza `metadata.input` del trace OAR. */
function langfuseGenerationInput(meta: OarTraceMetadata): unknown {
  if (meta.input !== undefined) {
    return meta.input;
  }
  return (
    readString(meta, "prompt") ??
    readString(meta, "planningPrompt") ??
    meta
  );
}

/** Salida de la generación Langfuse: prioriza `metadata.output` del trace OAR. */
function langfuseGenerationOutput(meta: OarTraceMetadata): unknown {
  if (meta.output !== undefined) {
    return meta.output;
  }
  return (
    readString(meta, "completion") ??
    readString(meta, "raw") ??
    readString(meta, "synthesisRaw")
  );
}

/** Entrada del span de tool: prioriza `metadata.input` (p. ej. args). */
function langfuseToolInput(meta: OarTraceMetadata): unknown {
  if (meta.input !== undefined) {
    return meta.input;
  }
  return {
    args: meta.args,
    stepId: meta.stepId,
    stepIndex: meta.stepIndex,
  };
}

function resolveLangfuseBaseUrl(): string {
  return (
    process.env.LANGFUSE_HOST ??
    process.env.LANGFUSE_BASE_URL ??
    "http://localhost:3000"
  );
}

export class OarTracer {
  private readonly langfuse: Langfuse | undefined;
  private readonly sessions = new Map<string, SessionTraceState>();

  constructor(private readonly redis: Redis) {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    if (publicKey && secretKey) {
      try {
        this.langfuse = new Langfuse({
          publicKey,
          secretKey,
          baseUrl: resolveLangfuseBaseUrl(),
        });
      } catch (err) {
        console.error("[OarTracer] Langfuse client init failed:", err);
      }
    }
  }

  /**
   * Publica un evento JSON en {@link OAR_TRACE_CHANNEL} y, si Langfuse está configurado,
   * ingiere el mismo evento de forma asíncrona. No lanza; fallos de observabilidad no detienen el runtime.
   */
  trace(
    sessionId: string,
    tenantSlug: string,
    eventType: OarTraceEventType,
    metadata: OarTraceMetadata,
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

    void this.ingestLangfuse(sessionId, tenantSlug, eventType, metadata).catch((err: unknown) => {
      console.error("[OarTracer] Langfuse ingest failed:", err);
    });
  }

  private async ingestLangfuse(
    sessionId: string,
    tenantSlug: string,
    eventType: OarTraceEventType,
    metadata: OarTraceMetadata,
  ): Promise<void> {
    const client = this.langfuse;
    if (client === undefined) {
      return;
    }

    try {
      if (eventType === "strategy_start") {
        this.langfuseStrategyStart(client, sessionId, tenantSlug, metadata);
      } else if (eventType === "strategy_end") {
        await this.langfuseStrategyEnd(client, sessionId, metadata);
      } else if (eventType === "llm_call") {
        this.langfuseLlmCall(client, sessionId, tenantSlug, metadata);
      } else if (eventType === "tool_call") {
        this.langfuseToolCall(client, sessionId, tenantSlug, metadata);
      } else if (eventType === "reflection_loop") {
        this.langfuseReflectionLoop(client, sessionId, tenantSlug, metadata);
      } else if (eventType === "reflection_result") {
        this.langfuseReflectionResult(sessionId, metadata);
      }
    } catch (err) {
      console.error("[OarTracer] Langfuse ingest error:", err);
    }
  }

  private langfuseStrategyStart(
    client: Langfuse,
    sessionId: string,
    tenantSlug: string,
    metadata: OarTraceMetadata,
  ): void {
    const kindRaw = metadata.type;
    const strategyKind =
      kindRaw === "react" || kindRaw === "plan_execute" ? kindRaw : "unknown";
    const trace = client.trace({
      id: sessionId,
      name: "OAR Execution",
      userId: tenantSlug,
      sessionId,
      metadata,
    });
    this.sessions.set(sessionId, {
      trace,
      lastGeneration: null,
      reflectionSpan: null,
      strategyKind,
    });
  }

  private async langfuseStrategyEnd(
    client: Langfuse,
    sessionId: string,
    metadata: OarTraceMetadata,
  ): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (state !== undefined) {
      state.trace.update({ output: metadata });
      if (state.reflectionSpan !== null) {
        state.reflectionSpan.end({ output: { closed: "strategy_end" } });
      }
      this.sessions.delete(sessionId);
    }
    await client.flushAsync();
  }

  private langfuseLlmCall(
    client: Langfuse,
    sessionId: string,
    tenantSlug: string,
    metadata: OarTraceMetadata,
  ): void {
    const state = this.ensureTrace(client, sessionId, tenantSlug);
    const model = readString(metadata, "model");
    const phaseLabel = readString(metadata, "phase");
    const name = phaseLabel === undefined ? "llm_call" : `llm_call:${phaseLabel}`;
    const generation = state.trace.generation({
      name,
      model,
      input: langfuseGenerationInput(metadata),
      output: langfuseGenerationOutput(metadata),
      metadata,
    });
    const phase = readString(metadata, "phase");
    if (phase === "planning") {
      state.lastGeneration = null;
    } else if (state.strategyKind === "react") {
      state.lastGeneration = generation;
    } else {
      state.lastGeneration = null;
    }
  }

  private langfuseToolCall(
    client: Langfuse,
    sessionId: string,
    tenantSlug: string,
    metadata: OarTraceMetadata,
  ): void {
    const state = this.ensureTrace(client, sessionId, tenantSlug);
    const toolName = readString(metadata, "toolName") ?? "tool_call";
    const parent =
      state.strategyKind === "react" && state.lastGeneration !== null
        ? state.lastGeneration
        : state.trace;
    const span = parent.span({
      name: toolName,
      input: langfuseToolInput(metadata),
      metadata,
    });
    if (metadata.toolResult === undefined) {
      span.end();
      return;
    }
    span.end({ output: metadata.toolResult });
  }

  private langfuseReflectionLoop(
    client: Langfuse,
    sessionId: string,
    tenantSlug: string,
    metadata: OarTraceMetadata,
  ): void {
    const state = this.ensureTrace(client, sessionId, tenantSlug);
    if (state.reflectionSpan !== null) {
      state.reflectionSpan.end({ output: { note: "superseded by new reflection_loop" } });
    }
    state.reflectionSpan = state.trace.span({
      name: "reflection_loop",
      input: metadata,
    });
  }

  private langfuseReflectionResult(sessionId: string, metadata: OarTraceMetadata): void {
    const state = this.sessions.get(sessionId);
    if (state === undefined) {
      return;
    }
    if (state.reflectionSpan !== null) {
      state.reflectionSpan.end({ output: metadata });
      state.reflectionSpan = null;
      return;
    }
    state.trace.span({ name: "reflection_result", input: metadata }).end();
  }

  private ensureTrace(
    client: Langfuse,
    sessionId: string,
    tenantSlug: string,
  ): SessionTraceState {
    const existing = this.sessions.get(sessionId);
    if (existing !== undefined) {
      return existing;
    }
    const trace = client.trace({
      id: sessionId,
      name: "OAR Execution",
      userId: tenantSlug,
      sessionId,
      metadata: { recovered: true },
    });
    const state: SessionTraceState = {
      trace,
      lastGeneration: null,
      reflectionSpan: null,
      strategyKind: "unknown",
    };
    this.sessions.set(sessionId, state);
    return state;
  }
}

/** No-op si `tracer` es `undefined`. */
export function traceOar(
  tracer: OarTracer | undefined,
  sessionId: string,
  tenantSlug: string,
  eventType: OarTraceEventType,
  metadata: OarTraceMetadata,
): void {
  if (tracer === undefined) {
    return;
  }
  tracer.trace(sessionId, tenantSlug, eventType, metadata);
}
