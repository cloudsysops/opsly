import { z } from 'zod';
import { requireAdminAccess } from '../../../../../lib/auth';
import { resumeTenant } from '../../../../../lib/orchestrator';
import { formatZodError } from '../../../../../lib/validation';
import { getServiceClient } from '../../../../../lib/supabase';
import { logger } from '../../../../../lib/logger';

const idParamSchema = z.string().uuid();

export async function POST(
  request: Request,
  context: { params: Promise<{ ref: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const { ref } = await context.params;
  const idParsed = idParamSchema.safeParse(ref);
  if (!idParsed.success) {
    return Response.json({ error: formatZodError(idParsed.error) }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('id')
    .eq('id', idParsed.data)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    logger.error('resume fetch', fetchError);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
  if (!existing) {
    return Response.json({ error: 'Tenant not found' }, { status: 404 });
  }

  try {
    await resumeTenant(idParsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Resume failed';
    if (message === 'Tenant not found') {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }
    if (message === 'Tenant is not suspended') {
      return Response.json({ error: message }, { status: 409 });
    }
    logger.error('resume', err instanceof Error ? err : { error: String(err) });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  return Response.json({ status: 'active' as const });
}
