import { createHash } from "node:crypto";
import { basename } from "node:path";

import { executeNotebookLM } from "@intcloudsysops/notebooklm-agent";
import type { NotebookDocument, NotebookQueryResponse } from "@intcloudsysops/types";

import { getNotebookLmCache, setNotebookLmCache } from "./notebooklm-cache.js";

const QUERY_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

function defaultTenantSlug(): string {
  return process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() || "platform";
}

function defaultNotebookId(): string | undefined {
  const id = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
  return id && id.length > 0 ? id : undefined;
}

function enabled(): boolean {
  return process.env.NOTEBOOKLM_ENABLED?.trim().toLowerCase() === "true";
}

function cacheKey(notebookId: string, question: string, context?: string): string {
  return createHash("sha256")
    .update(`${notebookId}|${question}|${context ?? ""}`)
    .digest("hex");
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`NotebookLM timeout after ${String(ms)}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * Cliente NotebookLM para Hermes: delega en `executeNotebookLM` → `notebooklm-py` (ADR-014).
 * No existe API REST pública estable de Google; no usar URLs inventadas.
 */
export class NotebookLMClient {
  public isAvailable(): boolean {
    return enabled() && defaultNotebookId() !== undefined;
  }

  public async queryNotebook(
    question: string,
    context?: string,
  ): Promise<NotebookQueryResponse> {
    const notebookId = defaultNotebookId();
    if (!notebookId) {
      return {
        answer: "",
        sources: [],
        confidence: 0,
        cached: false,
      };
    }

    const key = cacheKey(notebookId, question, context);
    const hit = getNotebookLmCache<NotebookQueryResponse>(key);
    if (hit) {
      return { ...hit, cached: true };
    }

    const fullQ =
      context && context.length > 0 ? `${question}\n\nContexto adicional:\n${context}` : question;

    let lastErr = "";
    const t0 = Date.now();
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        const result = await withTimeout(
          executeNotebookLM({
            action: "ask",
            tenant_slug: defaultTenantSlug(),
            notebook_id: notebookId,
            question: fullQ,
          }),
          QUERY_TIMEOUT_MS,
        );

        if (!result.success || result.answer === undefined) {
          lastErr = result.error ?? "ask failed";
          continue;
        }

        const out: NotebookQueryResponse = {
          answer: result.answer,
          sources: [],
          confidence: 0.85,
          latency_ms: Date.now() - t0,
          cached: false,
        };
        setNotebookLmCache(key, out);
        return out;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    return {
      answer: "",
      sources: [],
      confidence: 0,
      cached: false,
      latency_ms: Date.now() - t0,
    };
  }

  public async uploadDocument(filePath: string, content: string): Promise<string> {
    const notebookId = defaultNotebookId();
    if (!notebookId) {
      throw new Error("NOTEBOOKLM_NOTEBOOK_ID is not set");
    }
    const title = basename(filePath) || "document.md";
    const result = await executeNotebookLM({
      action: "add_source",
      tenant_slug: defaultTenantSlug(),
      notebook_id: notebookId,
      source_type: "text",
      title,
      text: content,
    });
    if (!result.success) {
      throw new Error(result.error ?? "add_source failed");
    }
    return `text:${title}`;
  }

  /**
   * notebooklm-py no expone listado de fuentes vía el cliente actual; devuelve [] de forma segura.
   */
  public async listDocuments(): Promise<NotebookDocument[]> {
    return [];
  }

  public async summarize(_docId: string): Promise<{ summary: string }> {
    const q = await this.queryNotebook(
      "Resume el documento indicado por el operador en una lista de viñetas (modo Hermes sync).",
    );
    return { summary: q.answer || "(sin respuesta NotebookLM)" };
  }
}
