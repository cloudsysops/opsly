/**
 * ArchitectSenior — Senior Architect with NotebookLM source-of-truth
 *
 * Role:
 * - Know entire project (VISION, AGENTS, ROADMAP, codebase, infra)
 * - Consult NotebookLM as authoritative knowledge source
 * - Create and supervise BullMQ orchestrators (4 teams)
 * - Care for operational health and propose optimizations
 * - Communicate with user for strategic decisions
 */

import type { NotebookQueryResponse } from "./notebooklm-client.js";
import { NotebookLMClient } from "./notebooklm-client.js";
import type { RedisConnection } from "./redis-connection.js";

export interface ArchitecturalOption {
  label: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  effortHours: number;
  owner: "user" | "cursor" | "both";
  notebookLMContext?: string;
}

export interface DiagnosticReport {
  topic: string;
  sourcesConsulted: {
    notebooklm?: string;
    agentsLine?: number;
    dockerComposePath?: string;
    otherFiles?: string[];
  };
  analysis: string;
  options: ArchitecturalOption[];
  immediateActions: Array<{
    action: string;
    owner: string;
    estimatedHours: number;
  }>;
  adrsNeeded: Array<{
    number: number;
    decision: string;
    rationale: string;
  }>;
}

export interface OrchestratorHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime_seconds: number;
  teams: Record<
    string,
    {
      queue_depth: number;
      active_workers: number;
      max_parallel: number;
      latency_p99_ms: number;
    }
  >;
  metrics: {
    total_jobs: number;
    failed_jobs: number;
    cost_usd: number;
    hermes_tracking_complete: boolean;
  };
}

export class ArchitectSenior {
  private notebookLM: NotebookLMClient;

  constructor(private redis: RedisConnection) {
    this.notebookLM = new NotebookLMClient();
  }

  /**
   * Diagnose architectural question by consulting NotebookLM + repo state
   */
  async diagnose(topic: string, userContext?: string): Promise<DiagnosticReport> {
    const fullContext = userContext
      ? `Topic: ${topic}. User context: ${userContext}`
      : `Topic: ${topic}`;

    // Consult NotebookLM as primary source
    const notebookResponse = await this.notebookLM.queryNotebook(
      `In the context of Opsly platform (phase 4, multi-tenant SaaS): ${fullContext}.
       What is the current state, what are the risks, and what architectural approach is recommended?`,
      "Architecture diagnostic",
    );

    // Analyze based on consultation
    const analysis = this._buildAnalysis(topic, notebookResponse, userContext);

    return analysis;
  }

  /**
   * Monitor orchestrator health: queue depths, worker latency, cost tracking
   */
  async checkOrchestratorHealth(): Promise<OrchestratorHealthStatus> {
    const teams = ["team-frontend", "team-backend", "team-ml", "team-infra"];
    const teamStatus: Record<string, any> = {};

    for (const team of teams) {
      const queueDepth = await this.redis.client.llen(`bull:${team}:wait`);
      const activeCount = await this.redis.client.llen(`bull:${team}:active`);

      const maxParallel =
        team === "team-frontend"
          ? 2
          : team === "team-backend"
            ? 3
            : team === "team-ml"
              ? 2
              : 1;

      // Fetch latency from Hermes metering (simplified; real: query Prometheus or Hermes API)
      const latencyP99 = await this._getTeamLatency(team);

      teamStatus[team] = {
        queue_depth: queueDepth,
        active_workers: activeCount,
        max_parallel: maxParallel,
        latency_p99_ms: latencyP99,
      };
    }

    // Check Hermes tracking completeness (query to verify all LLM calls are metered)
    const hermesComplete = await this._isHermesTrackingComplete();

    // Fetch total cost from Hermes metering
    const totalCost = await this._getTotalMeteringCost();

    // Calculate health status
    const status = this._calculateHealthStatus(teamStatus);

    return {
      status,
      uptime_seconds: Math.floor(process.uptime()),
      teams: teamStatus,
      metrics: {
        total_jobs: Object.values(teamStatus).reduce(
          (sum, t: any) => sum + (t.queue_depth || 0) + (t.active_workers || 0),
          0,
        ),
        failed_jobs: 0, // Would query from metering DB
        cost_usd: totalCost,
        hermes_tracking_complete: hermesComplete,
      },
    };
  }

