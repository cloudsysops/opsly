import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { parseJsonBody, jsonError } from '../../../../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../../../../lib/constants';
import {
  goHighLevelLeadWebhookSchema,
  normalizePeskidsPipelineStage,
} from '../../../../../../../../lib/peskids/ghl-contract';
import { dispatchPeskidsLeadAutomation } from '../../../../../../../../lib/peskids/automation';
import {
  buildPeskidsLeadPersistInputFromGoHighLevel,
  persistPeskidsLead,
} from '../../../../../../../../lib/peskids/lead-ingest';
import { createPipelineOpportunity } from '../../../../../../../../lib/peskids/opportunity';
import { formatZodError } from '../../../../../../../../lib/validation';
import {
  alertWebhookFailure,
  alertSubabaseFailure,
  alertGhlFailure,
  alertN8nFailure,
} from '../../../../../../../../lib/alerting/slack-notifier';
import {
  recordLeadReceived,
  recordLeadPersisted,
  recordGhlOpportunityCreated,
  recordSubabaseError,
  recordGhlApiError,
  recordN8nDispatchFailure,
  recordWebhookValidationError,
  createLatencyTimer,
} from '../../../../../../../../lib/metrics/metrics-collector';

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/public/tenants/peskids/webhooks/gohighlevel/leads
 * GHL -> Opsly bridge contract for lead capture, persistence, and minimal automation handoff.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const secret = process.env.PESKIDS_INBOUND_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get('x-webhook-secret')?.trim() ?? '';
    if (!header || !constantTimeEqual(header, secret)) {
      await alertWebhookFailure('auth', 'Invalid webhook secret');
      return jsonError('invalid webhook secret', HTTP_STATUS.UNAUTHORIZED);
    }
  } else {
    console.warn('[peskids/gohighlevel] PESKIDS_INBOUND_WEBHOOK_SECRET not set — webhook is unauthenticated');
  }

  const requestId = request.headers.get('x-request-id')?.trim() || globalThis.crypto.randomUUID();
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = goHighLevelLeadWebhookSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    await recordWebhookValidationError('peskids');
    await alertWebhookFailure('validation', formatZodError(parsed.error));
    return jsonError(
      `Invalid request body: ${formatZodError(parsed.error)}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Record: lead received
  await recordLeadReceived('peskids', parsed.data.source);

  // Persist lead to Supabase with latency tracking
  const persistTimer = createLatencyTimer();
  const result = await persistPeskidsLead(
    buildPeskidsLeadPersistInputFromGoHighLevel(parsed.data)
  );

  if (!result.ok) {
    await recordSubabaseError('peskids', 'persist');
    await alertSubabaseFailure('persistPeskidsLead', result.error, {
      leadId: parsed.data.lead_id,
      tenantSlug: 'peskids',
    });
    return Response.json({ error: result.error, request_id: requestId }, { status: 500 });
  }

  await recordLeadPersisted('peskids', result.created);
  await persistTimer.end('peskids', 'supabase.persist');

  // Create or link opportunity in GHL pipeline (blocks response; critical for lead routing)
  if (result.created && result.row.ghl_contact_id && parsed.data.lead?.parent_name) {
    const oppTimer = createLatencyTimer();
    const opportunityResult = await createPipelineOpportunity(
      result.row.ghl_contact_id,
      parsed.data.lead.parent_name
    );

    if (opportunityResult) {
      await recordGhlOpportunityCreated('peskids');
      await oppTimer.end('peskids', 'gohighlevel.opportunity');
      console.log('[peskids] pipeline opportunity created:', {
        contactId: result.row.ghl_contact_id,
        opportunityId: opportunityResult.opportunityId,
        leadId: result.row.lead_id,
      });
    } else {
      // Opportunity creation failed but lead was created; log and alert but don't fail response
      await recordGhlApiError('peskids', 0, 'createPipelineOpportunity');
      await alertGhlFailure('createPipelineOpportunity', undefined, 'Opportunity creation returned null', parsed.data.lead_id);
    }
  }

  // Fire-and-forget: automation dispatch must not block the HTTP response
  if (result.created) {
    const n8nTimer = createLatencyTimer();
    dispatchPeskidsLeadAutomation(parsed.data)
      .then((dispatchResult) => {
        if (dispatchResult.ok) {
          void n8nTimer.end('peskids', 'n8n.dispatch');
        } else {
          void recordN8nDispatchFailure('peskids', dispatchResult.detail);
          void alertN8nFailure('dispatchPeskidsLeadAutomation', dispatchResult.detail, parsed.data.lead_id);
        }
      })
      .catch((err: unknown) => {
        void recordN8nDispatchFailure('peskids', err instanceof Error ? err.message : String(err));
        void alertN8nFailure(
          'dispatchPeskidsLeadAutomation',
          err instanceof Error ? err.message : String(err),
          parsed.data.lead_id
        );
      });
  }

  const stage = result.row.stage ?? normalizePeskidsPipelineStage(parsed.data.pipeline_stage);

  return Response.json(
    {
      ok: true,
      lead_id: result.row.lead_id ?? parsed.data.lead_id,
      tenant_slug: result.row.tenant_slug,
      source: result.row.source ?? parsed.data.source,
      stage,
      event_type: parsed.data.event_type,
      created_at: result.row.created_at,
      automation_ready: true,
      automation: {
        next_actions: Object.entries(parsed.data.automation)
          .filter(([, enabled]) => enabled)
          .map(([action]) => action),
        dispatch: result.created,
      },
      request_id: requestId,
    },
    { status: result.created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK }
  );
}
