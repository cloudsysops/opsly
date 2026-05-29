import { createAiGateway } from './ai-gateway/index.js';
import { AgentRuntime } from './agent-runtime/runtime.js';
import { EventBuilder } from './event-builder/builder.js';
import { InMemoryEventLogStore } from './observability/event-log.js';
import { createConsoleLogger } from './observability/logger.js';
import {
  assertTenantConfig,
  createTenantRegistry,
} from './tenant-config/registry.js';
import { MockWorkflowDispatcher } from './workflow-dispatcher/dispatcher.js';
import type { AiProviderKind, TenantConfig } from './types/index.js';
import type { EventLogStore } from './observability/event-log.js';

export * from './types/index.js';
export * from './tenant-config/index.js';
export * from './ai-gateway/index.js';
export * from './agent-runtime/index.js';
export * from './event-builder/index.js';
export * from './workflow-dispatcher/index.js';
export * from './observability/index.js';
export { newEventId, newRequestId, isoTimestamp } from './lib/ids.js';

export interface CreateOpslyCoreOptions {
  tenants: readonly TenantConfig[];
  aiProvider?: AiProviderKind;
  geminiApiKey?: string;
  eventLog?: EventLogStore;
}

export interface OpslyCore {
  runtime: AgentRuntime;
  eventLog: EventLogStore;
}

export function createOpslyCore(options: CreateOpslyCoreOptions): OpslyCore {
  for (const tenant of options.tenants) {
    assertTenantConfig(tenant);
  }

  const registry = createTenantRegistry(options.tenants);
  const eventLog = options.eventLog ?? new InMemoryEventLogStore();
  const aiGateway = createAiGateway({
    provider: options.aiProvider ?? 'mock',
    geminiApiKey: options.geminiApiKey,
  });

  const runtime = new AgentRuntime({
    registry,
    aiGateway,
    eventBuilder: new EventBuilder(),
    dispatcher: new MockWorkflowDispatcher(),
    eventLog,
    logger: createConsoleLogger('opsly-core'),
  });

  return { runtime, eventLog };
}
