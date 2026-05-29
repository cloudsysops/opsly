/**
 * Super Orchestrator Integration
 *
 * Integra los Python scripts del Super Orchestrator v2 con el orchestrator BullMQ existente.
 * Provee:
 * - Provider selection inteligente
 * - Performance tracking automático
 * - Auto-evolución de rutas
 * - Pool de agentes unificado
 */

import { randomUUID } from 'node:crypto';
import { superOrchestrator } from './super-orchestrator-bridge.js';
import { enqueueJob } from './queue.js';
import type { OrchestratorJob } from './types.js';
import { logJobEnqueue } from './observability/job-log.js';
import { setJobState } from './state/store.js';

export interface SuperOrchestratorTask {
  prompt: string;
  task_type?: string;
  intent?: string;
  context?: Record<string, unknown>;
  capabilities?: string[];
  max_latency_ms?: number;
}

export interface SuperOrchestratorResult {
  success: boolean;
  provider: string;
  output?: string;
  latency_ms: number;
  cost: number;
  commit?: any;
  notification?: any;
  n8n?: any;
  error?: string;
}

/**
 * Integra Super Orchestrator con el motor de intents
 */
export class SuperOrchestratorIntegration {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[super-orchestrator-integration] Initializing...');

    // Health check de todos los agentes
    const health = await superOrchestrator.healthCheckAllAgents();
    console.log('[super-orchestrator-integration] Agent health:', health);

    // Obtener estado del pool
    const poolStatus = await superOrchestrator.getAgentPoolStatus();
    console.log('[super-orchestrator-integration] Pool status:', poolStatus);

