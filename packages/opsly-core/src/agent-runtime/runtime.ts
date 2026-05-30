import { newRequestId } from '../lib/ids.js';
import type { AiGateway } from '../ai-gateway/gateway.js';
import { EventBuilder } from '../event-builder/builder.js';
import type { EventLogStore } from '../observability/event-log.js';
import type { OpslyLogger } from '../observability/logger.js';
import type { TenantConfigRegistry } from '../tenant-config/registry.js';
import type { WorkflowDispatcher } from '../workflow-dispatcher/dispatcher.js';
import type { AgentRuntimeResult, IntentRequest, OpslyEvent } from '../types/index.js';

export interface AgentRuntimeDeps {
  registry: TenantConfigRegistry;
  aiGateway: AiGateway;
  eventBuilder: EventBuilder;
  dispatcher: WorkflowDispatcher;
  eventLog: EventLogStore;
  logger?: OpslyLogger;
}

export class AgentRuntime {
  constructor(private readonly deps: AgentRuntimeDeps) {}

  async handle(request: IntentRequest): Promise<AgentRuntimeResult> {
    const requestId = newRequestId(request.requestId);
    const tenant = this.deps.registry.get(request.tenantSlug);

    if (!tenant) {
      return {
        event: null,
        error: `Unknown tenant: ${request.tenantSlug}`,
        code: 'UNKNOWN_TENANT',
      };
    }

    const parsed = await this.deps.aiGateway.parseIntent(request, tenant);
    if (!parsed) {
      const rejected = this.deps.eventBuilder.build({
        tenantSlug: tenant.slug,
        intent: 'UNPARSED',
        payload: { utterance: request.utterance },
        requestId,
        status: 'rejected',
        metadata: { reason: 'AI_PARSE_FAILED' },
      });
      await this.deps.eventLog.append(rejected);
      return {
        event: rejected,
        error: 'Could not parse intent from utterance',
        code: 'AI_PARSE_FAILED',
      };
    }

    if (!tenant.allowedIntents.includes(parsed.intent)) {
      const rejected = this.deps.eventBuilder.build({
        tenantSlug: tenant.slug,
        intent: parsed.intent,
        payload: parsed.payload,
        requestId,
        status: 'rejected',
        metadata: { reason: 'INTENT_NOT_ALLOWED' },
      });
      await this.deps.eventLog.append(rejected);
      return {
        event: rejected,
        error: `Intent not allowed: ${parsed.intent}`,
        code: 'INTENT_NOT_ALLOWED',
      };
    }

    const accepted = this.deps.eventBuilder.build({
      tenantSlug: tenant.slug,
      intent: parsed.intent,
      payload: parsed.payload,
      requestId,
      status: 'accepted',
      metadata: { confidence: parsed.confidence, mode: tenant.mode },
    });

    const dispatchResult = await this.deps.dispatcher.dispatch(accepted, tenant);
    const finalStatus = dispatchResult.dispatched ? 'dispatched' : 'accepted';
    const finalEvent: OpslyEvent = { ...accepted, status: finalStatus };

    await this.deps.eventLog.append(finalEvent);

    if (!dispatchResult.dispatched && tenant.mode === 'live') {
      return {
        event: finalEvent,
        error: dispatchResult.detail ?? 'Workflow dispatch failed',
        code: 'DISPATCH_FAILED',
      };
    }

    this.deps.logger?.info('agent.runtime.complete', {
      tenantSlug: tenant.slug,
      intent: parsed.intent,
      requestId,
      mode: tenant.mode,
    });

    return { event: finalEvent };
  }
}
