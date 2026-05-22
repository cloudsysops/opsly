import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../constants';
import { assertPeskidsTenantPublic } from './assert-tenant';
import { PESKIDS_TENANT_SLUG } from './constants';
import { peskidsInsertLead } from './repository';
import { peskidsLeadBodySchema } from './schemas';

async function readJsonBody(request: NextRequest): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
}

/**
 * POST público: captura lead Peskids (sin JWT). Approval-first: sin email auto al padre.
 */
export async function postPublicPeskidsLead(request: NextRequest): Promise<Response> {
  const gate = await assertPeskidsTenantPublic(PESKIDS_TENANT_SLUG);
  if (gate !== null) {
    return gate;
  }

  const raw = await readJsonBody(request);
  if (raw instanceof Response) {
    return raw;
  }

  const parsed = peskidsLeadBodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const inserted = await peskidsInsertLead(parsed.data);
  if (!inserted.ok) {
    return Response.json({ error: inserted.error }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  const row = inserted.row;
  return Response.json(
    {
      ok: true,
      lead_id: row.id,
      tenant_slug: row.tenant_slug,
      event_type: 'lead.created',
      created_at: row.created_at,
    },
    { status: HTTP_STATUS.CREATED }
  );
}
