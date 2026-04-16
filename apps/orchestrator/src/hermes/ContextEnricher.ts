import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  ArchitecturalDecisionStub,
  DecisionContext,
  EnrichedTask,
  HermesTask,
  SuggestedApproach,
} from "@intcloudsysops/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { NotebookLMClient } from "../lib/notebooklm-client.js";

const LOCAL_DOC_PATHS = [
  "ARCHITECTURE.md",
  "AGENTS.md",
  "docs/HERMES-INTEGRATION.md",
] as const;

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

type TenantPlan = "startup" | "business" | "enterprise" | "demo";

export class ContextEnricher {
  constructor(
    private readonly notebook: NotebookLMClient,
    private readonly supabase?: SupabaseClient,
  ) {}

  private async resolveTenantPlan(tenantId: string): Promise<TenantPlan> {
    if (!this.supabase || !tenantId) {
      return "startup"; // fallback conservador
    }

    try {
      const { data, error } = await this.supabase
        .schema("platform")
        .from("tenants")
        .select("plan")
        .eq("id", tenantId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error || !data) {
        console.warn(`[ContextEnricher] Could not resolve plan for tenant ${tenantId}:`, error?.message);
        return "startup";
      }

      const plan = data.plan as TenantPlan;
      return ["startup", "business", "enterprise", "demo"].includes(plan) ? plan : "startup";
    } catch (err) {
      console.error(`[ContextEnricher] Error resolving tenant plan:`, err);
      return "startup";
    }
  }

  private isNotebookLmAllowed(plan: TenantPlan): boolean {
    // NotebookLM disponible solo para business y enterprise
    // Startup excluido per "NotebookLM no expuesto a Startup sin flag"
    return plan === "business" || plan === "enterprise";
  }

  public async enrichTaskContext(task: HermesTask): Promise<EnrichedTask> {
    const localContext = readLocalSnippets();

    // Resolver plan del tenant para validar acceso a NotebookLM
    const plan = await this.resolveTenantPlan(task.tenant_id ?? "");
    const allowNotebookLm = this.isNotebookLmAllowed(plan);

    let notebooklm;
    if (allowNotebookLm) {
      notebooklm = await this.notebook.queryNotebook(
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
    } else {
      // Plan no permite NotebookLM (startup)
      notebooklm = {
        answer: `NotebookLM no disponible para plan ${plan}. Usar contexto local y reglas por defecto.`,
        sources: ["plan-restricted"],
        confidence: 0,
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
    const res = await this.notebook.queryNotebook(
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
    const res = await this.notebook.queryNotebook(
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

export function createContextEnricher(supabase?: SupabaseClient): ContextEnricher | null {
  const client = new NotebookLMClient();
  if (!client.isAvailable()) {
    return null;
  }
  return new ContextEnricher(client, supabase);
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
