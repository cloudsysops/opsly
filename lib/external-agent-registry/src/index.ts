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
