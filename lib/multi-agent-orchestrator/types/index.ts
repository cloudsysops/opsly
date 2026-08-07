/**
 * Types para Multi-Agent Orchestrator
 */

export type AgentType = 'claude_remote' | 'cursor_local' | 'codex' | 'opencode' | 'custom';
export type TaskType = 'code_edit' | 'commit' | 'pr_creation' | 'validation' | 'testing';
export type TaskStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'blocked';

/**
 * Configuración de un agente
 */
export interface Agent {
  id: string;
  type: AgentType;
  isAvailable: () => boolean;
  execute: (task: Task) => Promise<TaskResult>;
  costPerTask?: number;
  estimatedTaskTime?: number;
  maxConcurrent?: number;
  capabilities?: string[];
}

/**
 * Configuración de tarea
 */
export interface Task {
  id?: string;
  taskType: TaskType;
  title: string;
  description: string;
  files_to_edit: string[];
  checklist?: string[];
  priority?: 'low' | 'medium' | 'high';
  estimatedTokens?: number;
  timeout?: number;
  retryCount?: number;
  agentId?: string;
  startTime?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Resultado de tarea
 */
export interface TaskResult {
  success: boolean;
  taskId?: string;
  agentId: string;
  output?: string;
  error?: string;
  tokensUsed: number;
  executionTime: number; // en ms
  cost: number;
  pr?: {
    number: number;
    url: string;
    title: string;
  };
  commits?: Array<{
    hash: string;
    message: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Métricas de agente
 */
export interface AgentMetrics {
  agentId: string;
  tasksCompleted: number;
  tasksFailed: number;
  tokensUsed: number;
  totalExecutionTime: number;
  averageTokensPerTask: number;
  costTotal: number;
}

/**
 * Configuración de Orchestrator
 */
export interface OrchestratorConfig {
  maxConcurrentTasks?: number;
  tokenLimit?: number;
  enableTokenOptimization?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Evento de tarea
 */
export interface TaskEvent {
  taskId: string;
  timestamp: number;
  type: 'started' | 'completed' | 'failed' | 'enqueued' | 'agent_selected';
  agentId?: string;
  data?: Record<string, unknown>;
}

/**
 * Configuración de agente del registro
 */
export interface AgentRegistryEntry {
  id: string;
  type: AgentType;
  enabled: boolean;
  max_concurrent: number;
  cost_per_task: number;
  auto_install: boolean;
  requires?: string[];
  capabilities?: string[];
}

/**
 * Dispatch request (múltiples fuentes)
 */
export interface DispatchRequest {
  source: 'chat' | 'cli' | 'webhook' | 'api' | 'dashboard';
  taskIds: string[]; // IDs de tareas a ejecutar
  preferredAgents?: string[]; // Preferencia de agentes
  metadata?: {
    userId?: string;
    sessionId?: string;
    [key: string]: unknown;
  };
}

/**
 * Respuesta de dispatch
 */
export interface DispatchResponse {
  success: boolean;
  dispatchId: string;
  taskIds: string[];
  estimatedCompletionTime: number;
  estimatedCost: number;
  estimatedTokens: number;
  message: string;
}
