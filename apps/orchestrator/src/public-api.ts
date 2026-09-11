/**
 * Orchestrator Public API
 *
 * Exports public types, queues, and functions for use by other applications
 * and services within the Opsly platform.
 *
 * This module provides:
 * - BullMQ queue instances for job enqueueing
 * - Event loop wiring for runtime event → job mapping
 * - Type definitions for orchestrator jobs and events
 */

// Job Types & Payloads
export type {
  JobType,
  OrchestratorJob,
  IntentRequest,
  ContentVideoJobPayload,
  ContentImageJobPayload,
  ContentCaptionJobPayload,
  ContentGenerationPayload,
  AgentRole,
  AutonomyRiskLevel,
  Intent,
  PlannerAction,
  PlannerResponse,
  SandboxExecutionPayload,
  TerminalTaskPayload,
  TestValidationPayload,
} from './types.js';

// Queue Instances
export { orchestratorQueue, localAgentQueue, agentClassifierQueue, hermesOrchestrationQueue, contentVideoQueue, contentImageQueue, contentCaptionQueue, contentGenerationQueue } from './queue.js';
export { enqueueJob, enqueueLocalAgentJob } from './queue.js';

// Events
export type { OpslyEvent } from './events/index.js';
export {
  publishEvent,
  subscribeEvents,
  handleRuntimeEvent,
  startEventLoopWiring,
  getEventJobMappings,
  enqueueContentGenerationJob,
  type ContentGenerationEvent,
  type EventToJobMapping,
  type EventLoopWiringConfig,
  type EventSubscriptionHandle,
} from './events/index.js';

// Validation
export { JOB_VALIDATION } from './types.js';