    this.initialized = true;
  }

  /**
   * Selecciona el mejor proveedor para una tarea
   */
  async selectProvider(prompt: string): Promise<{ provider: string; reasoning: string }> {
    return superOrchestrator.selectProvider(prompt);
  }

  /**
   * Ejecuta una tarea usando el Super Orchestrator
   */
  async executeTask(
    task: SuperOrchestratorTask,
    tenantSlug: string,
    _initiatedBy: string = 'system'
  ): Promise<SuperOrchestratorResult> {
    const startTime = Date.now();
    const _correlationId = randomUUID();

    try {
      // 1. Seleccionar provider
      const { provider, reasoning } = await this.selectProvider(task.prompt);
      console.log(`[super-orchestrator] Selected provider: ${provider} (${reasoning})`);

      // 2. Ejecutar en pool de agentes (si es agente local)
      let output: string | undefined;
      let success = false;

      if (
        provider.startsWith('ollama-') ||
        provider.startsWith('cursor-') ||
        provider.startsWith('claude-') ||
        provider.startsWith('opencode-')
      ) {
        // Usar agent pool
        const agentId = await superOrchestrator.findAvailableAgent(
          task.capabilities || this.getCapabilitiesForTask(task.task_type),
          task.max_latency_ms
        );

        if (agentId) {
          // Reservar agente
          console.log(`[super-orchestrator] Reserved agent: ${agentId} for task`);

          // Simular ejecución (aquí se conectaría con el worker real)
          output = `Executed via ${agentId}: ${task.prompt.substring(0, 100)}...`;
          success = true;
        } else {
          output = 'No available agents';
          success = false;
        }
      } else {
        // Proveedor externo - ejecutar via LLM Gateway
        output = `Would execute via ${provider}: ${task.prompt.substring(0, 100)}...`;
        success = true;
      }

      const latencyMs = Date.now() - startTime;
      const cost = this.estimateCost(provider, task.prompt.length);

      // 3. Registrar métricas
      await superOrchestrator.recordPerformance(
        provider,
        task.task_type || 'general',
        latencyMs,
        success,
        cost
      );

      // 4. Auto-commit si se solicitó
      let commit: any;
      if (task.context?.should_commit && success) {
        commit = await superOrchestrator.autoCommit(
          `[SuperOrch] ${task.task_type || 'task'}: ${task.prompt.substring(0, 50)}`
        );
      }

      // 5. N8n trigger si se solicitó
      let n8n: any;
      if (task.context?.should_trigger_n8n && success) {
        n8n = await superOrchestrator.triggerN8nWorkflow(
          `super_orchestrator_${task.task_type || 'task'}`,
          { prompt: task.prompt, output, provider, tenant_slug: tenantSlug }
        );
      }

      return {
        success,
        provider,
        output,
        latency_ms: latencyMs,
        cost,
        commit,
        n8n,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Registrar fallo
      await superOrchestrator.recordPerformance(
        'unknown',
        task.task_type || 'general',
        latencyMs,
        false,
        0
      );

      return {
        success: false,
        provider: 'none',
        latency_ms: latencyMs,
        cost: 0,
        error: String(error),
      };
    }
  }

  /**
   * Encola una tarea de Super Orchestrator como job BullMQ
   */
  async enqueueSuperOrchestratorJob(
    task: SuperOrchestratorTask,
    tenantSlug: string,
    initiatedBy: 'claude' | 'discord' | 'cron' | 'system' = 'system',
    _priority?: number
  ): Promise<string> {
    const correlationId = randomUUID();

    const jobData: OrchestratorJob = {
      type: 'super_orchestrator',
      tenant_slug: tenantSlug,
      initiated_by: initiatedBy,
      request_id: correlationId,
      payload: {
        prompt: task.prompt,
        task_type: task.task_type,
        intent: task.intent,
        context: task.context,
        capabilities: task.capabilities,
        max_latency_ms: task.max_latency_ms,
      },
      plan: (task.context?.plan as 'startup' | 'business' | 'enterprise' | undefined) || undefined,
    };

    const bullJob = await enqueueJob(jobData);

    logJobEnqueue({
      event: 'job_enqueue',
      job_type: 'super_orchestrator',
      tenant_slug: tenantSlug,
      request_id: correlationId,
      initiated_by: initiatedBy,
      plan: jobData.plan,
    });

    // Guardar estado
    await setJobState(correlationId, {
      status: 'pending',
      type: 'super_orchestrator',
      tenant_slug: tenantSlug,
      request_id: correlationId,
      started_at: new Date().toISOString(),
    });

    return bullJob.id as string;
  }

  /**
   * Obtiene dashboard unificado
   */
  async getDashboard(): Promise<string> {
    return superOrchestrator.getUnifiedDashboard();
  }

  /**
   * Obtiene métricas de performance
   */
  async getPerformanceMetrics() {
    return superOrchestrator.getPerformanceStats();
  }

  /**
   * Obtiene ideas de evolución pendientes
   */
  async getEvolutionIdeas() {
    return superOrchestrator.getPendingIdeas();
  }

  /**
   * Aplica una idea de evolución
   */
  async applyEvolutionIdea(ideaId: string) {
    return superOrchestrator.applyIdea(ideaId);
  }

  /**
   * Obtiene estado del pool de agentes
   */
  async getAgentPoolStatus() {
    return superOrchestrator.getAgentPoolStatus();
  }

  /**
   * Verifica salud del sistema
   */
  async checkHealth() {
    return superOrchestrator.checkSystemHealth();
  }

  /**
   * Genera ideas de mejora
   */
  async generateIdeas(context: string) {
    return superOrchestrator.generateIdeas(context);
  }

  /**
   * Analiza y genera ideas de evolución automáticamente
   */
  async analyzeAndEvolve(): Promise<{ new_ideas: number; applied: number }> {
    const ideas = await superOrchestrator.generateEvolutionIdeas();
    const pending = await superOrchestrator.getPendingIdeas();

    return {
      new_ideas: ideas.length,
      applied: pending.length,
    };
  }

  private getCapabilitiesForTask(taskType?: string): string[] {
    const capabilityMap: Record<string, string[]> = {
      code_generation: ['code_generation'],
      code_review: ['code_review'],
      analysis: ['analysis', 'reasoning'],
      planning: ['planning', 'reasoning'],
      reasoning: ['reasoning', 'analysis'],
      refactoring: ['code_generation', 'refactoring'],
      documentation: ['documentation'],
      testing: ['testing'],
    };

    return capabilityMap[taskType || ''] || ['code_generation', 'reasoning'];
  }

  private estimateCost(provider: string, promptLength: number): number {
    const costPer1kTokens = {
      'ollama-qwen': 0,
      'ollama-codellama': 0,
      anthropic: 0.015,
      deepseek: 0.001,
      openai: 0.01,
    };

    const tokens = promptLength / 4; // Rough estimate
    const rate = costPer1kTokens[provider as keyof typeof costPer1kTokens] || 0;

    return (tokens / 1000) * rate;
  }
}

// Export singleton
export const superOrchestratorIntegration = new SuperOrchestratorIntegration();
