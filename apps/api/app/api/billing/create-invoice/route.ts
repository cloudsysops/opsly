import {
  jsonError,
  parseJsonBody,
  serverErrorLogged,
  tryRoute,
} from '../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../lib/constants';
import { CreateInvoiceSimpleSchema } from '../../../../lib/billing/subscription-types';
import { createInvoice } from '../../../../lib/billing/invoice-service';
import { resolveTrustedPortalSession } from '../../../../lib/portal-trusted-identity';
import { requireAdminAccess } from '../../../../lib/auth';
import { formatZodError } from '../../../../lib/validation';
import { getServiceClient } from '../../../../lib/supabase';

/**
 * POST /api/billing/create-invoice
 *
 * Simplified invoice creation — single description + amount.
 * Wraps the full invoice service with a simpler interface.
 */
export function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/billing/create-invoice', async () => {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.body as Record<string, unknown>;

    const parsed = CreateInvoiceSimpleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    // Resolve tenant
    let tenantId: string;
    let tenantSlug: string;

    if (body.tenant_id) {
      const authError = await requireAdminAccess(request);
      if (authError) return authError;

      const { data: tenant } = await getServiceClient()
        .schema('platform')
        .from('tenants')
        .select('id, slug')
        .eq('id', String(body.tenant_id))
        .maybeSingle();

      if (!tenant) return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
      tenantId = tenant.id as string;
      tenantSlug = tenant.slug as string;
    } else {
      const session = await resolveTrustedPortalSession(request);
      if (!session.ok) return session.response;
      tenantId = session.session.tenant.id;
      tenantSlug = session.session.tenant.slug;
    }

    try {
      const invoice = await createInvoice(tenantId, tenantSlug, {
        customer_email: parsed.data.customer_email,
        customer_name: parsed.data.customer_name,
        line_items: [
          {
            description: parsed.data.description,
            quantity: 1,
            unit_price_cents: parsed.data.amount_cents,
          },
        ],
        due_date: parsed.data.due_date,
        currency: parsed.data.currency,
        tax_rate_percent: 0,
      });
      return Response.json(invoice, { status: HTTP_STATUS.CREATED });
    } catch (err) {
      return serverErrorLogged('POST /api/billing/create-invoice', err);
    }
  });
}
