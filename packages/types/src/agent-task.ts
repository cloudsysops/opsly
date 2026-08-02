import { z } from 'zod';

export const agentTaskTypeSchema = z.enum([
  'research',
  'code',
  'review',
  'browser',
  'infra',
  'qa',
  'planning',
  'documentation',
]);

export const agentExecutionModeSchema = z.enum([
  'dry_run',
  'enqueue',
  'synchronous',
  'approval_required',
]);

export const agentTaskConstraintsSchema = z
  .object({
    open_source_only: z.boolean().default(false),
    local_only: z.boolean().default(false),
    browser_allowed: z.boolean().default(false),
    network_allowed: z.boolean().default(false),
    write_allowed: z.boolean().default(false),
    repository_scope: z.string().min(1).optional(),
    file_scope: z.array(z.string().min(1)).default([]),
    max_tokens: z.number().int().positive().max(100_000).default(1_600),
    max_cost: z.number().nonnegative().optional(),
    deadline: z.string().datetime().optional(),
  })
  .default({});

export const agentTaskBudgetSchema = z
  .object({
    max_tokens: z.number().int().positive().max(100_000).default(1_600),
    max_cost_usd: z.number().nonnegative().optional(),
  })
  .default({});

/** Canonical, serializable contract shared by CLI, router and Orchestrator. */
export const agentTaskEnvelopeV1Schema = z
  .object({
    schema_version: z.literal('AgentTaskEnvelopeV1'),
    request_id: z.string().min(1),
    correlation_id: z.string().min(1),
    tenant_slug: z.string().regex(/^[a-z0-9-]{3,64}$/),
    task_type: agentTaskTypeSchema,
    task: z.string().min(1).max(50_000),
    requested_agent: z.string().min(1).nullable().optional(),
    selected_agent: z.string().min(1),
    skills: z.array(z.string().min(1)).max(3).default([]),
    constraints: agentTaskConstraintsSchema,
    execution_mode: agentExecutionModeSchema.default('dry_run'),
    source: z.string().min(1).default('opsly'),
    actor: z.string().min(1).default('system'),
    created_at: z.string().datetime(),
    timeout_ms: z.number().int().positive().max(3_600_000).default(120_000),
    max_attempts: z.number().int().min(1).max(5).default(2),
    budget: agentTaskBudgetSchema,
    metadata: z.record(z.unknown()).default({}),
    fallback_agents: z.array(z.string().min(1)).default([]),
  })
  .passthrough();

export type AgentTaskType = z.infer<typeof agentTaskTypeSchema>;
export type AgentExecutionMode = z.infer<typeof agentExecutionModeSchema>;
export type AgentTaskConstraints = z.infer<typeof agentTaskConstraintsSchema>;
export type AgentTaskEnvelopeV1 = z.infer<typeof agentTaskEnvelopeV1Schema>;