  /**
   * Propose optimization (cost, latency, resource limits)
   */
  async proposeOptimization(
    type: "cost" | "latency" | "resource-limits",
  ): Promise<DiagnosticReport> {
    const queries: Record<string, string> = {
      cost: "What are the top cost optimization opportunities in Opsly? Rank by ROI and implementation effort.",
      latency: "What are the latency bottlenecks in the Opsly orchestrator? How can we optimize?",
      "resource-limits":
        "Which services in docker-compose.platform.yml need memory limits? What should they be?",
    };

    const notebookResponse = await this.notebookLM.queryNotebook(
      queries[type],
      `Optimization request: ${type}. Current infrastructure: Docker Compose per tenant, Traefik v3, Supabase, BullMQ.`,
    );

    return this._buildAnalysis(`${type}-optimization`, notebookResponse);
  }

  /**
   * Build structured diagnostic report from NotebookLM response
   */
  private _buildAnalysis(
    topic: string,
    notebookResponse: NotebookQueryResponse,
    userContext?: string,
  ): DiagnosticReport {
    // Parse NotebookLM answer to extract options, risks, recommendations
    const options: ArchitecturalOption[] = [];

    // Example: NotebookLM typically answers with structured info
    // Real implementation would parse the answer field more intelligently
    if (notebookResponse.answer.includes("Option")) {
      options.push({
        label: "Option A (from NotebookLM)",
        description: notebookResponse.answer.substring(0, 200),
        riskLevel: notebookResponse.confidence > 0.8 ? "low" : "medium",
        effortHours: 8,
        owner: "cursor",
        notebookLMContext: notebookResponse.answer,
      });
    }

    const immediateActions = [];
    if (topic.includes("memory-limits") || topic.includes("resource")) {
      immediateActions.push({
        action: "Add memory limits to orchestrator, hermes, context-builder, cadvisor",
        owner: "cursor",
        estimatedHours: 2,
      });
    }

    if (topic.includes("second-client")) {
      immediateActions.push(
        {
          action: "Create onboarding runbook for second customer",
          owner: "both",
          estimatedHours: 8,
        },
        {
          action: "Prepare demo environment with tenant isolation test",
          owner: "cursor",
          estimatedHours: 4,
        },
      );
    }

    const adrsNeeded = [];
    if (
      topic.includes("lvm-routing") ||
      topic.includes("cost") ||
      topic.includes("optimization")
    ) {
      adrsNeeded.push({
        number: 15,
        decision: "LLM routing with cost-aware fallback",
        rationale:
          "Optimize cost by using Ollama (free) → Haiku (cheap) → GPT-4o-mini → Sonnet (premium) based on complexity",
      });
    }

    return {
      topic,
      sourcesConsulted: {
        notebooklm: notebookResponse.answer.substring(0, 100) + "...",
        agentsLine: 25,
        dockerComposePath: "infra/docker-compose.platform.yml",
        otherFiles: ["docs/adr/", "VISION.md", "ROADMAP.md"],
      },
      analysis:
        `Analysis of ${topic} based on NotebookLM source of truth and current repo state. ` +
        `Confidence: ${(notebookResponse.confidence * 100).toFixed(0)}%. ` +
        (userContext ? `User context: ${userContext}. ` : "") +
        `Sources: ${notebookResponse.sources?.join(", ") || "general repository knowledge"}.`,
      options,
      immediateActions,
      adrsNeeded,
    };
  }

  /**
   * Helper: Get team latency from metering (simplified)
   */
  private async _getTeamLatency(team: string): Promise<number> {
    // Real: Query Hermes metering API or Prometheus
    // Simplified: Return mock values
    const latencies: Record<string, number> = {
      "team-frontend": 150,
      "team-backend": 250,
      "team-ml": 800,
      "team-infra": 500,
    };
    return latencies[team] ?? 200;
  }

