export type {
  BranchPlan,
  BranchPlanTask,
  BranchRegistryEntry,
  BranchCleanupState,
  GitBranchPolicy,
  MergeAdvisorReport,
} from './types.js';

export {
  GitBranchPolicySchema,
  BranchRegistryEntrySchema,
  BranchCleanupStateSchema,
  BranchPlanSchema,
} from './types.js';

export {
  loadGitBranchPolicy,
  clearGitBranchPolicyCache,
  resolvePolicyPath,
} from './policy.js';

export {
  slugifyTask,
  agentBranchName,
  integrationBranchName,
  validateTaskSlug,
  validateJobId,
  assertNotProtectedTarget,
} from './naming.js';

export {
  workerIdForTaskType,
  riskLevelForTaskType,
  normalizeTaskType,
} from './worker-assignment.js';

export {
  listBranchEntries,
  getBranchEntry,
  getBranchByName,
  allocateJobId,
  upsertBranchEntry,
  updateBranchEntry,
  createRegistryEntry,
  resolveRepoRoot,
} from './registry.js';

export {
  createBranchPlan,
  defaultChatOpsMvpTasks,
  type CreateBranchPlanInput,
} from './planner.js';

export {
  assignWorkerToBranch,
  type AssignWorkerInput,
  type AssignWorkerResult,
  type BranchDispatchClaimEvidence,
} from './assign.js';

export { buildMergeAdvisorReport } from './merge-advisor.js';

export {
  buildBranchHygieneReport,
  buildIntegrationMergeAdvisor,
  type BranchHygieneReport,
  type BranchHygieneIssue,
} from './hygiene.js';

export {
  dispatchChatOps,
  type ChatOpsDispatchInput,
  type ChatOpsDispatchResult,
  type ChatOpsAction,
} from './chatops-dispatch.js';


export {
  classifyBranchCleanup,
  cleanupStateIsTerminal,
  cleanupStateRequiresPreservation,
  type BranchCleanupEvidence,
  type BranchCleanupDecision,
} from './cleanup.js';
