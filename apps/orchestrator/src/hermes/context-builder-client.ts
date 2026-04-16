/**
 * Context Builder Client — integración con servicio de persistencia de sesiones.
 *
 * Permite guardar y recuperar sesiones de agente con historial de decisiones,
 * con soporte para trazabilidad end-to-end vía request_id.
 */

import type { HermesTask } from "@intcloudsysops/types";

export interface AgentSessionPayload {
  tenant_slug: string;
  session_key: string;
  agent_role: "planner" | "executor" | "tool" | "notifier";
  summary: string;
  open_items: unknown[];
  decisions: unknown[];
  metadata: Record<string, unknown>;
}

export interface AgentSessionResponse {
  id: string;
  tenant_slug: string;
  session_key: string;
  agent_role: string;
  summary: string;
  open_items: unknown[];
  decisions: unknown[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

const FETCH_TIMEOUT_MS = 8_000;

/**
 * Construye la session_key para una tarea Hermes.
 * Formato: `hermes:{task_id}:{request_id || 'no-request'}`
 */
export function buildSessionKey(task: HermesTask): string {
  const requestId = task.request_id ?? "no-request";
  return `hermes:${task.id}:${requestId}`;
}

/**
 * Guarda o actualiza una sesión de agente en el context-builder.
 * Integra con decision history y request_id trazabilidad.
 */
export async function saveAgentSession(
  tenantSlug: string,
  task: HermesTask,
  payload: Partial<AgentSessionPayload>,
): Promise<AgentSessionResponse | null> {
  const base = process.env.CONTEXT_BUILDER_URL?.trim().replace(/\/$/, "");
  if (!base || !tenantSlug || !task.id) {
    return null;
  }

  const sessionKey = buildSessionKey(task);
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    ctrl.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      tenant_slug: tenantSlug,
      session_key: sessionKey,
      agent_role: payload.agent_role ?? "executor",
      summary: payload.summary ?? "",
      open_items: payload.open_items ?? [],
      decisions: payload.decisions ?? [],
      metadata: {
        ...payload.metadata,
        hermes_task_id: task.id,
        request_id: task.request_id,
        idempotency_key: task.idempotency_key,
        updated_at: new Date().toISOString(),
      },
    };

    const res = await fetch(`${base}/v1/internal/opsly/session/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CONTEXT_PACK_TOKEN ?? ""}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.error(
        JSON.stringify({
          event: "context_builder_save_session_error",
          status: res.status,
          task_id: task.id,
          request_id: task.request_id,
          ts: new Date().toISOString(),
        }),
      );
      return null;
    }

    const data = (await res.json()) as AgentSessionResponse;
    return data;
  } catch (err) {
    clearTimeout(timer);
    console.error(
      JSON.stringify({
        event: "context_builder_save_session_error",
        task_id: task.id,
        request_id: task.request_id,
        error: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      }),
    );
    return null;
  }
}

/**
 * Recupera una sesión existente del context-builder.
 */
export async function getAgentSession(
  tenantSlug: string,
  task: HermesTask,
): Promise<AgentSessionResponse | null> {
  const base = process.env.CONTEXT_BUILDER_URL?.trim().replace(/\/$/, "");
  if (!base || !tenantSlug || !task.id) {
    return null;
  }

  const sessionKey = buildSessionKey(task);
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    ctrl.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      `${base}/v1/internal/opsly/session/get?tenant_slug=${encodeURIComponent(tenantSlug)}&session_key=${encodeURIComponent(sessionKey)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.CONTEXT_PACK_TOKEN ?? ""}`,
        },
        signal: ctrl.signal,
      },
    );

    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as AgentSessionResponse;
    return data;
  } catch {
    clearTimeout(timer);
    return null;
  }
}
