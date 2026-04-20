import {
  jsonError,
  parseJsonBody,
  serverErrorLogged,
  tryRoute,
} from '../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../lib/constants';
import {
  CreateInvoiceSchema,
  ListInvoicesQuerySchema,
} from '../../../../lib/billing/invoice-types';
import { createInvoice, listInvoices } from '../../../../lib/billing/invoice-service';
import { resolveTrustedPortalSession } from '../../../../lib/portal-trusted-identity';
import { requireAdminAccess } from '../../../../lib/auth';
import { formatZodError } from '../../../../lib/validation';

/**
 * GET /api/billing/invoices
 *
 * List invoices for the authenticated tenant (portal session)
 * or all invoices for admin (with ?tenant_id= filter).
 */
export function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/billing/invoices', async () => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);

    // Admin path: requires admin access, can filter by tenant_id
    const adminTenantId = params.tenant_id;
    if (adminTenantId) {
      const authError = await requireAdminAccess(request);
      if (authError) return authError;

      const parsed = ListInvoicesQuerySchema.safeParse(params);
      if (!parsed.success) {
        return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
      }

      const result = await listInvoices(
        adminTenantId,
        parsed.data.page,
        parsed.data.limit,
        parsed.data.status
      );

      return Response.json({ ...result, page: parsed.data.page, limit: parsed.data.limit });
    }

    // Portal path: resolve tenant from session
    const session = await resolveTrustedPortalSession(request);
    if (!session.ok) return session.response;

    const parsed = ListInvoicesQuerySchema.safeParse(params);
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    const result = await listInvoices(
      session.session.tenant.id,
      parsed.data.page,
      parsed.data.limit,
      parsed.data.status
    );

    return Response.json({ ...result, page: parsed.data.page, limit: parsed.data.limit });
  });
}

/**
 * POST /api/billing/invoices
 *
 * Create a new invoice. Requires portal session (tenant creates their own invoices).
 * Admin can also create by passing tenant_id in body.
 */
export function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/billing/invoices', async () => {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.body as Record<string, unknown>;

    // Admin path: if tenant_id is in body, require admin access
    if (body.tenant_id) {
      const authError = await requireAdminAccess(request);
      if (authError) return authError;

      const parsed = CreateInvoiceSchema.safeParse(body);
      if (!parsed.success) {
        return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
      }

      const tenantId = String(body.tenant_id);
      // Resolve tenant slug from DB for invoice number
      const { getServiceClient } = await import('../../../../lib/supabase');
      const { data: tenant } = await getServiceClient()
        .schema('platform')
        .from('tenants')
        .select('slug')
        .eq('id', tenantId)
        .maybeSingle();

      if (!tenant) {
        return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
      }

      const invoice = await createInvoice(tenantId, tenant.slug, parsed.data);
      return Response.json(invoice, { status: HTTP_STATUS.CREATED });
    }

    // Portal path: tenant creates invoice for their own customers
    const session = await resolveTrustedPortalSession(request);
    if (!session.ok) return session.response;

    const parsed = CreateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const invoice = await createInvoice(
        session.session.tenant.id,
        session.session.tenant.slug,
        parsed.data
      );
      return Response.json(invoice, { status: HTTP_STATUS.CREATED });
    } catch (err) {
      return serverErrorLogged('POST /api/billing/invoices', err);
    }
  });
}
