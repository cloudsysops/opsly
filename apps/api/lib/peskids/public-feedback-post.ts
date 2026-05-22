import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../constants';
import { assertPeskidsTenantPublic } from './assert-tenant';
import { PESKIDS_LOW_SATISFACTION_THRESHOLD, PESKIDS_TENANT_SLUG } from './constants';
import { peskidsInsertFeedback } from './repository';
import { peskidsFeedbackBodySchema } from './schemas';

async function readJsonBody(request: NextRequest): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
}

/**
 * POST público: feedback padres Peskids (sin JWT). Alerta lógica si satisfaction < 3.
 */
export async function postPublicPeskidsFeedback(request: NextRequest): Promise<Response> {
  const gate = await assertPeskidsTenantPublic(PESKIDS_TENANT_SLUG);
  if (gate !== null) {
    return gate;
  }

  const raw = await readJsonBody(request);
  if (raw instanceof Response) {
    return raw;
  }

  const parsed = peskidsFeedbackBodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const inserted = await peskidsInsertFeedback(parsed.data);
  if (!inserted.ok) {
    return Response.json({ error: inserted.error }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  const row = inserted.row;
  const needs_attention = row.satisfaction < PESKIDS_LOW_SATISFACTION_THRESHOLD;

  return Response.json(
    {
      ok: true,
      feedback_id: row.id,
      tenant_slug: row.tenant_slug,
      event_type: 'feedback.created',
      needs_attention,
      created_at: row.created_at,
    },
    { status: HTTP_STATUS.CREATED }
  );
}
