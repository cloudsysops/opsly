import { z } from 'zod';

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
