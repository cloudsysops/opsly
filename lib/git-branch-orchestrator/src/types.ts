import { z } from 'zod';

export const BranchRiskLevelSchema = z.enum(['low', 'medium', 'high']);
export const BranchStatusSchema = z.enum([
  'planned',
  'active',
  'pr_open',
  'merged_integration',
  'merged_main',
  'stale',
  'closed',
]);
export const MergeRiskSchema = z.enum(['SAFE', 'MODERATE', 'HIGH']);
export const MergeActionSchema = z.enum([
  'merge_to_integration',
  'request_changes',
  'close_branch',
  'split_pr',
  'escalate_to_architect',
  'block_until_human',
]);

export const GitBranchPolicySchema = z.object({
  version: z.number(),
  principle: z.string(),
  branch_pattern: z.string(),
  integration_pattern: z.string(),
  protected_targets: z.array(z.string()),
  default_parent_branch: z.string(),
  require_pr_to_integration_first: z.boolean(),
  auto_merge_to_main: z.boolean(),
  task_type_workers: z.record(z.string(), z.string()),
  worker_branch_slug: z.record(z.string(), z.string()),
  high_risk_paths: z.array(z.string()),
  human_approval_required_for: z.array(z.string()),
});

export const BranchRegistryEntrySchema = z.object({
  id: z.string().uuid(),
  tenant_slug: z.string().min(1),
  branch_name: z.string().min(1),
  job_id: z.string().min(1),
  worker_id: z.string().min(1),
  worker_branch_slug: z.string().min(1),
  task_slug: z.string().min(1),
  task_type: z.string().min(1),
  title: z.string().optional(),
  parent_branch: z.string().min(1),
  target_branch: z.string().min(1),
  integration_branch: z.string().min(1),
  initiative: z.string().min(1),
  status: BranchStatusSchema,
  risk_level: BranchRiskLevelSchema,
  session_id: z.string().optional(),
  request_id: z.string().optional(),
  pr_url: z.string().optional(),
  test_status: z.enum(['unknown', 'pending', 'passed', 'failed']).optional(),
  files_touched: z.array(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const BranchPlanTaskSchema = z.object({
  task_slug: z.string().min(1),
  task_type: z.string().min(1),
  title: z.string().optional(),
  worker_id: z.string().optional(),
});

export const BranchPlanSchema = z.object({
  initiative: z.string().min(1),
  integration_branch: z.string().min(1),
  parent_branch: z.string().min(1),
  entries: z.array(BranchRegistryEntrySchema),
  created_at: z.string(),
});

export type GitBranchPolicy = z.infer<typeof GitBranchPolicySchema>;
export type BranchRegistryEntry = z.infer<typeof BranchRegistryEntrySchema>;
export type BranchPlan = z.infer<typeof BranchPlanSchema>;
export type BranchPlanTask = z.infer<typeof BranchPlanTaskSchema>;
export type MergeRisk = z.infer<typeof MergeRiskSchema>;
export type MergeAction = z.infer<typeof MergeActionSchema>;

export interface MergeAdvisorReport {
  branch_name: string;
  job_id: string;
  worker_id: string;
  summary: string;
  files_changed: string[];
  architecture_impact: string;
  risk_level: MergeRisk;
  tests_status: 'unknown' | 'pending' | 'passed' | 'failed';
  duplicate_logic_warnings: string[];
  recommended_action: MergeAction;
  requires_human_approval: boolean;
  pr_target: string;
  generated_at: string;
}
