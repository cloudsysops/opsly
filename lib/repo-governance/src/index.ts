export type {
  ApprovalGate,
  ArchitectureViolation,
  CanonService,
  ChangeBudgetLimits,
  ChangeBudgetReport,
  ContextPackInput,
  FileChange,
  MergeRiskReport,
  PathHit,
  PreMergeReport,
  ProtectionZone,
  ProtectedPathRule,
  RepoGovernanceConfig,
  RepoIntelligenceSnapshot,
} from './types.js';

export { findRepoRoot } from './paths.js';
export { loadRepoGovernanceConfig, allProtectedRules } from './policy.js';
export { buildRepoIntelligence } from './intelligence.js';
export { matchProtectedPaths } from './protected-paths.js';
export { resolveOwnership, touchedServicesFromPaths } from './ownership.js';
export { evaluateChangeBudget } from './change-budget.js';
export { validateArchitecture } from './architecture-validation.js';
export { buildApprovalGates, humanApprovalRequired } from './approval-gates.js';
export { analyzeMergeRisk } from './merge-risk.js';
export { generateContextPack, buildContextPackForWorker } from './context-pack.js';
export { parseNumstat, parseNameStatus, mergeFileChanges } from './git-diff.js';
export {
  buildPreMergeReport,
  formatPreMergeReportMarkdown,
} from './pre-merge-report.js';

import { buildPreMergeReport as buildPreMergeReportImpl } from './pre-merge-report.js';

export async function auditWorkingTreeChanges(
  changes: import('./types.js').FileChange[],
  root?: string,
): Promise<import('./types.js').PreMergeReport> {
  return buildPreMergeReportImpl(changes, undefined, root);
}
