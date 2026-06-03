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
import { formatZodError } from '../../../../../../../../lib/validation';

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
    return jsonError(
      `Invalid request body: ${formatZodError(parsed.error)}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const result = await persistPeskidsLead(
    buildPeskidsLeadPersistInputFromGoHighLevel(parsed.data)
  );
  if (!result.ok) {
    return Response.json({ error: result.error, request_id: requestId }, { status: 500 });
  }

  // Fire-and-forget: automation dispatch must not block the HTTP response
  if (result.created) {
    dispatchPeskidsLeadAutomation(parsed.data).catch((err: unknown) => {
      console.error('[peskids] automation dispatch failed:', err);
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
