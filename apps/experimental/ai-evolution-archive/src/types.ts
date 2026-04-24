import { z } from 'zod';

export const EvolutionPhaseSchema = z.enum([
  'analyze',
  'plan',
  'implement',
  'validate',
  'deploy',
  'feedback',
]);

export const EvolutionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'rolled_back',
]);

export const CodeQualitySchema = z.object({
  complexity: z.number().min(0).max(100),
  maintainability: z.number().min(0).max(100),
  testCoverage: z.number().min(0).max(100),
  documentation: z.number().min(0).max(100),
  performance: z.number().min(0).max(100),
  security: z.number().min(0).max(100),
});

export const ImprovementSchema = z.object({
  id: z.string(),
  type: z.enum(['bug', 'refactor', 'optimization', 'security', 'documentation', 'test']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string(),
  description: z.string(),
  affectedFiles: z.array(z.string()),
  estimatedEffort: z.number(),
  actualEffort: z.number().optional(),
  status: EvolutionStatusSchema,
  createdAt: z.string(),
  completedAt: z.string().optional(),
  autoApplied: z.boolean().default(false),
  feedback: z
    .object({
      score: z.number().min(1).max(5),
      notes: z.string().optional(),
    })
    .optional(),
});

export const SkillEvolutionSchema = z.object({
  skillId: z.string(),
  version: z.string(),
  previousVersion: z.string().optional(),
  changes: z.array(
    z.object({
      type: z.enum(['added', 'removed', 'changed', 'fixed']),
      description: z.string(),
      file: z.string().optional(),
    })
  ),
  performanceDelta: z.number().optional(),
  usageCount: z.number().default(0),
  successRate: z.number().min(0).max(1),
  lastUsed: z.string().optional(),
});

export const MetricsSnapshotSchema = z.object({
  timestamp: z.string(),
  layer: z.enum(['sandbox', 'qa', 'prod']),
  metrics: z.object({
    apiLatency: z.number(),
    errorRate: z.number(),
    successRate: z.number(),
    costUsd: z.number(),
    tokensUsed: z.number(),
    cacheHitRate: z.number(),
    activeTenants: z.number(),
  }),
});

export const EvolutionCycleSchema = z.object({
  id: z.string(),
  phase: EvolutionPhaseSchema,
  status: EvolutionStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  improvements: z.array(ImprovementSchema),
  skillEvolutions: z.array(SkillEvolutionSchema),
  metrics: MetricsSnapshotSchema.optional(),
  nextActions: z.array(z.string()).default([]),
});

export type EvolutionPhase = z.infer<typeof EvolutionPhaseSchema>;
export type EvolutionStatus = z.infer<typeof EvolutionStatusSchema>;
export type CodeQuality = z.infer<typeof CodeQualitySchema>;
export type Improvement = z.infer<typeof ImprovementSchema>;
export type SkillEvolution = z.infer<typeof SkillEvolutionSchema>;
export type MetricsSnapshot = z.infer<typeof MetricsSnapshotSchema>;
export type EvolutionCycle = z.infer<typeof EvolutionCycleSchema>;
