import { z } from 'zod';
import {
  grantEntitlement,
  listEntitlements,
  TenantNotFoundError,
} from '@intcloudsysops/services/entitlements';
import { jsonError, jsonOk, parseJsonBody, tryRoute } from '../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { getServiceClient } from '../../../../../lib/supabase';
import { formatZodError } from '../../../../../lib/validation';

const GrantEntitlementSchema = z.object({
  module_id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'module_id must be lowercase kebab-case'),
  source: z.enum(['manual', 'plan_default', 'package_default']).optional(),
  granted_by: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  return tryRoute('GET /api/tenants/[slug]/entitlements', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) return authError;

    const { slug } = await context.params;

    try {
      const entitlements = await listEntitlements(getServiceClient(), slug);
      return jsonOk({ data: entitlements });
    } catch (err) {
      if (err instanceof TenantNotFoundError) {
        return jsonError(err.message, HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
}

export function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  return tryRoute('POST /api/tenants/[slug]/entitlements', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) return authError;

    const { slug } = await context.params;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = GrantEntitlementSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const entitlement = await grantEntitlement(getServiceClient(), slug, {
        moduleId: parsed.data.module_id,
        source: parsed.data.source,
        grantedBy: parsed.data.granted_by,
        metadata: parsed.data.metadata,
      });
      return jsonOk({ data: entitlement }, HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof TenantNotFoundError) {
        return jsonError(err.message, HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
}
