import type {
  EnrichedTask,
  HermesRoutingDecision,
  HermesTask,
  HermesTaskType,
} from "@intcloudsysops/types";

/**
 * Enruta tareas Hermes a colas BullMQ existentes (sin nuevo bus).
 * La ejecución real sigue en workers OpenClaw (`openclaw`, etc.).
 */
export class DecisionEngine {
  route(task: HermesTask): HermesRoutingDecision {
    return this.routeWithContext(task, undefined);
  }

  /**
   * Enrutado con contexto NotebookLM + docs locales (opcional).
   */
  routeWithContext(task: HermesTask, enriched?: EnrichedTask): HermesRoutingDecision {
    const t: HermesTaskType = task.type;
    const effort = task.effort;

    const base = this.baseRoute(t, effort);
    if (!enriched?.notebooklm?.answer) {
      return base;
    }

    const summary = enriched.notebooklm.answer.slice(0, 240);
    if (enriched.notebooklm.confidence >= 0.5 && t === "decision") {
      return {
        ...base,
        priority: Math.min(base.priority ?? 50_000, 5_000),
        enrichment_summary: summary,
      };
    }

    return {
      ...base,
      enrichment_summary: summary,
    };
  }

  private baseRoute(t: HermesTaskType, effort: HermesTask["effort"]): HermesRoutingDecision {
    const localLlmFirst = process.env.HERMES_LOCAL_LLM_FIRST === "true";

    /** Decisiones rápidas (esfuerzo S) → Ollama local primero si está activado (ADR-024). */
    if (localLlmFirst && t === "decision" && effort === "S") {
      return { agentType: "ollama", queueName: "openclaw", priority: 0 };
    }

    if (t === "feature" && (effort === "M" || effort === "L" || effort === "XL")) {
      return {
        agentType: "cursor",
        queueName: "openclaw",
        priority: 10_000,
        secondary_agent: "claude",
      };
    }
    if (t === "feature") {
      return { agentType: "cursor", queueName: "openclaw", priority: 50_000 };
    }
    if (t === "adr") {
      return { agentType: "claude", queueName: "openclaw", priority: 50_000 };
    }
    if (t === "infra") {
      return {
        agentType: "github_actions",
        queueName: "hermes-orchestration",
        priority: 50_000,
      };
    }
    if (t === "task-management") {
      return {
        agentType: "notion",
        queueName: "hermes-orchestration",
        priority: 50_000,
      };
    }
    if (t === "decision") {
      return { agentType: "claude", queueName: "openclaw", priority: 0 };
    }
    return {
      agentType: "none",
      queueName: "hermes-orchestration",
      priority: 50_000,
    };
  }
}
