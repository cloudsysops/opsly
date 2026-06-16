import { z } from 'zod';
import { jsonError, serverErrorLogged } from '../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { getServiceClient } from '../../../../../lib/supabase';

const idParamSchema = z.string().uuid();
const tenantHeaderSchema = z.string().uuid();

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const tenantHeader = request.headers.get('x-tenant-id');
  const tenantParsed = tenantHeaderSchema.safeParse(tenantHeader ?? '');
  if (!tenantParsed.success) {
    return jsonError('Invalid or missing x-tenant-id header', HTTP_STATUS.BAD_REQUEST);
  }

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError('Invalid key id', HTTP_STATUS.BAD_REQUEST);
  }

  const { data: existing, error: fetchError } = await getServiceClient()
    .schema('platform')
    .from('api_keys')
    .select('id')
    .eq('id', idParsed.data)
    .eq('tenant_id', tenantParsed.data)
    .maybeSingle();

  if (fetchError) {
    return serverErrorLogged('DELETE v1/keys fetch:', fetchError);
  }
  if (!existing) {
    return jsonError('Not found', HTTP_STATUS.NOT_FOUND);
  }

  const { error: updateError } = await getServiceClient()
    .schema('platform')
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', idParsed.data)
    .eq('tenant_id', tenantParsed.data);

  if (updateError) {
    return serverErrorLogged('DELETE v1/keys update:', updateError);
  }

  return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
}
