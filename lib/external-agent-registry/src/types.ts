import { z } from 'zod';
import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';

export const ExternalWorkerKindSchema = z.literal('external-binary');

export const ExternalWorkerEntrySchema = z.object({
  kind: ExternalWorkerKindSchema,
  adapter: z.string().min(1),
  command: z.string().min(1),
  opsly_job_type: z.string().min(1),
  bridge_port: z.number().int().positive().optional(),
  endpoint_env: z.string().min(1).optional(),
  default_model: z.string().min(1),
  write_access: z.boolean(),
  risk_ceiling: z.enum(['low', 'medium', 'high']),
  capabilities: z.array(z.string().min(1)),
  provider: z.string().min(1).default('external'),
  runtime: z.string().min(1).default('cli'),
  supported_task_types: z.array(z.string().min(1)).default([]),
  skills: z.array(z.string().min(1)).default([]),
  local: z.boolean().default(true),
  open_source: z.boolean().default(false),
  health_endpoint: z.string().min(1).optional(),
  priority: z.number().int().min(0).default(50),
  fallback_agents: z.array(z.string().min(1)).default([]),
  enabled: z.boolean(),
  not_opsly_hermes_module: z.string().optional(),
});

export const ExternalAgentRegistrySchema = z.object({
  version: z.number().int().positive(),
  updated_at: z.string().min(1),
  principle: z.string().min(1),
  default_worker_id: z.string().min(1),
  routing_notes: z.record(z.string(), z.string()),
  workers: z.record(z.string(), ExternalWorkerEntrySchema),
});

export type ExternalWorkerEntry = z.infer<typeof ExternalWorkerEntrySchema>;
export type ExternalAgentRegistryFile = z.infer<typeof ExternalAgentRegistrySchema>;

export type ExternalWorkerId = string;

export interface ResolvedExternalWorker {
  workerId: ExternalWorkerId;
  entry: ExternalWorkerEntry;
  opslyJobType: string;
  defaultModel: string;
  command: string;
}

export type AgentRouteReasonCode =
  | 'CAPABILITY_MATCH'
  | 'LOCAL_PREFERRED'
  | 'OPEN_SOURCE_REQUIRED'
  | 'AGENT_DISABLED'
  | 'TENANT_NOT_ALLOWED'
  | 'COST_LIMIT_EXCEEDED'
  | 'FALLBACK_SELECTED'
  | 'NO_COMPATIBLE_AGENT';

export interface AgentTaskRoute {
  selected_agent: ExternalWorkerId | null;
  fallback_chain: ExternalWorkerId[];
  rationale_codes: AgentRouteReasonCode[];
  rejected_candidates: Array<{ agent: ExternalWorkerId; reason: AgentRouteReasonCode }>;
  task: AgentTaskEnvelopeV1;
}

export type RoutingIntent =
  | 'architecture'
  | 'planning'
  | 'implementation'
  | 'debugging'
  | 'review'
  | 'security_review'
  | 'tests'
  | 'assistant'
  | 'default';
