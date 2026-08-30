/**
 * Agent surface for cloudops-portal twin.
 * Heavy Peskids agent services live in `apps/peskids` until store/deps are ported.
 * Keep pipeline rule helpers here (pure, no missing imports).
 */
export {
  buildPipelineRules,
  LOCAL_STATUS_TO_PIPELINE_STAGE,
  PIPELINE_STAGE_TO_LOCAL_STATUS,
} from './pipeline-rules';
export type {
  LocalLeadStatus,
  PipelineRule,
  PipelineStage,
  RuleServices,
} from './pipeline-rules';
