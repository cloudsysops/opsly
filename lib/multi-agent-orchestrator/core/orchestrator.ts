/**
 * Multi-Agent Orchestrator
 * Coordina múltiples agentes de IA para ejecutar tareas en paralelo
 */

import { EventEmitter } from 'events';
import type { Agent, Task, TaskResult, AgentMetrics } from '../types';
import { AgentRegistry } from './agent-registry';

export class MultiAgentOrchestrator extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private taskQueue: Task[] = [];
  private executingTasks: Map<string, Task> = new Map();
  private metrics: Map<string, AgentMetrics> = new Map();
  private registry: AgentRegistry;

  constructor(private config: {
    maxConcurrentTasks?: number;
    tokenLimit?: number;
    enableTokenOptimization?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    useRegistry?: boolean;
  } = {}) {
    super();
    this.config = {
      maxConcurrentTasks: 10,
      enableTokenOptimization: true,
      logLevel: 'info',
      useRegistry: true,
      ...config,
    };

    this.registry = new AgentRegistry();

    // Auto-register agents from registry if enabled
    if (this.config.useRegistry) {
      this.registry.getEnabledAgents().forEach(agent => {
        this.registerAgent(agent.id, agent);
      });
    }
  }

  /**
   * Registra un agente
   */
  registerAgent(id: string, agent: Agent): void {
    if (this.agents.has(id)) {
      this.log('warn', `Agent ${id} already registered, overwriting`);
    }

    this.agents.set(id, agent);
    this.metrics.set(id, {
      agentId: id,
      tasksCompleted: 0,
      tasksFailed: 0,
      tokensUsed: 0,
      totalExecutionTime: 0,
      averageTokensPerTask: 0,
      costTotal: 0,
    });

    this.log('info', `Agent registered: ${id} (type: ${agent.type})`);
    this.emit('agent:registered', { agentId: id });
  }

  /**
   * Dispone una tarea para ejecución
   */
  async dispatchTask(task: Task): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    task.id = taskId;

    this.log('info', `Dispatching task: ${task.id}`);

    // Si hay espacio, ejecutar inmediatamente
    if (this.executingTasks.size < (this.config.maxConcurrentTasks || 10)) {
      return this.executeTask(task);
    }

    // Si no, encolar
    this.taskQueue.push(task);
    this.log('info', `Task enqueued: ${taskId} (queue size: ${this.taskQueue.length})`);
    this.emit('task:enqueued', { taskId, queueSize: this.taskQueue.length });

    return taskId;
  }

  /**
   * Ejecuta una tarea usando agente seleccionado
   */
  private async executeTask(task: Task): Promise<string> {
    const taskId = task.id!;
    this.executingTasks.set(taskId, task);

    try {
      this.emit('task:started', { taskId });
      this.log('info', `Starting task: ${taskId}`);

      // Selecciona agente óptimo
      const selectedAgent = this.selectOptimalAgent(task);
      if (!selectedAgent) {
        throw new Error('No agents available for task');
      }

      this.log('info', `Selected agent: ${selectedAgent.id} for task ${taskId}`);
      this.emit('task:agent_selected', { taskId, agentId: selectedAgent.id });

      // Prepara task para agente
      const preparedTask = {
        ...task,
        agentId: selectedAgent.id,
        startTime: Date.now(),
      };

      // Ejecuta en agente
      const result = await selectedAgent.agent.execute(preparedTask);

      // Registra resultado
      this.recordTaskResult(selectedAgent.id, result);

      this.emit('task:completed', { taskId, result });
      this.log('info', `Task completed: ${taskId}`);

      // Procesa próxima tarea de queue
      await this.processQueue();

      return taskId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('task:failed', { taskId, error: errorMsg });
      this.log('error', `Task failed: ${taskId} - ${errorMsg}`);

      // Intenta con siguiente agente (fallback)
      await this.retryWithFallback(task, error);

      return taskId;
    } finally {
      this.executingTasks.delete(taskId);
    }
  }

  /**
   * Selecciona el agente óptimo para una tarea
   */
  private selectOptimalAgent(task: Task): { id: string; agent: Agent } | null {
    if (!this.config.enableTokenOptimization) {
      // Simple: agente disponible
      for (const [id, agent] of this.agents) {
        if (agent.isAvailable()) return { id, agent };
      }
      return null;
    }

    // Optimización de tokens
    const candidates = Array.from(this.agents.entries())
      .filter(([_, agent]) => agent.isAvailable())
      .map(([id, agent]) => ({
        id,
        agent,
        score: this.calculateAgentScore(id, agent, task),
      }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) return null;

    const best = candidates[0];
    this.log('debug', `Agent selection for task ${task.taskType}:`, {
      selected: best.id,
      score: best.score,
      candidates: candidates.map(c => ({ id: c.id, score: c.score })),
    });

    return { id: best.id, agent: best.agent };
  }

  /**
   * Calcula score de agente para selección
   * (menor costo, más rápido = score más alto)
   */
  private calculateAgentScore(agentId: string, agent: Agent, task: Task): number {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return 0;

    const costFactor = 1 / (agent.costPerTask || 1); // Preferir agentes gratis
    const speedFactor = agent.estimatedTaskTime || 15; // Preferir rápidos
    const reliabilityFactor = metrics.tasksCompleted / Math.max(1, metrics.tasksCompleted + metrics.tasksFailed);

    return (costFactor * 0.5 + (1 / speedFactor) * 0.3 + reliabilityFactor * 0.2) * 100;
  }

  /**
   * Procesa siguiente tarea de queue
   */
  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;
    if (this.executingTasks.size >= (this.config.maxConcurrentTasks || 10)) return;

    const nextTask = this.taskQueue.shift();
    if (nextTask) {
      await this.executeTask(nextTask);
    }
  }

  /**
   * Registra resultado de tarea
   */
  private recordTaskResult(agentId: string, result: TaskResult): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return;

    if (result.success) {
      metrics.tasksCompleted++;
    } else {
      metrics.tasksFailed++;
    }

    metrics.tokensUsed += result.tokensUsed || 0;
    metrics.totalExecutionTime += result.executionTime || 0;
    metrics.costTotal += result.cost || 0;
    metrics.averageTokensPerTask = metrics.tokensUsed / Math.max(1, metrics.tasksCompleted + metrics.tasksFailed);

    this.emit('metrics:updated', { agentId, metrics });
  }

  /**
   * Retry con fallback a otro agente
   */
  private async retryWithFallback(task: Task, _previousError: unknown): Promise<void> {
    if (task.retryCount === undefined) task.retryCount = 0;
    task.retryCount++;

    if (task.retryCount > 2) {
      this.log('warn', `Task ${task.id} exceeded max retries`);
      this.emit('task:max_retries_exceeded', { taskId: task.id });
      return;
    }

    this.log('info', `Retrying task ${task.id} (attempt ${task.retryCount})`);
    await this.dispatchTask(task);
  }

  /**
   * Obtiene métricas de agente
   */
  getAgentMetrics(agentId: string): AgentMetrics | null {
    return this.metrics.get(agentId) || null;
  }

  /**
   * Obtiene métricas agregadas
   */
  getAggregatedMetrics() {
    const all = Array.from(this.metrics.values());

    return {
      totalTasksCompleted: all.reduce((sum, m) => sum + m.tasksCompleted, 0),
      totalTasksFailed: all.reduce((sum, m) => sum + m.tasksFailed, 0),
      totalTokensUsed: all.reduce((sum, m) => sum + m.tokensUsed, 0),
      totalCost: all.reduce((sum, m) => sum + m.costTotal, 0),
      averageSuccessRate: all.length > 0
        ? all.reduce((sum, m) => sum + (m.tasksCompleted / Math.max(1, m.tasksCompleted + m.tasksFailed)), 0) / all.length
        : 0,
      agentsCount: this.agents.size,
      executingTasksCount: this.executingTasks.size,
      queuedTasksCount: this.taskQueue.length,
    };
  }

  /**
   * Obtiene estado del sistema
   */
  getStatus() {
    return {
      agents: Array.from(this.agents.entries()).map(([id, agent]) => ({
        id,
        type: agent.type,
        isAvailable: agent.isAvailable(),
        costPerTask: agent.costPerTask,
        metrics: this.metrics.get(id),
      })),
      executingTasks: this.executingTasks.size,
      queuedTasks: this.taskQueue.length,
      aggregated: this.getAggregatedMetrics(),
      registry: this.registry.getStatus(),
    };
  }

  /**
   * Obtiene el registry de agentes
   */
  getRegistry(): AgentRegistry {
    return this.registry;
  }

  /**
   * Logging
   */
  private log(level: string, message: string, data?: unknown): void {
    const logLevel = this.config.logLevel || 'info';
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };

    if (levels[level as keyof typeof levels] >= levels[logLevel as keyof typeof levels]) {
      console.log(`[${level.toUpperCase()}] [MultiAgentOrchestrator] ${message}`, data || '');
    }
  }
}

export default MultiAgentOrchestrator;
