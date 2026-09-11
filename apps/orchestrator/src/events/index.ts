/**
 * Opsly Orchestrator Events
 *
 * Central hub for event system configuration and exports.
 * Combines event bus, types, and runtime event loop wiring.
 */

export type { OpslyEvent } from './types.js';
export { publishEvent, subscribeEvents, type EventSubscriptionHandle } from './bus.js';

export type {
  ContentGenerationEvent,
  EventToJobMapping,
  EventLoopWiringConfig,
} from './event-loop-wiring.js';
export {
  enqueueContentGenerationJob,
  handleRuntimeEvent,
  startEventLoopWiring,
  getEventJobMappings,
} from './event-loop-wiring.js';
