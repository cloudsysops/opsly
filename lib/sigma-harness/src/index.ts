export type {
  AgentReviewerRole,
  ConsensusResult,
  DecisionProposal,
  DecisionReview,
  DecisionRound,
  DecisionRoundStatus,
  DecisionVerdict,
  HarnessEvent,
  HarnessEventType,
  SigmaRuleLevel,
  SigmaRuleSummary,
} from './types.js';

export {
  computeConsensus,
  defaultReviewerRoles,
  mapSeverityToVerdict,
  roundIsFinal,
} from './consensus.js';
export {
  clearRuleIndexCache,
  findRulesForText,
  getRulesByIds,
  loadRuleIndex,
  searchRules,
} from './rule-index.js';
export {
  getHarnessConfig,
  getRuleSearchRoots,
  getSigmaVendorRoot,
  loadSigmaManifest,
} from './paths.js';
export { SigmaDecisionHarness, createHarnessRedisClient } from './harness.js';
