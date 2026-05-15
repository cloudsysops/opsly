export type ProtectionZone = 'green' | 'amber' | 'red';

export interface ProtectedPathRule {
  glob: string;
  zone: ProtectionZone;
  reason: string;
}

export interface CanonService {
  id: string;
  path: string;
  owner: string;
  purpose: string;
}

export interface ForbiddenPattern {
  pattern: string;
  reason: string;
}

export interface ChangeBudgetLimits {
  max_files_changed: number;
  max_lines_changed: number;
  max_new_files: number;
  max_deleted_files: number;
  max_apps_touched: number;
}

export interface RepoGovernanceConfig {
  version: number;
  principle: string;
  canon_services: CanonService[];
  architecture_docs: string[];
  forbidden_new_top_level: string[];
  forbidden_duplicate_service_patterns: ForbiddenPattern[];
  protected_paths: {
    red: ProtectedPathRule[];
    amber: ProtectedPathRule[];
  };
  change_budget: ChangeBudgetLimits;
  human_approval_required_for: string[];
  allowed_root_markdown: string[];
  allowed_top_level_dirs: string[];
}

export interface RepoIntelligenceSnapshot {
  repo_root: string;
  scanned_at: string;
  top_level_dirs: string[];
  apps: string[];
  api_route_count: number;
  lib_packages: string[];
  architecture_docs_present: string[];
  architecture_docs_missing: string[];
  canon_services: CanonService[];
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
}

export interface ChangeBudgetReport {
  within_budget: boolean;
  files_changed: number;
  lines_changed: number;
  new_files: number;
  deleted_files: number;
  apps_touched: string[];
  violations: string[];
}

export interface PathHit {
  path: string;
  zone: ProtectionZone;
  reason: string;
  glob: string;
}

export interface ArchitectureViolation {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
}

export interface ApprovalGate {
  gate: string;
  required: boolean;
  reason: string;
}

export interface MergeRiskReport {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  path_hits: PathHit[];
  architecture_violations: ArchitectureViolation[];
  change_budget: ChangeBudgetReport;
  approval_gates: ApprovalGate[];
  touched_services: string[];
  summary: string;
  rollback_path: string;
}

export interface PreMergeReport {
  generated_at: string;
  principle: string;
  change_summary: string;
  impact: string;
  touched_services: string[];
  risks: string[];
  rollback_path: string;
  merge_risk: MergeRiskReport;
  context_pack_markdown: string;
  human_approval_required: boolean;
  approval_gates: ApprovalGate[];
}

export interface ContextPackInput {
  task_title?: string;
  task_slug?: string;
  worker_role?: string;
  include_diff_paths?: string[];
}
