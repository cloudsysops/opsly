export type {
  AgentRouteReasonCode,
  AgentTaskRoute,
  ExternalAgentRegistryFile,
  ExternalWorkerEntry,
  ExternalWorkerId,
  ResolvedExternalWorker,
  RoutingIntent,
} from './types.js';

export {
  ExternalAgentRegistrySchema,
  ExternalWorkerEntrySchema,
  ExternalWorkerGithubQueuePolicySchema,
} from './types.js';

export {
  clearExternalAgentRegistryCache,
  getWorkerEntry,
  listEnabledWorkers,
  loadExternalAgentRegistry,
  resolveDefaultWorker,
  resolveRegistryPath,
  resolveWorker,
  workerIdFromCommand,
  workerIdFromOpslyJobType,
} from './registry.js';

export {
  routeExternalWorker,
  type RouteExternalWorkerInput,
} from './routing.js';

export { routeAgentTask } from './task-routing.js';

export {
  buildRuntimeCapabilityMatrixV1,
  routeModelV1,
} from './model-routing-v1.js';
export type {
  RuntimeCostClass,
  RuntimeLatencyClass,
  RuntimeLocality,
  RuntimeAvailabilityV1,
  RouteRejectCode,
  ModelRouteReasonCode,
  ModelRouteDecisionV1,
  RouteModelV1Input,
} from './model-routing-v1.js';
