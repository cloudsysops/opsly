/**
 * Adaptador OAR: enruta acciones del agente a la API interna (síncrono) o a colas BullMQ (asíncrono).
 *
 * @see docs/design/OAR.md — Fase 3 Action Port Adapter
 */

import axios, { type AxiosError } from "axios";
import type { Queue } from "bullmq";

import type { AgentActionPort, ToolResult } from "../interfaces/agent-action-port.js";

/** Herramientas consideradas seguras para ejecución síncrona vía API (MVP). */
export const DEFAULT_SAFE_SYNC_TOOLS: readonly string[] = [
  "fs_read",
  "fs_read_file",
  "fs_write",
  "fs_write_file",
  "list_adrs",
];

/** Cuerpo encolado para jobs OAR (serializable). */
export interface OarEnqueueJobPayload {
  tenantSlug: string;
  actionName: string;
  args: Record<string, unknown>;
}

export interface OpslyActionAdapterApiConfig {
  baseUrl: string;
  authToken: string;
}

export interface OpslyActionAdapterOptions {
  /**
   * Ruta POST bajo `baseUrl` para ejecución síncrona de herramientas.
   * @default "/api/tools/execute"
   */
  toolsExecutePath?: string;
  /**
   * Clave en `queues` usada para acciones asíncronas.
   * @default "default"
   */
  defaultQueueKey?: string;
  /** Lista extra de acciones síncronas además del prefijo `http_`. @default DEFAULT_SAFE_SYNC_TOOLS */
  safeSyncTools?: readonly string[];
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  try {
    return structuredClone(args);
  } catch {
    throw new Error("args must be JSON-serializable");
  }
}

function formatObservationPayload(data: unknown): string {
  if (data === null || data === undefined) {
    return "";
  }
  if (typeof data === "string") {
    return data;
  }
  if (typeof data === "object") {
    try {
      return JSON.stringify(data);
    } catch {
      return "[unserializable]";
    }
  }
  if (typeof data === "number" || typeof data === "boolean" || typeof data === "bigint") {
    return String(data);
  }
  if (typeof data === "symbol") {
    return data.toString();
  }
  if (typeof data === "function") {
    return `[function ${data.name}]`;
  }
  return "";
}

function isSyncRoute(actionName: string, safeTools: readonly string[]): boolean {
  if (actionName.startsWith("http_")) {
    return true;
  }
  return safeTools.includes(actionName);
}

function unknownToErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "object" && err !== null) {
    try {
      return JSON.stringify(err);
    } catch {
      return "non-serializable error";
    }
  }
  if (typeof err === "string") {
    return err;
  }
  if (typeof err === "number" || typeof err === "boolean") {
    return String(err);
  }
  if (typeof err === "bigint") {
    return err.toString();
  }
  if (typeof err === "symbol") {
    return err.toString();
  }
  if (typeof err === "function") {
    return `[function ${err.name}]`;
  }
  if (err === undefined) {
    return "undefined";
  }
  return "unknown error";
}

function observationFromAxiosError(err: AxiosError<unknown>): string {
  const data = err.response?.data;
  if (data === undefined || data === null) {
    return err.message;
  }
  if (typeof data === "string") {
    return data;
  }
  try {
    return JSON.stringify(data);
  } catch {
    return err.message;
  }
}

/**
 * Implementación de {@link AgentActionPort} con routing API vs BullMQ.
 */
export class OpslyActionAdapter implements AgentActionPort {
  private readonly safeSyncTools: readonly string[];

  constructor(
    private readonly apiConfig: OpslyActionAdapterApiConfig,
    private readonly queues: Record<string, Queue<OarEnqueueJobPayload>>,
    private readonly options: OpslyActionAdapterOptions = {},
  ) {
    this.safeSyncTools = options.safeSyncTools ?? DEFAULT_SAFE_SYNC_TOOLS;
  }

  async executeAction(
    tenantSlug: string,
    actionName: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    let sanitized: Record<string, unknown>;
    try {
      sanitized = sanitizeArgs(args);
    } catch (e) {
      const msg = unknownToErrorMessage(e);
      return {
        success: false,
        error: msg,
        observation: msg,
      };
    }

    if (isSyncRoute(actionName, this.safeSyncTools)) {
      return this.executeViaApi(tenantSlug, actionName, sanitized);
    }

    return this.enqueueJob(tenantSlug, actionName, sanitized);
  }

  private async executeViaApi(
    tenantSlug: string,
    actionName: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const path = this.options.toolsExecutePath ?? "/api/tools/execute";
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${normalizeBaseUrl(this.apiConfig.baseUrl)}${normalizedPath}`;

    try {
      const res = await axios.post<unknown>(
        url,
        {
          tenant_slug: tenantSlug,
          action: actionName,
          args,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiConfig.authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 120_000,
          validateStatus: (status) => status < 500,
        },
      );

      if (res.status >= 400) {
        return {
          success: false,
          error: `HTTP ${String(res.status)}`,
          data: res.data,
          observation: formatObservationPayload(res.data),
        };
      }

      const observation = formatObservationPayload(res.data);

      return {
        success: true,
        data: res.data,
        observation,
      };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const obs = observationFromAxiosError(err);
        return {
          success: false,
          error: err.message,
          observation: obs,
        };
      }
      const msg = unknownToErrorMessage(err);
      return {
        success: false,
        error: msg,
        observation: msg,
      };
    }
  }

  private async enqueueJob(
    tenantSlug: string,
    actionName: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const key = this.options.defaultQueueKey ?? "default";
    const queue = this.queues[key];
    if (queue === undefined) {
      const msg = `No BullMQ queue registered for key "${key}".`;
      return {
        success: false,
        error: msg,
        observation: msg,
      };
    }

    const payload: OarEnqueueJobPayload = {
      tenantSlug,
      actionName,
      args,
    };

    const job = await queue.add(`oar-${actionName}`, payload, {
      removeOnComplete: 1000,
      removeOnFail: 500,
    });

    const jobId = job.id === undefined ? "" : String(job.id);
    return {
      success: true,
      data: { jobId },
      observation: "Job enqueued successfully",
    };
  }
}
