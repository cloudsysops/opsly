import { z } from 'zod';

export const RuntimeSessionStatusSchema = z.enum([
  'created',
  'running',
  'checkpointed',
  'waiting_approval',
  'stopped',
  'failed',
  'resumable',
]);

export type RuntimeSessionStatus = z.infer<typeof RuntimeSessionStatusSchema>;

export const RuntimeJobLifecycleSchema = z.enum([
  'QUEUED',
  'SESSION_CREATED',
  'RUNNING',
  'CHECKPOINTED',
  'WAITING_APPROVAL',
  'COMPLETED',
  'FAILED',
  'RESUMABLE',
]);

export type RuntimeJobLifecycle = z.infer<typeof RuntimeJobLifecycleSchema>;

export const RuntimeSessionMetadataSchema = z.object({
  sessionId: z.string().min(1),
  name: z.string().min(1),
  agentId: z.string().min(1),
  jobId: z.string().optional(),
  workspace: z.string().min(1),
  branch: z.string().optional(),
  status: RuntimeSessionStatusSchema,
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  lastCommand: z.string().optional(),
  lastCheckpoint: z.string().optional(),
  tmuxSessionName: z.string().min(1),
});

export type RuntimeSessionMetadata = z.infer<typeof RuntimeSessionMetadataSchema>;

export interface CreateSessionInput {
  name: string;
  agentId: string;
  jobId?: string;
  workspace: string;
  branch?: string;
  initialCommand?: string;
}

export interface SendCommandInput {
  sessionId: string;
  command: string;
  dryRun?: boolean;
}
