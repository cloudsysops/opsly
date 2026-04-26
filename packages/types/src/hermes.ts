import { z } from 'zod';

/** Estados del ciclo de vida Hermes (tarea). */
export const hermesTaskStateSchema = z.enum([
  'PENDING',
  'ROUTED',
  'EXECUTING',
  'COMPLETED',
  'FAILED',
  'BLOCKED',
]);

export type HermesTaskState = z.infer<typeof hermesTaskStateSchema>;

/** Tipos de tarea para enrutado (DecisionEngine). */
export const hermesTaskTypeSchema = z.enum([
  'feature',
  'adr',
  'infra',
  'task-management',
  'decision',
  'unknown',
]);

export type HermesTaskType = z.infer<typeof hermesTaskTypeSchema>;

export const hermesEffortSchema = z.enum(['S', 'M', 'L', 'XL', 'unknown']);

export type HermesEffort = z.infer<typeof hermesEffortSchema>;

export const hermesAgentKindSchema = z.enum([
  'cursor',
  'claude',
  /** Inferencia vía worker `ollama` → LLM Gateway (`llama_local` / Ollama). */
  'ollama',
  'github_actions',
  'notion',
  'none',
]);

export type HermesAgentKind = z.infer<typeof hermesAgentKindSchema>;

/** Tarea coordinada por Hermes (persistencia + cola). */
export const hermesTaskSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: hermesTaskTypeSchema,
  state: hermesTaskStateSchema,
  assignee: z.string().optional(),
  effort: hermesEffortSchema.default('unknown'),
  tenant_id: z.string().min(1).optional(),
  request_id: z.string().min(1).optional(),
  idempotency_key: z.string().min(1).max(256).optional(),
  payload: z.record(z.unknown()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type HermesTask = z.infer<typeof hermesTaskSchema>;

export const hermesAgentSchema = z.object({
  name: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
  autonomy: z.enum(['low', 'medium', 'high']).default('medium'),
});

export type HermesAgent = z.infer<typeof hermesAgentSchema>;

export const workflowStepSchema = z.object({
  id: z.string().min(1),
  task_ids: z.array(z.string()).default([]),
  parallel: z.boolean().default(false),
  depends_on: z.array(z.string()).default([]),
});

export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export const hermesMetricSchema = z.object({
  agent: z.string().min(1),
  sprint: z.number().int().min(0).optional(),
  tasks_completed: z.number().int().min(0).default(0),
  tasks_failed: z.number().int().min(0).default(0),
  avg_execution_time_ms: z.number().int().min(0).optional(),
  success_rate: z.number().min(0).max(1).optional(),
  captured_at: z.string().optional(),
});

export type HermesMetric = z.infer<typeof hermesMetricSchema>;

export const hermesRoutingDecisionSchema = z.object({
  agentType: hermesAgentKindSchema,
  queueName: z.string().min(1),
  priority: z.number().int().min(0).optional(),
  secondary_agent: hermesAgentKindSchema.optional(),
  /** Resumen opcional del enriquecimiento (p. ej. NotebookLM + docs locales). */
  enrichment_summary: z.string().optional(),
});

export type HermesRoutingDecision = z.infer<typeof hermesRoutingDecisionSchema>;
