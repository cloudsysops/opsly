export type { AutomationLevel, BoardJobSpec, BoardSignal, DomainEvent, FeatureFlagRecord, IngestResult, SignalType } from './types.js';
export { SIGNAL_TYPES, BOARD_JOB_TYPES } from './types.js';
export { ingestDomainEvent, buildLeadCreatedEvent } from './pipeline.js';
export { mapDomainEventToSignals } from './signals.js';
export { mapSignalToBoardJob, dedupeBoardJobs, isSameBoardCondition, boardJobIdempotencyKey, CONTACT_HOT_LEAD_ACCEPTANCE } from './jobs.js';
export { PESKIDS_SUPPORT_AUTOMATION_CAP, canPromoteAutomationLevel, denyExternalCustomerSend, isLevelWithinCap } from './levels.js';
export { payloadContainsPii, findForbiddenPiiKeys, stripForbiddenPii, FORBIDDEN_PII_KEYS } from './pii.js';
export { PESKIDS_FLAG_REGISTRY, assertFlagGovernance, customerFacingFlagsEnabled, unprovenCustomerWorkflows } from './flags.js';
export { AI_BOARD_METRICS, isAiBoardMetric } from './metrics.js';
export { buildSupportWorkItem, type SupportWorkItem } from './support-ux.js';
export {
  PESKIDS_CANONICAL_EVENTS,
  PESKIDS_DEPRECATED_TRIAL_EVENTS,
  PESKIDS_GOLDEN_FLOW_EVENTS,
  PESKIDS_JOURNEY_STAGES,
  PESKIDS_WHATSAPP_TEMPLATE_FAMILIES,
  isCanonicalPeskidsEvent,
  isDeprecatedTrialEvent,
  nextStaffActionForEvent,
  whatsappEventForChannelAction,
  isConfirmedWhatsappSend,
  whatsappTemplateForEvent,
} from './peskids-journey.js';