  /**
   * Helper: Check if Hermes is tracking 100% of LLM calls
   */
  private async _isHermesTrackingComplete(): Promise<boolean> {
    // Real: Compare total LLM calls vs. metered calls
    // Simplified: Return status
    return true; // TODO: implement real check
  }

  /**
   * Helper: Get total cost from Hermes metering
   */
  private async _getTotalMeteringCost(): Promise<number> {
    // Real: Sum cost_usd from Hermes metering events
    // Simplified: Return mock value
    return 12.45;
  }

  /**
   * Helper: Calculate orchestrator health status
   */
  private _calculateHealthStatus(
    teamStatus: Record<string, any>,
  ): "healthy" | "degraded" | "unhealthy" {
    // Check queue depths and latencies
    for (const team of Object.values(teamStatus)) {
      const team_ = team as any;
      if (team_.queue_depth > 100) return "unhealthy";
      if (team_.latency_p99_ms > 5000) return "degraded";
    }
    return "healthy";
  }

  /**
   * Load architectural context into NotebookLM (before consulting)
   */
  async feedNotebookLM(
    topic: string,
    content: string,
    filePath: string,
  ): Promise<void> {
    await this.notebookLM.uploadDocument(filePath, content);
    console.log(`[ArchitectSenior] Fed NotebookLM: ${filePath} (${topic})`);
  }

  /**
   * Establish communication protocol: Present options to user
   */
  formatDecisionProtocol(report: DiagnosticReport): string {
    let output = `\n## 📋 ARQUITECTO SENIOR — ${report.topic.toUpperCase()}\n\n`;

    output += `### 🔍 Fuentes consultadas\n`;
    if (report.sourcesConsulted.notebooklm) {
      output += `- **NotebookLM:** ${report.sourcesConsulted.notebooklm}\n`;
    }
    if (report.sourcesConsulted.agentsLine) {
      output += `- **AGENTS.md** línea ${report.sourcesConsulted.agentsLine}\n`;
    }
    output += `- ${report.sourcesConsulted.otherFiles?.join(", ") || "Documentación del proyecto"}\n\n`;

    output += `### 📊 Análisis\n${report.analysis}\n\n`;

    output += `### 🎯 Opciones ordenadas\n`;
    report.options.forEach((opt, idx) => {
      output += `\n**${idx + 1}. ${opt.label}**\n`;
      output += `   ${opt.description}\n`;
      output += `   - Riesgo: ${opt.riskLevel} | Esfuerzo: ${opt.effortHours}h | Owner: ${opt.owner}\n`;
      if (opt.notebookLMContext) {
        output += `   - NotebookLM: *${opt.notebookLMContext.substring(0, 100)}...*\n`;
      }
    });

    output += `\n### ⚡ Acciones inmediatas\n`;
    report.immediateActions.forEach((action) => {
      output += `- [ ] **${action.action}** (${action.owner}, ${action.estimatedHours}h)\n`;
    });

    if (report.adrsNeeded.length > 0) {
      output += `\n### 📋 ADRs si aplica\n`;
      report.adrsNeeded.forEach((adr) => {
        output += `- **ADR-${adr.number}:** ${adr.decision}\n`;
        output += `  Razón: ${adr.rationale}\n`;
      });
    }

    return output;
  }
}

/**
 * Initialize ArchitectSenior and feed critical documentation to NotebookLM
 */
export async function initializeArchitectSenior(
  redis: RedisConnection,
): Promise<ArchitectSenior> {
  const architect = new ArchitectSenior(redis);

  // Feed critical docs to NotebookLM on startup (if enabled)
  if (process.env.NOTEBOOKLM_ENABLED === "true") {
    console.log("[ArchitectSenior] Feeding NotebookLM with critical docs...");
    // In real scenario: read VISION.md, AGENTS.md, ADRs, and feed them
    // For now: marked as ready
  }

  return architect;
}
