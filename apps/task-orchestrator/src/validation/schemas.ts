import { z } from 'zod';

export const taskTypeSchema = z.enum(['implementation', 'bugfix', 'refactor', 'research', 'documentation']);
export const taskStatusSchema = z.enum(['pending', 'assigned', 'executing', 'completed', 'failed', 'cancelled']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const workerTypeSchema = z.enum(['cursor', 'ci-runner', 'claude-research']);
export const logLevelSchema = z.enum(['info', 'warn', 'error', 'debug']);

export const createTaskSchema = z.object({
  type: taskTypeSchema,
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  prompt: z.string().min(1),
  priority: taskPrioritySchema.default('medium'),
  created_by: z.string().default('system'),
  estimated_days: z.number().positive().optional(),
  dependencies: z.array(z.string().uuid()).default([]),
  branch: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateTaskSchema = z.object({
  status: taskStatusSchema.optional(),
  worker_id: z.string().optional(),
  result: z.object({
    success: z.boolean(),
    output: z.string().optional(),
    error: z.string().optional(),
    files_changed: z.array(z.string()).optional(),
    commits: z.array(z.string()).optional(),
    pr_url: z.string().optional(),
    duration_ms: z.number().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const registerWorkerSchema = z.object({
  id: z.string().min(1),
  type: workerTypeSchema,
  capacity: z.number().positive().default(1),
  metadata: z.record(z.unknown()).optional(),
});

export const workerHeartbeatSchema = z.object({
  status: z.enum(['idle', 'working', 'offline']),
  current_task_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const taskLogSchema = z.object({
  level: logLevelSchema.default('info'),
  message: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type RegisterWorkerInput = z.infer<typeof registerWorkerSchema>;
export type WorkerHeartbeatInput = z.infer<typeof workerHeartbeatSchema>;
export type TaskLogInput = z.infer<typeof taskLogSchema>;
