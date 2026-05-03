import type { NextRequest } from 'next/server';
import { runLocalServicesTenantDal } from '../../../../../../lib/local-services-dal';
import { lsListServices } from '../../../../../../lib/repositories/local-services-repository';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  const result = await runLocalServicesTenantDal(request, slug, () => lsListServices());
  if (result instanceof Response) {
    return result;
  }
  return Response.json({ tenant_slug: slug, items: result });
}
