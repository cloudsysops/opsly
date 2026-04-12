import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  ArchitecturalDecisionStub,
  DecisionContext,
  EnrichedTask,
  HermesTask,
  NotebookQueryResponse,
  SuggestedApproach,
} from "@intcloudsysops/types";

import { NotebookLMClient } from "../lib/notebooklm-client.js";
import { CircuitOpenError, withCircuitBreaker } from "../resilience/circuit-breaker.js";

const LOCAL_DOC_PATHS = [
  "ARCHITECTURE.md",
  "AGENTS.md",
  "docs/HERMES-INTEGRATION.md",
] as const;

const NOTEBOOKLM_BREAKER_NAME = "hermes:notebooklm";
const QUERY_TIMEOUT_MS = 10_000;

async function withQueryTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
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

function repoRoot(): string {
  return process.env.OPSLY_REPO_ROOT?.trim() || process.cwd();
}

function readLocalSnippets(): string {
  const root = repoRoot();
  const parts: string[] = [];
  for (const rel of LOCAL_DOC_PATHS) {
    try {
      const text = readFileSync(join(root, rel), "utf8");
      parts.push(`## ${rel}\n${text.slice(0, 4000)}`);
    } catch {
      // archivo ausente en runtime (p. ej. imagen Docker sin repo completo)
    }
  }
  return parts.join("\n\n");
}

export class ContextEnricher {
  constructor(private readonly notebook: NotebookLMClient) {}

  private async queryNotebookWithBreaker(
    prompt: string,
    localContext?: string,
  ): Promise<NotebookQueryResponse> {
    const empty: NotebookQueryResponse = {
      answer: "",
      sources: [],
      confidence: 0,
      cached: false,
    };
    try {
      return await withCircuitBreaker(NOTEBOOKLM_BREAKER_NAME, async () => {
        return await withQueryTimeout(
          this.notebook.queryNotebook(prompt, localContext),
          QUERY_TIMEOUT_MS,
        );
      });
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        return empty;
      }
      console.error("[ContextEnricher] NotebookLM query failed:", err);
      return empty;
    }
  }

  public async enrichTaskContext(task: HermesTask): Promise<EnrichedTask> {
    const localContext = readLocalSnippets();
    let notebooklm = await this.queryNotebookWithBreaker(
      `En Opsly, ¿qué patrones y límites aplican para una tarea de tipo "${task.type}" con esfuerzo "${task.effort}"? Responde en español, breve.`,
      localContext ? localContext.slice(0, 6000) : undefined,
    );

    if (!notebooklm.answer || notebooklm.confidence === 0) {
      notebooklm = {
        answer:
          "NotebookLM no disponible o sin respuesta; se usa solo contexto local y reglas Hermes por defecto.",
        sources: ["local-fallback"],
        confidence: 0.2,
        cached: false,
      };
    }

    const suggestedApproach = [
      `Seguir orquestación BullMQ existente y DecisionEngine.`,
      notebooklm.answer.slice(0, 500),
    ].join(" ");

    return {
      task,
      notebooklm,
      localContext,
      relatedTasks: [],
      suggestedApproach,
      patterns: ["repository", "event-driven", "zero-trust-api"],
    };
  }

  public async enrichDecision(decision: ArchitecturalDecisionStub): Promise<DecisionContext> {
    const res = await this.queryNotebookWithBreaker(
      `¿Hay precedentes o riesgos para esta decisión arquitectónica? ${decision.title}. Resumen: ${decision.summary}`,
    );
    return {
      decision,
      precedents: res.answer ? [res.answer.slice(0, 400)] : [],
      tradeoffs: ["Ver ADRs en docs/adr y VISION.md"],
      recommendations: res.answer ? [res.answer.slice(0, 400)] : [],
    };
  }

  public async suggestApproach(taskDescription: string): Promise<SuggestedApproach> {
    const res = await this.queryNotebookWithBreaker(
      `Propón un enfoque por pasos para: ${taskDescription}`,
    );
    return {
      approach: res.answer || "Enfoque por defecto Opsly (sin NotebookLM).",
      steps: ["Validar en staging", "Type-check", "Desplegar con compose"],
      estimatedEffort: "M",
      relatedTasks: [],
    };
  }
}

export function createContextEnricher(): ContextEnricher | null {
  const client = new NotebookLMClient();
  if (!client.isAvailable()) {
    return null;
  }
  return new ContextEnricher(client);
}

/** Sin NotebookLM: solo recortes de docs locales (si existen en disco). */
export async function enrichTaskLocalOnly(task: HermesTask): Promise<EnrichedTask> {
  const localContext = readLocalSnippets();
  return {
    task,
    localContext,
    relatedTasks: [],
    suggestedApproach: `Tarea ${task.type}: revisar ARCHITECTURE.md y ADRs antes de implementar.`,
    patterns: ["repository", "event-driven"],
    notebooklm: {
      answer: "",
      sources: [],
      confidence: 0,
    },
  };
}
